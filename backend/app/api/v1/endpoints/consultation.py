"""
API endpoints for Doctor Consultation Booking with Video Calls.
Uses Jitsi Meet for free, open-source video conferencing.

Option 3: Production-ready with doctor registration, availability, and slot-based booking.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, desc
from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime, timedelta

from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models import User
from app.models.doctor import Doctor, Appointment, DoctorAvailability

router = APIRouter()


# ──────────────────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────────────────

class BookAppointmentRequest(BaseModel):
    doctor_id: str
    scheduled_at: str  # ISO format datetime
    duration_minutes: int = 30
    notes: Optional[str] = None


class DoctorRegistrationRequest(BaseModel):
    name: str
    specialization: str
    qualification: str
    experience_years: int
    bio: Optional[str] = None
    consultation_fee: float = 500.0
    phone: Optional[str] = None
    languages: Optional[str] = "English"


class DoctorProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None
    phone: Optional[str] = None
    languages: Optional[str] = None
    is_available: Optional[bool] = None


class AvailabilitySlot(BaseModel):
    day_of_week: int  # 0=Monday ... 6=Sunday
    start_time: str   # "09:00"
    end_time: str     # "17:00"
    slot_duration_minutes: int = 30


class SetAvailabilityRequest(BaseModel):
    slots: List[AvailabilitySlot]


class CompleteAppointmentRequest(BaseModel):
    notes: Optional[str] = None


# ──────────────────────────────────────────────────────────
# Helper: serialize doctor to dict
# ──────────────────────────────────────────────────────────

def doctor_to_dict(d: Doctor) -> dict:
    return {
        "id": str(d.id),
        "name": d.name,
        "specialization": d.specialization,
        "qualification": d.qualification,
        "experience_years": d.experience_years,
        "avatar_url": d.avatar_url,
        "bio": d.bio,
        "consultation_fee": d.consultation_fee,
        "is_available": d.is_available,
        "phone": d.phone,
        "languages": d.languages,
    }


# ──────────────────────────────────────────────────────────
# Public endpoints
# ──────────────────────────────────────────────────────────

@router.get("/doctors")
async def list_doctors(
    db: Session = Depends(get_session)
):
    """List all available doctors."""
    statement = select(Doctor).where(Doctor.is_available == True).order_by(Doctor.name)
    doctors = db.exec(statement).all()
    return [doctor_to_dict(d) for d in doctors]


@router.get("/doctors/{doctor_id}")
async def get_doctor(
    doctor_id: str,
    db: Session = Depends(get_session)
):
    """Get a specific doctor's profile."""
    try:
        doctor_uuid = uuid.UUID(doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    statement = select(Doctor).where(Doctor.id == doctor_uuid)
    doctor = db.exec(statement).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return doctor_to_dict(doctor)


@router.get("/doctors/{doctor_id}/availability")
async def get_doctor_availability(
    doctor_id: str,
    db: Session = Depends(get_session)
):
    """Get a doctor's weekly availability schedule (public)."""
    try:
        doctor_uuid = uuid.UUID(doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    statement = select(Doctor).where(Doctor.id == doctor_uuid)
    doctor = db.exec(statement).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    statement = (
        select(DoctorAvailability)
        .where(DoctorAvailability.doctor_id == doctor_uuid)
        .where(DoctorAvailability.is_active == True)
        .order_by(DoctorAvailability.day_of_week, DoctorAvailability.start_time)
    )
    slots = db.exec(statement).all()

    return {
        "doctor_id": str(doctor.id),
        "doctor_name": doctor.name,
        "slots": [
            {
                "id": str(s.id),
                "day_of_week": s.day_of_week,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "slot_duration_minutes": s.slot_duration_minutes,
            }
            for s in slots
        ],
    }


@router.get("/doctors/{doctor_id}/slots")
async def get_available_slots(
    doctor_id: str,
    date: str,  # YYYY-MM-DD
    db: Session = Depends(get_session)
):
    """Get available time slots for a specific doctor on a specific date.

    Returns a list of free time slots after subtracting already-booked appointments.
    """
    try:
        doctor_uuid = uuid.UUID(doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    # Parse requested date
    try:
        requested_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Don't allow past dates
    if requested_date < datetime.utcnow().date():
        raise HTTPException(status_code=400, detail="Cannot query slots in the past")

    # Get doctor
    doctor = db.exec(select(Doctor).where(Doctor.id == doctor_uuid)).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if not doctor.is_available:
        return {"doctor_id": str(doctor.id), "date": date, "slots": []}

    # Get day_of_week (Python: Monday=0, Sunday=6 — matches our model)
    day_of_week = requested_date.weekday()

    # Get availability for this day
    avail_stmt = (
        select(DoctorAvailability)
        .where(DoctorAvailability.doctor_id == doctor_uuid)
        .where(DoctorAvailability.day_of_week == day_of_week)
        .where(DoctorAvailability.is_active == True)
    )
    availability_blocks = db.exec(avail_stmt).all()

    if not availability_blocks:
        return {"doctor_id": str(doctor.id), "date": date, "slots": []}

    # Generate all possible slots from availability blocks
    all_slots = []
    for block in availability_blocks:
        start_h, start_m = map(int, block.start_time.split(":"))
        end_h, end_m = map(int, block.end_time.split(":"))
        duration = block.slot_duration_minutes

        slot_start = datetime.combine(requested_date, datetime.min.time().replace(hour=start_h, minute=start_m))
        block_end = datetime.combine(requested_date, datetime.min.time().replace(hour=end_h, minute=end_m))

        while slot_start + timedelta(minutes=duration) <= block_end:
            all_slots.append({
                "start": slot_start,
                "end": slot_start + timedelta(minutes=duration),
            })
            slot_start += timedelta(minutes=duration)

    # Get existing appointments for this doctor on this date
    day_start = datetime.combine(requested_date, datetime.min.time())
    day_end = datetime.combine(requested_date, datetime.max.time())

    booked_stmt = (
        select(Appointment)
        .where(Appointment.doctor_id == doctor_uuid)
        .where(Appointment.scheduled_at >= day_start)
        .where(Appointment.scheduled_at <= day_end)
        .where(Appointment.status != "cancelled")
    )
    booked_appointments = db.exec(booked_stmt).all()

    # Build set of booked slot start times
    booked_times = set()
    for apt in booked_appointments:
        booked_times.add(apt.scheduled_at.strftime("%H:%M"))

    # Filter to only free slots
    # Also filter out slots that have already passed today
    now = datetime.utcnow()
    free_slots = []
    for slot in all_slots:
        time_str = slot["start"].strftime("%H:%M")
        is_booked = time_str in booked_times
        is_past = slot["start"] <= now
        free_slots.append({
            "time": time_str,
            "end_time": slot["end"].strftime("%H:%M"),
            "available": not is_booked and not is_past,
            "booked": is_booked,
        })

    return {
        "doctor_id": str(doctor.id),
        "doctor_name": doctor.name,
        "date": date,
        "day_of_week": day_of_week,
        "slots": free_slots,
    }


# ──────────────────────────────────────────────────────────
# Patient endpoints (authenticated)
# ──────────────────────────────────────────────────────────

@router.post("/book")
async def book_appointment(
    request: BookAppointmentRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Book a video consultation appointment with a doctor.

    Validates the requested slot against doctor availability and existing bookings.
    """
    clerk_user_id = claims["sub"]

    # Verify user
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify doctor
    try:
        doctor_uuid = uuid.UUID(request.doctor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    statement = select(Doctor).where(Doctor.id == doctor_uuid)
    doctor = db.exec(statement).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if not doctor.is_available:
        raise HTTPException(status_code=400, detail="Doctor is not available")

    # Parse scheduled time
    try:
        raw = request.scheduled_at.replace("Z", "+00:00")
        scheduled_time = datetime.fromisoformat(raw)
        scheduled_time = scheduled_time.replace(tzinfo=None)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")

    if scheduled_time < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Cannot book appointments in the past")

    # Validate against availability (if doctor has set availability slots)
    day_of_week = scheduled_time.weekday()
    avail_stmt = (
        select(DoctorAvailability)
        .where(DoctorAvailability.doctor_id == doctor_uuid)
        .where(DoctorAvailability.day_of_week == day_of_week)
        .where(DoctorAvailability.is_active == True)
    )
    availability_blocks = db.exec(avail_stmt).all()

    if availability_blocks:
        # Doctor has availability set — validate the slot falls within
        slot_time = scheduled_time.strftime("%H:%M")
        slot_valid = False
        for block in availability_blocks:
            if block.start_time <= slot_time < block.end_time:
                slot_valid = True
                break
        if not slot_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Selected time {slot_time} is outside the doctor's availability"
            )

    # Check for double-booking
    conflict_stmt = (
        select(Appointment)
        .where(Appointment.doctor_id == doctor_uuid)
        .where(Appointment.scheduled_at == scheduled_time)
        .where(Appointment.status != "cancelled")
    )
    existing = db.exec(conflict_stmt).first()
    if existing:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    # Generate unique Jitsi meeting room ID
    meeting_room_id = f"aidoctor-{uuid.uuid4().hex[:12]}"

    appointment = Appointment(
        user_id=user.id,
        doctor_id=doctor.id,
        scheduled_at=scheduled_time,
        duration_minutes=request.duration_minutes,
        meeting_room_id=meeting_room_id,
        notes=request.notes
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return {
        "id": str(appointment.id),
        "doctor": {
            "id": str(doctor.id),
            "name": doctor.name,
            "specialization": doctor.specialization
        },
        "scheduled_at": appointment.scheduled_at.isoformat(),
        "duration_minutes": appointment.duration_minutes,
        "status": appointment.status,
        "meeting_room_id": appointment.meeting_room_id,
        "meeting_url": f"https://meet.jit.si/{appointment.meeting_room_id}",
        "notes": appointment.notes,
        "created_at": appointment.created_at.isoformat()
    }


@router.get("/appointments")
async def list_appointments(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get user's appointment list."""
    clerk_user_id = claims["sub"]

    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    if not user:
        return []

    statement = (
        select(Appointment)
        .where(Appointment.user_id == user.id)
        .order_by(desc(Appointment.scheduled_at))
    )
    appointments = db.exec(statement).all()

    results = []
    for apt in appointments:
        doc_stmt = select(Doctor).where(Doctor.id == apt.doctor_id)
        doctor = db.exec(doc_stmt).first()

        results.append({
            "id": str(apt.id),
            "doctor": {
                "id": str(doctor.id) if doctor else None,
                "name": doctor.name if doctor else "Unknown",
                "specialization": doctor.specialization if doctor else ""
            },
            "scheduled_at": apt.scheduled_at.isoformat(),
            "duration_minutes": apt.duration_minutes,
            "status": apt.status,
            "meeting_room_id": apt.meeting_room_id,
            "meeting_url": f"https://meet.jit.si/{apt.meeting_room_id}",
            "notes": apt.notes,
            "created_at": apt.created_at.isoformat()
        })

    return results


@router.get("/appointments/{appointment_id}")
async def get_appointment(
    appointment_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get details of a specific appointment."""
    clerk_user_id = claims["sub"]

    try:
        apt_uuid = uuid.UUID(appointment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    statement = select(Appointment).where(Appointment.id == apt_uuid)
    appointment = db.exec(statement).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify ownership
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()

    if not user or appointment.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Load doctor
    doc_stmt = select(Doctor).where(Doctor.id == appointment.doctor_id)
    doctor = db.exec(doc_stmt).first()

    return {
        "id": str(appointment.id),
        "doctor": {
            "id": str(doctor.id) if doctor else None,
            "name": doctor.name if doctor else "Unknown",
            "specialization": doctor.specialization if doctor else "",
            "qualification": doctor.qualification if doctor else "",
            "avatar_url": doctor.avatar_url if doctor else None
        },
        "scheduled_at": appointment.scheduled_at.isoformat(),
        "duration_minutes": appointment.duration_minutes,
        "status": appointment.status,
        "meeting_room_id": appointment.meeting_room_id,
        "meeting_url": f"https://meet.jit.si/{appointment.meeting_room_id}",
        "notes": appointment.notes,
        "created_at": appointment.created_at.isoformat()
    }


@router.put("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Cancel an appointment."""
    clerk_user_id = claims["sub"]

    try:
        apt_uuid = uuid.UUID(appointment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    statement = select(Appointment).where(Appointment.id == apt_uuid)
    appointment = db.exec(statement).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()

    if not user or appointment.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if appointment.status == "cancelled":
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")

    if appointment.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed appointment")

    appointment.status = "cancelled"
    db.commit()

    return {"status": "cancelled", "id": str(appointment.id)}


# ──────────────────────────────────────────────────────────
# Doctor-side endpoints (for the Doctor Portal dashboard)
# ──────────────────────────────────────────────────────────

@router.post("/doctor/register")
async def doctor_register(
    request: DoctorRegistrationRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Register the current user as a doctor.

    Creates a Doctor record linked to the current Clerk user.
    Fails if a doctor profile already exists for this user.
    """
    clerk_user_id = claims["sub"]

    # Check if already registered
    existing = db.exec(
        select(Doctor).where(Doctor.clerk_user_id == clerk_user_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You are already registered as a doctor")

    doctor = Doctor(
        name=request.name,
        specialization=request.specialization,
        qualification=request.qualification,
        experience_years=request.experience_years,
        bio=request.bio,
        consultation_fee=request.consultation_fee,
        phone=request.phone,
        languages=request.languages or "English",
        clerk_user_id=clerk_user_id,
        is_available=True,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return {
        "message": "Doctor profile created successfully",
        "doctor": doctor_to_dict(doctor),
    }


@router.get("/doctor/profile")
async def get_doctor_profile(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get the current user's doctor profile."""
    clerk_user_id = claims["sub"]

    doctor = db.exec(
        select(Doctor).where(Doctor.clerk_user_id == clerk_user_id)
    ).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor profile linked to this account")

    return doctor_to_dict(doctor)


@router.put("/doctor/profile")
async def update_doctor_profile(
    request: DoctorProfileUpdateRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Update the current user's doctor profile."""
    clerk_user_id = claims["sub"]

    doctor = db.exec(
        select(Doctor).where(Doctor.clerk_user_id == clerk_user_id)
    ).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor profile linked to this account")

    # Update only provided fields
    update_fields = request.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        if value is not None:
            setattr(doctor, field, value)

    db.commit()
    db.refresh(doctor)

    return {
        "message": "Profile updated successfully",
        "doctor": doctor_to_dict(doctor),
    }


@router.post("/doctor/availability")
async def set_doctor_availability(
    request: SetAvailabilityRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Set/replace the doctor's weekly availability slots.

    Replaces ALL existing active slots with the provided ones.
    """
    clerk_user_id = claims["sub"]

    doctor = db.exec(
        select(Doctor).where(Doctor.clerk_user_id == clerk_user_id)
    ).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor profile linked to this account")

    # Deactivate existing slots
    existing_slots = db.exec(
        select(DoctorAvailability).where(DoctorAvailability.doctor_id == doctor.id)
    ).all()
    for slot in existing_slots:
        db.delete(slot)

    # Create new slots
    new_slots = []
    for slot_data in request.slots:
        # Validate time format
        try:
            h, m = map(int, slot_data.start_time.split(":"))
            h2, m2 = map(int, slot_data.end_time.split(":"))
            assert 0 <= h <= 23 and 0 <= m <= 59
            assert 0 <= h2 <= 23 and 0 <= m2 <= 59
        except (ValueError, AssertionError):
            raise HTTPException(status_code=400, detail=f"Invalid time format: {slot_data.start_time}-{slot_data.end_time}")

        if slot_data.start_time >= slot_data.end_time:
            raise HTTPException(status_code=400, detail=f"Start time must be before end time: {slot_data.start_time}-{slot_data.end_time}")

        if not (0 <= slot_data.day_of_week <= 6):
            raise HTTPException(status_code=400, detail=f"Invalid day_of_week: {slot_data.day_of_week}")

        new_slot = DoctorAvailability(
            doctor_id=doctor.id,
            day_of_week=slot_data.day_of_week,
            start_time=slot_data.start_time,
            end_time=slot_data.end_time,
            slot_duration_minutes=slot_data.slot_duration_minutes,
        )
        db.add(new_slot)
        new_slots.append(new_slot)

    db.commit()

    return {
        "message": f"Availability updated: {len(new_slots)} slot(s) set",
        "slots": [
            {
                "id": str(s.id),
                "day_of_week": s.day_of_week,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "slot_duration_minutes": s.slot_duration_minutes,
            }
            for s in new_slots
        ],
    }


@router.get("/doctor/availability")
async def get_my_availability(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get the current doctor's availability schedule."""
    clerk_user_id = claims["sub"]

    doctor = db.exec(
        select(Doctor).where(Doctor.clerk_user_id == clerk_user_id)
    ).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor profile linked to this account")

    slots = db.exec(
        select(DoctorAvailability)
        .where(DoctorAvailability.doctor_id == doctor.id)
        .where(DoctorAvailability.is_active == True)
        .order_by(DoctorAvailability.day_of_week, DoctorAvailability.start_time)
    ).all()

    return {
        "doctor_id": str(doctor.id),
        "slots": [
            {
                "id": str(s.id),
                "day_of_week": s.day_of_week,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "slot_duration_minutes": s.slot_duration_minutes,
            }
            for s in slots
        ],
    }


@router.get("/doctor/my-appointments")
async def doctor_my_appointments(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get appointments for the logged-in doctor."""
    clerk_user_id = claims["sub"]

    statement = select(Doctor).where(Doctor.clerk_user_id == clerk_user_id)
    doctor = db.exec(statement).first()

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="No doctor profile linked to this account"
        )

    statement = (
        select(Appointment)
        .where(Appointment.doctor_id == doctor.id)
        .order_by(desc(Appointment.scheduled_at))
    )
    appointments = db.exec(statement).all()

    results = []
    for apt in appointments:
        user_stmt = select(User).where(User.id == apt.user_id)
        patient = db.exec(user_stmt).first()

        results.append({
            "id": str(apt.id),
            "patient": {
                "id": str(patient.id) if patient else None,
                "name": patient.name if patient else "Unknown",
                "email": patient.email if patient else "",
            },
            "scheduled_at": apt.scheduled_at.isoformat(),
            "duration_minutes": apt.duration_minutes,
            "status": apt.status,
            "meeting_room_id": apt.meeting_room_id,
            "meeting_url": f"https://meet.jit.si/{apt.meeting_room_id}",
            "notes": apt.notes,
            "created_at": apt.created_at.isoformat(),
        })

    return results


@router.put("/doctor/appointments/{appointment_id}/complete")
async def doctor_complete_appointment(
    appointment_id: str,
    request: CompleteAppointmentRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Mark an appointment as completed (doctor-side)."""
    clerk_user_id = claims["sub"]

    statement = select(Doctor).where(Doctor.clerk_user_id == clerk_user_id)
    doctor = db.exec(statement).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="No doctor profile linked to this account")

    try:
        apt_uuid = uuid.UUID(appointment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    statement = select(Appointment).where(Appointment.id == apt_uuid)
    appointment = db.exec(statement).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appointment.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Not authorized — this is not your appointment")

    if appointment.status == "completed":
        raise HTTPException(status_code=400, detail="Appointment is already completed")

    if appointment.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot complete a cancelled appointment")

    appointment.status = "completed"
    if request.notes:
        appointment.notes = request.notes
    db.commit()

    return {"status": "completed", "id": str(appointment.id)}

"""
API endpoints for Doctor Consultation Booking with Video Calls.
Uses Jitsi Meet for free, open-source video conferencing.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, desc
from typing import Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models import User
from app.models.doctor import Doctor, Appointment

router = APIRouter()


class BookAppointmentRequest(BaseModel):
    doctor_id: str
    scheduled_at: str  # ISO format datetime
    duration_minutes: int = 30
    notes: Optional[str] = None


@router.get("/doctors")
async def list_doctors(
    db: Session = Depends(get_session)
):
    """List all available doctors."""
    statement = select(Doctor).where(Doctor.is_available == True).order_by(Doctor.name)
    doctors = db.exec(statement).all()

    return [
        {
            "id": str(d.id),
            "name": d.name,
            "specialization": d.specialization,
            "qualification": d.qualification,
            "experience_years": d.experience_years,
            "avatar_url": d.avatar_url,
            "bio": d.bio,
            "consultation_fee": d.consultation_fee,
            "is_available": d.is_available
        }
        for d in doctors
    ]


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

    return {
        "id": str(doctor.id),
        "name": doctor.name,
        "specialization": doctor.specialization,
        "qualification": doctor.qualification,
        "experience_years": doctor.experience_years,
        "avatar_url": doctor.avatar_url,
        "bio": doctor.bio,
        "consultation_fee": doctor.consultation_fee,
        "is_available": doctor.is_available
    }


@router.post("/book")
async def book_appointment(
    request: BookAppointmentRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Book a video consultation appointment with a doctor."""
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
        scheduled_time = datetime.fromisoformat(request.scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")

    if scheduled_time < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Cannot book appointments in the past")

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
        # Load doctor info
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

    # Verify ownership
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

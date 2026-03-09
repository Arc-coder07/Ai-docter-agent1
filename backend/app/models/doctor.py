import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User


class Doctor(SQLModel, table=True):
    """Available doctors for video consultations."""
    __tablename__ = "doctors"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    specialization: str
    qualification: str
    experience_years: int
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: float = Field(default=0.0)
    is_available: bool = Field(default=True)
    # Links a Clerk-authenticated user to this doctor profile.
    clerk_user_id: Optional[str] = Field(default=None, unique=True, index=True)
    # Option 3 fields
    phone: Optional[str] = None
    languages: Optional[str] = Field(default="English")  # Comma-separated
    created_at: datetime = Field(default_factory=datetime.utcnow)

    appointments: List["Appointment"] = Relationship(back_populates="doctor")
    availability_slots: List["DoctorAvailability"] = Relationship(back_populates="doctor")


class DoctorAvailability(SQLModel, table=True):
    """Weekly recurring availability slots for doctors.

    Each row represents a time block on a specific day of the week.
    E.g. Monday 09:00-12:00 (slot_duration_minutes=30 → generates 6 slots).
    """
    __tablename__ = "doctor_availability"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    doctor_id: uuid.UUID = Field(foreign_key="doctors.id", index=True)
    day_of_week: int  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    start_time: str   # "09:00" (HH:MM 24h format)
    end_time: str     # "17:00"
    slot_duration_minutes: int = Field(default=30)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    doctor: Doctor = Relationship(back_populates="availability_slots")


class Appointment(SQLModel, table=True):
    """Video consultation appointments between users and doctors."""
    __tablename__ = "appointments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    doctor_id: uuid.UUID = Field(foreign_key="doctors.id", index=True)
    scheduled_at: datetime
    duration_minutes: int = Field(default=30)
    status: str = Field(default="scheduled")  # scheduled, completed, cancelled
    meeting_room_id: str  # Jitsi room ID
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: "User" = Relationship(back_populates="appointments")
    doctor: Doctor = Relationship(back_populates="appointments")

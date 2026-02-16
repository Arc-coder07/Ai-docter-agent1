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
    created_at: datetime = Field(default_factory=datetime.utcnow)

    appointments: List["Appointment"] = Relationship(back_populates="doctor")


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

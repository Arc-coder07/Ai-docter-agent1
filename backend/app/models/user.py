import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from typing import List, Optional, TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from .chat import ChatSession
    from .health_report import HealthReport
    from .xray_scan import XrayScan
    from .brain_tumor_scan import BrainTumorScan
    from .doctor import Appointment

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    clerk_id: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    role: Optional[str] = None  # "patient", "doctor", or null (not onboarded)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Patient Profile (collected during onboarding)
    date_of_birth: Optional[str] = None       # YYYY-MM-DD
    gender: Optional[str] = None              # male, female, other
    blood_group: Optional[str] = None         # A+, A-, B+, B-, AB+, AB-, O+, O-
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None           # comma-separated or free text
    chronic_conditions: Optional[str] = None  # e.g. "Diabetes, Hypertension"
    current_medications: Optional[str] = None # e.g. "Metformin 500mg"
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    sessions: List["ChatSession"] = Relationship(back_populates="user")
    reports: List["MedicalReport"] = Relationship(back_populates="user")
    health_reports: List["HealthReport"] = Relationship(back_populates="user")
    xray_scans: List["XrayScan"] = Relationship(back_populates="user")
    brain_tumor_scans: List["BrainTumorScan"] = Relationship(back_populates="user")
    appointments: List["Appointment"] = Relationship(back_populates="user")


class MedicalReport(SQLModel, table=True):
    """Stores uploaded medical reports (blood reports, X-rays, MRI, etc.)"""
    __tablename__ = "medical_reports"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    session_id: Optional[uuid.UUID] = Field(default=None, foreign_key="chat_sessions.id", index=True)
    
    report_type: str  # 'blood_report', 'xray', 'mri', 'skin_image'
    file_path: str
    analysis_result: Optional[str] = None  # JSON string for analysis results
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: "User" = Relationship(back_populates="reports")

import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from typing import List, Optional, TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from .chat import ChatSession
    from .health_report import HealthReport
    from .xray_scan import XrayScan
    from .doctor import Appointment

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    clerk_id: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    sessions: List["ChatSession"] = Relationship(back_populates="user")
    reports: List["MedicalReport"] = Relationship(back_populates="user")
    health_reports: List["HealthReport"] = Relationship(back_populates="user")
    xray_scans: List["XrayScan"] = Relationship(back_populates="user")
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

"""
Health Report Models for Blood Report Analysis
"""
import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User


class HealthReport(SQLModel, table=True):
    """Stores blood/health report analyses"""
    __tablename__ = "health_reports"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    # Report metadata
    file_name: str
    file_path: Optional[str] = None
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None

    # Analysis data
    report_text: str  # Extracted PDF text
    analysis: str  # AI-generated analysis
    model_used: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="health_reports")
    chat_messages: List["HealthReportMessage"] = Relationship(back_populates="report")


class HealthReportMessage(SQLModel, table=True):
    """Chat messages for follow-up questions on health reports"""
    __tablename__ = "health_report_messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    report_id: uuid.UUID = Field(foreign_key="health_reports.id", index=True)
    role: str  # "user" or "assistant"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    report: HealthReport = Relationship(back_populates="chat_messages")

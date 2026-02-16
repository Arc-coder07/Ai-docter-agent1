import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User


class XrayScan(SQLModel, table=True):
    """Stores chest X-ray pneumonia detection results."""
    __tablename__ = "xray_scans"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    # Image metadata
    file_name: str
    file_path: str

    # Optional patient info
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None

    # Prediction results
    diagnosis: str  # "PNEUMONIA" or "NORMAL"
    confidence: float  # 0-100 percentage
    confidence_level: str  # "High", "Moderate", "Low"
    recommendation: str
    raw_score: float  # Raw model output (0-1)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: "User" = Relationship(back_populates="xray_scans")

import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
import json

if TYPE_CHECKING:
    from .user import User


class BrainTumorScan(SQLModel, table=True):
    """Stores Brain Tumor MRI detection results."""
    __tablename__ = "brain_tumor_scans"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    # Image metadata
    file_name: str
    file_path: str

    # Optional patient info
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None

    # Prediction results
    diagnosis: str
    confidence: float
    confidence_level: str
    recommendation: str
    
    # Advanced metrics
    cdss_score: Optional[float] = None
    uncertainty_total: Optional[float] = None
    robustness_score: Optional[float] = None
    
    # JSON strings for complex nested data (XAI, probabilities, etc.)
    xai_data_json: Optional[str] = None
    probabilities_json: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: "User" = Relationship(back_populates="brain_tumor_scans")

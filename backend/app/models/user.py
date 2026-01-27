import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .chat import ChatSession

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    clerk_id: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    sessions: List["ChatSession"] = Relationship(back_populates="user")

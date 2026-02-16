import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from typing import List, Optional
from .user import User

class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_sessions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    title: Optional[str] = "New Chat"
    
    # New fields for multi-agent support
    conversation_type: str = Field(default="voice_consultation")  # 'voice_consultation', 'medical_assistant', 'report_analysis'
    agent_used: Optional[str] = None  # e.g., 'RAG_AGENT', 'CHEST_XRAY_AGENT'
    session_metadata: Optional[str] = None  # JSON string for doctor info, image paths, etc.
    summary: Optional[str] = None  # AI-generated summary
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="sessions")
    messages: List["ChatMessage"] = Relationship(back_populates="session")

class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="chat_sessions.id", index=True)
    role: str  # "user" or "assistant"
    content: str
    image_url: Optional[str] = None  # New: for image messages
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    session: ChatSession = Relationship(back_populates="messages")

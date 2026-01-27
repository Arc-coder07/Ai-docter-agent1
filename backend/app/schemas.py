from pydantic import BaseModel
from typing import List, Optional

class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[int] = None

class ChatRequest(BaseModel):
    messages: List[Message]
    sessionId: Optional[str] = None

class SuggestDoctorRequest(BaseModel):
    notes: str

class SyncConversationRequest(BaseModel):
    messages: List[Message]

class CreateUserRequest(BaseModel):
    email: str
    name: Optional[str] = None

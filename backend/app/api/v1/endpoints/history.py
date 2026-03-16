from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, desc
from typing import List
import uuid

from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models import ChatSession, ChatMessage, User

from app.schemas import SyncConversationRequest

router = APIRouter()

@router.put("/sessions/{session_id}")
async def sync_session(
    session_id: str,
    request: SyncConversationRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    clerk_user_id = claims["sub"]
    # Verify ownership
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Session ID")
        
    statement = select(ChatSession).where(ChatSession.id == session_uuid)
    chat_session = db.exec(statement).first()
    
    if not chat_session:
        # Check if we should create it on the fly?
        # Usually frontend creates it before starting chat.
        raise HTTPException(status_code=404, detail="Session not found")
        
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    
    if not user or chat_session.user_id != user.id:
         raise HTTPException(status_code=403, detail="Not authorized")

    # Sync strategy: Replace all messages?
    # Vapi sends the full transcript.
    # To be safe and simple: Delete existing messages for this session and re-insert.
    # (Not efficient for huge chats but fine for medical consults < 100 msgs)
    
    # Delete old
    statement = select(ChatMessage).where(ChatMessage.session_id == session_uuid)
    results = db.exec(statement).all()
    for msg in results:
        db.delete(msg)
        
    # Insert new
    for msg in request.messages:
        new_msg = ChatMessage(
            session_id=session_uuid,
            role=msg.role,
            content=msg.content
        )
        db.add(new_msg)
        
    db.commit()
    return {"status": "synced"}

@router.get("/sessions")
async def get_sessions(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    clerk_user_id = claims["sub"]
    # Find user
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    if not user:
        return []
        
    # Get sessions
    statement = select(ChatSession).where(ChatSession.user_id == user.id).order_by(desc(ChatSession.created_at))
    sessions = db.exec(statement).all()
    return sessions

@router.get("/sessions/{session_id}")
async def get_session_messages(
    session_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    clerk_user_id = claims["sub"]
    # Verify ownership
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Session ID")

    statement = select(ChatSession).where(ChatSession.id == session_uuid)
    chat_session = db.exec(statement).first()
    
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Check user (via join or lazy load) -> simple check
    # We need to fetch user to compare IDs or just check user_id
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    
    if not user or chat_session.user_id != user.id:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    # Get messages
    statement = select(ChatMessage).where(ChatMessage.session_id == session_uuid).order_by(ChatMessage.created_at)
    messages = db.exec(statement).all()
    return messages

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    clerk_user_id = claims["sub"]
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Session ID")
        
    statement = select(ChatSession).where(ChatSession.id == session_uuid)
    chat_session = db.exec(statement).first()
    
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    
    if not user or chat_session.user_id != user.id:
         raise HTTPException(status_code=403, detail="Not authorized")

    # Manual Cascade: Delete messages first
    messages_statement = select(ChatMessage).where(ChatMessage.session_id == session_uuid)
    messages = db.exec(messages_statement).all()
    for msg in messages:
        db.delete(msg)

    db.delete(chat_session)
    db.commit()
    return {"status": "success"}


@router.get("/sessions/{session_id}/summary")
async def generate_session_summary(
    session_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Generate an AI-powered summary report for a session."""
    clerk_user_id = claims["sub"]
    
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Session ID")
    
    # Get session
    statement = select(ChatSession).where(ChatSession.id == session_uuid)
    chat_session = db.exec(statement).first()
    
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify ownership
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    
    if not user or chat_session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get messages
    statement = select(ChatMessage).where(
        ChatMessage.session_id == session_uuid
    ).order_by(ChatMessage.created_at)
    messages = db.exec(statement).all()
    
    if not messages:
        return {
            "summary": None,
            "message": "No messages found to summarize"
        }
    
    # Build conversation text
    conversation_text = "\n".join([
        f"{msg.role.upper()}: {msg.content}" 
        for msg in messages
    ])
    
    # Generate summary using Gemini Flash
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        import os
        
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.3
        )
        
        summary_prompt = f"""Analyze this medical consultation and provide a structured clinical summary.

**Conversation:**
{conversation_text}

**Generate a summary with the following sections:**

1. **Chief Complaint**: The main reason for the consultation (1-2 sentences)
2. **Key Symptoms Discussed**: List the main symptoms mentioned
3. **Recommendations Given**: What was advised or recommended
4. **Follow-up Actions**: Any next steps mentioned

Format your response using markdown with clear headers."""

        response = llm.invoke(summary_prompt)
        summary_text = response.content
        
        # Update session with summary
        chat_session.summary = summary_text
        db.add(chat_session)
        db.commit()
        
        return {
            "session_id": str(session_uuid),
            "title": chat_session.title,
            "conversation_type": chat_session.conversation_type,
            "agent_used": chat_session.agent_used,
            "summary": summary_text,
            "generated_at": chat_session.created_at.isoformat() if chat_session.created_at else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")


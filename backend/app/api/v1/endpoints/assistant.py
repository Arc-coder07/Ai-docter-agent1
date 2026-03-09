"""
Multi-Agent Medical Assistant API Endpoints
"""
import os
import uuid
import logging
import traceback
from typing import Dict, Optional, List
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from werkzeug.utils import secure_filename

from app.core.auth import get_current_user
from app.db.engine import get_session
from app.models import User, ChatSession, ChatMessage, MedicalReport
from sqlmodel import Session, select
import json

logger = logging.getLogger(__name__)

# Import the agent decision system
from app.agents.agent_decision import process_query
from app.agents.config import Config

router = APIRouter()

# Load configuration
config = Config()

# Set up directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads/backend")
SKIN_LESION_OUTPUT = os.path.join(BASE_DIR, "uploads/skin_lesion_output")

# Create directories if they don't exist
for directory in [UPLOAD_FOLDER, SKIN_LESION_OUTPUT]:
    os.makedirs(directory, exist_ok=True)

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename: str) -> bool:
    """Check if file has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


class AssistantChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    conversation_history: List[Dict] = []


class AssistantValidateRequest(BaseModel):
    session_id: str
    validation_result: str  # 'yes' or 'no'
    comments: Optional[str] = None


@router.post("/chat")
async def assistant_chat(
    request: AssistantChatRequest,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Process user text query through the multi-agent system.
    Creates or continues a session for conversation history.
    """
    clerk_user_id = current_user.get("sub")
    
    # Find or create user
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create session
    session = None
    if request.session_id:
        session = db.exec(
            select(ChatSession).where(
                ChatSession.id == uuid.UUID(request.session_id),
                ChatSession.user_id == user.id
            )
        ).first()
    
    if not session:
        # Create new session for medical assistant
        session = ChatSession(
            user_id=user.id,
            title=request.message[:50] + "..." if len(request.message) > 50 else request.message,
            conversation_type="medical_assistant"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    
    try:
        # Save user message
        user_message = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.message
        )
        db.add(user_message)
        db.commit()
        
        # Process through multi-agent system
        response_data = process_query(request.message)
        response_text = response_data['messages'][-1].content
        agent_name = response_data.get("agent_name", "UNKNOWN")
        
        # Save assistant response
        assistant_message = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=response_text
        )
        db.add(assistant_message)
        
        # Update session with agent used
        session.agent_used = agent_name
        db.commit()
        
        return {
            "status": "success",
            "session_id": str(session.id),
            "response": response_text,
            "agent": agent_name,
            "needs_validation": "HUMAN_VALIDATION" in agent_name
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Assistant chat error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Chat processing error: {str(e)}")


@router.post("/upload")
async def upload_and_analyze(
    image: UploadFile = File(...),
    text: str = Form(""),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Process medical image uploads with optional text input.
    Analyzes images using the appropriate medical vision agent.
    """
    clerk_user_id = current_user.get("sub")
    
    # Validate file type
    if not allowed_file(image.filename):
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "agent": "System",
                "response": "Unsupported file type. Allowed formats: PNG, JPG, JPEG"
            }
        )
    
    # Check file size
    file_content = await image.read()
    max_size_mb = config.api.max_image_upload_size
    if len(file_content) > max_size_mb * 1024 * 1024:
        return JSONResponse(
            status_code=413,
            content={
                "status": "error",
                "agent": "System",
                "response": f"File too large. Maximum size allowed: {max_size_mb}MB"
            }
        )
    
    # Find user
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create session
    session = None
    if session_id:
        session = db.exec(
            select(ChatSession).where(
                ChatSession.id == uuid.UUID(session_id),
                ChatSession.user_id == user.id
            )
        ).first()
    
    if not session:
        session = ChatSession(
            user_id=user.id,
            title=f"Image Analysis: {text[:30]}..." if text else "Medical Image Analysis",
            conversation_type="medical_assistant"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    
    # Save file
    filename = secure_filename(f"{uuid.uuid4()}_{image.filename}")
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    try:
        # Save user message with image
        user_message = ChatMessage(
            session_id=session.id,
            role="user",
            content=text or "Uploaded medical image for analysis",
            image_url=f"/uploads/backend/{filename}"
        )
        db.add(user_message)
        db.commit()
        
        # Process through multi-agent system with image
        query = {"text": text, "image": file_path}
        response_data = process_query(query)
        response_text = response_data['messages'][-1].content
        agent_name = response_data.get("agent_name", "UNKNOWN")
        
        # Prepare result
        result = {
            "status": "success",
            "session_id": str(session.id),
            "response": response_text,
            "agent": agent_name,
            "needs_validation": "HUMAN_VALIDATION" in agent_name
        }
        
        # Check for skin lesion segmentation output
        if "SKIN_LESION_AGENT" in agent_name:
            segmentation_path = os.path.join(SKIN_LESION_OUTPUT, "segmentation_plot.png")
            if os.path.exists(segmentation_path):
                import shutil
                # Create unique filename to prevent overwriting
                unique_img_name = f"seg_{session.id}_{uuid.uuid4().hex[:8]}.png"
                unique_img_path = os.path.join(SKIN_LESION_OUTPUT, unique_img_name)
                shutil.copy(segmentation_path, unique_img_path)
                result["result_image"] = f"/uploads/skin_lesion_output/{unique_img_name}"
        
        # Save main assistant response
        assistant_message = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=response_text
        )
        db.add(assistant_message)
        
        # Save the result image as a separate message for UI persistence
        if result.get("result_image"):
            image_message = ChatMessage(
                session_id=session.id,
                role="assistant",
                content="Analysis Result:",
                image_url=result["result_image"]
            )
            db.add(image_message)
        
        # Create medical report record
        report = MedicalReport(
            user_id=user.id,
            session_id=session.id,
            report_type=agent_name.split("_")[0].lower() if "_" in agent_name else "image",
            file_path=file_path,
            analysis_result=json.dumps({
                "agent": agent_name,
                "response": response_text[:500]  # First 500 chars
            })
        )
        db.add(report)
        
        # Update session
        session.agent_used = agent_name
        db.commit()
        
        return result
        
    except Exception as e:
        db.rollback()
        logger.error(f"Assistant upload error: {str(e)}\n{traceback.format_exc()}")
        # Clean up uploaded file on error
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Image analysis error: {str(e)}")


@router.post("/validate")
async def validate_output(
    request: AssistantValidateRequest,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Handle human validation for medical AI outputs.
    """
    clerk_user_id = current_user.get("sub")
    
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session = db.exec(
        select(ChatSession).where(
            ChatSession.id == uuid.UUID(request.session_id),
            ChatSession.user_id == user.id
        )
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # Build validation query
        validation_query = f"Validation result: {request.validation_result}"
        if request.comments:
            validation_query += f" Comments: {request.comments}"
        
        # Process validation
        response_data = process_query(validation_query)
        response_text = response_data['messages'][-1].content
        
        # Save validation message
        validation_message = ChatMessage(
            session_id=session.id,
            role="user",
            content=f"Validation: {request.validation_result}"
        )
        db.add(validation_message)
        
        # Save response
        assistant_message = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=response_text
        )
        db.add(assistant_message)
        db.commit()
        
        if request.validation_result.lower() == 'yes':
            return {
                "status": "validated",
                "message": "**Output confirmed by human validator:**",
                "response": response_text
            }
        else:
            return {
                "status": "rejected",
                "comments": request.comments,
                "message": "**Output requires further review:**",
                "response": response_text
            }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def get_assistant_sessions(
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all medical assistant sessions for the current user.
    """
    clerk_user_id = current_user.get("sub")
    
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    sessions = db.exec(
        select(ChatSession).where(
            ChatSession.user_id == user.id,
            ChatSession.conversation_type == "medical_assistant"
        ).order_by(ChatSession.created_at.desc())
    ).all()
    
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "agent_used": s.agent_used,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all messages for a specific assistant session.
    """
    clerk_user_id = current_user.get("sub")
    
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session = db.exec(
        select(ChatSession).where(
            ChatSession.id == uuid.UUID(session_id),
            ChatSession.user_id == user.id
        )
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.exec(
        select(ChatMessage).where(
            ChatMessage.session_id == session.id
        ).order_by(ChatMessage.created_at)
    ).all()
    
    return {
        "session": {
            "id": str(session.id),
            "title": session.title,
            "agent_used": session.agent_used,
            "conversation_type": session.conversation_type
        },
        "messages": [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "image_url": m.image_url,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]
    }


class SpeechRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"


@router.post("/speech")
async def generate_speech(
    request: SpeechRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate speech from text using ElevenLabs API.
    """
    try:
        from elevenlabs.client import ElevenLabs
        from fastapi.responses import StreamingResponse
        import io
        
        client = ElevenLabs(api_key=config.speech.api_key)
        
        audio = client.text_to_speech.convert(
            voice_id=request.voice_id,
            text=request.text[:1000],  # Limit text length
            model_id="eleven_multilingual_v2"
        )
        
        # Collect audio chunks
        audio_data = b"".join(list(audio))
        
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech generation failed: {str(e)}")


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Transcribe audio to text using Groq Whisper.
    """
    try:
        from groq import Groq
        import tempfile
        
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Save audio to temp file
        content = await audio.read()
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            with open(tmp_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=(audio.filename, audio_file.read()),
                    model="whisper-large-v3-turbo",
                    language="en"
                )
            
            return {"transcript": transcription.text}
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


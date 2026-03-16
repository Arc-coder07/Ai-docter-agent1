"""
Multi-Agent Medical Assistant API Endpoints
"""
import os
import io
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


def get_patient_context(user) -> str:
    """Build a patient health context string from user profile for AI personalization."""
    parts = []
    if user.name:
        parts.append(f"Name: {user.name}")
    if user.gender:
        parts.append(f"Gender: {user.gender}")
    if user.date_of_birth:
        parts.append(f"Date of Birth: {user.date_of_birth}")
    if user.blood_group:
        parts.append(f"Blood Group: {user.blood_group}")
    if user.height_cm and user.weight_kg:
        bmi = round(user.weight_kg / ((user.height_cm / 100) ** 2), 1)
        parts.append(f"Height: {user.height_cm}cm, Weight: {user.weight_kg}kg, BMI: {bmi}")
    if user.allergies:
        parts.append(f"Known Allergies: {user.allergies}")
    if user.chronic_conditions:
        parts.append(f"Chronic Conditions: {user.chronic_conditions}")
    if user.current_medications:
        parts.append(f"Current Medications: {user.current_medications}")
    return "\n".join(parts) if parts else ""

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
        
        # Process through multi-agent system with patient context
        patient_context = get_patient_context(user)
        response_data = process_query(
            request.message,
            user_id=clerk_user_id,
            patient_context=patient_context
        )
        response_text = response_data['messages'][-1].content
        agent_name = response_data.get("agent_name", "UNKNOWN")
        
        # Save assistant response
        assistant_message = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=response_text,
            agent=agent_name
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
        patient_context = get_patient_context(user)
        response_data = process_query(
            query,
            user_id=clerk_user_id,
            patient_context=patient_context
        )
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
            content=response_text,
            agent=agent_name
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
        patient_context = get_patient_context(user)
        response_data = process_query(
            validation_query,
            user_id=clerk_user_id,
            patient_context=patient_context
        )
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
            content=response_text,
            agent="HUMAN_VALIDATED"
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


@router.get("/sessions/{session_id}/download-report")
async def download_diagnosis_report(
    session_id: str,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate and download a PDF diagnosis report for an image analysis session.
    """
    from app.agents.report_generator.diagnosis_report import (
        build_report_from_user_and_session,
        generate_diagnosis_pdf,
    )
    from fastapi.responses import StreamingResponse

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

    # Only allow report download for image analysis sessions
    image_agents = ["BRAIN_TUMOR_AGENT", "CHEST_XRAY_AGENT", "SKIN_LESION_AGENT"]
    if not any(agent in (session.agent_used or "") for agent in image_agents):
        raise HTTPException(status_code=400, detail="Reports are only available for image analysis sessions")

    # Get the analysis result from the session's assistant messages
    messages = db.exec(
        select(ChatMessage).where(
            ChatMessage.session_id == session.id,
            ChatMessage.role == "assistant"
        ).order_by(ChatMessage.created_at)
    ).all()

    analysis_text = "\n".join(m.content for m in messages if m.content) if messages else "No analysis available."

    # Get the uploaded image path from the medical report record
    report_record = db.exec(
        select(MedicalReport).where(
            MedicalReport.session_id == session.id
        )
    ).first()
    image_path = report_record.file_path if report_record else ""

    # Check for heatmap (generated by X-ray agent)
    heatmap_path = ""
    if "CHEST_XRAY_AGENT" in (session.agent_used or "") and image_path:
        # The xray_detector generates a heatmap in the same directory
        possible_heatmap = os.path.join(os.path.dirname(image_path), "gradcam_heatmap.png")
        if os.path.exists(possible_heatmap):
            heatmap_path = possible_heatmap

    # Build and generate
    report = build_report_from_user_and_session(
        user=user,
        session=session,
        analysis_result=analysis_text,
        image_path=image_path,
        heatmap_path=heatmap_path,
    )
    pdf_bytes = generate_diagnosis_pdf(report)

    filename = f"MedSage_Report_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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
            "summary": s.summary,
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
            "conversation_type": session.conversation_type,
            "summary": session.summary
        },
        "messages": [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "image_url": m.image_url,
                "agent": m.agent,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]
    }


@router.post("/sessions/{session_id}/summarize")
async def summarize_session(
    session_id: str,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate an AI clinical summary for a chat session using Gemini Flash.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import SystemMessage, HumanMessage
    
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
    
    if not messages:
        return {"summary": "No messages in session to summarize."}
        
    # Format messages
    conversation = "\n".join([f"{m.role}: {m.content}" for m in messages if m.content])
    
    # Init Gemini
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.3
        )
        
        prompt = [
            SystemMessage(content="You are a medical scribe. Summarize the following medical consultation or assistant interaction. Keep it concise, highlighting the patient's main concern, any symptoms discussed, the AI's assessment/advice, and next steps. Do not use more than 3-4 sentences. Format as a clinical summary paragraph."),
            HumanMessage(content=f"Conversation Transcript:\n{conversation}")
        ]
        
        response = llm.invoke(prompt)
        summary = response.content
        
        # Save to DB
        session.summary = summary
        db.add(session)
        db.commit()
        
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")


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
        
        client = ElevenLabs(api_key=config.speech.eleven_labs_api_key)
        
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


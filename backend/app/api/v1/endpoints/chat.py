from google import genai
from google.genai import types
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import uuid

from app.db.engine import get_session
from app.core.config import get_settings
from app.core.auth import get_current_user
from app.models import ChatSession, ChatMessage, User
from app.schemas import ChatRequest, SuggestDoctorRequest

settings = get_settings()
router = APIRouter()

# Configure Gemini with new SDK
client = genai.Client(api_key=settings.GEMINI_API_KEY)

@router.post("/suggest-doctors")
async def suggest_doctors(request: SuggestDoctorRequest):
    """
    Suggests a specialist doctor based on user symptoms.
    Uses keyword matching based on the original AIDoctorAgents list.
    """
    symptoms = request.notes.lower()
    
    # Comprehensive symptom-to-specialist mapping based on original list
    specialist_mappings = [
        {
            "keywords": ["child", "baby", "infant", "kid", "toddler", "pediatric", "fever child", "vaccination"],
            "specialist": "Pediatrician",
            "description": "Expert in children's health, from babies to teens.",
            "image": "/doctor2.png"
        },
        {
            "keywords": ["skin", "rash", "acne", "eczema", "itching", "derma", "pimple", "allergy skin", "psoriasis", "hives"],
            "specialist": "Dermatologist",
            "description": "Handles skin issues like rashes, acne, or infections.",
            "image": "/doctor3.png"
        },
        {
            "keywords": ["stress", "anxiety", "depression", "mental", "sleep", "insomnia", "panic", "mood", "sad", "emotional", "therapy", "psychology"],
            "specialist": "Psychologist",
            "description": "Supports mental health and emotional well-being.",
            "image": "/doctor4.png"
        },
        {
            "keywords": ["diet", "weight", "nutrition", "obesity", "eating", "calorie", "fat", "vitamin", "protein", "meal plan"],
            "specialist": "Nutritionist",
            "description": "Provides advice on healthy eating and weight management.",
            "image": "/doctor5.png"
        },
        {
            "keywords": ["heart", "chest pain", "blood pressure", "bp", "cardiac", "palpitation", "cholesterol", "artery", "cardiovascular"],
            "specialist": "Cardiologist",
            "description": "Focuses on heart health and blood pressure issues.",
            "image": "/doctor6.png"
        },
        {
            "keywords": ["ear", "nose", "throat", "sinus", "cold", "cough", "hearing", "tonsil", "snoring", "voice", "ent"],
            "specialist": "ENT Specialist",
            "description": "Handles ear, nose, and throat-related problems.",
            "image": "/doctor7.png"
        },
        {
            "keywords": ["bone", "joint", "muscle", "back pain", "spine", "fracture", "arthritis", "knee", "shoulder", "orthopedic", "sprain"],
            "specialist": "Orthopedic",
            "description": "Helps with bone, joint, and muscle pain.",
            "image": "/doctor8.png"
        },
        {
            "keywords": ["period", "menstrual", "pregnancy", "pregnant", "gynec", "uterus", "ovary", "hormonal", "pcos", "menopause", "women health"],
            "specialist": "Gynecologist",
            "description": "Cares for women's reproductive and hormonal health.",
            "image": "/doctor9.png"
        },
        {
            "keywords": ["tooth", "teeth", "dental", "gum", "cavity", "mouth", "oral", "toothache", "wisdom tooth", "braces"],
            "specialist": "Dentist",
            "description": "Handles oral hygiene and dental problems.",
            "image": "/doctor10.png"
        }
    ]
    
    # Check each specialist's keywords against symptoms
    for mapping in specialist_mappings:
        for keyword in mapping["keywords"]:
            if keyword in symptoms:
                return {
                    "specialist": mapping["specialist"],
                    "description": mapping["description"],
                    "image": mapping["image"]
                }
    
    # Default to General Physician if no specific match
    return {
        "specialist": "General Physician",
        "description": "Helps with everyday health concerns and common symptoms.",
        "image": "/doctor1.png"
    }

@router.post("/")
async def chat_endpoint(
    request: ChatRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Validate request
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")

    clerk_user_id = claims["sub"]

    # 1. Sync User with Race Condition Protection
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    
    if not user:
        try:
            # Create new user
            # TODO: Fetch real email/name from Clerk via API using token
            user = User(clerk_id=clerk_user_id, email=f"{clerk_user_id}@placeholder.com", name="New User")
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception: # sqlalchemy.exc.IntegrityError
            db.rollback()
            # Retry fetch
            statement = select(User).where(User.clerk_id == clerk_user_id)
            user = db.exec(statement).first()
            if not user:
                raise HTTPException(status_code=500, detail="Failed to create or retrieve user")
        
    # 2. Manage Session
    session_id = request.sessionId
    chat_session = None
    
    if session_id:
        # Resume existing
        try:
             statement = select(ChatSession).where(ChatSession.id == uuid.UUID(session_id))
             chat_session = db.exec(statement).first()
        except ValueError:
             pass # Invalid UUID

    if not chat_session:
        # Create new session
        chat_session = ChatSession(
            user_id=user.id,
            title=request.messages[0].content[:30] # Safe now
        )
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)
    
    # 3. Save User Message
    user_msg_content = request.messages[-1].content # Safe now
    user_msg = ChatMessage(
        session_id=chat_session.id,
        role="user",
        content=user_msg_content
    )
    db.add(user_msg)
    db.commit()
    
    # 4. Process AI Response
    try:
        # Build conversation history for the new SDK
        contents = []
        for msg in request.messages[:-1]:
            role = "user" if msg.role == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(msg.content)]))
        
        # Add current user message
        contents.append(types.Content(role="user", parts=[types.Part.from_text(user_msg_content)]))
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents
        )
        ai_text = response.text
    except Exception as e:
        # Rollback or cleanup if needed? 
        # We already committed the user message (which is fine, it was sent).
        # We just warn the user.
        print(f"AI Error: {e}")
        raise HTTPException(status_code=503, detail="AI Service currently unavailable")
    
    # 5. Save AI Message
    ai_msg = ChatMessage(
         session_id=chat_session.id,
         role="assistant",
         content=ai_text
    )
    db.add(ai_msg)
    db.commit()
    
    return {
        "reply": ai_text,
        "sessionId": str(chat_session.id)
    }

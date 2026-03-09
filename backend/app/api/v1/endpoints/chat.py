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

def _local_symptom_analysis(notes: str) -> str:
    """
    Intelligent local fallback for symptom-to-specialist matching.
    Uses weighted scoring so condition-specific terms beat ambiguous body parts.
    E.g., "blackheads on nose" → Dermatologist (blackhead=3pts) beats ENT (nose=1pt).
    """
    text = notes.lower()

    # (keyword, weight) — higher weight = more specific to that specialty
    specialist_rules: list[tuple[str, list[tuple[str, int]]]] = [
        ("Dermatologist", [
            ("blackhead", 3), ("whitehead", 3), ("acne", 3), ("pimple", 3),
            ("eczema", 3), ("psoriasis", 3), ("hives", 3), ("rash", 3),
            ("derma", 3), ("itching", 2), ("skin", 2), ("mole", 2),
            ("blister", 2), ("sunburn", 2), ("fungal", 2), ("ringworm", 3),
            ("dandruff", 2), ("dry skin", 2), ("oily skin", 2),
        ]),
        ("Cardiologist", [
            ("chest pain", 3), ("heart attack", 3), ("cardiac", 3),
            ("palpitation", 3), ("arrhythmia", 3), ("cardiovascular", 3),
            ("blood pressure", 2), ("cholesterol", 2), ("heart", 2),
            ("angina", 3), ("shortness of breath", 2), ("bp", 1),
        ]),
        ("Pediatrician", [
            ("child", 2), ("baby", 3), ("infant", 3), ("toddler", 3),
            ("pediatric", 3), ("kid", 2), ("newborn", 3), ("my son", 2),
            ("my daughter", 2), ("vaccination", 2),
        ]),
        ("Psychologist", [
            ("anxiety", 3), ("depression", 3), ("panic attack", 3),
            ("mental health", 3), ("stress", 2), ("insomnia", 2),
            ("suicidal", 3), ("self harm", 3), ("therapy", 2),
            ("mood", 2), ("emotional", 1), ("sad", 1), ("lonely", 2),
        ]),
        ("Orthopedic", [
            ("fracture", 3), ("sprain", 3), ("arthritis", 3),
            ("back pain", 3), ("spine", 3), ("orthopedic", 3),
            ("bone", 2), ("joint", 2), ("knee pain", 3), ("shoulder pain", 3),
            ("muscle pain", 2), ("ligament", 3),
        ]),
        ("ENT Specialist", [
            ("ear infection", 3), ("tonsil", 3), ("sinus", 3),
            ("hearing loss", 3), ("snoring", 3), ("sore throat", 3),
            ("throat pain", 3), ("ear pain", 3), ("nasal congestion", 3),
            ("cold", 1), ("cough", 1), ("ear", 1), ("nose", 1), ("throat", 1),
        ]),
        ("Gynecologist", [
            ("period", 2), ("menstrual", 3), ("pregnancy", 3), ("pregnant", 3),
            ("pcos", 3), ("ovary", 3), ("uterus", 3), ("menopause", 3),
            ("gynec", 3), ("hormonal", 2), ("vaginal", 3), ("breast", 2),
        ]),
        ("Nutritionist", [
            ("diet", 2), ("nutrition", 3), ("obesity", 3), ("weight loss", 3),
            ("weight gain", 3), ("calorie", 2), ("vitamin deficiency", 3),
            ("protein", 1), ("meal plan", 3), ("eating disorder", 3),
        ]),
        ("Dentist", [
            ("tooth", 3), ("teeth", 3), ("dental", 3), ("cavity", 3),
            ("toothache", 3), ("gum", 2), ("braces", 3), ("wisdom tooth", 3),
            ("oral", 2), ("mouth ulcer", 3), ("bad breath", 2),
        ]),
    ]

    # Score each specialist
    scores: dict[str, int] = {}
    for specialist, keywords in specialist_rules:
        score = 0
        for keyword, weight in keywords:
            if keyword in text:
                score += weight
        if score > 0:
            scores[specialist] = score

    if not scores:
        return "General Physician"

    # Return the specialist with highest score
    return max(scores, key=scores.get)  # type: ignore


@router.post("/suggest-doctors")
async def suggest_doctors(request: SuggestDoctorRequest):
    """
    Suggests a specialist doctor based on user symptoms.
    Uses Gemini AI for intelligent, context-aware symptom analysis.
    """
    # The exact specialist names that exist in the frontend AIDoctorAgents list
    valid_specialists = [
        "General Physician",
        "Pediatrician",
        "Dermatologist",
        "Psychologist",
        "Nutritionist",
        "Cardiologist",
        "ENT Specialist",
        "Orthopedic",
        "Gynecologist",
        "Dentist",
    ]

    prompt = f"""You are a medical triage assistant. Based on the patient's symptoms below, 
determine which specialist doctor they should consult.

Patient's symptoms: "{request.notes}"

You MUST respond with EXACTLY ONE of these specialist names (no other text):
{chr(10).join(f'- {s}' for s in valid_specialists)}

Rules:
- Consider the MEDICAL CONTEXT, not just individual words.
- "blackheads on nose" is a SKIN issue → Dermatologist (not ENT just because "nose" appears).
- "chest pain" → Cardiologist
- "child with fever" → Pediatrician
- If symptoms don't clearly match a specialist, choose "General Physician".
- Respond with ONLY the specialist name, nothing else."""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        suggested = response.text.strip().strip('"').strip("'")

        # Validate the response is a known specialist
        matched = None
        for spec in valid_specialists:
            if spec.lower() == suggested.lower():
                matched = spec
                break

        if not matched:
            # Fuzzy fallback: check if the AI response contains a valid specialist name
            for spec in valid_specialists:
                if spec.lower() in suggested.lower():
                    matched = spec
                    break

        if not matched:
            matched = "General Physician"

    except Exception as e:
        print(f"Gemini suggest-doctors error: {e}")
        # Intelligent local fallback using weighted keyword scoring
        matched = _local_symptom_analysis(request.notes)

    # Map specialist name to image and description
    specialist_info = {
        "General Physician": {"description": "Helps with everyday health concerns and common symptoms.", "image": "/doctor1.png"},
        "Pediatrician": {"description": "Expert in children's health, from babies to teens.", "image": "/doctor2.png"},
        "Dermatologist": {"description": "Handles skin issues like rashes, acne, or infections.", "image": "/doctor3.png"},
        "Psychologist": {"description": "Supports mental health and emotional well-being.", "image": "/doctor4.png"},
        "Nutritionist": {"description": "Provides advice on healthy eating and weight management.", "image": "/doctor5.png"},
        "Cardiologist": {"description": "Focuses on heart health and blood pressure issues.", "image": "/doctor6.png"},
        "ENT Specialist": {"description": "Handles ear, nose, and throat-related problems.", "image": "/doctor7.png"},
        "Orthopedic": {"description": "Helps with bone, joint, and muscle pain.", "image": "/doctor8.png"},
        "Gynecologist": {"description": "Cares for women's reproductive and hormonal health.", "image": "/doctor9.png"},
        "Dentist": {"description": "Handles oral hygiene and dental problems.", "image": "/doctor10.png"},
    }

    info = specialist_info.get(matched, specialist_info["General Physician"])

    return {
        "specialist": matched,
        "description": info["description"],
        "image": info["image"],
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
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))
        
        # Add current user message
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_msg_content)]))
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents
        )
        ai_text = response.text
    except Exception as e:
        # Graceful fallback: session was already created above.
        # Return sessionId so the user can still navigate to the voice agent.
        print(f"AI Error (falling back): {e}")
        ai_text = "I'm ready to help. Please start the voice consultation to speak with me directly."

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

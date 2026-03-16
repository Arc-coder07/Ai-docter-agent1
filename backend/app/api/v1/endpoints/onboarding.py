"""
API endpoints for user onboarding — role selection and profile setup.
"""

import os
import httpx
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")


# ──────────────────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────────────────

class PatientOnboardingRequest(BaseModel):
    name: str
    date_of_birth: str          # YYYY-MM-DD (required)
    gender: str                 # male, female, other (required)
    blood_group: str            # A+, A-, B+, etc. (required)
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────

async def set_clerk_role(clerk_user_id: str, role: str):
    """Set the user's role in Clerk publicMetadata."""
    if not CLERK_SECRET_KEY:
        print("[Onboarding] CLERK_SECRET_KEY not set, skipping metadata update")
        return

    url = f"https://api.clerk.com/v1/users/{clerk_user_id}"
    headers = {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "public_metadata": {"role": role}
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.patch(url, json=payload, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                print(f"[Onboarding] Set Clerk role={role} for user {clerk_user_id}")
            else:
                print(f"[Onboarding] Clerk API error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[Onboarding] Failed to set Clerk role: {e}")


def get_or_create_user(clerk_user_id: str, db: Session) -> User:
    """Get existing user or create a stub."""
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        user = User(clerk_id=clerk_user_id, email=f"{clerk_user_id}@placeholder.local")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# ──────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────

@router.get("/status")
async def onboarding_status(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Check if user has completed onboarding."""
    clerk_user_id = claims["sub"]
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()

    if not user or not user.role:
        return {"onboarded": False, "role": None}

    return {
        "onboarded": True,
        "role": user.role,
        "name": user.name,
    }


@router.post("/patient")
async def onboard_patient(
    request: PatientOnboardingRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Complete patient onboarding — save health profile and set role."""
    clerk_user_id = claims["sub"]
    user = get_or_create_user(clerk_user_id, db)

    if user.role:
        raise HTTPException(status_code=400, detail="User already onboarded")

    # Update user with patient profile
    user.name = request.name
    user.role = "patient"
    user.date_of_birth = request.date_of_birth
    user.gender = request.gender
    user.blood_group = request.blood_group
    user.height_cm = request.height_cm
    user.weight_kg = request.weight_kg
    user.allergies = request.allergies
    user.chronic_conditions = request.chronic_conditions
    user.current_medications = request.current_medications
    user.emergency_contact_name = request.emergency_contact_name
    user.emergency_contact_phone = request.emergency_contact_phone

    # Update email from Clerk claims if available
    email = claims.get("email")
    if email:
        user.email = email

    db.add(user)
    db.commit()
    db.refresh(user)

    # Set role in Clerk metadata
    await set_clerk_role(clerk_user_id, "patient")

    return {
        "message": "Patient onboarding complete",
        "role": "patient",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.get("/profile")
async def get_patient_profile(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get the current user's patient profile."""
    clerk_user_id = claims["sub"]
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "date_of_birth": user.date_of_birth,
        "gender": user.gender,
        "blood_group": user.blood_group,
        "height_cm": user.height_cm,
        "weight_kg": user.weight_kg,
        "allergies": user.allergies,
        "chronic_conditions": user.chronic_conditions,
        "current_medications": user.current_medications,
        "emergency_contact_name": user.emergency_contact_name,
        "emergency_contact_phone": user.emergency_contact_phone,
    }

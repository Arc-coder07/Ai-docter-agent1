"""
API endpoints for Chest X-ray Pneumonia Detection.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select, desc
from typing import Optional
import uuid
import os
from datetime import datetime

from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models import User
from app.models.xray_scan import XrayScan
from app.agents.xray_detection.xray_detector import detector

router = APIRouter()

# Directory for uploaded X-ray images
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "xrays")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/predict")
async def predict_pneumonia(
    file: UploadFile = File(...),
    patient_name: Optional[str] = Form(None),
    patient_age: Optional[int] = Form(None),
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Upload a chest X-ray image for pneumonia detection.
    Returns diagnosis, confidence, and recommendation.
    """
    clerk_user_id = claims["sub"]

    # Verify user
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, etc.)"
        )

    # Check file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size too large. Maximum 10MB allowed."
        )

    try:
        # Save uploaded file
        file_ext = os.path.splitext(file.filename or "xray.jpg")[1] or ".jpg"
        saved_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)

        with open(file_path, "wb") as f:
            f.write(contents)

        # Run prediction
        result = detector.predict(contents)

        # Save to database
        scan = XrayScan(
            user_id=user.id,
            file_name=file.filename or "unknown",
            file_path=f"/uploads/xrays/{saved_filename}",
            patient_name=patient_name,
            patient_age=patient_age,
            diagnosis=result["diagnosis"],
            confidence=result["confidence"],
            confidence_level=result["confidence_level"],
            recommendation=result["recommendation"],
            raw_score=result["raw_score"]
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        # Return response
        return {
            "id": str(scan.id),
            "diagnosis": result["diagnosis"],
            "confidence": result["confidence"],
            "confidence_level": result["confidence_level"],
            "recommendation": result["recommendation"],
            "raw_score": result["raw_score"],
            "image_size": result.get("image_size"),
            "patient_name": patient_name,
            "patient_age": patient_age,
            "file_name": file.filename,
            "validation_metrics": result["validation_metrics"],
            "disclaimer": result["disclaimer"],
            "created_at": scan.created_at.isoformat()
        }

    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/history")
async def get_scan_history(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get user's X-ray scan history."""
    clerk_user_id = claims["sub"]

    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    if not user:
        return []

    statement = select(XrayScan).where(
        XrayScan.user_id == user.id
    ).order_by(desc(XrayScan.created_at))
    scans = db.exec(statement).all()

    return [
        {
            "id": str(s.id),
            "file_name": s.file_name,
            "patient_name": s.patient_name,
            "patient_age": s.patient_age,
            "diagnosis": s.diagnosis,
            "confidence": s.confidence,
            "confidence_level": s.confidence_level,
            "recommendation": s.recommendation,
            "created_at": s.created_at.isoformat()
        }
        for s in scans
    ]


@router.get("/stats")
async def get_model_stats():
    """Get model performance statistics from cross-operator validation."""
    return detector.get_stats()


@router.get("/{scan_id}")
async def get_scan_detail(
    scan_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get details of a specific X-ray scan."""
    clerk_user_id = claims["sub"]

    try:
        scan_uuid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID")

    statement = select(XrayScan).where(XrayScan.id == scan_uuid)
    scan = db.exec(statement).first()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Verify ownership
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()

    if not user or scan.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "id": str(scan.id),
        "file_name": scan.file_name,
        "file_path": scan.file_path,
        "patient_name": scan.patient_name,
        "patient_age": scan.patient_age,
        "diagnosis": scan.diagnosis,
        "confidence": scan.confidence,
        "confidence_level": scan.confidence_level,
        "recommendation": scan.recommendation,
        "raw_score": scan.raw_score,
        "created_at": scan.created_at.isoformat()
    }

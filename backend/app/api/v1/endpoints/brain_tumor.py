"""
API endpoints for Brain Tumor MRI Detection using Advanced CDSS.
Includes ensemble prediction, XAI heatmaps, uncertainty, and history.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlmodel import Session, select, desc
from typing import Optional
import uuid
import os
import json
from datetime import datetime

from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models import User
from app.models.brain_tumor_scan import BrainTumorScan
from app.agents.brain_tumor_detection.brain_tumor_detector import detector 


import logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Directory for uploaded MRI images
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "brain_mri")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Accepted content types
ACCEPTED_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
                  'application/dicom', 'application/octet-stream'}


@router.post("/predict")
async def predict_brain_tumor(
    file: UploadFile = File(...),
    patient_name: Optional[str] = Form(None),
    patient_age: Optional[int] = Form(None),
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Upload a Brain MRI image for tumor detection.
    Returns highly detailed analysis with CDSS, XAI, and Uncertainty.
    """
    clerk_user_id = claims["sub"]

    # Verify user
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type
    is_dicom = (file.filename or "").lower().endswith('.dcm')
    if not is_dicom:
        if not file.content_type or not (
            file.content_type.startswith('image/') or
            file.content_type in ACCEPTED_TYPES
        ):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (JPEG, PNG) or DICOM (.dcm) file"
            )

    # Read and check file size (max 20MB)
    contents: bytes = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size too large. Maximum 20MB allowed."
        )

    try:
        # Save uploaded file
        file_ext = os.path.splitext(file.filename or "mri.jpg")[1] or ".jpg"
        saved_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)

        with open(file_path, "wb") as f:
            f.write(contents)

        # Run prediction
        result = detector.predict(contents)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        # Transform flat Space result back to nested structure expected by frontend
        diagnosis = result.get("prediction", "Unknown")
        confidence = result.get("confidence", 0.0)
        probabilities = result.get("probabilities", {})
        winning_model = result.get("winning_model", "Ensemble")
        
        cdss_data = result.get("cdss", {})
        cdss_score = cdss_data.get("cdss_score", 0.0)
        risk_level = cdss_data.get("reliability", "LOW")
        
        uncertainty_data = result.get("uncertainty", {})
        total_uncertainty = uncertainty_data.get("uncertainty_std", 0.0)
        
        robustness_data = result.get("robustness", {})
        robustness_score = robustness_data.get("robustness_score", 0.0)
        
        robustness_tests = {}
        for test_name, test_data in robustness_data.items():
            if isinstance(test_data, dict) and "consistent" in test_data:
                robustness_tests[test_name] = {
                    "combined": test_data.get("confidence", 0.0),
                    "pred_stable": test_data.get("consistent", True)
                }
        
        xai_heatmaps = result.get("xai_heatmaps", {})

        # Save to database
        scan = BrainTumorScan(
            user_id=user.id,
            file_name=file.filename or "unknown",
            file_path=f"/uploads/brain_mri/{saved_filename}",
            patient_name=patient_name,
            patient_age=patient_age,
            diagnosis=diagnosis,
            confidence=confidence,
            confidence_level=risk_level,
            recommendation=f"CDSS Reliability: {risk_level}",
            cdss_score=cdss_score,
            uncertainty_total=total_uncertainty,
            robustness_score=robustness_score,
            xai_data_json=json.dumps(xai_heatmaps),
            probabilities_json=json.dumps(probabilities)
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        # Build frontend response
        frontend_response = {
            "id": str(scan.id),
            "success": True,
            "prediction": {
                "class": diagnosis,
                "confidence": confidence,
                "confidence_level": risk_level,
                "probabilities": probabilities,
                "model_used": winning_model
            },
            "cdss": {
                "score": cdss_score,
                "risk_level": risk_level,
                "action": f"Model Reliability: {risk_level}",
                "components": cdss_data.get("components", {})
            },
            "uncertainty": {
                "total_uncertainty": total_uncertainty,
                "epistemic": uncertainty_data.get("predictive_entropy", 0.0),
                "aleatoric": total_uncertainty / 2.0,
                "needs_review": total_uncertainty > 0.15
            },
            "xai": {
                "levels": {
                    "level1_detection": {
                        "name": "Lesion Localization",
                        "question": "Where is the abnormality?",
                        "heatmap": xai_heatmaps.get("gradcam", "")
                    },
                    "level2_features": {
                        "name": "Feature Extraction",
                        "question": "What features stand out?",
                        "heatmap": xai_heatmaps.get("gradcam_pp", "")
                    },
                    "level3_cellular": {
                        "name": "Deep Representations",
                        "question": "Which patterns influenced the decision?",
                        "heatmap": xai_heatmaps.get("layercam", "")
                    }
                }
            },
            "robustness": {
                "overall_score": robustness_score,
                "tests": robustness_tests
            },
            "created_at": scan.created_at.isoformat(),
            "file_name": file.filename
        }
        return frontend_response

    except RuntimeError as e:
        import traceback
        logger.error(f"RuntimeError in predict_brain_tumor: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Exception in predict_brain_tumor: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/history")
async def get_scan_history(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get user's Brain Tumor MRI scan history."""
    clerk_user_id = claims["sub"]

    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    if not user:
        return []

    statement = select(BrainTumorScan).where(
        BrainTumorScan.user_id == user.id
    ).order_by(desc(BrainTumorScan.created_at))
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
            "cdss_score": s.cdss_score,
            "created_at": s.created_at.isoformat()
        }
        for s in scans
    ]


@router.get("/{scan_id}")
async def get_scan_detail(
    scan_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get details of a specific MRI scan."""
    clerk_user_id = claims["sub"]

    try:
        scan_uuid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID")

    statement = select(BrainTumorScan).where(BrainTumorScan.id == scan_uuid)
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
        "cdss_score": scan.cdss_score,
        "uncertainty_total": scan.uncertainty_total,
        "robustness_score": scan.robustness_score,
        "xai": json.loads(scan.xai_data_json) if scan.xai_data_json else None,
        "probabilities": json.loads(scan.probabilities_json) if scan.probabilities_json else None,
        "created_at": scan.created_at.isoformat()
    }

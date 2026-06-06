"""
API endpoints for Chest X-ray Pneumonia Detection.
Includes prediction, heatmap generation, PDF report, and scan history.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
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
from app.agents.xray_detection.pdf_report import generate_medical_pdf_report

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Directory for uploaded X-ray images
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "xrays")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Accepted content types (includes DICOM)
ACCEPTED_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
                  'application/dicom', 'application/octet-stream'}


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
    Supports JPEG, PNG, and DICOM (.dcm) formats.
    Returns diagnosis, confidence, recommendation, and AI focus heatmap.
    """
    clerk_user_id = claims["sub"]

    # Verify user
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type (allow DICOM and images)
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

    # Read and check file size (max 10MB)
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
        result = detector.predict(contents, filename=file.filename or "")
        
        if "error" in result:
            raise RuntimeError(result["error"])

        # Generate heatmap (base64 encoded)
        try:
            heatmap_b64 = detector.generate_heatmap_base64(contents, filename=file.filename or "")
        except Exception as e:
            logger.warning(f"Heatmap generation failed: {e}")
            heatmap_b64 = None

        # Save to database
        scan = XrayScan(
            user_id=user.id,
            file_name=file.filename or "unknown",
            file_path=f"/uploads/xrays/{saved_filename}",
            patient_name=patient_name,
            patient_age=patient_age,
            diagnosis=result.get("diagnosis", "Unknown"),
            confidence=result.get("confidence", 0.0),
            confidence_level=result.get("confidence_level", "Unknown"),
            recommendation=result.get("recommendation", ""),
            raw_score=result.get("raw_score", 0.0)
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        # Return response with heatmap
        return {
            "id": str(scan.id),
            "diagnosis": result.get("diagnosis", "Unknown"),
            "confidence": result.get("confidence", 0.0),
            "confidence_level": result.get("confidence_level", "Unknown"),
            "recommendation": result.get("recommendation", ""),
            "raw_score": result.get("raw_score", 0.0),
            "image_size": result.get("image_size"),
            "analysis_time": result.get("analysis_time", 0),
            "patient_name": patient_name,
            "patient_age": patient_age,
            "file_name": file.filename,
            "heatmap_base64": heatmap_b64,
            "validation_metrics": result.get("validation_metrics", {}),
            "disclaimer": result.get("disclaimer", "This AI system is for preliminary screening only. Always consult qualified healthcare professionals."),
            "created_at": scan.created_at.isoformat()
        }

    except RuntimeError as e:
        import traceback
        logger.error(f"RuntimeError in predict_pneumonia: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Exception in predict_pneumonia: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/heatmap/{scan_id}")
async def generate_heatmap(
    scan_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Generate or regenerate AI Focus heatmap for an existing scan."""
    clerk_user_id = claims["sub"]

    try:
        scan_uuid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID")

    # Get scan and verify ownership
    scan = db.exec(select(XrayScan).where(XrayScan.id == scan_uuid)).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user or scan.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Read the saved image file
    full_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        scan.file_path.lstrip('/')
    )

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Original image file not found")

    with open(full_path, 'rb') as f:
        image_bytes = f.read()

    try:
        heatmap_b64 = detector.generate_heatmap_base64(image_bytes, filename=scan.file_name)
        return {"heatmap_base64": heatmap_b64, "scan_id": scan_id}
    except Exception as e:
        logger.error(f"Heatmap generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {e}")


@router.get("/report/{scan_id}")
async def generate_report(
    scan_id: str,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Generate a downloadable PDF medical report for a scan."""
    clerk_user_id = claims["sub"]

    try:
        scan_uuid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID")

    # Get scan and verify ownership
    scan = db.exec(select(XrayScan).where(XrayScan.id == scan_uuid)).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user or scan.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Try to load original image and generate heatmap
    original_image = None
    heatmap_image = None

    full_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        scan.file_path.lstrip('/')
    )

    if os.path.exists(full_path):
        from PIL import Image
        with open(full_path, 'rb') as f:
            image_bytes = f.read()

        try:
            if scan.file_name.lower().endswith('.dcm'):
                from app.agents.xray_detection.xray_detector import dicom_to_pil_image
                original_image = dicom_to_pil_image(image_bytes)
            else:
                original_image = Image.open(full_path)

            # Generate heatmap image for PDF
            heatmap_image = detector.generate_heatmap(image_bytes, filename=scan.file_name)
        except Exception as e:
            logger.warning(f"Could not load images for report: {e}")

    try:
        pdf_bytes = generate_medical_pdf_report(
            diagnosis=scan.diagnosis,
            confidence=scan.confidence,
            confidence_level=scan.confidence_level,
            recommendation=scan.recommendation,
            raw_score=scan.raw_score,
            patient_name=scan.patient_name,
            patient_age=scan.patient_age,
            original_image=original_image,
            heatmap_image=heatmap_image,
        )

        filename = f"MedSage_Xray_Report_{scan_id[:8]}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")


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

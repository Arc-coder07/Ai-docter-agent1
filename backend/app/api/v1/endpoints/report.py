"""
Health Report Analysis API Endpoints
"""
import os
import uuid
import logging
import traceback
from typing import Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends  # pyre-ignore[21]
from fastapi.responses import JSONResponse  # pyre-ignore[21]
from pydantic import BaseModel  # pyre-ignore[21]
from sqlmodel import Session, select  # pyre-ignore[21]

from app.core.auth import get_current_user  # pyre-ignore[21]
from app.db.engine import get_session  # pyre-ignore[21]
from app.models import User, HealthReport, HealthReportMessage  # pyre-ignore[21]
from app.agents.report_analysis import AnalysisAgent, ReportChatAgent  # pyre-ignore[21]
from app.agents.report_analysis.pdf_utils import extract_text_from_pdf  # pyre-ignore[21]

router = APIRouter()

# Initialize agents (lazy loading)
_analysis_agent: Optional[AnalysisAgent] = None
_chat_agent: Optional[ReportChatAgent] = None


def get_analysis_agent() -> AnalysisAgent:
    global _analysis_agent
    if _analysis_agent is None:
        _analysis_agent = AnalysisAgent()
    return _analysis_agent


def get_chat_agent() -> ReportChatAgent:
    global _chat_agent
    if _chat_agent is None:
        _chat_agent = ReportChatAgent()
    return _chat_agent


class ReportChatRequest(BaseModel):
    report_id: str
    message: str
    

class ReportChatResponse(BaseModel):
    response: str
    

@router.post("/analyze")
async def analyze_report(
    file: UploadFile = File(...),
    patient_name: Optional[str] = Form(None),
    patient_age: Optional[int] = Form(None),
    patient_gender: Optional[str] = Form(None),
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and analyze a blood report PDF.
    
    Returns the AI-generated analysis and report ID for follow-up chat.
    """
    clerk_user_id = current_user.get("sub")
    
    # Find user
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Read file content
    file_content = await file.read()
    
    # Extract text from PDF
    extracted = extract_text_from_pdf(file_content, file.filename or "report.pdf")
    
    if isinstance(extracted, dict) and "error" in extracted:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "error": extracted["error"]}
        )
    
    report_text = extracted
    
    try:
        # Analyze report
        agent = get_analysis_agent()
        result = agent.analyze_report(
            report_text=report_text,
            patient_name=patient_name,
            age=patient_age,
            gender=patient_gender
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500, 
                detail=result.get("error", "Analysis failed")
            )
        
        # Save to database
        health_report = HealthReport(
            user_id=user.id,
            file_name=file.filename or "report.pdf",
            patient_name=patient_name,
            patient_age=patient_age,
            patient_gender=patient_gender,
            report_text=report_text,
            analysis=result["content"],
            model_used=result.get("model_used")
        )
        db.add(health_report)
        db.commit()
        db.refresh(health_report)
        
        return {
            "status": "success",
            "report_id": str(health_report.id),
            "analysis": result["content"],
            "model_used": result.get("model_used"),
            "file_name": file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat_with_report(
    request: ReportChatRequest,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Ask follow-up questions about a specific report.
    Uses RAG for context-aware responses.
    """
    clerk_user_id = current_user.get("sub")
    
    # Find user
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find report
    report = db.exec(
        select(HealthReport).where(
            HealthReport.id == uuid.UUID(request.report_id),
            HealthReport.user_id == user.id
        )
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        # Ensure report has text for RAG
        report_text = report.report_text or ""
        if not report_text.strip():
            logger.warning(f"Report {request.report_id} has empty report_text, chat may have limited context")
        
        # Get chat history for this report
        messages = db.exec(
            select(HealthReportMessage).where(
                HealthReportMessage.report_id == report.id
            ).order_by(HealthReportMessage.created_at)
        ).all()
        
        chat_history = [
            {"role": m.role, "content": m.content}
            for m in messages
        ]
        
        # Save user message
        user_msg = HealthReportMessage(
            report_id=report.id,
            role="user",
            content=request.message
        )
        db.add(user_msg)
        db.commit()
        
        # Get response
        agent = get_chat_agent()
        response = agent.get_response(
            query=request.message,
            report_id=str(report.id),
            report_text=report_text,
            chat_history=chat_history
        )
        
        # Save assistant response
        assistant_msg = HealthReportMessage(
            report_id=report.id,
            role="assistant",
            content=response
        )
        db.add(assistant_msg)
        db.commit()
        
        return {"response": response}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Report chat error for report_id={request.report_id}: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.get("/history")
async def get_report_history(
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all health reports for the current user.
    """
    clerk_user_id = current_user.get("sub")
    
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    reports = db.exec(
        select(HealthReport).where(
            HealthReport.user_id == user.id
        ).order_by(HealthReport.created_at.desc())
    ).all()
    
    return {
        "reports": [
            {
                "id": str(r.id),
                "file_name": r.file_name,
                "patient_name": r.patient_name,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "analysis": r.analysis[:200] + "..." if len(r.analysis) > 200 else r.analysis
            }
            for r in reports
        ]
    }


@router.get("/{report_id}")
async def get_report_detail(
    report_id: str,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a specific report.
    """
    clerk_user_id = current_user.get("sub")
    
    user = db.exec(select(User).where(User.clerk_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    report = db.exec(
        select(HealthReport).where(
            HealthReport.id == uuid.UUID(report_id),
            HealthReport.user_id == user.id
        )
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get chat messages
    messages = db.exec(
        select(HealthReportMessage).where(
            HealthReportMessage.report_id == report.id
        ).order_by(HealthReportMessage.created_at)
    ).all()
    
    return {
        "id": str(report.id),
        "file_name": report.file_name,
        "patient_name": report.patient_name,
        "patient_age": report.patient_age,
        "patient_gender": report.patient_gender,
        "analysis": report.analysis,
        "model_used": report.model_used,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "messages": [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]
    }

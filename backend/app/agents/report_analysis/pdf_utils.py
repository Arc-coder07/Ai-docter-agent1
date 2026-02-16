"""
PDF Text Extraction Utility
Extracts text from PDF blood reports using pdfplumber.
"""
import os
import tempfile
from typing import Union
import pdfplumber

# Constants
MAX_UPLOAD_SIZE_MB = 5
ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename: str) -> bool:
    """Check if file has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_pdf(file_content: bytes, filename: str = "report.pdf") -> Union[str, dict]:
    """
    Extract text from a PDF file.
    
    Args:
        file_content: PDF file bytes
        filename: Original filename for validation
        
    Returns:
        Extracted text string or dict with error
    """
    # Validate file extension
    if not allowed_file(filename):
        return {"error": "Invalid file type. Only PDF files are supported."}
    
    # Validate file size
    file_size_mb = len(file_content) / (1024 * 1024)
    if file_size_mb > MAX_UPLOAD_SIZE_MB:
        return {"error": f"File size ({file_size_mb:.1f}MB) exceeds the {MAX_UPLOAD_SIZE_MB}MB limit."}
    
    # Extract text using pdfplumber
    try:
        # Write to temp file for pdfplumber
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        try:
            text_parts = []
            with pdfplumber.open(tmp_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            
            if not text_parts:
                return {"error": "Could not extract any text from the PDF. The file may be image-based or empty."}
            
            return "\n\n".join(text_parts)
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        return {"error": f"Error processing PDF: {str(e)}"}


def validate_pdf_content(text: str) -> bool:
    """
    Basic validation that extracted text looks like a medical report.
    """
    # Check for common medical report keywords
    medical_keywords = [
        "hemoglobin", "hb", "rbc", "wbc", "platelet",
        "glucose", "cholesterol", "triglyceride",
        "creatinine", "bilirubin", "sgpt", "sgot",
        "blood", "test", "report", "patient", "sample"
    ]
    
    text_lower = text.lower()
    matches = sum(1 for keyword in medical_keywords if keyword in text_lower)
    
    # Consider valid if at least 3 medical keywords found
    return matches >= 3

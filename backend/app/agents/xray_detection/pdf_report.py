"""
PDF Report Generation for Chest X-ray Pneumonia Detection.
Generates professional medical analysis reports with images, diagnosis,
model specs, and disclaimers.
"""

from fpdf import FPDF
from PIL import Image
from datetime import datetime
import io
import logging

logger = logging.getLogger(__name__)

# Model specs for the report
MODEL_SPECS = {
    "name": "MedSage X-ray Analysis",
    "version": "v1.0",
    "architecture": "MobileNetV2",
    "accuracy": 86.0,
    "sensitivity": 96.4,
    "specificity": 74.8,
    "validated_on": "485 independent samples",
}


def _clean_text(text: str) -> str:
    """Remove Unicode chars that cause PDF encoding errors."""
    if not text:
        return ""

    replacements = {
        '\u201c': '"', '\u201d': '"', '\u2018': "'", '\u2019': "'",
        '\u2014': '-', '\u2013': '-', '\u2212': '-',
        '\u2713': '[OK]', '\u2717': '[X]',
        '\u2026': '...', '\u2022': '-', '\u2192': '->',
        '\u00b0': 'deg', '\u00b1': '+/-',
    }
    for char, repl in replacements.items():
        text = text.replace(char, repl)

    return text.encode('ascii', 'ignore').decode('ascii')


def generate_medical_pdf_report(
    diagnosis: str,
    confidence: float,
    confidence_level: str,
    recommendation: str,
    raw_score: float,
    analysis_time: float = 0.0,
    patient_name: str = None,
    patient_age: int = None,
    original_image: Image.Image = None,
    heatmap_image: Image.Image = None,
) -> bytes:
    """
    Generate a professional medical PDF report with analysis results and images.

    Returns:
        PDF file as bytes
    """
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ── Header ──
    pdf.set_fill_color(41, 98, 255)  # MedSage blue
    pdf.rect(0, 0, 210, 35, 'F')
    pdf.set_font('Helvetica', 'B', 22)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 18, 'MedSage - Chest X-ray Analysis Report', 0, 1, 'C')
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 8, 'AI-Powered Pneumonia Detection', 0, 1, 'C')
    pdf.set_text_color(0, 0, 0)
    pdf.ln(10)

    # ── Report Details ──
    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_fill_color(240, 245, 255)
    pdf.cell(0, 10, '  Report Information', 0, 1, 'L', fill=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.ln(3)
    pdf.cell(0, 7, f'Date: {datetime.now().strftime("%B %d, %Y  %I:%M %p")}', 0, 1)
    pdf.cell(0, 7, f'Model: {MODEL_SPECS["name"]} {MODEL_SPECS["version"]}', 0, 1)
    pdf.cell(0, 7, f'Architecture: {MODEL_SPECS["architecture"]}', 0, 1)
    if analysis_time > 0:
        pdf.cell(0, 7, f'Analysis Time: {analysis_time:.2f} seconds', 0, 1)

    if patient_name or patient_age:
        pdf.ln(3)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(0, 7, 'Patient Information:', 0, 1)
        pdf.set_font('Helvetica', '', 10)
        if patient_name:
            pdf.cell(0, 7, f'  Name: {_clean_text(patient_name)}', 0, 1)
        if patient_age:
            pdf.cell(0, 7, f'  Age: {patient_age}', 0, 1)

    pdf.ln(8)

    # ── Diagnosis Result ──
    pdf.set_font('Helvetica', 'B', 13)
    if diagnosis == "PNEUMONIA":
        pdf.set_fill_color(255, 235, 235)
        pdf.set_text_color(200, 0, 0)
    else:
        pdf.set_fill_color(235, 255, 235)
        pdf.set_text_color(0, 128, 0)

    pdf.cell(0, 10, f'  DIAGNOSIS: {diagnosis}', 0, 1, 'L', fill=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(3)

    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 7, f'Confidence: {confidence}% ({confidence_level})', 0, 1)
    pdf.cell(0, 7, f'Raw Prediction Score: {raw_score:.4f}', 0, 1)
    pdf.cell(0, 7, f'Decision Threshold: 0.5', 0, 1)
    pdf.ln(5)

    # Confidence bar
    bar_width = 170
    bar_height = 8
    bar_x = 20
    bar_y = pdf.get_y()

    # Background
    pdf.set_fill_color(220, 220, 220)
    pdf.rect(bar_x, bar_y, bar_width, bar_height, 'F')

    # Fill
    fill_width = bar_width * (confidence / 100)
    if diagnosis == "PNEUMONIA":
        pdf.set_fill_color(220, 50, 50)
    else:
        pdf.set_fill_color(56, 142, 60)
    pdf.rect(bar_x, bar_y, fill_width, bar_height, 'F')

    pdf.ln(12)

    # ── Recommendation ──
    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_fill_color(240, 245, 255)
    pdf.cell(0, 10, '  Recommendation', 0, 1, 'L', fill=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.ln(3)
    pdf.multi_cell(0, 7, _clean_text(recommendation))
    pdf.ln(5)

    # ── Images Section ──
    if original_image or heatmap_image:
        # Check if we need a new page
        if pdf.get_y() > 170:
            pdf.add_page()

        pdf.set_font('Helvetica', 'B', 13)
        pdf.set_fill_color(240, 245, 255)
        pdf.cell(0, 10, '  Medical Images', 0, 1, 'L', fill=True)
        pdf.ln(3)

        try:
            if original_image and heatmap_image:
                # Side-by-side layout
                pdf.set_font('Helvetica', 'B', 9)
                pdf.cell(85, 6, 'Original Chest X-Ray', 0, 0, 'C')
                pdf.cell(85, 6, 'AI Attention Analysis', 0, 1, 'C')

                current_y = pdf.get_y()

                orig_buf = io.BytesIO()
                original_image.save(orig_buf, format='PNG')
                orig_buf.seek(0)
                pdf.image(orig_buf, x=15, y=current_y, w=80)

                heat_buf = io.BytesIO()
                heatmap_image.save(heat_buf, format='PNG')
                heat_buf.seek(0)
                pdf.image(heat_buf, x=110, y=current_y, w=80)

                pdf.ln(65)

            elif original_image:
                pdf.set_font('Helvetica', 'B', 9)
                pdf.cell(0, 6, 'Original Chest X-Ray', 0, 1, 'C')
                current_y = pdf.get_y()
                orig_buf = io.BytesIO()
                original_image.save(orig_buf, format='PNG')
                orig_buf.seek(0)
                pdf.image(orig_buf, x=55, y=current_y, w=100)
                pdf.ln(80)

        except Exception as e:
            pdf.set_font('Helvetica', '', 9)
            pdf.cell(0, 7, f'Images could not be embedded: {str(e)}', 0, 1)

    # ── AI Attention Explanation ──
    if heatmap_image:
        pdf.ln(5)
        pdf.set_font('Helvetica', 'B', 13)
        pdf.set_fill_color(240, 245, 255)
        pdf.cell(0, 10, '  AI Attention Explanation', 0, 1, 'L', fill=True)
        pdf.set_font('Helvetica', '', 9)
        pdf.ln(3)
        explanation = (
            "The AI Attention Analysis shows areas where the model focused during "
            "diagnosis. Red and yellow regions indicate high attention areas, while "
            "blue regions show lower attention. This visualization helps clinicians "
            "understand the AI's decision-making process and identify which lung "
            "regions influenced the diagnosis."
        )
        pdf.multi_cell(0, 6, explanation)

    # ── Technical Details (new page) ──
    pdf.add_page()

    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_fill_color(240, 245, 255)
    pdf.cell(0, 10, '  Model Performance Metrics', 0, 1, 'L', fill=True)
    pdf.ln(3)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(0, 7, f'Overall Accuracy: {MODEL_SPECS["accuracy"]}%', 0, 1)
    pdf.cell(0, 7, f'Sensitivity (Recall): {MODEL_SPECS["sensitivity"]}%', 0, 1)
    pdf.cell(0, 7, f'Specificity: {MODEL_SPECS["specificity"]}%', 0, 1)
    pdf.cell(0, 7, f'Validated On: {MODEL_SPECS["validated_on"]}', 0, 1)
    pdf.ln(5)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 7, 'Clinical Interpretation:', 0, 1)
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 6, (
        "- 96.4% sensitivity means the model correctly identifies 96.4% of pneumonia cases\n"
        "- 25.2% false positive rate requires clinical review of positive findings\n"
        "- Model validated on 485 independent samples with good generalization"
    ))

    # ── Medical Disclaimer ──
    pdf.ln(10)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_fill_color(255, 250, 235)
    pdf.cell(0, 10, '  MEDICAL DISCLAIMER', 0, 1, 'L', fill=True)
    pdf.set_font('Helvetica', '', 9)
    pdf.ln(3)
    disclaimer = (
        "This AI analysis is for preliminary screening purposes only. "
        "It is NOT a replacement for professional medical diagnosis. "
        "Always seek advice from qualified healthcare professionals before "
        "making medical decisions. This tool has not been approved by regulatory "
        "bodies for clinical diagnostic use."
    )
    pdf.multi_cell(0, 6, disclaimer)

    # ── Footer ──
    pdf.ln(10)
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 6, f'Generated by {MODEL_SPECS["name"]} {MODEL_SPECS["version"]} | '
             f'{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'C')

    # Output
    pdf_output = pdf.output(dest='S')
    if isinstance(pdf_output, str):
        return pdf_output.encode('latin-1')
    return bytes(pdf_output)

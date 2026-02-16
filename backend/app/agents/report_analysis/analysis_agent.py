"""
Analysis Agent for Blood Report Interpretation
Processes blood reports and generates AI-powered analysis.
"""
from typing import Dict, Optional, List
from .model_manager import ModelManager
from .prompts import COMPREHENSIVE_ANALYST_PROMPT


class AnalysisAgent:
    """
    Agent responsible for managing blood report analysis.
    Uses ModelManager for robust AI generation with fallback support.
    """

    def __init__(self):
        self.model_manager = ModelManager()

    def analyze_report(
        self,
        report_text: str,
        patient_name: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> Dict:
        """
        Analyze a blood report using AI.

        Args:
            report_text: Extracted text from the blood report PDF
            patient_name: Optional patient name
            age: Optional patient age
            gender: Optional patient gender
            system_prompt: Optional custom system prompt (uses default if not provided)

        Returns:
            dict with keys: success, content, model_used, error
        """
        # Prepare data for analysis
        data = {
            "patient_name": patient_name or "",
            "age": age,
            "gender": gender or "",
            "report": report_text
        }

        # Use default prompt if not provided
        prompt = system_prompt or COMPREHENSIVE_ANALYST_PROMPT

        # Generate analysis
        result = self.model_manager.generate_analysis(data, prompt)

        return result

    def preprocess_report(self, data: dict) -> dict:
        """Pre-process report data before analysis."""
        processed = {
            "patient_name": data.get("patient_name", ""),
            "age": data.get("age"),
            "gender": data.get("gender", ""),
            "report": data.get("report", "")
        }
        return processed

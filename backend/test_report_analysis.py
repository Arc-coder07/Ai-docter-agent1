import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agents.report_analysis.analysis_agent import AnalysisAgent
from dotenv import load_dotenv

load_dotenv()

def test():
    print("Testing AnalysisAgent with Groq...")
    
    agent = AnalysisAgent()
    
    report_text = "This is a dummy blood report showing Hemoglobin 14.2 g/dL."
    
    try:
        response = agent.analyze_report(
            report_text=report_text,
            patient_name="John Doe",
            age=30,
            gender="Male"
        )
        print("Success:", response.get("success"))
        print("Model Used:", response.get("model_used"))
        print("Content (preview):", str(response.get("content"))[:200])
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()

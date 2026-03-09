import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agents.report_analysis.chat_agent import ReportChatAgent
from dotenv import load_dotenv

load_dotenv()

def test():
    print("Testing ReportChatAgent...")
    
    agent = ReportChatAgent()
    
    report_text = "This is a dummy blood report showing Hemoglobin 14.2 g/dL."
    query = "What is my hemoglobin?"
    
    try:
        response = agent.get_response(
            query=query,
            report_id="dummy_report_123",
            report_text=report_text,
            chat_history=[]
        )
        print("Response:", response)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()

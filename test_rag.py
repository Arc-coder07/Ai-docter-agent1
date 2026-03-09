
import sys
import os
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.abspath("backend"))

from app.agents.rag_agent import MedicalRAG
from app.agents.config import Config

load_dotenv()

def test_rag():
    config = Config()
    rag = MedicalRAG(config)
    
    query = "What are the common symptoms of a brain tumor?"
    print(f"Querying: {query}")
    
    try:
        response = rag.process_query(query)
        print("\nResponse:")
        print(response.get("response"))
        print("\nConfidence:", response.get("confidence"))
        print("Sources:", len(response.get("sources", [])))
        
        if response.get("confidence", 0) > 0.4:
            print("\n✅ RAG is working and retrieving documents.")
        else:
            print("\n⚠️ RAG confidence is low. Documents might not be indexed correctly.")
            
    except Exception as e:
        print(f"\n❌ RAG failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_rag()

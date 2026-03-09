
import sys
import os
import logging
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.abspath("backend"))

from app.agents.rag_agent import MedicalRAG
from app.agents.config import Config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def ingest_medical_docs():
    config = Config()
    
    # NEW: Clear existing data BEFORE initializing MedicalRAG
    # This prevents the QdrantClient from crashing on corrupt meta.json
    qdrant_db_path = config.rag.vector_local_path
    docs_db_path = config.rag.doc_local_path
    parsed_docs_path = config.rag.parsed_content_dir
    
    import shutil
    for path in [qdrant_db_path, docs_db_path, parsed_docs_path]:
        if os.path.exists(path):
            logger.info(f"Clearing {path}")
            shutil.rmtree(path)
        os.makedirs(path, exist_ok=True)

    # Now we can safely initialize RAG
    rag = MedicalRAG(config)
    
    raw_data_dir = os.path.join("backend/app/data/raw")
    if not os.path.exists(raw_data_dir):
        logger.error(f"Raw data directory not found: {raw_data_dir}")
        return
    
    # Get files manually to loop and sleep
    files = [os.path.join(raw_data_dir, f) for f in os.listdir(raw_data_dir) 
             if os.path.isfile(os.path.join(raw_data_dir, f))]

    logger.info(f"Starting ingestion from {raw_data_dir} ({len(files)} files)")
    
    import time
    for file_path in files:
        logger.info(f"Ingesting file: {file_path}")
        result = rag.ingest_file(file_path)
        if result["success"]:
            logger.info(f"   Success: {result['chunks_processed']} chunks")
        else:
            logger.error(f"   Failed: {result.get('error')}")
        
        # Sleep between files to allow quota to reset
        time.sleep(10)
    
    if result["success"]:
        logger.info(f"✅ Successfully ingested {result['documents_ingested']} documents.")
        logger.info(f"   Chunks processed: {result['chunks_processed']}")
    else:
        logger.error(f"❌ Ingestion failed: {result.get('error')}")
        if result.get("failed_files"):
            for failed in result["failed_files"]:
                logger.error(f"   Failed file: {failed['file']} - Error: {failed['error']}")

if __name__ == "__main__":
    ingest_medical_docs()

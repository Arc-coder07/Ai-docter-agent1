import logging
from app.core.hf_client import hf_client

logger = logging.getLogger(__name__)

class BrainTumorDetector:
    def __init__(self):
        logger.info("Initialized BrainTumorDetector (HF Space Client)")

    def predict(self, image_bytes):
        try:
            return hf_client.predict_brain_tumor(image_bytes)
        except Exception as e:
            logger.error(f"Error calling HF Space for brain tumor: {e}")
            return {"error": str(e), "success": False}

# Global singleton
detector = BrainTumorDetector()

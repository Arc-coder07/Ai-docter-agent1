import logging
import requests
from app.core.hf_client import hf_client

logger = logging.getLogger(__name__)

class XrayDetector:
    def __init__(self):
        logger.info("Initialized XrayDetector (HF Space Client)")

    def predict(self, image_bytes: bytes, filename: str = "") -> dict:
        try:
            return hf_client.predict_xray_pneumonia(image_bytes, filename)
        except Exception as e:
            logger.error(f"Error calling HF Space for X-ray predict: {e}")
            return {"error": str(e), "success": False}

    def generate_heatmap_base64(self, image_bytes: bytes, filename: str = "") -> str:
        # The new HF space returns the heatmap in the prediction payload
        res = self.predict(image_bytes, filename)
        if res and "heatmap_base64" in res:
            return res["heatmap_base64"]
        return ""

    @staticmethod
    def get_stats() -> dict:
        try:
            # Fetch directly from the space, or fallback
            r = requests.get(f"{hf_client.tensorflow_space_url}/stats", timeout=10)
            if r.status_code == 200:
                return r.json()
        except:
            pass
            
        # Fallback stats
        return {
            "model": {
                "name": "MedSage Pneumonia Detector",
                "architecture": "MobileNetV2 with custom classification head (HF Space)",
                "input_size": "224x224 RGB images"
            },
            "performance_metrics": {
                "accuracy": 86.0,
                "sensitivity": 96.4,
                "specificity": 74.8,
            }
        }

# Singleton instance
detector = XrayDetector()

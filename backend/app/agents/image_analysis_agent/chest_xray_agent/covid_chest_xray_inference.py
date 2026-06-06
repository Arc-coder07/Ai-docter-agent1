import logging
import os
from app.core.hf_client import hf_client

class ChestXRayClassification:
    def __init__(self, model_path=None, device=None):
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)
        self.logger.info("Initialized ChestXRayClassification via HF Space")
        
    def predict(self, img_path):
        try:
            if not os.path.exists(img_path):
                self.logger.error("Image path does not exist")
                return None
                
            with open(img_path, "rb") as f:
                image_bytes = f.read()
                
            res = hf_client.predict_covid_xray(image_bytes)
            if "error" in res:
                self.logger.error(f"HF Space Error: {res['error']}")
                return None
                
            return {
                "class": res.get("class"),
                "confidence": res.get("confidence"),
                "probabilities": res.get("probabilities", {})
            }
        except Exception as e:
            self.logger.error(f"Error during prediction Covid Chest X-ray: {str(e)}")
            return None

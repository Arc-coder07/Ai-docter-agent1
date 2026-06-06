import os
import logging
import base64
from app.core.hf_client import hf_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

class SkinLesionSegmentation:
    def __init__(self, model_path=None):
        self.model_path = model_path
        logger.info("Initialized SkinLesionSegmentation via HF Space")

    def predict(self, image_path, output_path):
        try:
            if not os.path.exists(image_path):
                raise ValueError("Image path does not exist")
                
            with open(image_path, "rb") as f:
                image_bytes = f.read()
                
            res = hf_client.predict_skin_lesion(image_bytes)
            if "error" in res:
                raise RuntimeError(f"HF Space error: {res['error']}")
                
            mask_b64 = res.get("mask_base64")
            if mask_b64:
                with open(output_path, "wb") as f:
                    f.write(base64.b64decode(mask_b64))
                logger.info(f"Overlayed segmentation mask saved at {output_path}")
            
            return {
                "success": res.get("success", True),
                "confidence": res.get("confidence"),
                "lesion_detected": res.get("lesion_detected")
            }

        except Exception as e:
            logger.error(f"Error during segmentation: {e}")
            raise e

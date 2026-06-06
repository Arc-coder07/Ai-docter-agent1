import os
import httpx
import logging

logger = logging.getLogger(__name__)

class HFSpaceClient:
    def __init__(self):
        # Allow overriding via env vars, fallback to the ones we just deployed
        self.pytorch_space_url = os.getenv("HF_PYTORCH_SPACE_URL", "https://amar-nadh-medsage-pytorch.hf.space")
        self.tensorflow_space_url = os.getenv("HF_TENSORFLOW_SPACE_URL", "https://amar-nadh-medsage-tensorflow.hf.space")
        self.timeout = httpx.Timeout(60.0) # inference can take a bit if it has to download weights

    async def _post_image(self, url: str, image_bytes: bytes, filename: str = "image.jpg") -> dict:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                files = {"file": (filename, image_bytes, "image/jpeg")}
                response = await client.post(url, files=files)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error calling HF Space at {url}: {e}")
            return {"error": str(e), "success": False}

    def _post_image_sync(self, url: str, image_bytes: bytes, filename: str = "image.jpg") -> dict:
        try:
            with httpx.Client(timeout=self.timeout) as client:
                files = {"file": (filename, image_bytes, "image/jpeg")}
                response = client.post(url, files=files)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error calling HF Space at {url}: {e}")
            return {"error": str(e), "success": False}

    def predict_brain_tumor(self, image_bytes: bytes) -> dict:
        url = f"{self.pytorch_space_url}/predict/brain-tumor"
        return self._post_image_sync(url, image_bytes)

    def predict_brain_tumor_vit(self, image_bytes: bytes) -> dict:
        url = f"{self.pytorch_space_url}/predict/brain-tumor-vit"
        return self._post_image_sync(url, image_bytes)

    def predict_covid_xray(self, image_bytes: bytes) -> dict:
        url = f"{self.pytorch_space_url}/predict/covid-xray"
        return self._post_image_sync(url, image_bytes)

    def predict_skin_lesion(self, image_bytes: bytes) -> dict:
        url = f"{self.pytorch_space_url}/predict/skin-lesion"
        return self._post_image_sync(url, image_bytes)

    def predict_xray_pneumonia(self, image_bytes: bytes, filename: str = "image.jpg") -> dict:
        url = f"{self.tensorflow_space_url}/predict/xray-pneumonia"
        return self._post_image_sync(url, image_bytes, filename=filename)

# Global singleton
hf_client = HFSpaceClient()

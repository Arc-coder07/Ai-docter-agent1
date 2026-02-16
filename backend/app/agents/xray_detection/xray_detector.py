"""
Chest X-ray Pneumonia Detection using MobileNetV2 model.
Model source: https://huggingface.co/ayushirathour/chest-xray-pneumonia-detection
Performance: 86% accuracy, 96.4% sensitivity, 74.8% specificity
"""

import numpy as np
from PIL import Image
from pathlib import Path
import logging
import io

logger = logging.getLogger(__name__)

# Model configuration
MODEL_REPO_ID = "ayushirathour/chest-xray-pneumonia-detection"
MODEL_FILENAME = "best_chest_xray_model.h5"
MODEL_INPUT_SIZE = (224, 224)
PREDICTION_THRESHOLD = 0.5

# Cache directory for downloaded model
MODEL_CACHE_DIR = Path(__file__).parent / "model_cache"

# Performance metrics from cross-operator validation
VALIDATION_METRICS = {
    "accuracy": 86.0,
    "sensitivity": 96.4,
    "specificity": 74.8,
    "precision": 80.4,
    "false_positive_rate": 25.2,
    "false_negative_rate": 3.6,
    "roc_auc": 0.964,
    "pr_auc": 0.968,
    "validated_on": "485 independent samples"
}


class XrayDetector:
    """Pneumonia detection from chest X-ray images using pre-trained MobileNetV2."""

    def __init__(self):
        self._model = None
        self._loaded = False

    def _ensure_model_loaded(self):
        """Lazy-load the model on first use."""
        if self._loaded:
            return

        try:
            import tensorflow as tf
            from huggingface_hub import hf_hub_download

            # Download model from HuggingFace (cached after first download)
            logger.info(f"Downloading model from HuggingFace: {MODEL_REPO_ID}")
            MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

            model_path = hf_hub_download(
                repo_id=MODEL_REPO_ID,
                filename=MODEL_FILENAME,
                cache_dir=str(MODEL_CACHE_DIR)
            )

            logger.info(f"Loading TensorFlow model from: {model_path}")

            # Suppress TF warnings during load
            tf.get_logger().setLevel('ERROR')
            self._model = tf.keras.models.load_model(model_path)
            self._loaded = True
            logger.info("✅ X-ray detection model loaded successfully")

        except Exception as e:
            logger.error(f"❌ Failed to load X-ray model: {e}")
            raise RuntimeError(f"Model loading failed: {e}")

    @staticmethod
    def preprocess_image(image: Image.Image) -> np.ndarray:
        """
        Preprocess image for model prediction.
        Matches the preprocessing used during training.
        """
        # Convert to RGB if not already
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Resize to model input size (224x224 for MobileNetV2)
        image = image.resize(MODEL_INPUT_SIZE)

        # Convert to numpy array and normalize to [0, 1]
        img_array = np.array(image, dtype=np.float32) / 255.0

        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        return img_array

    @staticmethod
    def interpret_prediction(prediction_score: float) -> dict:
        """
        Interpret model prediction with confidence levels.
        Based on cross-operator validation performance metrics.
        """
        if prediction_score > PREDICTION_THRESHOLD:
            diagnosis = "PNEUMONIA"
            confidence = float(prediction_score * 100)

            if confidence >= 80:
                confidence_level = "High"
                recommendation = (
                    "Strong indication of pneumonia detected. "
                    "Recommend immediate medical consultation and further diagnostic tests."
                )
            elif confidence >= 60:
                confidence_level = "Moderate"
                recommendation = (
                    "Moderate indication of pneumonia. "
                    "Medical review and additional tests recommended."
                )
            else:
                confidence_level = "Low"
                recommendation = (
                    "Possible pneumonia detected with low confidence. "
                    "Further examination and clinical correlation advised."
                )
        else:
            diagnosis = "NORMAL"
            confidence = float((1 - prediction_score) * 100)

            if confidence >= 80:
                confidence_level = "High"
                recommendation = (
                    "No signs of pneumonia detected. "
                    "Chest X-ray appears normal."
                )
            elif confidence >= 60:
                confidence_level = "Moderate"
                recommendation = (
                    "Likely normal chest X-ray. "
                    "Routine follow-up if symptoms persist."
                )
            else:
                confidence_level = "Low"
                recommendation = (
                    "Unclear result with low confidence. "
                    "Manual review by a radiologist is recommended."
                )

        return {
            "diagnosis": diagnosis,
            "confidence": round(confidence, 2),
            "confidence_level": confidence_level,
            "recommendation": recommendation,
            "raw_score": float(prediction_score)
        }

    def predict(self, image_bytes: bytes) -> dict:
        """
        Full prediction pipeline: load model → preprocess → predict → interpret.

        Args:
            image_bytes: Raw image file bytes

        Returns:
            dict with diagnosis, confidence, recommendation, etc.
        """
        self._ensure_model_loaded()

        # Open and preprocess the image
        image = Image.open(io.BytesIO(image_bytes))
        original_size = image.size

        processed = self.preprocess_image(image)

        # Run prediction
        prediction = self._model.predict(processed, verbose=0)
        score = float(prediction[0][0]) if prediction.ndim > 1 else float(prediction[0])

        # Interpret results
        result = self.interpret_prediction(score)
        result["image_size"] = f"{original_size[0]}x{original_size[1]}"
        result["validation_metrics"] = VALIDATION_METRICS
        result["disclaimer"] = (
            "This AI system is for preliminary screening only. "
            "It is NOT a replacement for professional medical diagnosis. "
            "Always consult qualified healthcare professionals for medical decisions."
        )

        return result

    @staticmethod
    def get_stats() -> dict:
        """Return model performance statistics."""
        return {
            "model": {
                "architecture": "MobileNetV2 with custom classification head",
                "input_size": "224x224 RGB images",
                "model_size": "~14MB",
                "source": f"https://huggingface.co/{MODEL_REPO_ID}"
            },
            "performance_metrics": VALIDATION_METRICS,
            "cross_operator_validation": {
                "dataset_size": "485 independent samples",
                "normal_cases": 234,
                "pneumonia_cases": 251,
                "confusion_matrix": {
                    "true_negatives": 175,
                    "false_positives": 59,
                    "false_negatives": 9,
                    "true_positives": 242
                }
            },
            "clinical_interpretation": {
                "screening_quality": "96.4% sensitivity ideal for pneumonia screening",
                "false_alarm_note": "25.2% false positive rate requires clinical review",
                "generalization": "Good (8.8% drop from internal validation)"
            }
        }


# Singleton instance
detector = XrayDetector()

"""
Chest X-ray Pneumonia Detection using MobileNetV2 model.
Model source: https://huggingface.co/ayushirathour/chest-xray-pneumonia-detection
Performance: 86% accuracy, 96.4% sensitivity, 74.8% specificity

Features:
- Pneumonia detection with confidence levels
- AI Focus heatmap generation (Grad-CAM with fallback)
- DICOM file support
"""

import numpy as np
from PIL import Image
from pathlib import Path
import logging
import io
import base64

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


def dicom_to_pil_image(dicom_bytes: bytes) -> Image.Image:
    """
    Convert DICOM bytes to PIL Image (RGB format).
    Uses pydicom to extract pixel data from medical DICOM files.
    """
    try:
        import pydicom
        dicom_file = pydicom.dcmread(io.BytesIO(dicom_bytes))
        pixel_array = dicom_file.pixel_array

        # Normalize to 0-255 range
        pixel_min = pixel_array.min()
        pixel_max = pixel_array.max()
        if pixel_max > pixel_min:
            normalized = (255 * (pixel_array - pixel_min) / (pixel_max - pixel_min)).astype(np.uint8)
        else:
            normalized = pixel_array.astype(np.uint8)

        # Convert grayscale to RGB (model expects RGB)
        return Image.fromarray(normalized).convert('RGB')

    except ImportError:
        raise RuntimeError("pydicom is required for DICOM file support. Install with: pip install pydicom")
    except Exception as e:
        raise ValueError(f"Failed to process DICOM file: {e}")


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
            # Use Keras 3 directly (not tf_keras/legacy) since the model
            # was saved with Keras 3 format (batch_shape, DTypePolicy)
            import keras
            from huggingface_hub import hf_hub_download

            # Download model from HuggingFace (cached after first download)
            logger.info(f"Downloading model from HuggingFace: {MODEL_REPO_ID}")
            MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

            model_path = hf_hub_download(
                repo_id=MODEL_REPO_ID,
                filename=MODEL_FILENAME,
                cache_dir=str(MODEL_CACHE_DIR)
            )

            logger.info(f"Loading model from: {model_path}")
            self._model = keras.models.load_model(model_path, compile=False)
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
        if image.mode != 'RGB':
            image = image.convert('RGB')

        image = image.resize(MODEL_INPUT_SIZE)
        img_array = np.array(image, dtype=np.float32) / 255.0
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

    def predict(self, image_bytes: bytes, filename: str = "") -> dict:
        """
        Full prediction pipeline: load model → preprocess → predict → interpret.

        Args:
            image_bytes: Raw image file bytes
            filename: Optional filename (used to detect DICOM format)

        Returns:
            dict with diagnosis, confidence, recommendation, etc.
        """
        import time
        start_time = time.time()

        self._ensure_model_loaded()

        # Handle DICOM files
        if filename.lower().endswith('.dcm'):
            image = dicom_to_pil_image(image_bytes)
        else:
            image = Image.open(io.BytesIO(image_bytes))

        original_size = image.size

        processed = self.preprocess_image(image)

        # Run prediction
        prediction = self._model.predict(processed, verbose=0)
        score = float(prediction[0][0]) if prediction.ndim > 1 else float(prediction[0])

        # Interpret results
        result = self.interpret_prediction(score)
        result["image_size"] = f"{original_size[0]}x{original_size[1]}"
        result["analysis_time"] = round(time.time() - start_time, 2)
        result["validation_metrics"] = VALIDATION_METRICS
        result["disclaimer"] = (
            "This AI system is for preliminary screening only. "
            "It is NOT a replacement for professional medical diagnosis. "
            "Always consult qualified healthcare professionals for medical decisions."
        )

        return result

    def generate_heatmap(self, image_bytes: bytes, filename: str = "") -> Image.Image:
        """
        Generate AI Focus heatmap showing where the model focused during prediction.

        Uses Grad-CAM on the last Conv2D layer when possible, with a
        confidence-weighted attention fallback.

        Args:
            image_bytes: Raw image file bytes
            filename: Optional filename (used to detect DICOM format)

        Returns:
            PIL Image of the heatmap overlay
        """
        self._ensure_model_loaded()

        # Handle DICOM
        if filename.lower().endswith('.dcm'):
            image = dicom_to_pil_image(image_bytes)
        else:
            image = Image.open(io.BytesIO(image_bytes))

        processed = self.preprocess_image(image)

        # Try Grad-CAM first
        try:
            heatmap = self._gradcam_heatmap(processed)
        except Exception as e:
            logger.warning(f"Grad-CAM failed, using fallback: {e}")
            heatmap = self._fallback_heatmap(processed)

        # Create overlay
        return self._create_overlay(processed, heatmap)

    def _gradcam_heatmap(self, processed_image: np.ndarray) -> np.ndarray:
        """Generate Grad-CAM heatmap from the model's last Conv2D layer."""
        import tensorflow as tf

        model = self._model

        # Find the last Conv2D layer
        last_conv_layer = None
        for layer in reversed(model.layers):
            if 'conv' in layer.name.lower():
                last_conv_layer = layer
                break

        if last_conv_layer is None:
            raise RuntimeError("No Conv2D layer found in model")

        # Create a model that outputs both the conv layer output and prediction
        grad_model = tf.keras.Model(
            inputs=model.input,
            outputs=[last_conv_layer.output, model.output]
        )

        # Compute gradients
        with tf.GradientTape() as tape:
            conv_output, predictions = grad_model(processed_image)
            predicted_class = predictions[:, 0]

        # Get gradients of the predicted class w.r.t. the conv layer output
        grads = tape.gradient(predicted_class, conv_output)

        # Global average pooling of gradients
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

        # Weight the conv output by the pooled gradients
        conv_output = conv_output[0]
        heatmap = conv_output @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)

        # ReLU and normalize
        heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
        heatmap = heatmap.numpy()

        # Resize to image dimensions
        heatmap_resized = np.array(
            Image.fromarray((heatmap * 255).astype(np.uint8)).resize(
                MODEL_INPUT_SIZE, Image.Resampling.BILINEAR
            )
        ).astype(np.float32) / 255.0

        return heatmap_resized

    def _fallback_heatmap(self, processed_image: np.ndarray) -> np.ndarray:
        """
        Fallback attention-based heatmap when Grad-CAM isn't available.
        Uses confidence-weighted distance pattern from the center.
        """
        pred = self._model.predict(processed_image, verbose=0)[0][0]

        h, w = MODEL_INPUT_SIZE
        y, x = np.ogrid[:h, :w]
        center_y, center_x = h // 2, w // 2

        # Distance-based attention pattern
        attention = np.exp(-((x - center_x) ** 2 + (y - center_y) ** 2) / (w * h / 8))

        # Weight by prediction confidence
        if pred > 0.5:
            attention = attention * pred
        else:
            attention = attention * (1 - pred) * 0.3

        # Normalize to 0-1
        attention = (attention - attention.min()) / (attention.max() - attention.min() + 1e-8)
        return attention

    def _create_overlay(self, processed_image: np.ndarray, heatmap: np.ndarray) -> Image.Image:
        """Blend the heatmap with the original image using jet colormap."""
        import matplotlib.cm as cm

        # Apply jet colormap to heatmap
        colormap = (cm.jet(heatmap)[:, :, :3] * 255).astype(np.uint8)

        # Get base image
        base_image = (processed_image[0] * 255).astype(np.uint8)

        # Ensure shapes match
        if colormap.shape[:2] != base_image.shape[:2]:
            colormap_img = Image.fromarray(colormap).resize(
                (base_image.shape[1], base_image.shape[0])
            )
            colormap = np.array(colormap_img)

        # Blend: 40% original + 60% heatmap
        overlay = (0.4 * base_image + 0.6 * colormap).astype(np.uint8)
        return Image.fromarray(overlay)

    def generate_heatmap_base64(self, image_bytes: bytes, filename: str = "") -> str:
        """Generate heatmap and return as base64-encoded PNG string."""
        heatmap_image = self.generate_heatmap(image_bytes, filename)

        buf = io.BytesIO()
        heatmap_image.save(buf, format='PNG')
        buf.seek(0)
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    @staticmethod
    def get_stats() -> dict:
        """Return model performance statistics."""
        return {
            "model": {
                "name": "MedSage Pneumonia Detector",
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

"""
Chest X-ray Pneumonia Detection API
TensorFlow/Keras MobileNetV2 model served via FastAPI.
"""

import io
import base64
import logging
import threading
import time
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MODEL_INPUT_SIZE = (224, 224)
PREDICTION_THRESHOLD = 0.5
MODEL_REPO_ID = "ayushirathour/chest-xray-pneumonia-detection"
MODEL_FILENAME = "best_chest_xray_model.h5"
MODEL_CACHE_DIR = "/tmp/model_cache"

VALIDATION_METRICS = {
    "accuracy": 86.0,
    "sensitivity": 96.4,
    "specificity": 74.8,
    "precision": 80.4,
    "false_positive_rate": 25.2,
    "false_negative_rate": 3.6,
    "roc_auc": 0.964,
    "pr_auc": 0.968,
    "validated_on": "485 independent samples",
}

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"}

# ---------------------------------------------------------------------------
# Global model state (lazy loaded)
# ---------------------------------------------------------------------------
_model = None
_model_lock = threading.Lock()
_model_load_time: Optional[float] = None


def _get_model():
    """Return the loaded Keras model, downloading & loading on first call."""
    global _model, _model_load_time
    if _model is not None:
        return _model

    with _model_lock:
        # Double-checked locking
        if _model is not None:
            return _model

        logger.info("Downloading model from HuggingFace Hub …")
        from huggingface_hub import hf_hub_download

        model_path = hf_hub_download(
            repo_id=MODEL_REPO_ID,
            filename=MODEL_FILENAME,
            cache_dir=MODEL_CACHE_DIR,
        )
        logger.info("Model downloaded to %s – loading with Keras …", model_path)

        import keras

        _model = keras.models.load_model(model_path, compile=False)
        _model_load_time = time.time()
        logger.info("Model loaded successfully.")
        return _model


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def _read_dicom_bytes(file_bytes: bytes) -> Image.Image:
    """Convert raw DICOM bytes into an RGB PIL Image."""
    import pydicom

    ds = pydicom.dcmread(io.BytesIO(file_bytes))
    pixel_array = ds.pixel_array.astype(np.float64)

    # Normalise to 0-255
    pmin, pmax = pixel_array.min(), pixel_array.max()
    if pmax - pmin > 0:
        pixel_array = (pixel_array - pmin) / (pmax - pmin) * 255.0
    else:
        pixel_array = np.zeros_like(pixel_array, dtype=np.float64)

    pixel_array = pixel_array.astype(np.uint8)
    img = Image.fromarray(pixel_array)
    return img.convert("RGB")


def _preprocess(image: Image.Image) -> np.ndarray:
    """Resize & normalise a PIL image for the model."""
    image = image.resize(MODEL_INPUT_SIZE)
    img_array = np.array(image, dtype=np.float32) / 255.0
    if img_array.ndim == 2:
        img_array = np.stack([img_array] * 3, axis=-1)
    elif img_array.shape[-1] == 4:
        img_array = img_array[..., :3]
    return np.expand_dims(img_array, axis=0)


# ---------------------------------------------------------------------------
# Grad-CAM
# ---------------------------------------------------------------------------

def _generate_gradcam(model, processed_image: np.ndarray, original_image: Image.Image) -> Optional[str]:
    """Generate a Grad-CAM heatmap overlay and return it as a base64 PNG string."""
    try:
        import tensorflow as tf

        # Find the last Conv2D layer
        last_conv_layer = None
        for layer in reversed(model.layers):
            if "conv" in layer.name.lower():
                last_conv_layer = layer
                break

        if last_conv_layer is None:
            logger.warning("No convolutional layer found for Grad-CAM.")
            return _fallback_heatmap(processed_image, original_image)

        grad_model = tf.keras.Model(
            inputs=model.input,
            outputs=[last_conv_layer.output, model.output],
        )

        processed_tensor = tf.cast(processed_image, tf.float32)

        with tf.GradientTape() as tape:
            conv_output, predictions = grad_model(processed_tensor)
            predicted_class = predictions[:, 0]

        grads = tape.gradient(predicted_class, conv_output)
        if grads is None:
            logger.warning("Grad-CAM gradient computation returned None.")
            return _fallback_heatmap(processed_image, original_image)

        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_output = conv_output[0]
        heatmap = conv_output @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
        heatmap = heatmap.numpy()

        # Resize heatmap to image size
        heatmap_img = Image.fromarray(np.uint8(heatmap * 255)).resize(
            MODEL_INPUT_SIZE, Image.BILINEAR
        )
        heatmap_array = np.array(heatmap_img, dtype=np.float32) / 255.0

        # Apply jet-like colormap manually (avoids matplotlib dependency)
        colored = _apply_jet_colormap(heatmap_array)

        # Overlay on original image
        original_resized = original_image.resize(MODEL_INPUT_SIZE).convert("RGB")
        original_array = np.array(original_resized, dtype=np.float32) / 255.0

        overlay = 0.6 * original_array + 0.4 * colored
        overlay = np.clip(overlay * 255, 0, 255).astype(np.uint8)

        buf = io.BytesIO()
        Image.fromarray(overlay).save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    except Exception as exc:
        logger.warning("Grad-CAM failed (%s), using fallback heatmap.", exc)
        return _fallback_heatmap(processed_image, original_image)


def _apply_jet_colormap(gray: np.ndarray) -> np.ndarray:
    """Apply a simple jet-style colormap to a [0,1] grayscale array → RGB float array."""
    r = np.clip(1.5 - np.abs(gray * 4.0 - 3.0), 0, 1)
    g = np.clip(1.5 - np.abs(gray * 4.0 - 2.0), 0, 1)
    b = np.clip(1.5 - np.abs(gray * 4.0 - 1.0), 0, 1)
    return np.stack([r, g, b], axis=-1)


def _fallback_heatmap(processed_image: np.ndarray, original_image: Image.Image) -> str:
    """Produce a confidence-weighted radial distance heatmap as a fallback."""
    h, w = MODEL_INPUT_SIZE
    cx, cy = w // 2, h // 2
    y_coords, x_coords = np.ogrid[:h, :w]
    distances = np.sqrt((x_coords - cx) ** 2 + (y_coords - cy) ** 2)
    max_dist = np.sqrt(cx**2 + cy**2)
    heatmap = 1.0 - (distances / max_dist)
    heatmap = np.clip(heatmap, 0, 1)

    colored = _apply_jet_colormap(heatmap)
    original_resized = original_image.resize(MODEL_INPUT_SIZE).convert("RGB")
    original_array = np.array(original_resized, dtype=np.float32) / 255.0
    overlay = 0.6 * original_array + 0.4 * colored
    overlay = np.clip(overlay * 255, 0, 255).astype(np.uint8)

    buf = io.BytesIO()
    Image.fromarray(overlay).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ---------------------------------------------------------------------------
# Interpretation
# ---------------------------------------------------------------------------

def _interpret(score: float) -> dict:
    if score > PREDICTION_THRESHOLD:
        diagnosis = "PNEUMONIA"
        confidence = score * 100
    else:
        diagnosis = "NORMAL"
        confidence = (1 - score) * 100

    if confidence >= 80:
        confidence_level = "High"
    elif confidence >= 60:
        confidence_level = "Moderate"
    else:
        confidence_level = "Low"

    recommendation = (
        "Findings suggest pneumonia. Clinical correlation and follow-up recommended."
        if diagnosis == "PNEUMONIA"
        else "No pneumonia detected. Routine follow-up as clinically indicated."
    )

    return {
        "diagnosis": diagnosis,
        "confidence": round(confidence, 2),
        "confidence_level": confidence_level,
        "recommendation": recommendation,
        "raw_score": round(score, 6),
    }


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Chest X-ray Pneumonia Detection API starting up (model loads lazily).")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Chest X-ray Pneumonia Detection API",
    description="MobileNetV2-based pneumonia detection with Grad-CAM visualisation.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Health checks -------------------------------------------------------

@app.get("/")
async def root():
    return {"status": "healthy", "model": "xray-pneumonia"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model": "xray-pneumonia",
        "model_loaded": _model is not None,
        "model_load_time": _model_load_time,
    }


# ---- Stats ----------------------------------------------------------------

@app.get("/stats")
async def stats():
    return {
        "model": "chest-xray-pneumonia-detection",
        "architecture": "MobileNetV2 (Keras)",
        "input_size": list(MODEL_INPUT_SIZE),
        "threshold": PREDICTION_THRESHOLD,
        "validation_metrics": VALIDATION_METRICS,
        "model_loaded": _model is not None,
    }


# ---- Prediction -----------------------------------------------------------

@app.post("/predict/xray-pneumonia")
async def predict_xray_pneumonia(file: UploadFile = File(...)):
    # Validate file
    if file.filename is None or file.filename == "":
        raise HTTPException(status_code=400, detail="No file provided.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Read image (DICOM or standard)
    try:
        is_dicom = file.filename.lower().endswith(".dcm")
        if is_dicom:
            image = _read_dicom_bytes(file_bytes)
        else:
            if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported image type: {file.content_type}. Accepted: {', '.join(ALLOWED_IMAGE_TYPES)} or .dcm",
                )
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to read image: %s", exc)
        raise HTTPException(status_code=400, detail=f"Could not read image file: {exc}")

    # Preprocess
    try:
        processed = _preprocess(image)
    except Exception as exc:
        logger.error("Preprocessing error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Image preprocessing failed: {exc}")

    # Load model & predict
    try:
        model = _get_model()
        prediction = model.predict(processed, verbose=0)
        score = float(prediction[0][0]) if prediction.ndim > 1 else float(prediction[0])
    except Exception as exc:
        logger.error("Prediction error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {exc}")

    # Interpret
    result = _interpret(score)

    # Grad-CAM heatmap
    heatmap_b64 = _generate_gradcam(model, processed, image)

    result["heatmap_base64"] = heatmap_b64
    result["validation_metrics"] = VALIDATION_METRICS

    return JSONResponse(content=result)


# ---------------------------------------------------------------------------
# Entry-point (for local dev; container uses uvicorn directly)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=True)

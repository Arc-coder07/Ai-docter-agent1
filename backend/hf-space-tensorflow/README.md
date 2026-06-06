---
title: Chest X-ray Pneumonia Detection
emoji: 🩻
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Chest X-ray Pneumonia Detection API

A **FastAPI** inference server that uses a **MobileNetV2 (Keras)** model to detect pneumonia from chest X-ray images, with **Grad-CAM** heatmap visualisation.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/health` | Detailed health status |
| `GET` | `/stats` | Model performance statistics |
| `POST` | `/predict/xray-pneumonia` | Predict pneumonia from an uploaded X-ray image |

## Usage

### Predict

```bash
curl -X POST \
  https://Amar-nadh-chest-xray-pneumonia-detection.hf.space/predict/xray-pneumonia \
  -F "file=@chest_xray.jpg"
```

### Response

```json
{
  "diagnosis": "PNEUMONIA",
  "confidence": 92.34,
  "confidence_level": "High",
  "recommendation": "Findings suggest pneumonia. Clinical correlation and follow-up recommended.",
  "raw_score": 0.923401,
  "heatmap_base64": "<base64 PNG>",
  "validation_metrics": {
    "accuracy": 86.0,
    "sensitivity": 96.4,
    "specificity": 74.8,
    "precision": 80.4,
    "roc_auc": 0.964
  }
}
```

## Supported Formats

- **Images**: JPEG, PNG, WebP, BMP, TIFF
- **Medical**: DICOM (`.dcm`)

## Model

- **Source**: [`ayushirathour/chest-xray-pneumonia-detection`](https://huggingface.co/ayushirathour/chest-xray-pneumonia-detection)
- **Architecture**: MobileNetV2
- **Input**: 224 × 224 RGB
- **Validated on**: 485 independent samples

## ⚠️ Disclaimer

This tool is for **educational and research purposes only**. It is **not** a substitute for professional medical diagnosis.

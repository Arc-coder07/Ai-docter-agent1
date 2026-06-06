---
title: MedSage PyTorch Models
emoji: 🧠
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# MedSage PyTorch Models API

FastAPI inference server serving 4 medical imaging PyTorch models.

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check |
| `/health` | GET | Health check |
| `/predict/brain-tumor` | POST | Brain Tumor Ensemble (DenseNet-169 + EfficientNet-B3) |
| `/predict/brain-tumor-vit` | POST | Brain Tumor ViT Classification |
| `/predict/covid-xray` | POST | COVID Chest X-ray (DenseNet-121) |
| `/predict/skin-lesion` | POST | Skin Lesion U-Net Segmentation |

## Models

- **Brain Tumor Ensemble**: DenseNet-169 + EfficientNet-B3 ensemble with Monte Carlo Dropout uncertainty, Grad-CAM XAI, robustness testing, and CDSS scoring.
- **Brain Tumor ViT**: Vision Transformer from `Hemgg/brain-tumor-classification`.
- **COVID X-ray**: DenseNet-121 binary classifier (COVID-19 vs Normal).
- **Skin Lesion**: U-Net segmentation model for skin lesion detection.

## Usage

All prediction endpoints accept a multipart file upload with field name `file`.

```bash
curl -X POST -F "file=@brain_scan.jpg" https://Amar-nadh-medsage-pytorch-models.hf.space/predict/brain-tumor
```

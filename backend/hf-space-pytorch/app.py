"""
MedSage PyTorch Models – FastAPI Inference Server
Serves 4 medical imaging models on a single HuggingFace Space.
All models are lazily loaded on first request to avoid startup timeout.
"""

from __future__ import annotations

import base64
import io
import logging
import threading
import traceback
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from PIL import Image
from scipy.ndimage import gaussian_filter

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medsage")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="MedSage PyTorch Models", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_CACHE = "/tmp/model_cache"

# ============================= MODEL DEFINITIONS =============================

# ----- Brain Tumor Ensemble -----

BRAIN_TUMOR_CLASSES = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]


class DenseNet169Classifier(nn.Module):
    def __init__(self, num_classes: int = 4):
        super().__init__()
        self.base_model = models.densenet169(weights=None)
        num_features = self.base_model.classifier.in_features
        self.base_model.classifier = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.25),
            nn.Linear(512, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.base_model(x)


class EfficientNetB3Classifier(nn.Module):
    def __init__(self, num_classes: int = 4):
        super().__init__()
        self.base_model = models.efficientnet_b3(weights=None)
        num_features = self.base_model.classifier[1].in_features
        self.base_model.classifier = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.25),
            nn.Linear(512, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.base_model(x)


# ----- Skin Lesion U-Net -----


class UNet(nn.Module):
    def __init__(self, n_channels: int, n_classes: int):
        super(UNet, self).__init__()
        self.n_channels = n_channels
        self.n_classes = n_classes
        self.conv1 = nn.Conv2d(self.n_channels, 64, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(128, 256, kernel_size=3, padding=1)
        self.conv4 = nn.Conv2d(256, 512, kernel_size=3, padding=1)
        self.conv5 = nn.Conv2d(512, 1024, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)
        self.upconv1 = nn.ConvTranspose2d(1024, 512, kernel_size=2, stride=2)
        self.conv6 = nn.Conv2d(1024, 512, kernel_size=3, padding=1)
        self.upconv2 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
        self.conv7 = nn.Conv2d(512, 256, kernel_size=3, padding=1)
        self.upconv3 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.conv8 = nn.Conv2d(256, 128, kernel_size=3, padding=1)
        self.upconv4 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.conv9 = nn.Conv2d(128, 64, kernel_size=3, padding=1)
        self.conv10 = nn.Conv2d(64, self.n_classes, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x1 = F.relu(self.conv1(x))
        x2 = F.relu(self.conv2(self.pool(x1)))
        x3 = F.relu(self.conv3(self.pool(x2)))
        x4 = F.relu(self.conv4(self.pool(x3)))
        x5 = F.relu(self.conv5(self.pool(x4)))
        x6 = F.relu(self.upconv1(x5))
        x6 = torch.cat([x4, x6], dim=1)
        x6 = F.relu(self.conv6(x6))
        x7 = F.relu(self.upconv2(x6))
        x7 = torch.cat([x3, x7], dim=1)
        x7 = F.relu(self.conv7(x7))
        x8 = F.relu(self.upconv3(x7))
        x8 = torch.cat([x2, x8], dim=1)
        x8 = F.relu(self.conv8(x8))
        x9 = F.relu(self.upconv4(x8))
        x9 = torch.cat([x1, x9], dim=1)
        x9 = F.relu(self.conv9(x9))
        x10 = self.conv10(x9)
        return x10


# ========================== LAZY MODEL REGISTRY =============================

_models: Dict[str, Any] = {}
_locks: Dict[str, threading.Lock] = {
    "brain-tumor-densenet": threading.Lock(),
    "brain-tumor-efficientnet": threading.Lock(),
    "brain-tumor-vit-model": threading.Lock(),
    "brain-tumor-vit-processor": threading.Lock(),
    "covid-xray": threading.Lock(),
    "skin-lesion": threading.Lock(),
}


def _load_brain_tumor_densenet() -> DenseNet169Classifier:
    key = "brain-tumor-densenet"
    if key not in _models:
        with _locks[key]:
            if key not in _models:
                logger.info("Loading DenseNet-169 brain tumor model …")
                path = hf_hub_download(
                    repo_id="Amar-nadh/medsage-brain-tumor-ensemble",
                    filename="densenet169_best.pth",
                    cache_dir=MODEL_CACHE,
                )
                model = DenseNet169Classifier(num_classes=4).to(DEVICE)
                ckpt = torch.load(path, map_location=DEVICE, weights_only=False)
                sd = ckpt.get("model_state_dict", ckpt)
                model.load_state_dict(sd)
                model.eval()
                _models[key] = model
                logger.info("DenseNet-169 loaded ✓")
    return _models[key]


def _load_brain_tumor_efficientnet() -> EfficientNetB3Classifier:
    key = "brain-tumor-efficientnet"
    if key not in _models:
        with _locks[key]:
            if key not in _models:
                logger.info("Loading EfficientNet-B3 brain tumor model …")
                path = hf_hub_download(
                    repo_id="Amar-nadh/medsage-brain-tumor-ensemble",
                    filename="efficientnetb3_best.pth",
                    cache_dir=MODEL_CACHE,
                )
                model = EfficientNetB3Classifier(num_classes=4).to(DEVICE)
                ckpt = torch.load(path, map_location=DEVICE, weights_only=False)
                sd = ckpt.get("model_state_dict", ckpt)
                model.load_state_dict(sd)
                model.eval()
                _models[key] = model
                logger.info("EfficientNet-B3 loaded ✓")
    return _models[key]


def _load_brain_tumor_vit():
    key_m = "brain-tumor-vit-model"
    key_p = "brain-tumor-vit-processor"
    if key_m not in _models:
        with _locks[key_m]:
            if key_m not in _models:
                logger.info("Loading Brain Tumor ViT model …")
                from transformers import (
                    AutoImageProcessor,
                    AutoModelForImageClassification,
                )

                repo = "Hemgg/brain-tumor-classification"
                processor = AutoImageProcessor.from_pretrained(
                    repo, cache_dir=MODEL_CACHE
                )
                model = AutoModelForImageClassification.from_pretrained(
                    repo, cache_dir=MODEL_CACHE
                )
                model.eval()
                _models[key_m] = model
                _models[key_p] = processor
                logger.info("Brain Tumor ViT loaded ✓")
    return _models[key_m], _models[key_p]


def _load_covid_xray() -> nn.Module:
    key = "covid-xray"
    if key not in _models:
        with _locks[key]:
            if key not in _models:
                logger.info("Loading COVID X-ray DenseNet-121 model …")
                path = hf_hub_download(
                    repo_id="Amar-nadh/medsage-covid-xray-densenet121",
                    filename="covid_chest_xray_model.pth",
                    cache_dir=MODEL_CACHE,
                )
                model = models.densenet121(weights=None)
                num_ftrs = model.classifier.in_features
                model.classifier = nn.Linear(num_ftrs, 2)
                model.load_state_dict(
                    torch.load(path, map_location=DEVICE, weights_only=True)
                )
                model.to(DEVICE)
                model.eval()
                _models[key] = model
                logger.info("COVID X-ray model loaded ✓")
    return _models[key]


def _load_skin_lesion() -> UNet:
    key = "skin-lesion"
    if key not in _models:
        with _locks[key]:
            if key not in _models:
                logger.info("Loading Skin Lesion U-Net model …")
                path = hf_hub_download(
                    repo_id="Amar-nadh/medsage-skin-lesion-unet",
                    filename="checkpointN25_.pth.tar",
                    cache_dir=MODEL_CACHE,
                )
                model = UNet(n_channels=3, n_classes=1).to(DEVICE)
                ckpt = torch.load(path, map_location=DEVICE, weights_only=False)
                model.load_state_dict(ckpt["state_dict"])
                model.eval()
                _models[key] = model
                logger.info("Skin Lesion U-Net loaded ✓")
    return _models[key]


# ========================== TRANSFORMS =======================================

brain_tumor_transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)

covid_xray_transform = transforms.Compose(
    [
        transforms.Resize((150, 150)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


# ========================== HELPER UTILITIES =================================


def _read_image(file_bytes: bytes) -> Image.Image:
    """Read uploaded bytes into a PIL RGB Image."""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        return img
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}")


def _validate_medical_image(img: Image.Image) -> bool:
    """Basic validation that image has reasonable dimensions and content."""
    w, h = img.size
    if w < 10 or h < 10:
        return False
    arr = np.array(img)
    if arr.std() < 1.0:
        return False
    return True


def _apply_clahe(img: Image.Image) -> Image.Image:
    """Apply CLAHE enhancement to improve contrast."""
    arr = np.array(img)
    lab = cv2.cvtColor(arr, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
    return Image.fromarray(enhanced)


def _numpy_to_base64_png(arr: np.ndarray) -> str:
    """Encode a numpy HxW or HxWxC array to a base64 PNG string."""
    if arr.dtype != np.uint8:
        arr_norm = arr.astype(np.float64)
        mn, mx = arr_norm.min(), arr_norm.max()
        if mx - mn > 0:
            arr_norm = (arr_norm - mn) / (mx - mn) * 255.0
        arr = arr_norm.astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ========================== BRAIN TUMOR PIPELINE =============================


def _predict_single_model(
    model: nn.Module, tensor: torch.Tensor
) -> tuple[int, float, List[float]]:
    """Run a single model and return (class_idx, confidence, probabilities)."""
    with torch.no_grad():
        logits = model(tensor)
        probs = F.softmax(logits, dim=-1)[0]
    conf, idx = probs.max(0)
    return idx.item(), conf.item(), probs.cpu().tolist()


def predict_with_uncertainty(
    model: nn.Module, tensor: torch.Tensor, T: int = 20
) -> Dict[str, Any]:
    """
    Monte Carlo Dropout uncertainty estimation.
    Enables dropout at inference time and runs T forward passes.
    """
    model.train()  # enable dropout
    predictions: List[np.ndarray] = []
    for _ in range(T):
        with torch.no_grad():
            logits = model(tensor)
            probs = F.softmax(logits, dim=-1)[0].cpu().numpy()
            predictions.append(probs)
    model.eval()

    preds = np.stack(predictions, axis=0)  # (T, C)
    mean_probs = preds.mean(axis=0)
    std_probs = preds.std(axis=0)
    predictive_entropy = -np.sum(mean_probs * np.log(mean_probs + 1e-10))
    pred_class = int(np.argmax(mean_probs))
    confidence = float(mean_probs[pred_class])
    uncertainty = float(std_probs[pred_class])

    return {
        "predicted_class": pred_class,
        "confidence": confidence,
        "mean_probabilities": mean_probs.tolist(),
        "std_probabilities": std_probs.tolist(),
        "predictive_entropy": float(predictive_entropy),
        "uncertainty": uncertainty,
    }


def _get_target_layer(model: nn.Module, model_type: str):
    """Return the appropriate target layer for Grad-CAM."""
    if model_type == "densenet":
        return model.base_model.features[-1]
    elif model_type == "efficientnet":
        return model.base_model.features[-1]
    return None


def _generate_gradcam(
    model: nn.Module,
    tensor: torch.Tensor,
    target_class: int,
    target_layer: nn.Module,
) -> np.ndarray:
    """Generate a Grad-CAM heatmap for the given target class."""
    activations: List[torch.Tensor] = []
    gradients: List[torch.Tensor] = []

    def fwd_hook(module, inp, out):
        activations.append(out.detach())

    def bwd_hook(module, grad_in, grad_out):
        gradients.append(grad_out[0].detach())

    fh = target_layer.register_forward_hook(fwd_hook)
    bh = target_layer.register_full_backward_hook(bwd_hook)

    model.eval()
    tensor_input = tensor.clone().requires_grad_(True)
    output = model(tensor_input)
    model.zero_grad()
    target = output[0, target_class]
    target.backward()

    fh.remove()
    bh.remove()

    act = activations[0][0]  # (C, H, W)
    grad = gradients[0][0]  # (C, H, W)

    weights = grad.mean(dim=(1, 2))  # (C,)
    cam = (weights[:, None, None] * act).sum(dim=0)  # (H, W)
    cam = F.relu(cam)
    cam = cam.cpu().numpy()
    if cam.max() > 0:
        cam = cam / cam.max()
    cam = cv2.resize(cam, (224, 224))
    return cam


def _generate_gradcam_pp(
    model: nn.Module,
    tensor: torch.Tensor,
    target_class: int,
    target_layer: nn.Module,
) -> np.ndarray:
    """Generate a Grad-CAM++ heatmap."""
    activations: List[torch.Tensor] = []
    gradients: List[torch.Tensor] = []

    def fwd_hook(module, inp, out):
        activations.append(out.detach())

    def bwd_hook(module, grad_in, grad_out):
        gradients.append(grad_out[0].detach())

    fh = target_layer.register_forward_hook(fwd_hook)
    bh = target_layer.register_full_backward_hook(bwd_hook)

    model.eval()
    tensor_input = tensor.clone().requires_grad_(True)
    output = model(tensor_input)
    model.zero_grad()
    score = output[0, target_class]
    score.backward()

    fh.remove()
    bh.remove()

    act = activations[0][0]
    grad = gradients[0][0]

    grad2 = grad ** 2
    grad3 = grad ** 3
    sum_act = act.sum(dim=(1, 2), keepdim=True)
    alpha = grad2 / (2 * grad2 + sum_act * grad3 + 1e-8)
    weights = (alpha * F.relu(grad)).sum(dim=(1, 2))
    cam = (weights[:, None, None] * act).sum(dim=0)
    cam = F.relu(cam).cpu().numpy()
    if cam.max() > 0:
        cam = cam / cam.max()
    cam = cv2.resize(cam, (224, 224))
    return cam


def _generate_layercam(
    model: nn.Module,
    tensor: torch.Tensor,
    target_class: int,
    target_layer: nn.Module,
) -> np.ndarray:
    """Generate a LayerCAM heatmap."""
    activations: List[torch.Tensor] = []
    gradients: List[torch.Tensor] = []

    def fwd_hook(module, inp, out):
        activations.append(out.detach())

    def bwd_hook(module, grad_in, grad_out):
        gradients.append(grad_out[0].detach())

    fh = target_layer.register_forward_hook(fwd_hook)
    bh = target_layer.register_full_backward_hook(bwd_hook)

    model.eval()
    tensor_input = tensor.clone().requires_grad_(True)
    output = model(tensor_input)
    model.zero_grad()
    score = output[0, target_class]
    score.backward()

    fh.remove()
    bh.remove()

    act = activations[0][0]
    grad = gradients[0][0]

    cam = (F.relu(grad) * act).sum(dim=0)
    cam = F.relu(cam).cpu().numpy()
    if cam.max() > 0:
        cam = cam / cam.max()
    cam = cv2.resize(cam, (224, 224))
    return cam


def hierarchical_xai(
    model: nn.Module,
    tensor: torch.Tensor,
    target_class: int,
    model_type: str,
) -> Dict[str, str]:
    """Generate multiple XAI heatmaps and return as base64 PNGs."""
    target_layer = _get_target_layer(model, model_type)
    if target_layer is None:
        return {}

    result: Dict[str, str] = {}
    try:
        gc = _generate_gradcam(model, tensor, target_class, target_layer)
        heatmap_gc = cv2.applyColorMap((gc * 255).astype(np.uint8), cv2.COLORMAP_JET)
        result["gradcam"] = _numpy_to_base64_png(
            cv2.cvtColor(heatmap_gc, cv2.COLOR_BGR2RGB)
        )
    except Exception:
        pass

    try:
        gcpp = _generate_gradcam_pp(model, tensor, target_class, target_layer)
        heatmap_pp = cv2.applyColorMap(
            (gcpp * 255).astype(np.uint8), cv2.COLORMAP_JET
        )
        result["gradcam_pp"] = _numpy_to_base64_png(
            cv2.cvtColor(heatmap_pp, cv2.COLOR_BGR2RGB)
        )
    except Exception:
        pass

    try:
        lc = _generate_layercam(model, tensor, target_class, target_layer)
        heatmap_lc = cv2.applyColorMap((lc * 255).astype(np.uint8), cv2.COLORMAP_JET)
        result["layercam"] = _numpy_to_base64_png(
            cv2.cvtColor(heatmap_lc, cv2.COLOR_BGR2RGB)
        )
    except Exception:
        pass

    return result


def test_robustness(
    model: nn.Module, tensor: torch.Tensor, original_pred: int
) -> Dict[str, Any]:
    """Test model robustness against perturbations."""
    perturbations: Dict[str, torch.Tensor] = {}

    # Gaussian noise
    noise = torch.randn_like(tensor) * 0.05
    perturbations["gaussian_noise"] = tensor + noise

    # Brightness change
    perturbations["brightness"] = tensor * 1.2

    # Scanner noise (salt & pepper style via uniform noise)
    scanner_noise = torch.rand_like(tensor) * 0.1 - 0.05
    perturbations["scanner_noise"] = tensor + scanner_noise

    # Gaussian blur (apply via numpy/scipy)
    blurred = tensor.clone().cpu().numpy()
    for c in range(blurred.shape[1]):
        blurred[0, c] = gaussian_filter(blurred[0, c], sigma=1.0)
    perturbations["blur"] = torch.tensor(blurred, dtype=tensor.dtype, device=DEVICE)

    results: Dict[str, Any] = {}
    consistent = 0
    total = len(perturbations)

    model.eval()
    for name, perturbed in perturbations.items():
        perturbed = perturbed.to(DEVICE)
        with torch.no_grad():
            logits = model(perturbed)
            probs = F.softmax(logits, dim=-1)[0]
            pred = probs.argmax().item()
            conf = probs[pred].item()
        is_consistent = pred == original_pred
        if is_consistent:
            consistent += 1
        results[name] = {
            "predicted_class": BRAIN_TUMOR_CLASSES[pred],
            "confidence": round(conf, 4),
            "consistent": is_consistent,
        }

    results["robustness_score"] = round(consistent / total, 4)
    return results


def compute_cdss(
    confidence: float,
    uncertainty: float,
    robustness_score: float,
    entropy: float,
) -> Dict[str, Any]:
    """Compute Clinical Decision Support System score."""
    # Weighted scoring
    w_conf = 0.35
    w_unc = 0.25
    w_rob = 0.25
    w_ent = 0.15

    # Normalize components to [0, 1] where higher is better
    conf_score = confidence
    unc_score = max(0, 1.0 - uncertainty * 5)  # lower uncertainty is better
    rob_score = robustness_score
    ent_score = max(0, 1.0 - entropy / 2.0)  # lower entropy is better

    cdss_score = (
        w_conf * conf_score
        + w_unc * unc_score
        + w_rob * rob_score
        + w_ent * ent_score
    )
    cdss_score = round(min(1.0, max(0.0, cdss_score)), 4)

    if cdss_score >= 0.8:
        reliability = "HIGH"
    elif cdss_score >= 0.5:
        reliability = "MODERATE"
    else:
        reliability = "LOW"

    return {
        "cdss_score": cdss_score,
        "reliability": reliability,
        "components": {
            "confidence_contribution": round(w_conf * conf_score, 4),
            "uncertainty_contribution": round(w_unc * unc_score, 4),
            "robustness_contribution": round(w_rob * rob_score, 4),
            "entropy_contribution": round(w_ent * ent_score, 4),
        },
    }


# ========================== ENDPOINTS ========================================


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "models": ["brain-tumor", "brain-tumor-vit", "covid-xray", "skin-lesion"],
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models": ["brain-tumor", "brain-tumor-vit", "covid-xray", "skin-lesion"],
    }


# ----- 1. Brain Tumor Ensemble -----


@app.post("/predict/brain-tumor")
async def predict_brain_tumor(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        img = _read_image(file_bytes)

        if not _validate_medical_image(img):
            raise HTTPException(
                status_code=400,
                detail="Image failed validation – too small or uniform.",
            )

        # Enhance with CLAHE
        img_enhanced = _apply_clahe(img)
        tensor = brain_tumor_transform(img_enhanced).unsqueeze(0).to(DEVICE)

        # Load models
        densenet = _load_brain_tumor_densenet()
        efficientnet = _load_brain_tumor_efficientnet()

        # Run both models
        dn_idx, dn_conf, dn_probs = _predict_single_model(densenet, tensor)
        en_idx, en_conf, en_probs = _predict_single_model(efficientnet, tensor)

        # Pick higher-confidence model
        if dn_conf >= en_conf:
            best_model = densenet
            best_model_type = "densenet"
            pred_idx = dn_idx
            pred_conf = dn_conf
            pred_probs = dn_probs
            winning_model = "DenseNet-169"
        else:
            best_model = efficientnet
            best_model_type = "efficientnet"
            pred_idx = en_idx
            pred_conf = en_conf
            pred_probs = en_probs
            winning_model = "EfficientNet-B3"

        prediction = BRAIN_TUMOR_CLASSES[pred_idx]

        # Monte Carlo Dropout uncertainty
        mc_result = predict_with_uncertainty(best_model, tensor, T=20)

        # XAI heatmaps
        xai_maps = hierarchical_xai(best_model, tensor, pred_idx, best_model_type)

        # Robustness testing
        robustness = test_robustness(best_model, tensor, pred_idx)

        # CDSS score
        cdss = compute_cdss(
            confidence=mc_result["confidence"],
            uncertainty=mc_result["uncertainty"],
            robustness_score=robustness.get("robustness_score", 0.0),
            entropy=mc_result["predictive_entropy"],
        )

        return {
            "prediction": prediction,
            "confidence": round(pred_conf, 4),
            "probabilities": {
                BRAIN_TUMOR_CLASSES[i]: round(p, 4) for i, p in enumerate(pred_probs)
            },
            "winning_model": winning_model,
            "ensemble_details": {
                "densenet169": {
                    "prediction": BRAIN_TUMOR_CLASSES[dn_idx],
                    "confidence": round(dn_conf, 4),
                    "probabilities": {
                        BRAIN_TUMOR_CLASSES[i]: round(p, 4)
                        for i, p in enumerate(dn_probs)
                    },
                },
                "efficientnet_b3": {
                    "prediction": BRAIN_TUMOR_CLASSES[en_idx],
                    "confidence": round(en_conf, 4),
                    "probabilities": {
                        BRAIN_TUMOR_CLASSES[i]: round(p, 4)
                        for i, p in enumerate(en_probs)
                    },
                },
            },
            "uncertainty": {
                "method": "monte_carlo_dropout",
                "T": 20,
                "mean_confidence": round(mc_result["confidence"], 4),
                "uncertainty_std": round(mc_result["uncertainty"], 4),
                "predictive_entropy": round(mc_result["predictive_entropy"], 4),
                "mean_probabilities": {
                    BRAIN_TUMOR_CLASSES[i]: round(p, 4)
                    for i, p in enumerate(mc_result["mean_probabilities"])
                },
                "std_probabilities": {
                    BRAIN_TUMOR_CLASSES[i]: round(p, 4)
                    for i, p in enumerate(mc_result["std_probabilities"])
                },
            },
            "xai_heatmaps": xai_maps,
            "robustness": robustness,
            "cdss": cdss,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Brain tumor prediction error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")


# ----- 2. Brain Tumor ViT -----


@app.post("/predict/brain-tumor-vit")
async def predict_brain_tumor_vit(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        img = _read_image(file_bytes)

        vit_model, processor = _load_brain_tumor_vit()

        inputs = processor(images=img, return_tensors="pt")
        with torch.no_grad():
            outputs = vit_model(**inputs)
            probs = F.softmax(outputs.logits, dim=-1)
            idx = probs.argmax(-1).item()
            confidence = probs[0][idx].item()

        vit_classes = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]
        all_probs = probs[0].cpu().tolist()

        return {
            "prediction": vit_classes[idx],
            "confidence": round(confidence, 4),
            "probabilities": {
                vit_classes[i]: round(p, 4) for i, p in enumerate(all_probs)
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Brain tumor ViT prediction error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")


# ----- 3. COVID Chest X-ray -----


@app.post("/predict/covid-xray")
async def predict_covid_xray(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        img = _read_image(file_bytes)

        model = _load_covid_xray()
        tensor = covid_xray_transform(img).unsqueeze(0).to(DEVICE)

        covid_classes = ["covid19", "normal"]

        with torch.no_grad():
            logits = model(tensor)
            probs = F.softmax(logits, dim=-1)[0]
            idx = probs.argmax().item()
            confidence = probs[idx].item()

        all_probs = probs.cpu().tolist()

        return {
            "prediction": covid_classes[idx],
            "confidence": round(confidence, 4),
            "probabilities": {
                covid_classes[i]: round(p, 4) for i, p in enumerate(all_probs)
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"COVID X-ray prediction error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")


# ----- 4. Skin Lesion Segmentation -----


@app.post("/predict/skin-lesion")
async def predict_skin_lesion(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        # Decode with OpenCV
        nparr = np.frombuffer(file_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        original_h, original_w = img_rgb.shape[:2]

        # Preprocess
        img_norm = img_rgb.astype(np.float64) / 255.0
        img_resized = cv2.resize(img_norm, (256, 256))
        img_tensor = (
            torch.tensor(img_resized, dtype=torch.float32)
            .unsqueeze(0)
            .permute(0, 3, 1, 2)
            .to(DEVICE)
        )

        model = _load_skin_lesion()

        with torch.no_grad():
            logits = model(img_tensor).squeeze()
            probs = torch.sigmoid(logits).cpu().numpy()

        mask = (probs > 0.5).astype(np.float32)
        lesion_pixels = mask.sum()
        total_pixels = mask.size
        lesion_detected = bool(lesion_pixels > 0)

        if lesion_detected:
            confidence = float(probs[mask > 0.5].mean())
        else:
            confidence = float((1.0 - probs).mean())

        # Generate overlay: resize mask back to original, overlay on original image
        mask_resized = cv2.resize(mask, (original_w, original_h))
        overlay = img_rgb.copy()
        # Red overlay for lesion
        lesion_color = np.array([255, 0, 0], dtype=np.uint8)
        lesion_mask_3ch = np.stack([mask_resized] * 3, axis=-1)
        overlay = (
            overlay * (1 - 0.4 * lesion_mask_3ch) + lesion_color * 0.4 * lesion_mask_3ch
        ).astype(np.uint8)

        mask_base64 = _numpy_to_base64_png(overlay)

        return {
            "success": True,
            "confidence": round(confidence, 4),
            "lesion_detected": lesion_detected,
            "lesion_area_fraction": round(float(lesion_pixels / total_pixels), 4),
            "mask_base64": mask_base64,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Skin lesion prediction error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")


# ========================== MAIN =============================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)

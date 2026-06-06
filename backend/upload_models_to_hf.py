"""
Upload local ML model files to HuggingFace Model Repos.
Features: retry logic, resume support, uploads one file at a time.
Run: python3 upload_models_to_hf.py
"""

from huggingface_hub import HfApi, create_repo, list_repo_files
import os
import time

api = HfApi()
USERNAME = "Amar-nadh"

BASE = os.path.dirname(os.path.abspath(__file__))

MODELS = [
    {
        "repo_name": "medsage-brain-tumor-ensemble",
        "description": "Brain Tumor Detection - DenseNet-169 + EfficientNet-B3 Ensemble (PyTorch). Classifies MRI images into: Glioma, Meningioma, No Tumor, Pituitary.",
        "files": [
            os.path.join(BASE, "app/agents/brain_tumor_detection/models/densenet169_best.pth"),
            os.path.join(BASE, "app/agents/brain_tumor_detection/models/efficientnetb3_best.pth"),
        ],
        "tags": ["pytorch", "image-classification", "medical", "brain-tumor", "mri"],
    },
    {
        "repo_name": "medsage-covid-xray-densenet121",
        "description": "COVID Chest X-Ray Detection - DenseNet-121 (PyTorch). Binary classification: covid19 vs normal.",
        "files": [
            os.path.join(BASE, "app/agents/image_analysis_agent/chest_xray_agent/models/covid_chest_xray_model.pth"),
        ],
        "tags": ["pytorch", "image-classification", "medical", "chest-xray", "covid19"],
    },
    {
        "repo_name": "medsage-skin-lesion-unet",
        "description": "Skin Lesion Segmentation - U-Net (PyTorch). Binary segmentation of dermatological images.",
        "files": [
            os.path.join(BASE, "app/agents/image_analysis_agent/skin_lesion_agent/models/checkpointN25_.pth.tar"),
        ],
        "tags": ["pytorch", "image-segmentation", "medical", "skin-lesion", "unet"],
    },
]


def create_model_card(model_info: dict) -> str:
    tags_yaml = "\n".join(f"- {t}" for t in model_info["tags"])
    filenames = "\n".join(f"- `{os.path.basename(f)}`" for f in model_info["files"])
    return f"""---
license: mit
tags:
{tags_yaml}
library_name: pytorch
---

# {model_info['repo_name']}

{model_info['description']}

## Files

{filenames}

## Usage

These model weights are served via a HuggingFace Space (FastAPI inference server) as part of the MedSage AI Doctor project.

## Project

Part of the [MedSage AI Doctor Agent](https://github.com/Arc-coder07/Ai-docter-agent) project.
"""


def file_exists_in_repo(repo_id: str, filename: str) -> bool:
    """Check if a file already exists in the HF repo (for resume support)."""
    try:
        existing_files = list_repo_files(repo_id, repo_type="model")
        return filename in existing_files
    except Exception:
        return False


def upload_with_retry(filepath: str, repo_id: str, max_retries: int = 3):
    """Upload a single file with retry logic."""
    filename = os.path.basename(filepath)
    size_mb = os.path.getsize(filepath) / (1024 * 1024)

    # Check if already uploaded (resume support)
    if file_exists_in_repo(repo_id, filename):
        print(f"   ⏭️  {filename} already exists in repo — skipping")
        return True

    for attempt in range(1, max_retries + 1):
        try:
            print(f"   ⬆️  Uploading {filename} ({size_mb:.1f} MB) — attempt {attempt}/{max_retries}")
            api.upload_file(
                path_or_fileobj=filepath,
                path_in_repo=filename,
                repo_id=repo_id,
                repo_type="model",
            )
            print(f"   ✅ Uploaded {filename}")
            return True
        except Exception as e:
            print(f"   ⚠️  Attempt {attempt} failed: {type(e).__name__}: {e}")
            if attempt < max_retries:
                wait = 10 * attempt  # 10s, 20s, 30s
                print(f"   ⏳ Retrying in {wait}s...")
                time.sleep(wait)
            else:
                print(f"   ❌ FAILED after {max_retries} attempts: {filename}")
                return False


def upload_model(model_info: dict) -> bool:
    repo_id = f"{USERNAME}/{model_info['repo_name']}"
    all_ok = True

    print(f"\n{'='*60}")
    print(f"📦 Repo: {repo_id}")

    # 1. Create the repo
    try:
        create_repo(repo_id, repo_type="model", exist_ok=True)
        print(f"   ✅ Repo ready")
    except Exception as e:
        print(f"   ⚠️  Repo creation: {e}")

    # 2. Upload model card
    if not file_exists_in_repo(repo_id, "README.md"):
        print(f"   📝 Uploading model card...")
        try:
            model_card = create_model_card(model_info)
            api.upload_file(
                path_or_fileobj=model_card.encode("utf-8"),
                path_in_repo="README.md",
                repo_id=repo_id,
                repo_type="model",
            )
        except Exception as e:
            print(f"   ⚠️  Model card upload failed: {e}")
    else:
        print(f"   ⏭️  README.md already exists — skipping")

    # 3. Upload each model file
    for filepath in model_info["files"]:
        if not os.path.exists(filepath):
            print(f"   ❌ File not found: {filepath}")
            all_ok = False
            continue
        if not upload_with_retry(filepath, repo_id):
            all_ok = False

    if all_ok:
        print(f"   🎉 Done! → https://huggingface.co/{repo_id}")
    else:
        print(f"   ⚠️  Some files failed. Re-run the script to retry.")

    return all_ok


if __name__ == "__main__":
    print("🚀 MedSage Model Upload to HuggingFace (with resume support)")
    print(f"   Account: {USERNAME}")
    print(f"   Models to upload: {len(MODELS)}")

    results = []
    for model in MODELS:
        ok = upload_model(model)
        results.append((model["repo_name"], ok))

    print(f"\n{'='*60}")
    print("📊 Results:")
    for name, ok in results:
        status = "✅" if ok else "❌ RETRY NEEDED"
        print(f"  {status} https://huggingface.co/{USERNAME}/{name}")

    if all(ok for _, ok in results):
        print("\n✅ All models uploaded successfully!")
    else:
        print("\n⚠️  Some uploads failed. Re-run the script — it will skip already-uploaded files.")

    print("\n📌 Already on HuggingFace (no upload needed):")
    print("  → ayushirathour/chest-xray-pneumonia-detection (MobileNetV2, .h5)")
    print("  → Hemgg/brain-tumor-classification (ViT)")

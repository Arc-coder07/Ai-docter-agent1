"""
Push both HuggingFace Spaces (PyTorch + TensorFlow) to HuggingFace.
Run: python3 push_spaces_to_hf.py
"""

from huggingface_hub import HfApi, create_repo
import os

api = HfApi()
USERNAME = "Amar-nadh"

SPACES = [
    {
        "repo_name": "medsage-pytorch",
        "local_dir": os.path.join(os.path.dirname(os.path.abspath(__file__)), "hf-space-pytorch"),
        "description": "MedSage PyTorch Inference Server - Brain Tumor (Ensemble + ViT), COVID X-ray, Skin Lesion",
    },
    {
        "repo_name": "medsage-tensorflow",
        "local_dir": os.path.join(os.path.dirname(os.path.abspath(__file__)), "hf-space-tensorflow"),
        "description": "MedSage TensorFlow Inference Server - Chest X-ray Pneumonia Detection (MobileNetV2)",
    },
]


def push_space(space_info: dict):
    repo_id = f"{USERNAME}/{space_info['repo_name']}"
    local_dir = space_info["local_dir"]

    print(f"\n{'='*60}")
    print(f"🚀 Pushing Space: {repo_id}")
    print(f"   Local dir: {local_dir}")

    # 1. Create the Space repo (Docker SDK type)
    try:
        create_repo(
            repo_id,
            repo_type="space",
            space_sdk="docker",
            exist_ok=True,
        )
        print(f"   ✅ Space repo created/exists: https://huggingface.co/spaces/{repo_id}")
    except Exception as e:
        print(f"   ⚠️  Repo creation: {e}")

    # 2. Upload all files from the local directory
    files_to_upload = []
    for filename in os.listdir(local_dir):
        filepath = os.path.join(local_dir, filename)
        if os.path.isfile(filepath) and not filename.startswith('.'):
            files_to_upload.append((filepath, filename))

    print(f"   📁 Files to upload: {[f[1] for f in files_to_upload]}")

    for filepath, filename in files_to_upload:
        size_kb = os.path.getsize(filepath) / 1024
        print(f"   ⬆️  Uploading {filename} ({size_kb:.1f} KB)...")
        try:
            api.upload_file(
                path_or_fileobj=filepath,
                path_in_repo=filename,
                repo_id=repo_id,
                repo_type="space",
            )
            print(f"   ✅ {filename} uploaded")
        except Exception as e:
            print(f"   ❌ Failed to upload {filename}: {e}")
            return False

    print(f"   🎉 Space deployed! → https://huggingface.co/spaces/{repo_id}")
    return True


if __name__ == "__main__":
    print("🚀 Pushing MedSage HuggingFace Spaces")
    print(f"   Account: {USERNAME}")

    results = []
    for space in SPACES:
        ok = push_space(space)
        results.append((space["repo_name"], ok))

    print(f"\n{'='*60}")
    print("📊 Results:")
    for name, ok in results:
        status = "✅" if ok else "❌"
        print(f"  {status} https://huggingface.co/spaces/{USERNAME}/{name}")

    if all(ok for _, ok in results):
        print("\n✅ All Spaces pushed successfully!")
        print("\n⏳ HuggingFace will now build the Docker containers.")
        print("   This typically takes 5-10 minutes per Space.")
        print(f"\n   Monitor builds at:")
        for space in SPACES:
            print(f"   → https://huggingface.co/spaces/{USERNAME}/{space['repo_name']}")
    else:
        print("\n⚠️  Some pushes failed. Check errors above.")

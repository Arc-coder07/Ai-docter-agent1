"""
Test script for all three ML models in the Medical AI Assistant.
Tests: Brain Tumor Classification, Chest X-ray COVID Detection, Skin Lesion Segmentation.

Uses synthetic test images since real medical images aren't available locally.
"""
import os
import sys
import time
import numpy as np
from PIL import Image

# Add the backend app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

TEMP_DIR = "/tmp/ml_model_tests"
os.makedirs(TEMP_DIR, exist_ok=True)

def get_real_test_images():
    """Get the real test images from the user's directory."""
    base_dir = "/Users/amarnadhpb/Desktop/Projects/College Project/Project Code/Med-Github-Clone/Ai-docter-agent/Test Files"
    images = {
        "brain_tumor": os.path.join(base_dir, "Brain tumor/tumor.jpg"),
        "brain_notumor": os.path.join(base_dir, "Brain tumor/notumor.jpg"),
        "chest": os.path.join(base_dir, "chest x-ray covid-19/COVID19(0).jpg"),
        "skin": os.path.join(base_dir, "skin lesion/skinlesion.png")
    }
    return images


def test_brain_tumor(image_path):
    """Test Brain Tumor Classification model."""
    print("\n" + "="*60)
    print("TEST: Brain Tumor Classification (HuggingFace ViT)")
    print("="*60)
    
    from app.agents.image_analysis_agent.brain_tumor_agent.brain_tumor_inference import BrainTumorClassification
    
    start = time.time()
    model = BrainTumorClassification()
    load_time = time.time() - start
    print(f"✅ Model loaded in {load_time:.2f}s")
    
    if model.model is None:
        print("❌ Model failed to load!")
        return False
    
    start = time.time()
    result = model.predict(image_path)
    pred_time = time.time() - start
    
    print(f"✅ Prediction completed in {pred_time:.2f}s")
    print(f"📋 Result:\n{result}")
    
    # Validate output structure
    checks = [
        ("Contains class name", any(c in result for c in ["Glioma", "Meningioma", "No Tumor", "Pituitary"])),
        ("Contains confidence", "Confidence" in result),
        ("Contains clinical info", "Clinical Overview" in result),
        ("Contains disclaimer", "AI-assisted" in result),
    ]
    
    all_passed = True
    for name, passed in checks:
        status = "✅" if passed else "❌"
        print(f"  {status} {name}")
        if not passed:
            all_passed = False
    
    return all_passed


def test_chest_xray(image_path):
    """Test Chest X-ray COVID Detection model."""
    print("\n" + "="*60)
    print("TEST: Chest X-ray COVID-19 Detection (DenseNet121)")
    print("="*60)
    
    from app.agents.image_analysis_agent.chest_xray_agent.covid_chest_xray_inference import ChestXRayClassification
    
    model_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "app/agents/image_analysis_agent/chest_xray_agent/models/covid_chest_xray_model.pth"
    )
    
    start = time.time()
    model = ChestXRayClassification(model_path=model_path)
    load_time = time.time() - start
    print(f"✅ Model loaded in {load_time:.2f}s")
    
    start = time.time()
    result = model.predict(image_path)
    pred_time = time.time() - start
    
    print(f"✅ Prediction completed in {pred_time:.2f}s")
    print(f"📋 Result: {result}")
    
    # Validate output
    checks = [
        ("Returns a dict", isinstance(result, dict)),
        ("Contains confidence score", isinstance(result, dict) and "confidence" in result),
        ("Valid class name", isinstance(result, dict) and result.get("class") in ["covid19", "normal"]),
    ]
    
    all_passed = True
    for name, passed in checks:
        status = "✅" if passed else "❌"
        print(f"  {status} {name}")
        if not passed:
            all_passed = False
    
    return all_passed


def test_skin_lesion(image_path):
    """Test Skin Lesion Segmentation model."""
    print("\n" + "="*60)
    print("TEST: Skin Lesion Segmentation (UNet)")
    print("="*60)
    
    from app.agents.image_analysis_agent.skin_lesion_agent.skin_lesion_inference import SkinLesionSegmentation
    
    model_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "app/agents/image_analysis_agent/skin_lesion_agent/models/checkpointN25_.pth.tar"
    )
    output_path = os.path.join(TEMP_DIR, "skin_lesion_output.png")
    
    start = time.time()
    model = SkinLesionSegmentation(model_path=model_path)
    load_time = time.time() - start
    print(f"✅ Model loaded in {load_time:.2f}s")
    
    start = time.time()
    result = model.predict(image_path, output_path)
    pred_time = time.time() - start
    
    print(f"✅ Prediction completed in {pred_time:.2f}s")
    
    # Validate output
    checks = [
        ("Returns success dict", isinstance(result, dict) and result.get("success") is True),
        ("Contains confidence", isinstance(result, dict) and "confidence" in result),
        ("Output file created", os.path.exists(output_path)),
        ("Output file has size", os.path.exists(output_path) and os.path.getsize(output_path) > 0),
    ]
    
    all_passed = True
    for name, passed in checks:
        status = "✅" if passed else "❌"
        print(f"  {status} {name}")
        if not passed:
            all_passed = False
    
    if os.path.exists(output_path):
        print(f"📁 Output saved: {output_path} ({os.path.getsize(output_path)} bytes)")
    
    return all_passed


if __name__ == "__main__":
    print("🏥 MedSage ML Model Testing Suite (REAL IMAGES)")
    print("=" * 60)
    
    # Get real test images
    print("\n📸 Locating real test images...")
    images = get_real_test_images()
    for name, path in images.items():
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  Found: {name} → {path} ({size} bytes)")
        else:
            print(f"  ❌ Missing: {name} → {path}")
            sys.exit(1)
    
    results = {}
    
    # Test 1a: Brain Tumor (Tumor)
    try:
        results["Brain Tumor (Positive)"] = test_brain_tumor(images["brain_tumor"])
    except Exception as e:
        print(f"❌ Brain Tumor (Positive) test FAILED with exception: {e}")
        results["Brain Tumor (Positive)"] = False

    # Test 1b: Brain Tumor (No Tumor)
    try:
        results["Brain Tumor (Negative)"] = test_brain_tumor(images["brain_notumor"])
    except Exception as e:
        print(f"❌ Brain Tumor (Negative) test FAILED with exception: {e}")
        results["Brain Tumor (Negative)"] = False
    
    # Test 2: Chest X-ray
    try:
        results["Chest X-ray"] = test_chest_xray(images["chest"])
    except Exception as e:
        print(f"❌ Chest X-ray test FAILED with exception: {e}")
        results["Chest X-ray"] = False
    
    # Test 3: Skin Lesion
    try:
        results["Skin Lesion"] = test_skin_lesion(images["skin"])
    except Exception as e:
        print(f"❌ Skin Lesion test FAILED with exception: {e}")
        results["Skin Lesion"] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    for model, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}  {model}")
    
    total_passed = sum(1 for p in results.values() if p)
    total = len(results)
    print(f"\n  Result: {total_passed}/{total} models passed")
    
    sys.exit(0 if total_passed == total else 1)

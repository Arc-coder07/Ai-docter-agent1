"""
Brain Tumor Classification Agent using HuggingFace ViT Model.
Model: Hemgg/brain-tumor-classification
Classes: Glioma, Meningioma, No Tumor, Pituitary
"""
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification


# Medical context for each tumor type
MEDICAL_INFO = {
    "Glioma": {
        "desc": "Gliomas originate in the glial cells that support neurons. They can be fast-growing and may involve surrounding brain tissue.",
        "next": "Urgent consultation with a neuro-oncologist. An MRI with contrast or a biopsy is typically the next diagnostic step."
    },
    "Meningioma": {
        "desc": "These tumors arise from the meninges, the layers covering the brain. Most are slow-growing and benign but can cause pressure.",
        "next": "Consult a neurosurgeon to evaluate the mass effect. Treatment ranges from 'watchful waiting' to surgical resection."
    },
    "Pituitary": {
        "desc": "Pituitary adenomas occur in the master gland at the base of the brain. They often affect hormone regulation and vision.",
        "next": "An endocrine workup (blood tests) and a visual field test are recommended to assess hormonal and optic nerve impact."
    },
    "No Tumor": {
        "desc": "The neural network did not detect significant signs of the three primary tumor types in this scan.",
        "next": "If symptoms (headaches, seizures, vision loss) persist, please consult a neurologist for a comprehensive evaluation."
    }
}


class BrainTumorClassification:
    """
    Brain tumor classification using a pre-trained ViT model from HuggingFace Hub.
    Classifies brain MRI images into: Glioma, Meningioma, No Tumor, Pituitary.
    """

    CLASS_NAMES = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]
    MODEL_NAME = "Hemgg/brain-tumor-classification"

    def __init__(self):
        """Initialize the model and processor from HuggingFace Hub."""
        print("[BrainTumorAgent] Loading model from HuggingFace Hub...")
        try:
            self.processor = AutoImageProcessor.from_pretrained(self.MODEL_NAME)
            self.model = AutoModelForImageClassification.from_pretrained(self.MODEL_NAME)
            self.model.eval()
            print("[BrainTumorAgent] Model loaded successfully.")
        except Exception as e:
            print(f"[BrainTumorAgent] Failed to load model: {e}")
            self.processor = None
            self.model = None

    def predict(self, image_path: str) -> str:
        """
        Classify a brain MRI image.
        
        Args:
            image_path: Path to the brain MRI image file
            
        Returns:
            Formatted classification result string
        """
        if self.model is None or self.processor is None:
            return "Error: Brain tumor classification model is not loaded."

        if not image_path:
            return "Error: No image path provided for brain tumor analysis."

        try:
            # Load and preprocess image
            image = Image.open(image_path).convert("RGB")
            inputs = self.processor(images=image, return_tensors="pt")

            # Run inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                idx = probs.argmax(-1).item()
                confidence = probs[0][idx].item()
                predicted_class = self.CLASS_NAMES[idx]

            # Get medical context
            med_info = MEDICAL_INFO.get(predicted_class, {"desc": "", "next": ""})

            # Build probability breakdown
            prob_breakdown = ", ".join([
                f"{self.CLASS_NAMES[i]}: {probs[0][i]:.1%}"
                for i in range(len(self.CLASS_NAMES))
            ])

            # Format response
            result = f"""**Brain MRI Analysis Result: {predicted_class} Detected**

**Confidence Score:** {confidence:.1%}

**Clinical Overview:**
{med_info['desc']}

**Recommended Next Steps:**
{med_info['next']}

**Probability Breakdown:** {prob_breakdown}

⚠️ *This is an AI-assisted analysis and should not replace professional medical diagnosis. Please consult a qualified healthcare professional for clinical decisions.*"""

            return result

        except Exception as e:
            return f"Error during brain tumor analysis: {str(e)}"
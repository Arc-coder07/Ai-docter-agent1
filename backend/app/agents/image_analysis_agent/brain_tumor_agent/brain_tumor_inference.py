import os
from app.core.hf_client import hf_client

class BrainTumorClassification:
    def __init__(self):
        print("[BrainTumorAgent] Initialized HF Space client for ViT.")

    def predict(self, image_path: str) -> str:
        if not image_path or not os.path.exists(image_path):
            return "Error: No image path provided or file does not exist."
        
        try:
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            
            res = hf_client.predict_brain_tumor_vit(image_bytes)
            
            if "error" in res:
                return f"Error from HF Space: {res['error']}"
            
            # Reconstruct the formatted string
            predicted_class = res.get("class", "Unknown")
            confidence = res.get("confidence", 0.0)
            probs = res.get("probabilities", {})
            
            # Get medical context
            med_info = self._get_medical_info(predicted_class)
            
            prob_breakdown = ", ".join([f"{k}: {v:.1%}" for k, v in probs.items()])
            
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

    def _get_medical_info(self, cls_name: str) -> dict:
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
        return MEDICAL_INFO.get(cls_name, {"desc": "", "next": ""})
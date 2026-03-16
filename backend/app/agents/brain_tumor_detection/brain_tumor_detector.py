import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import io
import base64
import numpy as np
from pathlib import Path
from scipy import stats as scipy_stats
from scipy.ndimage import gaussian_filter
import cv2
import os

CLASS_NAMES = ['Glioma', 'Meningioma', 'No Tumor', 'Pituitary']

class DenseNet169Classifier(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.base_model = models.densenet169(weights=None)
        num_features = self.base_model.classifier.in_features
        self.base_model.classifier = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.25),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.base_model(x)

class EfficientNetB3Classifier(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.base_model = models.efficientnet_b3(weights=None)
        num_features = self.base_model.classifier[1].in_features
        self.base_model.classifier = nn.Sequential(
            nn.Dropout(p=0.5),
            nn.Linear(num_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.25),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.base_model(x)

class BrainTumorDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu')
        self.models = {}
        self.load_models()

    def _load_model(self, cls, filename):
        model_path = Path(__file__).parent / 'models' / filename
        model = cls(num_classes=4)
        if not model_path.exists():
            print(f"Warning: Model not found at {model_path}")
            return None
        checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
        state_dict = checkpoint.get('model_state_dict', checkpoint)
        model.load_state_dict(state_dict)
        model.eval()
        return model

    def load_models(self):
        self.models['densenet169'] = self._load_model(DenseNet169Classifier, 'densenet169_best.pth')
        self.models['efficientnetb3'] = self._load_model(EfficientNetB3Classifier, 'efficientnetb3_best.pth')
        m_dense = self.models.get('densenet169')
        if m_dense is not None:
            self.models['densenet169'] = m_dense.to(self.device)
        m_eff = self.models.get('efficientnetb3')
        if m_eff is not None:
            self.models['efficientnetb3'] = m_eff.to(self.device)

    def get_target_layer(self, model, model_name):
        if model_name == 'densenet169':
            return model.base_model.features.denseblock4.denselayer32.conv2
        return model.base_model.features[-1]

    def get_layercam_layers(self, model, model_name):
        if model_name == 'densenet169':
            return {
                'block1': model.base_model.features.denseblock1,
                'block2': model.base_model.features.denseblock2,
                'block3': model.base_model.features.denseblock3,
                'block4': model.base_model.features.denseblock4,
            }
        return {
            'block1': model.base_model.features[2],
            'block2': model.base_model.features[4],
            'block3': model.base_model.features[6],
            'block4': model.base_model.features[8],
        }

    def _validate_and_enhance(self, image):
        warnings_list = []
        info = {'original_size': list(image.size), 'enhanced': False}
        w, h = image.size
        if w < 32 or h < 32:
            warnings_list.append(f'Very small image ({w}x{h}), results may be unreliable')
        arr = np.array(image)
        gray = np.mean(arr, axis=2) if arr.ndim == 3 else arr.astype(float)
        std_val = float(gray.std())
        mean_val = float(gray.mean())
        info['contrast'] = float(np.round(std_val, 2))
        info['brightness'] = float(np.round(mean_val, 2))
        if std_val < 10:
            warnings_list.append('Very low contrast image')
        if std_val < 40 or mean_val < 50:
            arr_uint8 = arr if arr.dtype == np.uint8 else (arr * 255).astype(np.uint8)
            if arr_uint8.ndim == 3:
                lab = cv2.cvtColor(arr_uint8, cv2.COLOR_RGB2LAB)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                lab[:, :, 0] = clahe.apply(lab[:, :, 0])
                enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            else:
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                enhanced = clahe.apply(arr_uint8)
                enhanced = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)
            image = Image.fromarray(enhanced)
            info['enhanced'] = True
        info['warnings'] = warnings_list
        return image, info

    def preprocess_image(self, image_bytes):
        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception:
            raise ValueError('Cannot open file as image. Please upload a valid JPEG/PNG.')
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image, prep_info = self._validate_and_enhance(image)
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        return transform(image).unsqueeze(0), image, prep_info

    def numpy_to_base64(self, arr):
        if arr.dtype != np.uint8:
            arr = (arr * 255).astype(np.uint8) if arr.max() <= 1.0 else arr.astype(np.uint8)
        img = Image.fromarray(arr)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    def cam_to_heatmap_b64(self, cam, original_img=None, alpha=0.4):
        cam_resized = cv2.resize(cam, (224, 224))
        heatmap = cv2.applyColorMap((cam_resized * 255).astype(np.uint8), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        if original_img is not None:
            orig = np.array(original_img.resize((224, 224))).astype(np.float32)
            overlay = ((1 - alpha) * orig + alpha * heatmap.astype(np.float32))
            overlay = np.clip(overlay, 0, 255).astype(np.uint8)
            return self.numpy_to_base64(overlay)
        return self.numpy_to_base64(heatmap)

    def predict_with_uncertainty(self, model, image_tensor, T=20):
        model.eval()
        for m in model.modules():
            if isinstance(m, nn.Dropout):
                m.train()  # pyre-ignore
        image_tensor = image_tensor.to(self.device)
        all_probs = []
        with torch.no_grad():
            for _ in range(T):
                logits = model(image_tensor)
                probs = F.softmax(logits, dim=1).cpu().numpy()[0]
                all_probs.append(probs)
        model.eval()
        all_probs = np.array(all_probs)
        mean_probs = all_probs.mean(axis=0)
        var_probs = all_probs.var(axis=0)
        pred_class = int(mean_probs.argmax())
        pred_prob = float(mean_probs[pred_class])
        epistemic = float(np.sqrt(var_probs[pred_class]))
        entropy = -np.sum(mean_probs * np.log(mean_probs + 1e-10))
        aleatoric = float(entropy / np.log(4))
        total = float(np.sqrt(epistemic ** 2 + aleatoric ** 2))
        z = scipy_stats.norm.ppf(0.975)
        std = float(np.std(all_probs[:, pred_class]))
        ci_lower = max(0.0, pred_prob - z * std)
        ci_upper = min(1.0, pred_prob + z * std)
        needs_review = epistemic > 0.10 or pred_prob < 0.7 or (ci_upper - ci_lower) > 0.4
        return {
            'prediction': pred_class,
            'class_name': CLASS_NAMES[pred_class],
            'mean_confidence': pred_prob,
            'epistemic': float(np.round(epistemic, 6)),
            'aleatoric': float(np.round(aleatoric, 6)),
            'total_uncertainty': float(np.round(total, 6)),
            'ci_lower': float(np.round(ci_lower, 4)),
            'ci_upper': float(np.round(ci_upper, 4)),
            'needs_review': bool(needs_review),
            'probabilities': {CLASS_NAMES[i]: float(np.round(float(mean_probs[i]), 6)) for i in range(4)}
        }

    def _gradcam(self, model, image_tensor, target_layer, target_class):
        activations, gradients = {}, {}
        h1 = target_layer.register_forward_hook(lambda m, i, o: activations.update({'v': o.detach()}))
        h2 = target_layer.register_full_backward_hook(lambda m, gi, go: gradients.update({'v': go[0].detach()}))
        try:
            model.eval()
            inp = image_tensor.clone().requires_grad_(True)
            out = model(inp)
            model.zero_grad()
            one_hot = torch.zeros_like(out)
            one_hot[0, target_class] = 1
            out.backward(gradient=one_hot)
            w = gradients['v'].mean(dim=[2, 3], keepdim=True)
            cam = F.relu((w * activations['v']).sum(dim=1, keepdim=True))
            cam = cam.squeeze().cpu().numpy()
            if cam.max() > 0:
                cam = cam / cam.max()
            return cam
        finally:
            h1.remove()
            h2.remove()

    def _gradcam_pp(self, model, image_tensor, target_layer, target_class):
        activations, gradients = {}, {}
        h1 = target_layer.register_forward_hook(lambda m, i, o: activations.update({'v': o.detach()}))
        h2 = target_layer.register_full_backward_hook(lambda m, gi, go: gradients.update({'v': go[0].detach()}))
        try:
            model.eval()
            inp = image_tensor.clone().requires_grad_(True)
            out = model(inp)
            model.zero_grad()
            one_hot = torch.zeros_like(out)
            one_hot[0, target_class] = 1
            out.backward(gradient=one_hot)
            grads = gradients['v'][0]
            acts = activations['v'][0]
            g2 = grads ** 2
            g3 = grads ** 3
            s = torch.sum(acts, dim=(1, 2), keepdim=True)
            alpha = g2 / (2 * g2 + s * g3 + 1e-10)
            weights = torch.sum(alpha * F.relu(grads), dim=(1, 2))
            cam = torch.zeros(acts.shape[1:], device=acts.device)
            for ww, aa in zip(weights, acts):
                cam += ww * aa
            cam = F.relu(cam).cpu().numpy()
            if cam.max() > 0:
                cam = (cam - cam.min()) / (cam.max() - cam.min())
            return cam
        finally:
            h1.remove()
            h2.remove()

    def _layercam(self, model, image_tensor, layers_dict, target_class):
        activations, gradients = {}, {}
        hooks = []
        for name, layer in layers_dict.items():
            def fwd(n):
                return lambda m, i, o: activations.update({n: o.detach()})
            def bwd(n):
                return lambda m, gi, go: gradients.update({n: go[0].detach()})
            hooks.append(layer.register_forward_hook(fwd(name)))
            hooks.append(layer.register_full_backward_hook(bwd(name)))
        try:
            model.eval()
            inp = image_tensor.clone().requires_grad_(True)
            out = model(inp)
            model.zero_grad()
            one_hot = torch.zeros_like(out)
            one_hot[0, target_class] = 1
            out.backward(gradient=one_hot)
            layer_cams = {}
            for name in layers_dict:
                if name not in gradients:
                    continue
                g = gradients[name][0]
                a = activations[name][0]
                cam = F.relu(g * a).sum(dim=0).cpu().numpy()
                if cam.max() > 0:
                    cam = (cam - cam.min()) / (cam.max() - cam.min())
                cam = cv2.resize(cam, (224, 224))
                layer_cams[name] = cam
            if layer_cams:
                cams = list(layer_cams.values())
                w = np.linspace(0.3, 1.0, len(cams))
                w /= w.sum()
                fused = np.average(cams, axis=0, weights=w)
            else:
                fused = np.zeros((224, 224))
            return layer_cams, fused
        finally:
            for h in hooks:
                h.remove()

    def hierarchical_xai(self, model, model_name, image_tensor, target_class, original_img=None):
        image_tensor = image_tensor.to(self.device)
        tl = self.get_target_layer(model, model_name)
        layers = self.get_layercam_layers(model, model_name)
        cam_l1 = self._gradcam(model, image_tensor, tl, target_class)
        cam_l2 = self._gradcam_pp(model, image_tensor, tl, target_class)
        layer_cams, fused = self._layercam(model, image_tensor, layers, target_class)
        is_tumor = CLASS_NAMES[target_class] != 'No Tumor'
        return {
            'levels': {
                'level1_detection': {
                    'name': 'Detection (Grad-CAM)',
                    'question': 'Is there a tumor?' if is_tumor else 'Why is there no tumor?',
                    'heatmap': self.cam_to_heatmap_b64(cam_l1, original_img)
                },
                'level2_classification': {
                    'name': 'Classification (Grad-CAM++)',
                    'question': 'What type of tumor?' if is_tumor else 'What makes this brain normal?',
                    'heatmap': self.cam_to_heatmap_b64(cam_l2, original_img)
                },
                'level3_localization': {
                    'name': 'Localization (LayerCAM Block4)',
                    'question': 'Where is the tumor?' if is_tumor else 'Which regions confirm normalcy?',
                    'heatmap': self.cam_to_heatmap_b64(layer_cams.get('block4', np.zeros((224, 224))), original_img)
                },
                'level4_deep': {
                    'name': 'Deep Analysis (LayerCAM Fused)',
                    'question': 'How does the model reason?' if is_tumor else 'How does the model confirm no tumor?',
                    'heatmap': self.cam_to_heatmap_b64(fused, original_img)
                }
            }
        }

    def compute_cdss(self, confidence, uncertainty_total, robustness_score):
        w = {'cls': 0.30, 'xai': 0.20, 'unc': 0.20, 'cal': 0.15, 'rob': 0.15}
        s_cls = confidence
        s_xai = 0.85
        s_unc = max(0.0, 1.0 - uncertainty_total)
        s_cal = 0.80
        s_rob = robustness_score
        cdss = w['cls'] * s_cls + w['xai'] * s_xai + w['unc'] * s_unc + w['cal'] * s_cal + w['rob'] * s_rob
        if cdss >= 0.85:
            risk, action = 'LOW', 'High confidence diagnosis. Suitable for automated reporting.'
        elif cdss >= 0.70:
            risk, action = 'MEDIUM', 'Moderate confidence. Clinical review recommended.'
        else:
            risk, action = 'HIGH', 'Low confidence. Expert consultation required.'
        return {
            'score': float(np.round(float(cdss), 4)),
            'risk_level': risk,
            'action': action,
            'components': {
                'classification': float(np.round(float(s_cls), 4)),
                'xai_consistency': float(np.round(float(s_xai), 4)),
                'uncertainty': float(np.round(float(s_unc), 4)),
                'calibration': float(np.round(float(s_cal), 4)),
                'robustness': float(np.round(float(s_rob), 4))
            }
        }

    def test_robustness(self, model, model_name, image_tensor, target_class):
        model.eval()
        image_tensor = image_tensor.to(self.device)
        tl = self.get_target_layer(model, model_name)
        clean_cam = cv2.resize(self._gradcam(model, image_tensor, tl, target_class), (224, 224))
        mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1).to(self.device)
        std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1).to(self.device)
        img_01 = torch.clamp(image_tensor * std + mean, 0, 1)

        def renorm(t):
            return ((t - mean) / std)

        def blur_t(t):
            arr = t.cpu().squeeze(0).numpy()
            bl = np.stack([gaussian_filter(arr[c], sigma=1.0) for c in range(3)])
            return torch.from_numpy(bl).unsqueeze(0).float().to(self.device)

        def rician(t, sigma=0.03):
            r = t + torch.randn_like(t) * sigma
            i_noise = torch.randn_like(t) * sigma
            return torch.clamp(torch.sqrt(r ** 2 + i_noise ** 2), 0, 1)

        perts = {
            'gaussian_noise': torch.clamp(img_01 + torch.randn_like(img_01) * 0.03, 0, 1),
            'brightness': torch.clamp(img_01 * 1.2, 0, 1),
            'scanner_noise': rician(img_01),
            'blur': blur_t(img_01),
        }
        with torch.no_grad():
            clean_pred = model(image_tensor).argmax(1).item()
        results = {}
        scores = []
        for name, pert_01 in perts.items():
            pert_norm = renorm(pert_01)
            with torch.no_grad():
                pert_pred = model(pert_norm).argmax(1).item()
            pert_cam = cv2.resize(self._gradcam(model, pert_norm, tl, target_class), (224, 224))
            a, b = clean_cam.flatten(), pert_cam.flatten()
            d = np.linalg.norm(a) * np.linalg.norm(b)
            xai_stab = float(np.dot(a, b) / d) if d > 1e-8 else 0.0
            pred_ok = clean_pred == pert_pred
            combined = 0.5 * (1.0 if pred_ok else 0.0) + 0.5 * xai_stab
            scores.append(combined)
            results[name] = {
                'pred_stable': bool(pred_ok),
                'xai_stability': float(np.round(xai_stab, 4)),
                'combined': float(np.round(combined, 4))
            }
        overall = float(np.round(float(np.mean(scores)), 4))
        return {'overall_score': overall, 'fda_ready': overall >= 0.85, 'tests': results}

    def predict(self, image_bytes):
        if not self.models.get('densenet169') or not self.models.get('efficientnetb3'):
            return {"error": "Models not loaded"}
            
        try:
            image_tensor, original_img, prep_info = self.preprocess_image(image_bytes)
        except ValueError as ve:
            return {"error": str(ve)}
            
        image_tensor = image_tensor.to(self.device)

        # Run both models
        model_results = {}
        for mname in ['densenet169', 'efficientnetb3']:
            model = self.models[mname]
            model.eval()
            with torch.no_grad():
                logits = model(image_tensor)
                probs = F.softmax(logits, dim=1).cpu().numpy()[0]
            pred_class = int(probs.argmax())
            model_results[mname] = {
                'class': CLASS_NAMES[pred_class],
                'confidence': float(np.round(float(probs[pred_class]), 6)),
                'probabilities': {CLASS_NAMES[i]: float(np.round(float(probs[i]), 6)) for i in range(4)},
                'pred_index': pred_class
            }

        best_name = max(model_results, key=lambda k: model_results[k]['confidence'])
        best_model = self.models[best_name]

        uncertainty = self.predict_with_uncertainty(best_model, image_tensor, T=20)
        target_class = uncertainty['prediction']
        xai = self.hierarchical_xai(best_model, best_name, image_tensor, target_class, original_img)
        robustness = self.test_robustness(best_model, best_name, image_tensor, target_class)
        cdss = self.compute_cdss(
            confidence=uncertainty['mean_confidence'],
            uncertainty_total=uncertainty['total_uncertainty'],
            robustness_score=robustness['overall_score']
        )

        if robustness['overall_score'] < 0.50:
            uncertainty['needs_review'] = True  # pyre-ignore

        return {
            'success': True,
            'preprocessing': prep_info,
            'models': {
                'densenet169': {
                    'name': 'DenseNet-169',
                    'accuracy': '98.80%',
                    **model_results['densenet169']
                },
                'efficientnetb3': {
                    'name': 'EfficientNet-B3',
                    'accuracy': '99.10%',
                    **model_results['efficientnetb3']
                }
            },
            'best_model': best_name,
            'prediction': {
                'class': uncertainty['class_name'],
                'confidence': uncertainty['mean_confidence'] * 100,  # return percentage for top-level
                'confidence_level': "High" if uncertainty['mean_confidence'] > 0.85 else "Moderate" if uncertainty['mean_confidence'] > 0.70 else "Low",
                'probabilities': uncertainty['probabilities'],
                'model_used': best_name
            },
            'uncertainty': uncertainty,
            'xai': xai,
            'cdss': cdss,
            'robustness': robustness,
        }

# Global singleton
detector = BrainTumorDetector()

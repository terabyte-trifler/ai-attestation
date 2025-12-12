"""
DEEPFAKE DETECTION SERVICE
===========================
Model: prithivMLmods/Deep-Fake-Detector-v2-Model
Accuracy: 92%+ on deepfake images

WHAT ARE DEEPFAKES?
- Face swaps (putting someone's face on another body)
- Face manipulations (changing expressions, lip-sync)
- AI-generated faces (completely fake people)

HOW THIS MODEL WORKS:
- Uses Vision Transformer (ViT) architecture
- Treats image as 16x16 pixel patches
- Analyzes patches for manipulation artifacts
- Deepfakes often have subtle inconsistencies:
  - Weird lighting on face vs background
  - Blurry edges around face
  - Unnatural skin texture
  - Misaligned features
"""

import torch
from transformers import ViTForImageClassification, ViTImageProcessor
from PIL import Image
import hashlib
import io
from typing import Union


class DeepfakeDetectionService:
    """
    Service to detect deepfake images (face manipulations).
    
    Usage:
        service = DeepfakeDetectionService()
        result = service.detect("suspect_photo.jpg")
        print(result['deepfake_probability'])  # e.g., 91.2
    """
    
    # Hugging Face model ID
    MODEL_NAME = "prithivMLmods/Deep-Fake-Detector-v2-Model"
    
    def __init__(self):
        """Initialize the service"""
        
        # Check for GPU
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        self.model = None
        self.processor = None
        self._loaded = False
        
        print(f"🎭 DeepfakeDetectionService initialized (device: {self.device})")
    
    def load(self):
        """Load the Vision Transformer model"""
        
        if self._loaded:
            return
        
        print(f"⏳ Loading deepfake model: {self.MODEL_NAME}")
        
        # Load the ViT model for image classification
        # ViT = Vision Transformer
        # - Splits image into 16x16 patches
        # - Treats patches like words in a sentence
        # - Uses transformer to understand relationships
        self.model = ViTForImageClassification.from_pretrained(self.MODEL_NAME)
        
        # Processor handles image preprocessing:
        # - Resize to 224x224
        # - Normalize pixel values
        # - Convert to tensor
        self.processor = ViTImageProcessor.from_pretrained(self.MODEL_NAME)
        
        # Move to GPU if available
        self.model.to(self.device)
        self.model.eval()
        
        self._loaded = True
        print("✅ Deepfake model loaded!")
    
    def detect(self, image: Union[str, bytes, Image.Image]) -> dict:
        """
        Detect if an image is a deepfake.
        
        Args:
            image: Can be:
                - str: File path to image
                - bytes: Raw image bytes
                - PIL.Image: Already loaded image
                
        Returns:
            dict with:
                - deepfake_probability: 0-100
                - real_probability: 0-100
                - classification: 'deepfake', 'real', or 'uncertain'
        """
        
        self.load()
        
        # =====================================================
        # Step 1: Load the image
        # =====================================================
        
        if isinstance(image, str):
            # It's a file path
            img = Image.open(image).convert("RGB")
            
            # Create hash from file contents
            with open(image, 'rb') as f:
                content_hash = hashlib.sha256(f.read()).hexdigest()
                
        elif isinstance(image, bytes):
            # It's raw bytes (from file upload)
            img = Image.open(io.BytesIO(image)).convert("RGB")
            content_hash = hashlib.sha256(image).hexdigest()
            
        elif isinstance(image, Image.Image):
            # It's already a PIL Image
            img = image.convert("RGB")
            
            # Need to get bytes for hashing
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            content_hash = hashlib.sha256(img_bytes.getvalue()).hexdigest()
        else:
            raise ValueError("Image must be file path, bytes, or PIL Image")
        
        # =====================================================
        # Step 2: Preprocess the image
        # =====================================================
        # The processor:
        # 1. Resizes to 224x224 (model's expected size)
        # 2. Normalizes pixels to [-1, 1] range
        # 3. Converts to PyTorch tensor
        
        inputs = self.processor(images=img, return_tensors="pt")
        
        # Move to GPU/CPU
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # =====================================================
        # Step 3: Run inference
        # =====================================================
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            
            # Get probabilities using softmax
            # Softmax ensures all probs sum to 1
            probs = torch.softmax(outputs.logits, dim=1)[0]
        
        # Model labels:
        # Index 0 = "Realism" (real image)
        # Index 1 = "Deepfake" (manipulated)
        
        real_prob = round(probs[0].item() * 100, 2)
        deepfake_prob = round(probs[1].item() * 100, 2)
        
        # =====================================================
        # Step 4: Classify
        # =====================================================
        
        if deepfake_prob > 70:
            classification = "deepfake"
        elif deepfake_prob < 30:
            classification = "real"
        else:
            classification = "uncertain"
        
        confidence = round(abs(deepfake_prob - 50) * 2, 2)
        
        return {
            "content_type": "image",
            "detection_type": "deepfake",
            "content_hash": content_hash,
            "deepfake_probability": deepfake_prob,
            "real_probability": real_prob,
            "ai_probability": deepfake_prob,  # Alias for consistency
            "classification": classification,
            "confidence": confidence,
            "detection_model": "deep-fake-detector-v2",
            "model_info": "92%+ accuracy, ViT-based"
        }


# =====================================================
# Test the service
# =====================================================

if __name__ == "__main__":
    print("\n🎭 Deepfake Detection Service")
    print("="*50)
    print("To test, you need an image file.")
    print("Usage:")
    print("  service = DeepfakeDetectionService()")
    print("  result = service.detect('path/to/image.jpg')")
    print("  print(result)")
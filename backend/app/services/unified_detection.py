"""
UNIFIED DETECTION SERVICE
=========================
Combines all three detection models into one interface.

This is the main service your API will use!
"""

from typing import Union, Optional
from PIL import Image

from .text_detection import TextDetectionService
from .deepfake_detection import DeepfakeDetectionService
from .ai_image_detection import AIImageDetectionService


class UnifiedDetectionService:
    """
    One service to rule them all!
    
    Automatically picks the right model based on content type.
    
    Usage:
        service = UnifiedDetectionService()
        
        # For text
        result = service.detect_text("Some text...")
        
        # For images (auto-detects deepfake vs AI-generated)
        result = service.detect_image("photo.jpg", detection_type="deepfake")
        result = service.detect_image("art.png", detection_type="ai_generated")
        
        # Or let it run both image checks
        result = service.detect_image("image.jpg", detection_type="both")
    """
    
    def __init__(self, preload: bool = False):
        """
        Initialize all detection services.
        
        Args:
            preload: If True, load all models immediately.
                    If False (default), load on first use.
        """
        print("🚀 Initializing Unified Detection Service...")
        print("="*50)
        
        # Create service instances (models not loaded yet)
        self.text_service = TextDetectionService()
        self.deepfake_service = DeepfakeDetectionService()
        self.ai_image_service = AIImageDetectionService()
        
        # Optionally preload all models
        if preload:
            print("\n📦 Preloading all models...")
            self.text_service.load()
            self.deepfake_service.load()
            self.ai_image_service.load()
            print("✅ All models loaded!\n")
        
        print("="*50)
        print("✅ Unified Detection Service ready!")
    
    def detect_text(self, text: str) -> dict:
        """
        Detect if text is AI-generated.
        
        Args:
            text: Text to analyze (recommend 50+ words)
            
        Returns:
            Detection result dict
        """
        return self.text_service.detect(text)
    
    def detect_image(
        self, 
        image: Union[str, bytes, Image.Image],
        detection_type: str = "both"
    ) -> dict:
        """
        Detect image manipulation or AI generation.
        
        Args:
            image: Image to analyze
            detection_type: 
                - "deepfake": Check for face manipulation only
                - "ai_generated": Check for AI-generated image only
                - "both": Run both checks (default)
                
        Returns:
            Detection result(s)
        """
        
        if detection_type == "deepfake":
            return self.deepfake_service.detect(image)
        
        elif detection_type == "ai_generated":
            return self.ai_image_service.detect(image)
        
        elif detection_type == "both":
            # Run both detections
            deepfake_result = self.deepfake_service.detect(image)
            ai_image_result = self.ai_image_service.detect(image)
            
            # Combine results
            return {
                "content_type": "image",
                "content_hash": deepfake_result["content_hash"],
                "deepfake_analysis": {
                    "probability": deepfake_result["deepfake_probability"],
                    "classification": deepfake_result["classification"],
                    "confidence": deepfake_result["confidence"],
                    "model": deepfake_result["detection_model"]
                },
                "ai_generated_analysis": {
                    "probability": ai_image_result["ai_probability"],
                    "classification": ai_image_result["classification"],
                    "confidence": ai_image_result["confidence"],
                    "model": ai_image_result["detection_model"]
                },
                # Overall assessment
                "overall": self._combine_image_results(deepfake_result, ai_image_result)
            }
        
        else:
            raise ValueError(f"Unknown detection_type: {detection_type}")
    
    def _combine_image_results(self, deepfake: dict, ai_image: dict) -> dict:
        """
        Combine deepfake and AI image results into overall assessment.
        """
        
        # Take the higher AI probability
        max_ai_prob = max(
            deepfake["deepfake_probability"],
            ai_image["ai_probability"]
        )
        
        # Determine overall classification
        if deepfake["classification"] == "deepfake":
            classification = "deepfake"
            primary_concern = "Face manipulation detected"
        elif ai_image["classification"] == "ai_generated":
            classification = "ai_generated"
            primary_concern = "AI-generated image detected"
        elif deepfake["classification"] == "uncertain" or ai_image["classification"] == "uncertain":
            classification = "uncertain"
            primary_concern = "Inconclusive - may contain AI elements"
        else:
            classification = "authentic"
            primary_concern = "No AI manipulation detected"
        
        return {
            "ai_probability": round(max_ai_prob, 2),
            "classification": classification,
            "assessment": primary_concern
        }
    
    def get_status(self) -> dict:
        """Get status of all detection services"""
        return {
            "text_detection": {
                "model": self.text_service.MODEL_NAME,
                "loaded": self.text_service._loaded,
                "device": str(self.text_service.device)
            },
            "deepfake_detection": {
                "model": self.deepfake_service.MODEL_NAME,
                "loaded": self.deepfake_service._loaded,
                "device": str(self.deepfake_service.device)
            },
            "ai_image_detection": {
                "model": self.ai_image_service.MODEL_NAME,
                "loaded": self.ai_image_service._loaded,
                "device": str(self.ai_image_service.device)
            }
        }


# =====================================================
# Singleton instance for the API
# =====================================================
# We create one global instance so models stay loaded

_detection_service: Optional[UnifiedDetectionService] = None

def get_detection_service() -> UnifiedDetectionService:
    """
    Get the singleton detection service.
    
    This ensures we only load models once, not on every request!
    """
    global _detection_service
    
    if _detection_service is None:
        _detection_service = UnifiedDetectionService()
    
    return _detection_service


# =====================================================
# Test
# =====================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("UNIFIED DETECTION SERVICE TEST")
    print("="*60)
    
    # Get the service
    service = get_detection_service()
    
    # Show status
    print("\n📊 Service Status:")
    status = service.get_status()
    for name, info in status.items():
        print(f"  {name}:")
        print(f"    Model: {info['model']}")
        print(f"    Loaded: {info['loaded']}")
        print(f"    Device: {info['device']}")
    
    # Test text detection
    print("\n" + "-"*40)
    print("Testing Text Detection...")
    print("-"*40)
    
    test_text = """
    The implementation of artificial intelligence in modern healthcare 
    systems has demonstrated significant potential for improving diagnostic 
    accuracy and patient outcomes. Machine learning algorithms can analyze 
    medical images with remarkable precision, often matching or exceeding 
    human expert performance in specific tasks.
    """
    
    result = service.detect_text(test_text)
    print(f"AI Probability: {result['ai_probability']}%")
    print(f"Classification: {result['classification']}")
    print(f"Model: {result['detection_model']}")
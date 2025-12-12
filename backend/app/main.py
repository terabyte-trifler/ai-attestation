"""
AI ATTESTATION API SERVER
=========================
FastAPI server that exposes AI detection as REST API.

Endpoints:
    POST /api/detect/text     - Detect AI-generated text
    POST /api/detect/image    - Detect deepfakes & AI images  
    GET  /api/status          - Check service status
    GET  /api/health          - Health check
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

# Import our detection service
from app.services import get_detection_service


# =====================================================
# PYDANTIC MODELS (Request/Response schemas)
# =====================================================
# These define the shape of data going in and out

class TextDetectionRequest(BaseModel):
    """Request body for text detection"""
    text: str
    
    class Config:
        # Example for API docs
        json_schema_extra = {
            "example": {
                "text": "The quick brown fox jumps over the lazy dog. This is sample text to analyze."
            }
        }

class TextDetectionResponse(BaseModel):
    """Response from text detection"""
    content_type: str
    content_hash: str
    ai_probability: float
    human_probability: float
    classification: str
    confidence: float
    detection_model: str
    model_info: str

class ImageDetectionResponse(BaseModel):
    """Response from image detection"""
    content_type: str
    content_hash: str
    ai_probability: float
    classification: str
    confidence: float
    detection_model: str
    # Additional fields for combined analysis
    deepfake_analysis: Optional[dict] = None
    ai_generated_analysis: Optional[dict] = None
    overall: Optional[dict] = None

class StatusResponse(BaseModel):
    """API status response"""
    status: str
    services: dict


# =====================================================
# CREATE FASTAPI APP
# =====================================================

app = FastAPI(
    title="AI Content Attestation API",
    description="""
    ## AI Detection API for Content Verification
    
    This API detects:
    - **AI-generated text** (ChatGPT, Claude, etc.)
    - **Deepfakes** (face swaps, manipulations)
    - **AI-generated images** (Midjourney, DALL-E, Stable Diffusion)
    
    ### Models Used:
    - Text: `desklib/ai-text-detector-v1.01` (#1 RAID Benchmark)
    - Deepfakes: `prithivMLmods/Deep-Fake-Detector-v2-Model` (92%+)
    - AI Images: `Organika/sdxl-detector` (~90%)
    """,
    version="1.0.0",
)


# =====================================================
# CORS MIDDLEWARE
# =====================================================
# This allows our frontend (different port) to call the API

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:8000",      # This server
        "*",                          # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Allow all HTTP methods
    allow_headers=["*"],              # Allow all headers
)


# =====================================================
# API ROUTES
# =====================================================

@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {
        "name": "AI Content Attestation API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "detect_text": "POST /api/detect/text",
            "detect_image": "POST /api/detect/image",
            "status": "GET /api/status",
            "health": "GET /api/health",
        }
    }


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns 200 if the server is running.
    Used by load balancers and monitoring.
    """
    return {"status": "healthy"}


@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """
    Get status of all detection services.
    
    Shows which models are loaded and on what device.
    """
    service = get_detection_service()
    status = service.get_status()
    
    return {
        "status": "operational",
        "services": status
    }


@app.post("/api/detect/text", response_model=TextDetectionResponse)
async def detect_text(request: TextDetectionRequest):
    """
    Detect if text is AI-generated.
    
    - **text**: The text to analyze (recommend 50+ words for accuracy)
    
    Returns probability scores and classification.
    """
    
    # Validate input
    if not request.text or len(request.text.strip()) < 10:
        raise HTTPException(
            status_code=400, 
            detail="Text must be at least 10 characters"
        )
    
    # Get detection service and run analysis
    service = get_detection_service()
    
    try:
        result = service.detect_text(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/detect/image")
async def detect_image(
    file: UploadFile = File(..., description="Image file to analyze"),
    detection_type: str = Form(
        default="both",
        description="Type of detection: 'deepfake', 'ai_generated', or 'both'"
    )
):
    """
    Detect deepfakes or AI-generated images.
    
    - **file**: Image file (JPG, PNG, WebP)
    - **detection_type**: 
        - `deepfake`: Check for face manipulation only
        - `ai_generated`: Check for AI-generated image only
        - `both`: Run both checks (default)
    
    Returns probability scores and classification.
    """
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File must be an image. Got: {file.content_type}"
        )
    
    # Validate detection_type
    valid_types = ["deepfake", "ai_generated", "both"]
    if detection_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"detection_type must be one of: {valid_types}"
        )
    
    # Read file bytes
    try:
        image_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")
    
    # Get detection service and run analysis
    service = get_detection_service()
    
    try:
        result = service.detect_image(image_bytes, detection_type=detection_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# STARTUP EVENT
# =====================================================

@app.on_event("startup")
async def startup_event():
    """
    Runs when the server starts.
    
    We initialize the detection service here so models
    start loading in the background.
    """
    print("\n" + "="*60)
    print("🚀 AI Attestation API Starting...")
    print("="*60)
    
    # Initialize service (but don't preload models yet)
    # Models will load on first request
    get_detection_service()
    
    print("\n✅ API Ready!")
    print("📚 Docs: http://localhost:8000/docs")
    print("="*60 + "\n")


# =====================================================
# RUN SERVER
# =====================================================

if __name__ == "__main__":
    # Run with: python -m app.main
    # Or: uvicorn app.main:app --reload
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
    )
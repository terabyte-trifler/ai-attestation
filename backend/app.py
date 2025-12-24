# Hugging Face Spaces entry point
# This file is required for HF Spaces deployment

import sys
sys.path.insert(0, '.')

from app.main import app

# For Hugging Face Spaces
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)

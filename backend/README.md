---
title: AI Content Attestation API
emoji: 🔍
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# AI Content Attestation API

Detects AI-generated content (text, images, deepfakes) for blockchain attestation.

## Endpoints

- `POST /api/detect/text` - Detect AI-generated text
- `POST /api/detect/image` - Detect deepfakes & AI images
- `GET /api/health` - Health check
- `GET /api/status` - Service status

## Usage

```python
import requests

# Text detection
response = requests.post(
    "https://YOUR-SPACE.hf.space/api/detect/text",
    json={"text": "Your text here..."}
)
print(response.json())
```

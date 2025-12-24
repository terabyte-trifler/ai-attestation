# Backend Deployment Guide

## Option 1: Railway (Recommended - Easiest)

1. **Push code to GitHub** (if not already)

2. **Go to Railway**: https://railway.app

3. **Create New Project** → **Deploy from GitHub repo**

4. **Select your repo** and set:

   - Root Directory: `backend`
   - Railway will auto-detect Python

5. **Deploy!** Railway handles everything automatically.

6. **Get your URL** from the Railway dashboard (e.g., `https://your-app.up.railway.app`)

7. **Update Vercel frontend**:
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Set `NEXT_PUBLIC_API_URL` = your Railway URL

---

## Option 2: Render

1. Go to https://render.com
2. New → Web Service → Connect GitHub
3. Select repo, set:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Deploy

---

## Option 3: Docker (Any Cloud)

```bash
cd backend
docker build -t ai-attestation-api .
docker run -p 8000:8000 ai-attestation-api
```

Deploy the Docker image to:

- Google Cloud Run
- AWS ECS/Fargate
- Azure Container Apps
- DigitalOcean App Platform

---

## Option 4: Hugging Face Spaces (Free GPU!)

1. Go to https://huggingface.co/spaces
2. Create new Space → Select "Docker"
3. Upload the backend folder
4. HF will build and deploy

---

## Environment Variables (if needed)

None required for basic operation. Models download automatically.

## Health Check

After deployment, verify:

```
curl https://your-backend-url/api/health
# Should return: {"status": "healthy"}
```

## Notes

- First request may be slow (models loading)
- Requires ~2GB RAM for all models
- GPU optional but recommended for speed

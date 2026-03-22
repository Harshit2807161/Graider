# 🚀 Graider Startup & Development Guide

This guide provides a step-by-step walkthrough for setting up and running the Graider AI Grading System on a new machine.

---

## 📋 Prerequisites

Ensure you have the following installed on your system:
- **Python 3.12+**
- **Node.js 18+** & **npm**
- **Docker** (optional, recommended for Redis)
- **Homebrew** (for macOS users)

---

## 🛠️ Step 1: System Dependencies

The OCR service requires **Poppler** to convert PDFs into images.

### macOS
```bash
brew install poppler
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y poppler-utils
```

### Windows
1. Download the latest Poppler for Windows.
2. Add the `bin/` folder to your System PATH.

---

## 🐍 Step 2: Backend Setup

### 1. Create Virtual Environment
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
# Note: Ensure pydantic-settings and redis are installed
pip install pydantic-settings redis
```

### 3. Configure Environment (`.env`)
Create a `.env` file in the `backend/` directory:
```env
# API Keys (Required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Provider Configuration
LLM_PROVIDER=openai  # or anthropic

# Model Selection (defaults to cost-optimized GPT-5-Nano)
LLM_GRADER_MODEL=gpt-5-nano-2025-08-07
LLM_ORCHESTRATOR_MODEL=gpt-5-nano-2025-08-07
LLM_VISION_MODEL=gpt-5-nano-2025-08-07

# Infrastructure
DATABASE_URL=postgresql://user:password@localhost:5433/graider
CELERY_BROKER_URL=redis://localhost:6379/0
```

---

## 📦 Step 3: Infrastructure (Redis & Postgres)

The easiest way to run the infrastructure is via Docker:

```bash
# Start Redis and Postgres (from project root)
docker-compose up -d
```

*(If you don't have docker-compose, ensure Redis is running on `6379` and Postgres on `5433`).*

---

## 🚀 Step 4: Starting the Services

You need **three terminals** running to have the full system operational.

### Terminal 1: FastAPI Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Terminal 2: Celery Worker (The "Brain")
The worker handles all the heavy lifting (OCR & AI Grading).
```bash
cd backend
source .venv/bin/activate
celery -A app.worker.celery_app worker --loglevel=info
```

### Terminal 3: Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
- **Web App**: [http://localhost:3000](http://localhost:3000)

---

## ✅ Step 5: Verification

### 1. Health Check
Visit `http://localhost:8000/health` to ensure the backend can talk to the DB and Redis.

### 2. Test Grading Pipeline
You can trigger a manual test grading using the script provided:
```bash
cd backend
python test_celery_submission.py
```

### 3. Monitor AI Costs
The system has a built-in **LLM Usage Protector**. You can check or reset the call count via Python:
```bash
# Reset count if you hit the safety limit
python -c "from app.core.llm_protection import protector; protector.reset()"
```

---

## 💡 Troubleshooting

- **401 Unauthorized in Frontend**: Ensure your `.env` has the correct `BACKEND_CORS_ORIGINS`.
- **OCR failing on PDFs**: Ensure `pdftoppm` (part of Poppler) is in your PATH.
- **Grader returning empty responses**: Check your LLM API balance and ensure you are using a model that supports the `developer` role if configured.
- **Celery Task Not Found**: Ensure you are running the worker from the `backend/` directory.

---
*Created by Antigravity AI - 2026*

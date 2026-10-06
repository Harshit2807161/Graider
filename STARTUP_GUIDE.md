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
pip install -r requirements-dev.txt   # runtime deps + pytest/ruff
```
*(Or use conda: `conda env create -f environment.yml && conda activate gr8r` from the repo root.)*

### 3. Configure Environment (`.env`)
Copy the template and fill in your values:
```bash
cp .env.example .env   # inside backend/
```
At minimum set `SECRET_KEY` (`openssl rand -hex 32`), `LLM_PROVIDER` with its API key, and the
three `LLM_*_MODEL` values for that provider. See `backend/.env.example` for every setting.

---

## 📦 Step 3: Infrastructure (Redis & Postgres)

The easiest way to run the infrastructure is via Docker:

```bash
# Start Redis and Postgres only (from project root)
docker compose up -d db redis
```

Then apply the database migrations and create the first superuser (uses `FIRST_SUPERUSER_EMAIL` /
`FIRST_SUPERUSER_PASSWORD` from `backend/.env`):
```bash
cd backend
python -m app.initial_data      # runs `alembic upgrade head`, then creates the superuser
```

To run the whole stack in Docker instead, copy the root `.env.example` to `.env`, then
`docker compose up -d --build`. The one-shot `migrate` service applies migrations before the API
and worker start. Create the first superuser with `docker compose run --rm backend python -m app.initial_data`.

### Database migrations (Alembic)
The schema is versioned with Alembic (`backend/alembic/`). The app never creates tables on its own.

```bash
cd backend
alembic upgrade head            # apply pending migrations
alembic current                 # show the database's revision
alembic check                   # fail if models and migrations differ
alembic revision --autogenerate -m "describe change"   # after changing a model; review the file!
```

**Existing database created before migrations** (tables made by the old `create_all`): don't run
`upgrade` on it. Mark it as already at the baseline once, then check for drift:
```bash
alembic stamp head && alembic check
```
If `check` reports differences (e.g. columns added by the old ad-hoc scripts with different types),
either recreate the database (dev data) with `docker compose down -v`, or fix the columns by hand
before continuing.

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

### 2. Run the Tests
```bash
cd backend
ruff check app tests alembic
pytest                                   # SQLite + fake LLM, no keys needed
TEST_DATABASE_URL=postgresql://... MIGRATIONS_DATABASE_URL=postgresql://.../empty_db pytest
                                         # same suite on Postgres + migration round-trip test
```
CI runs the same checks on every PR (`.github/workflows/ci.yml`), plus the frontend type-check and build.

### 3. Grade a Submission
Log in at `http://localhost:3000`, create an organization and exam, add questions (with a
rubric, one point per line), then upload an answer sheet on the exam page. Progress and
results appear on the same page.

### 4. LLM Cost Guard
Each submission may make at most `LLM_MAX_CALLS_PER_SUBMISSION` LLM calls (default 200);
a run that exceeds it fails with a clear error instead of running up costs.

---

## 💡 Troubleshooting

- **CORS errors in Frontend**: Ensure `BACKEND_CORS_ORIGINS` in `backend/.env` includes the frontend URL.
- **Frontend can't reach the API**: Set `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).
- **OCR failing on PDFs**: Ensure `pdftoppm` (part of Poppler) is in your PATH.
- **Grader returning empty responses**: Check your LLM API balance and ensure you are using a model that supports the `developer` role if configured.
- **Celery Task Not Found**: Ensure you are running the worker from the `backend/` directory.

---
*Created by Antigravity AI - 2026*

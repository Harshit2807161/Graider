# Gr8r - AI-Powered Grading System

## Project Overview
Gr8r grades handwritten exam answers. Teachers set up organizations, classes (batches) and exams with questions and rubrics, then upload a student's answer sheet (PDF or image). A background worker transcribes the sheet with a vision LLM and grades each answer with LangGraph agents.

Status: multi-tenant web app working end to end (branch `v1-full`). **Grading v2 is accepted** in [docs/proposals/002-grading-v2-architecture.md](../docs/proposals/002-grading-v2-architecture.md) and is being built milestone by milestone; progress is tracked in [docs/grading-v2-checklist.md](../docs/grading-v2-checklist.md). Deferred items and edge cases go in [docs/v2-backlog.md](../docs/v2-backlog.md). Sections below describe the code as it is today; update them as milestones land.

## Tech Stack

### Backend (`backend/`)
- **API**: FastAPI (Python 3.12), routes under `/api/v1`
- **ORM / DB**: SQLModel on PostgreSQL 15 (Docker, host port 5433). Schema versioned with **Alembic** (`backend/alembic/`); the app never calls `create_all` (tests do). Any model change needs a migration (`alembic revision --autogenerate`, then review it); CI runs `alembic check`
- **Background jobs**: Celery with Redis broker; one task grades one submission
- **Auth**: JWT bearer tokens (PyJWT) + bcrypt; org-scoped roles owner / admin / teacher / student
- **Files**: local disk under `UPLOAD_DIR` (shared with the worker via the `./backend/data` volume in Docker). MinIO runs in compose but is not used yet
- **Logging**: structlog

### AI/ML
- **Provider layer**: `app/core/llm_provider.py`, provider-agnostic. `LLM_PROVIDER=openai|anthropic` for the whole app
- **Models per role**: `LLM_VISION_MODEL` (OCR), `LLM_GRADER_MODEL` (tagging + grading), `LLM_ORCHESTRATOR_MODEL` (evaluator). Defaults are `gpt-5-nano-2025-08-07`; model names must belong to the chosen provider
- **Orchestration**: LangGraph, one graph run per question (no checkpointer)
- AGNTCY / observability SDKs are not integrated yet

### Frontend (`frontend/`)
- Next.js 16 (App Router), React 19, TypeScript
- Styling: CSS Modules plus some inline styles (no Tailwind)
- HTTP: axios client in `lib/api.ts` (bearer token from the `token` cookie, redirects to `/login` on 401). API base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`)

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app, CORS, request logging
│   ├── worker.py                  # Celery app + grade_exam_task
│   ├── initial_data.py            # alembic upgrade head + first superuser
│   ├── api/
│   │   ├── deps.py                # current user, get_membership, require_org_role
│   │   └── v1/endpoints/          # login, users, orgs, batches, exams, submissions
│   ├── core/                      # config, db, security, constants, llm_provider,
│   │                              # llm_protection (per-run call budget), langgraph_setup
│   ├── crud/                      # data access (soft-delete aware)
│   ├── models/                    # SQLModel tables (user, org, exam)
│   ├── schemas/                   # Pydantic request/response + grading pipeline schemas
│   ├── services/                  # grading_service (pipeline), ocr_service, pdf_service,
│   │                              # triplet_service, enrollment_service, org_service
│   └── agents/
│       ├── orchestrator.py        # LangGraph graph: tag -> grader -> evaluator loop
│       └── graders/               # base + math, english, science, history, general
└── tests/                         # pytest suite (FakeLLM, SQLite or Postgres)
frontend/
├── app/                           # (auth)/login, dashboard/{orgs,classes,exams,exams/[id]}
├── components/ context/ hooks/    # UI, React contexts per resource
├── services/ types/               # API calls and types per resource
└── lib/                           # api.ts (axios client), utils.ts
docs/                              # architecture, ADRs, proposals/
```

## Data Model
`User` (global identity) → `Membership` (user + org + role) → `Organization`.
`Batch` (class) ← `Enrollment` → student `Membership`.
`Exam` (org, optional batch) → `Question` (text, `max_score`, free-text `rubric_criteria`, `order_index`, type).
`Submission` (exam, optional student membership, file path, status, `current_step`, totals) → `SubmissionAnswer` (question, transcribed answer text, score, feedback, reasoning).

All tables have `deleted_at` (soft delete); CRUD helpers filter it. Timestamps are timezone-aware UTC — use `app.models.base.utcnow()`, never `datetime.utcnow()` (SQLModel ≥ 0.0.45 rejects naive datetimes).

Submission statuses: `PENDING → PROCESSING → GRADED | FAILED`. `APPROVED` / `PUBLISHED` exist in the enum but nothing sets them yet.

## Grading Pipeline (`services/grading_service.py`)
1. Load the exam's live questions in order and label them `Q1..Qn` (labels, not DB UUIDs, are what the OCR model echoes back).
2. **OCR**: rasterize PDF pages (poppler), send to the vision model in batches of 10 pages, get answers keyed by label.
3. **Triplets**: pair each question with its answer and its rubric (rubric text → one expected point per line).
4. **Grade**: per question, LangGraph tags the subject, routes to a subject grader, and an LLM evaluator may request up to 3 attempts.
5. **Save**: all answers and totals in one transaction; status `GRADED`.

Failure rules: unparseable model output is retried once, then the submission is marked `FAILED` with the error in `current_step` — never record a made-up score. Each run is capped at `LLM_MAX_CALLS_PER_SUBMISSION` LLM calls.

## Development Commands

```bash
# Environment (conda) — installs backend/requirements.txt
conda env create -f environment.yml && conda activate gr8r
# Requires poppler (pdftoppm) for PDF conversion: brew install poppler

# Infrastructure only
docker compose up -d db redis

# Backend (from backend/, with backend/.env)
python -m app.initial_data                                  # migrations + first superuser
alembic upgrade head / alembic check                        # migrations only / drift check
uvicorn app.main:app --reload --port 8000
celery -A app.worker.celery_app worker --loglevel=info

# Frontend
cd frontend && npm install && npm run dev                   # http://localhost:3000

# Tests (no API keys needed; FakeLLM + SQLite)
cd backend && pytest
TEST_DATABASE_URL=postgresql://user:password@localhost:5433/test pytest   # against Postgres

# Frontend checks
cd frontend && npx tsc --noEmit && npm run lint && npm run build

# Format / lint backend
cd backend && ruff check app tests alembic    # same as CI
```

Full stack in Docker: copy root `.env.example` to `.env`, `docker compose up -d --build` (the `migrate` service runs migrations first), then `docker compose run --rm backend python -m app.initial_data` for the superuser. CI: `.github/workflows/ci.yml`.

## Environment Variables
See `backend/.env.example` (local) and `.env.example` (docker compose). Key ones:

```bash
SECRET_KEY=...                       # required
DATABASE_URL=postgresql://user:password@localhost:5433/graider
CELERY_BROKER_URL=redis://localhost:6379/0
LLM_PROVIDER=openai                  # or anthropic
OPENAI_API_KEY=... / ANTHROPIC_API_KEY=...
LLM_VISION_MODEL / LLM_GRADER_MODEL / LLM_ORCHESTRATOR_MODEL
LLM_MAX_CALLS_PER_SUBMISSION=200
UPLOAD_DIR=./data/uploads            MAX_UPLOAD_SIZE_MB=50
FIRST_SUPERUSER_EMAIL / FIRST_SUPERUSER_PASSWORD
BACKEND_CORS_ORIGINS=http://localhost:3000   # comma-separated or JSON list
```

## API Endpoints (`/api/v1`)

| Method | Endpoint | Who |
|--------|----------|-----|
| POST | /auth/login | anyone (OAuth2 form: username=email) |
| GET | /users/me | logged in |
| GET, POST | /users/ | superuser |
| GET | /orgs/ | own orgs (superuser: all) |
| POST | /orgs/ | superuser (creator becomes owner) |
| GET, DELETE | /orgs/{id} | member / owner |
| GET, POST | /batches/?org_id= , /batches/ | staff / owner+admin |
| DELETE | /batches/{id} | owner+admin |
| POST | /batches/{id}/enroll, /batches/{id}/upload-students | staff |
| GET | /batches/{id}/students | staff |
| GET, POST | /exams/?org_id=&batch_id= , /exams/ | member / staff |
| GET, PATCH, DELETE | /exams/{id} | member / staff / owner+admin |
| POST | /exams/{id}/questions | staff — full-list sync: send `id` for existing questions; missing ones are soft-deleted |
| POST | /exams/{id}/questions/upload | staff — Excel import, all-or-nothing |
| GET, POST | /exams/{id}/submissions | staff — list / upload answer sheet (queues grading) |
| GET | /submissions/{id} | member (students: own only) |
| POST | /submissions/{id}/regrade | staff |
| GET | /health | anyone |

"Staff" = owner, admin or teacher. Use `deps.require_org_role(...)` for every org-scoped check.

## Coding Guidelines
1. Type hints on all function signatures; Pydantic schemas for request/response
2. Every org-scoped endpoint checks membership/role via `deps.require_org_role`; validate that referenced ids (batch, student, question) belong to the same org/exam
3. Never trust client file names; store uploads under `UPLOAD_DIR` with generated names
4. LLM output: parse with `extract_json_object`, validate, retry once, then raise — never default to a score
5. Every LLM call goes through `protector.check_and_increment()` and the async `achat` / `achat_vision` helpers
6. Structured logging with structlog
7. Mock LLMs in tests with the `fake_llm` fixture (`tests/conftest.py`); tests must not need API keys

## Git Workflow
- Feature branches + PRs; don't commit directly to `master`
- Small commits, one concern each, conventional messages (`fix(scope): ...`, `feat`, `refactor`, `test`, `docs`, `build`)
- Run `pytest` and the frontend checks before pushing

## Testing
- `backend/tests/test_pipeline.py` — grading pipeline against a real DB with FakeLLM
- `backend/tests/test_api.py` — auth, tenant isolation, question sync/import, uploads, submissions
- `backend/tests/test_grading.py` — JSON extraction, grader retries, call budget

## Known Gaps
- Frontend lint has existing `any` / hook warnings
- No audit trail of prompts/LLM calls, no human review/approval flow, single provider per deployment — see the proposal

## Key Documents
- [Grading v2 architecture (Proposal 002, accepted)](../docs/proposals/002-grading-v2-architecture.md)
- [Grading v2 feature checklist](../docs/grading-v2-checklist.md)
- [v2 backlog](../docs/v2-backlog.md)
- [Startup Guide](../STARTUP_GUIDE.md)
- [Architecture](../docs/architecture.md), [ADRs](../docs/ADRs.md)
- [System flow](../docs/system-flow.md), [User flow](../docs/user-flow.md)
- [Original requirements](../docs/start.txt)

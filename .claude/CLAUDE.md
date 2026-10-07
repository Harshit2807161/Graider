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
- **Document intake** (`app/ingestion/`, Proposal 003): uploads are identified by their bytes (`filetype`), checked (zip bombs, macros, encrypted PDFs, size/page/pixel caps) and turned into pages: PDFs rendered with pypdfium2 at 200 DPI (text layer kept for digital pages), images via Pillow + pi-heif (EXIF rotation, photo straightening with OpenCV), Word/ODT/RTF/PowerPoint via the sandboxed **Gotenberg** container (`GOTENBERG_URL`). No poppler
- **Logging**: structlog

### AI/ML
- **Model router** (`app/llm/`): every LLM call goes through `get_router().call(LLMRequest[Schema](...))`. Roles `vision`, `rubric_parser`, `grader`, `evaluator`, each with a primary target + fallbacks (`LLM__<ROLE>__...` env). Providers: `anthropic` (ChatAnthropic, native structured outputs), `openai`, `openweight` (self-hosted vLLM/SGLang via ChatOpenAI + `base_url`). Defaults: Claude Opus 5.5 (vision, rubric_parser, evaluator), Sonnet 5.5 (grader). See [docs/deploy/open-weight.md](../docs/deploy/open-weight.md)
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
│   ├── worker.py                  # Celery app + grade_submission_task(run_id); one event loop per process
│   ├── initial_data.py            # alembic upgrade head + first superuser
│   ├── api/
│   │   ├── deps.py                # current user, get_membership, require_org_role
│   │   └── v1/endpoints/          # login, users, orgs, batches, exams, submissions
│   ├── core/                      # config, db (engine, upgrade_to_head), security, constants, langgraph_setup
│   ├── audit/                     # grading runs (lifecycle) + DbCallRecorder → llm_calls (append-only)
│   ├── rubrics/                   # RubricSpec schema, validation, LLM parser, spec lifecycle
│   ├── ingestion/                 # formats (detect + safety), pages (render), office (Gotenberg), service
│   ├── observability/             # optional Langfuse tracing (one trace per run, images masked)
│   ├── llm/                       # model router: types, config (roles/targets), schema, invoker
│   │                              # (LangChain chat models), router, budget, costs, recorder
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
`Exam` (org, optional batch) → `Question` (text, `max_score`, free-text `rubric_criteria`, `order_index`, type, `rubric_status`) → `RubricSpecRecord` (`rubric_specs`: append-only versions of the parsed rubric; the current spec is the newest for the question's current inputs).
`Submission` (exam, optional student membership, file path, status, `current_step`, totals) → `SubmissionAnswer` (question, transcribed answer text, score, feedback, reasoning).

All tables have `deleted_at` (soft delete); CRUD helpers filter it. Timestamps are timezone-aware UTC — use `app.models.base.utcnow()`, never `datetime.utcnow()` (SQLModel ≥ 0.0.45 rejects naive datetimes).

`Document` (`documents`: one uploaded file, its role, position in the submission, kind from its bytes) → `DocumentPage` (`document_pages`: page image + text layer; derived, re-makeable). A submission's answers are its documents in order; old submissions are adopted from `original_file_url`.

Submission statuses: `PENDING → PROCESSING → GRADED | FAILED`. `APPROVED` / `PUBLISHED` exist in the enum but nothing sets them yet.

## Grading Pipeline (`services/grading_service.py`)
Every grading attempt is a **grading run** (`grading_runs`): the API creates it (`trigger` upload/regrade) and enqueues `grade_submission_task(run_id)`; `run_grading(run_id)` skips finished runs (idempotent), snapshots the model config, records every model call to `llm_calls` (append-only; a failed audit write fails the run), and finishes the run as succeeded/failed. See [docs/audit-trail.md](../docs/audit-trail.md).
1. Load the exam's live questions in order and label them `Q1..Qn` (labels, not DB UUIDs, are what the OCR model echoes back).
2. **Rubric specs**: every question needs a *ready* spec for its current inputs. Missing ones are parsed now (`ensure_rubric_specs`); if any is invalid or couldn't be parsed, the run fails before OCR with the reasons (per-question escalation comes in M5). Specs are normally parsed in the background when questions are saved (`parse_rubric_task`, queue `rubric`); see `app/rubrics/`.
3. **Pages + OCR**: the submission's files become pages (`submission_pages`, made once); each page's image (plus the typed text of digital PDF pages, as a hint) goes to the vision model in batches of 10, answers keyed by label.
4. **Triplets**: pair each question with its answer and its spec's criteria (ids, points, expected answers, notes).
5. **Grade**: per question, LangGraph tags the subject, routes to a subject grader, and an LLM evaluator may request up to 3 attempts.
6. **Save**: all answers and totals in one transaction; status `GRADED`.

Failure rules: unparseable model output is retried once, then the submission is marked `FAILED` with the error in `current_step` — never record a made-up score. Each run has a call + USD budget (`LLM__MAX_CALLS_BASE`, `LLM__MAX_CALLS_PER_QUESTION`, `LLM__MAX_COST_USD_PER_SUBMISSION`).

## Development Commands

```bash
# Environment (conda) — installs backend/requirements.txt
conda env create -f environment.yml && conda activate gr8r
# Optional, for Word/ODT/RTF/PowerPoint uploads: docker run -d -p 127.0.0.1:3002:3000 gotenberg/gotenberg:8.37.0-libreoffice  (GOTENBERG_URL=http://localhost:3002)

# Infrastructure only
docker compose up -d db redis

# Backend (from backend/, with backend/.env)
python -m app.initial_data                                  # migrations + first superuser
alembic upgrade head / alembic check                        # migrations only / drift check
uvicorn app.main:app --reload --port 8000
celery -A app.worker.celery_app worker -Q celery,rubric --pool=solo --loglevel=info   # --pool=solo on macOS only

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

Full stack in Docker: copy root `.env.example` to `.env`, `docker compose up -d --build` (the `migrate` service runs migrations first), then `docker compose run --rm backend python -m app.initial_data` for the superuser. Optional Langfuse (traces/dashboards, UI on :3001): add `-f docker-compose.langfuse.yml` — see docs/observability.md. CI: `.github/workflows/ci.yml`.

## Environment Variables
See `backend/.env.example` (local) and `.env.example` (docker compose). Key ones:

```bash
SECRET_KEY=...                       # required
DATABASE_URL=postgresql://user:password@localhost:5433/graider
CELERY_BROKER_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=... / OPENAI_API_KEY=... / OPENWEIGHT_API_KEY=...
LLM__GRADER__PROVIDER / __MODEL / __BASE_URL / __EFFORT / __FALLBACKS=[...]   # per role; profiles in backend/.env.example
LLM__ALLOW_EXTERNAL_FALLBACK=true    LLM__MAX_COST_USD_PER_SUBMISSION=10
UPLOAD_DIR=./data/uploads            MAX_UPLOAD_SIZE_MB=50 (per file)
GOTENBERG_URL=http://localhost:3002  # office documents; INGEST_DPI=200, INGEST_MAX_LONG_EDGE=2576, MAX_*_PER_* caps
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
| POST | /exams/{id}/questions | staff — full-list sync: send `id` for existing questions; missing ones are soft-deleted; changed questions get their rubric re-parsed |
| POST | /exams/{id}/questions/upload | staff — Excel import, all-or-nothing |
| GET | /exams/{id}/rubric-status | staff — rubric state of every question (Q1..Qn) |
| GET, PUT | /exams/{id}/questions/{qid}/rubric-spec | staff — current parsed rubric; replace with a teacher's version (422 if it fails the checks) |
| POST | /exams/{id}/questions/{qid}/rubric-spec/reparse | staff — queue a fresh parse |
| GET, POST | /exams/{id}/submissions | staff — list / upload a student's answers: `file` or several `files` (PDF, Word/ODT/RTF/PPTX, JPEG/PNG/WebP/HEIC/TIFF/GIF/BMP, text); queues grading |
| GET | /submissions/{id} | member (students: own only) |
| POST | /submissions/{id}/regrade | staff |
| GET | /health | anyone |

"Staff" = owner, admin or teacher. Use `deps.require_org_role(...)` for every org-scoped check.

## Coding Guidelines
1. Type hints on all function signatures; Pydantic schemas for request/response
2. Every org-scoped endpoint checks membership/role via `deps.require_org_role`; validate that referenced ids (batch, student, question) belong to the same org/exam
3. Never trust client file names; store uploads under `UPLOAD_DIR` with generated names
4. LLM output: define a Pydantic output schema (no defaults, `extra="forbid"`, validators for domain rules) and call the router; it enforces the schema natively, repairs once, falls back, and raises `LLMAllTargetsFailed` — never default to a score
5. Never import provider SDKs or LangChain chat models outside `app/llm/`; the router records every attempt and enforces the per-run budget
6. Structured logging with structlog
7. Mock LLMs in tests with the `fake_llm` fixture (a `FakeInvoker` below the router, routed by output-schema title); tests must not need API keys. Live tests are opt-in (`pytest -m live`)

## Git Workflow
- Feature branches + PRs; don't commit directly to `master`
- Small commits, one concern each, conventional messages (`fix(scope): ...`, `feat`, `refactor`, `test`, `docs`, `build`)
- Run `pytest` and the frontend checks before pushing

## Testing
- `backend/tests/test_pipeline.py` — grading pipeline against a real DB with FakeLLM
- `backend/tests/test_api.py` — auth, tenant isolation, question sync/import, uploads, submissions
- `backend/tests/test_grading.py` — JSON extraction, grader retries, call budget
- `backend/tests/test_rubrics.py` — rubric spec validation, parsing lifecycle, grading against specs
- `backend/tests/test_ingestion.py` — every file format (generated in `tests/ingestion_fixtures.py`), safety checks, pages, documents; real office conversion when `GOTENBERG_URL` is set (CI)
- `backend/tests/test_audit.py`, `test_tracing.py` — audit rows, run lifecycle, Langfuse tracing

## Known Gaps
- Frontend lint has existing `any` / hook warnings
- No human review/approval flow yet (M6); audit has no tamper-evidence/retention/erasure tooling yet — see docs/audit-trail.md and the backlog

## Key Documents
- [Audit trail](../docs/audit-trail.md)
- [Grading v2 architecture (Proposal 002, accepted)](../docs/proposals/002-grading-v2-architecture.md)
- [Grading v2 feature checklist](../docs/grading-v2-checklist.md)
- [v2 backlog](../docs/v2-backlog.md)
- [Startup Guide](../STARTUP_GUIDE.md)
- [Architecture](../docs/architecture.md), [ADRs](../docs/ADRs.md)
- [System flow](../docs/system-flow.md), [User flow](../docs/user-flow.md)
- [Original requirements](../docs/start.txt)

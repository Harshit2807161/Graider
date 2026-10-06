# Gr8r: AI-powered grading of handwritten answers

Teachers set up an organization, classes and exams (questions with rubrics), then upload a student's answer sheet as a PDF or image. A background worker transcribes the handwriting with a vision model and grades each answer against the rubric. Teachers see scores, feedback and reasoning per question.

> **Status (Oct 2026):** the multi-tenant web app works end to end on branch `v1-full`. **Grading v2** — auditable criterion-level grading with an evaluator loop, a teacher review workflow, and support for self-hosted open-weight models as well as API models — is designed in [Proposal 002](docs/proposals/002-grading-v2-architecture.md) and tracked in the [feature checklist](docs/grading-v2-checklist.md).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, CSS Modules (`frontend/`) |
| API | FastAPI (`backend/app`), JWT auth, org-scoped roles |
| Data | PostgreSQL 15 via SQLModel |
| Jobs | Celery worker with Redis broker; one task grades one submission |
| AI | Vision OCR + LangGraph grading agents. Today: OpenAI or Anthropic via `LLM_PROVIDER`. Grading v2: per-role Claude / OpenAI / self-hosted vLLM-SGLang models with fallback. |

## Quick start

```bash
conda env create -f environment.yml && conda activate gr8r     # Python 3.12 + backend deps
brew install poppler                                           # PDF → image (macOS)
cp backend/.env.example backend/.env                           # set SECRET_KEY, LLM keys/models
docker compose up -d db redis                                  # Postgres :5433, Redis :6379
cd backend && python -m app.initial_data                       # tables + first superuser
uvicorn app.main:app --reload --port 8000                      # API (docs at /docs)
celery -A app.worker.celery_app worker --loglevel=info         # worker (second terminal)
cd frontend && npm install && npm run dev                      # http://localhost:3000
```

Full setup, Docker-only setup and troubleshooting: [STARTUP_GUIDE.md](STARTUP_GUIDE.md).

## Tests

```bash
cd backend && pytest                                  # SQLite + fake LLM, no API keys needed
TEST_DATABASE_URL=postgresql://... pytest             # same suite against Postgres
cd frontend && npx tsc --noEmit && npm run build
```

## Documentation

| Doc | What it covers |
|---|---|
| [Proposal 002](docs/proposals/002-grading-v2-architecture.md) | Accepted grading v2 architecture: decisions, model layer, rubrics, evaluator loop, audit, workflow, evals, cost, risks |
| [Feature checklist](docs/grading-v2-checklist.md) | Milestones M0–M10, acceptance criteria, PR status |
| [v2 backlog](docs/v2-backlog.md) | Deferred items and edge cases |
| [ADRs](docs/ADRs.md) | Architecture decision records |
| [STARTUP_GUIDE.md](STARTUP_GUIDE.md) | Local and Docker setup |
| [`.claude/CLAUDE.md`](.claude/CLAUDE.md) | Codebase guide: structure, data model, API endpoints, conventions |
| [docs/architecture.md](docs/architecture.md), [system-flow](docs/system-flow.md), [user-flow](docs/user-flow.md) | Original MVP design docs (historical; partly superseded by Proposal 002) |

## Contributing

Feature branch per change, small conventional commits (`feat(scope): …`, `fix`, `docs`, `test`, `refactor`, `chore`), PR into `v1-full`, CI green, owner merges.

# Gr8r - AI-Powered Grading System

## Project Overview
Gr8r grades handwritten exam answers. Teachers set up organizations, classes (batches) and exams with questions and rubrics, then upload a student's answer sheet (PDF or image). A background worker reads every page with a vision LLM, stitches each question's answer, and grades it against a checked rubric spec with an evaluator-optimizer loop (grader + independent evaluator, at most 2 revisions), escalating to the teacher whatever it can't decide.

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
- **Orchestration**: LangGraph, one graph run per submission (pages read in parallel, then questions graded in parallel via `Send`; no checkpointer). The per-question loop is plain async code (`app/grading/question.py`)
- AGNTCY / observability SDKs are not integrated yet

### Frontend (`frontend/`)
- Next.js 16 (App Router), React 19, TypeScript
- Styling: CSS Modules (no Tailwind) on the design tokens in `app/globals.css` (status colours, type and spacing scales, radii). New UI builds on the existing components and visual language (cards, icon tiles, pills, modals); see docs/grading-v2-checklist.md M7
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
│   ├── core/                      # config, db (engine, upgrade_to_head), security, constants
│   ├── audit/                     # grading runs (lifecycle) + DbCallRecorder → llm_calls (append-only)
│   ├── rubrics/                   # RubricSpec schema, validation, LLM parser, spec lifecycle
│   ├── ingestion/                 # formats (detect + safety), pages (render), office (Gotenberg), service
│   ├── exam_drafts/               # exam documents -> draft: page extraction, merge, rubric linking, checks, confirm
│   ├── observability/             # optional Langfuse tracing (one trace per run, images masked)
│   ├── admin/                     # CLI commands: reparse_specs, langfuse_retention
│   ├── llm/                       # model router: types, config (roles/targets), schema, invoker
│   │                              # (LangChain chat models), router, budget, costs, recorder
│   ├── crud/                      # data access (soft-delete aware)
│   ├── models/                    # SQLModel tables (user, org, exam)
│   ├── schemas/                   # Pydantic request/response + grading pipeline schemas
│   ├── grading/                   # grading v2: schemas, prompts, checks, stitch, choices, question loop,
│   │                              # transcribe (pages), graph (LangGraph), persist (versions + totals)
│   ├── workflow/                  # state.py (submission status edges + grade events), actions.py (teacher
│   │                              # actions: override, resolve, transcript edit, regrade, approve, publish)
│   └── services/                  # grading_service (run lifecycle), labels, enrollment_service, org_service
└── tests/                         # pytest suite (FakeLLM, SQLite or Postgres)
frontend/
├── app/                           # (auth)/login, dashboard/{orgs,classes,exams,exams/[id],
│                                  #   exams/[id]/review (queue), exams/[id]/submissions/[sid] (review screen), results (students)}
├── components/                    # ui/ (Button, Card, Input, Modal, ConfirmDialog, StatusBadge, InlineMessage),
│                                  # common/ (Sidebar, PageHeader, ErrorBanner, ButtonLink, useHydrated, useTabTitle),
│                                  # features/{review,rubrics,exams,classes,orgs,auth}
├── context/ hooks/                # React contexts per resource
├── services/ types/               # API calls and types per resource (review, rubric, exam, ...)
└── lib/                           # api.ts (axios client), utils.ts
docs/                              # architecture, ADRs, proposals/
```

## Data Model
`User` (global identity) → `Membership` (user + org + role) → `Organization`.
`Batch` (class) ← `Enrollment` → student `Membership`.
`Exam` (org, optional batch) → `Question` (text, `max_score`, free-text `rubric_criteria`, `order_index`, type, `rubric_status`) → `RubricSpecRecord` (`rubric_specs`: append-only versions of the parsed rubric; the current spec is the newest for the question's current inputs).
`Submission` (exam, optional student membership, file path, status, `current_step`, `failure_code`, totals) → `SubmissionAnswer` (question, transcribed answer text, score, feedback, reasoning).

All tables have `deleted_at` (soft delete); CRUD helpers filter it. Timestamps are timezone-aware UTC — use `app.models.base.utcnow()`, never `datetime.utcnow()` (SQLModel ≥ 0.0.45 rejects naive datetimes).

`Document` (`documents`: one uploaded file, its role, position in the submission, kind from its bytes) → `DocumentPage` (`document_pages`: page image + text layer; derived, re-makeable). A submission's answers are its documents in order; old submissions are adopted from `original_file_url`.
Exam documents (question paper / rubric / both / blank copy) have no submission; `ExamDraft` (`exam_drafts`) is a versioned extraction of them that the teacher confirms into questions. Questions carry `label` (e.g. `2(b)`), `printed_label` and `choice_group` (groups in `exam.config["choice_groups"]`).

`Transcription` / `AnswerGrade` (`transcriptions`, `answer_grades`): versioned per (submission, question), one current version, append-only except `is_current` (Postgres triggers). Grades keep criteria (score, quoted evidence, justification), every evaluator round, flags, escalation reason, models, the spec and transcription used, and whether they count (choice groups). `submission_answers` is the projection the UI reads; `submissions.unassigned_segments` holds answers the model couldn't place.

`GradeEvent` (`grade_events`, append-only): every teacher action on a submission (override, resolve, transcript edit, regrade, approve, unapprove, publish, review complete) with actor, reason, before and after. Runs, model calls, versions and events together are the submission's audit timeline.

Submission statuses (`app/workflow/state.py`, Proposal 002 §9): the worker moves `PENDING → PROCESSING → GRADED | NEEDS_REVIEW | FAILED`; teachers move `NEEDS_REVIEW → GRADED` (last escalation resolved), `GRADED ⇄ APPROVED` (approve / unapprove; refused while answers need review), `APPROVED → PUBLISHED` (exam-level publish; final), and `GRADED | NEEDS_REVIEW | APPROVED | FAILED → PENDING` (regrade or transcript edit; clears an approval). Teacher actions go through `app/workflow/actions.py` (one transaction, submission row locked, a grade event, new versions instead of changes); a move the state doesn't allow is a 409. Students see only their own `PUBLISHED` submissions, reduced to scores and feedback.

## Grading Pipeline (`services/grading_service.py`, `app/grading/`)
Every grading attempt is a **grading run** (`grading_runs`): the API creates it (`trigger` upload / regrade / transcript_edit, optionally scoped to some `question_ids`) and enqueues `grade_submission_task(run_id)`; `run_grading(run_id)` skips finished runs (idempotent), snapshots models + thresholds + prompt versions, records every model call to `llm_calls` (append-only; a failed audit write fails the run). See [docs/audit-trail.md](../docs/audit-trail.md).
1. Questions in order, labelled with the paper's labels (`2(b)`) if every question has a unique one, else `Q1..Qn`.
2. **Rubric specs** (`ensure_rubric_specs`): parsed now if missing. A question without a *ready* spec escalates (`rubric_invalid`); the others are graded.
3. **Pages** (`submission_pages`) are read in parallel (`transcribe_page`: segments labelled with the exam's labels or `unassigned`, student's own writing only, plus an inventory of questions and drawings on the page) and **stitched** in code (unnumbered continuations join the previous answer, fully crossed-out blocks excluded and flagged, unplaced work kept for the teacher; answers on a page whose inventory the transcript doesn't cover get `page_inventory_mismatch`). Choice-group alternatives the student didn't answer aren't graded.
4. **Each question** is graded in parallel (`grade_question`, Proposal 002 §7): no answer → escalate (`no_answer_found`, never auto-zero); grade with quoted evidence → code checks (+1 repair) → grader flags escalate → evaluator (own view first) → effective agreement = min(stated, score gap), any criterion beyond tolerance counts as disagreement → revise (accept/reject each point) ≤ `GRADING_MAX_REVISIONS` → finalize or escalate `evaluator_disagreement`. A failed evidence quote, a rubric expecting a drawing (`drawing_expected`), an inventory mismatch, low transcription confidence, repeated attempts and spot checks keep the proposed score but escalate. Grader and evaluator fallbacks avoid each other's model.
5. **Save** in one transaction (`persist.save_results`): new transcription/grade versions, projection, totals (choice groups counted once; extra alternatives by `exam.config["choice_policy"]` best/first), status `GRADED` or `NEEDS_REVIEW`.

Failure rules: the run is `FAILED` only when pages can't be read, the budget (`LLM__MAX_CALLS_*` + 2 per page, `LLM__MAX_COST_USD_PER_SUBMISSION`) runs out, or the exam has no questions (`submissions.failure_code`: `pages_unreadable`, `budget_exhausted`, `no_questions`, `model_unavailable`, `internal_error`) — per-question problems escalate that answer. Never record a made-up score. Grading settings: `GRADING_AGREEMENT_THRESHOLD` (0.8), `GRADING_MAX_REVISIONS` (2), `GRADING_CRITERION_TOLERANCE` (0.25 of a criterion's points), `GRADING_OCR_CONFIDENCE_THRESHOLD` (0.5), `GRADING_SPOT_CHECK_RATE` (0), `GRADING_MAX_CONCURRENCY` (4).

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
python -m app.admin.reparse_specs [--org-id ID] [--dry-run]                    # re-parse AI specs from an older parser prompt
python -m app.admin.langfuse_retention --older-than-days N [--submission-id ID] [--dry-run]   # delete old Langfuse traces

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
LLM__ALLOW_UNPRICED_MODELS=false     # the router refuses an API model with no price unless true
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
| GET | /orgs/ | own orgs (superuser: all), each with the user's `role` there |
| POST | /orgs/ | superuser (creator becomes owner) |
| GET, DELETE | /orgs/{id} | member / owner |
| GET | /orgs/{id}/students/{membership_id}/export | owner+admin — everything recorded about one student's grading (runs, call metadata, versions, events) |
| GET, POST | /batches/?org_id= , /batches/ | staff / owner+admin |
| DELETE | /batches/{id} | owner+admin |
| POST | /batches/{id}/enroll, /batches/{id}/upload-students | staff |
| GET | /batches/{id}/students | staff |
| GET, POST | /exams/?org_id=&batch_id= , /exams/ | member / staff |
| GET | /exams/summary?org_id= | staff — every exam's answer sheets counted by status |
| GET, PATCH, DELETE | /exams/{id} | member (students: no rubric fields) / staff / owner+admin |
| POST | /exams/{id}/questions | staff — full-list sync: send `id` for existing questions; missing ones are soft-deleted; changed questions get their rubric re-parsed |
| POST | /exams/{id}/questions/upload | staff — Excel import, all-or-nothing |
| GET | /exams/{id}/rubric-status | staff — rubric state of every question (Q1..Qn) |
| POST, GET | /exams/{id}/documents | staff — upload exam documents with `role` (question_paper, rubric, question_paper_and_rubric, blank_copy) / list them |
| DELETE | /exams/{id}/documents/{document_id} | staff — soft-delete a document no confirmed draft uses (409 otherwise) |
| POST, GET | /exams/{id}/drafts | staff — extract a draft from chosen documents (background, 202) / list versions |
| GET, PUT | /exams/{id}/drafts/{draft_id} | staff — read (content + issues) / save the teacher's corrections as a new version |
| POST | /exams/{id}/drafts/{draft_id}/confirm | staff — create/update the exam's questions (409 with blocking issues) |
| GET, PUT | /exams/{id}/questions/{qid}/rubric-spec | staff — current parsed rubric; replace with a teacher's version (422 if it fails the checks) |
| POST | /exams/{id}/questions/{qid}/rubric-spec/reparse | staff — queue a fresh parse |
| GET, POST | /exams/{id}/submissions | staff — list / upload a student's answers: `file` or several `files` (PDF, Word/ODT/RTF/PPTX, JPEG/PNG/WebP/HEIC/TIFF/GIF/BMP, text); queues grading |
| GET, PATCH | /exams/{id}/grading-settings | staff — agreement threshold (0.5–1), spot-check rate (0–1), choice policy (best/first) |
| GET | /exams/{id}/review-queue | staff — answers to review: escalated first, then lowest evaluator agreement (`escalated_only`) |
| POST | /exams/{id}/publish | staff — publish the approved submissions |
| GET | /submissions/mine | a student's own published results (+ how many aren't published yet) |
| GET | /submissions/{id} | staff: full (with `failure_code`); students: own and published only, scores, per-criterion marks and feedback |
| GET | /submissions/{id}/review | staff — pages, and per question spec, transcript, current grade with evaluator rounds, earlier versions, `rubric_outdated` |
| GET | /submissions/{id}/pages/{n}/image | staff; the student whose sheet it is, once published — page image |
| GET | /submissions/{id}/timeline | staff — runs, model calls, versions, actions; `bodies=true` raw model I/O for owner/admin |
| POST | /submissions/{id}/answers/{qid}/override | staff — set every criterion's score; `expected_grade_id`, mandatory `reason` (409 stale, 422 failed checks) |
| POST | /submissions/{id}/answers/{qid}/resolve | staff — accept an escalated answer's proposed grade |
| PATCH | /submissions/{id}/answers/{qid}/transcript | staff — correct a transcript (mandatory `reason`); regrades that question |
| POST | /submissions/{id}/regrade, /approve, /unapprove | staff — optional `reason` |
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
- Each milestone PR adds its entry to `CHANGELOG.md`

## Testing
- `backend/tests/test_pipeline.py` — grading pipeline end to end against a real DB with fake models (versions, escalations, choice groups, scoped regrades)
- `backend/tests/test_api.py` — auth, tenant isolation, question sync/import, uploads, submissions
- `backend/tests/test_grading_v2.py` — code checks, agreement, stitching, choice groups, the per-question loop (agree, revise, push back, escalate, repair, flags, fallbacks, budget)
- `backend/tests/test_grading.py` — degraded-path JSON extraction, call/cost budget
- `backend/tests/test_workflow.py` — the status edges; `backend/tests/test_review.py` — review API end to end (overrides, resolve, transcript edit, approve, publish, queue, detail, images, timeline, student view, tenancy)
- `backend/tests/test_rubrics.py` — rubric spec validation, parsing lifecycle, grading against specs
- `backend/tests/test_ingestion.py` — every file format (generated in `tests/ingestion_fixtures.py`), safety checks, pages, documents; real office conversion when `GOTENBERG_URL` is set (CI)
- `backend/tests/test_audit.py`, `test_tracing.py` — audit rows, run lifecycle, Langfuse tracing

## Known Gaps
- Audit has no tamper-evidence/retention/erasure tooling yet — see docs/audit-trail.md and the backlog

## Key Documents
- [Changelog](../CHANGELOG.md)
- [Audit trail](../docs/audit-trail.md)
- [Grading v2 architecture (Proposal 002, accepted)](../docs/proposals/002-grading-v2-architecture.md)
- [Grading v2 feature checklist](../docs/grading-v2-checklist.md)
- [v2 backlog](../docs/v2-backlog.md)
- [Startup Guide](../STARTUP_GUIDE.md)
- [Architecture](../docs/architecture.md), [ADRs](../docs/ADRs.md)
- [System flow](../docs/system-flow.md), [User flow](../docs/user-flow.md)
- [Original requirements](../docs/start.txt)

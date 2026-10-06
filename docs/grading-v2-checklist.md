# Grading v2: feature checklist

Implements [Proposal 002](proposals/002-grading-v2-architecture.md). Deferred items live in the [v2 backlog](v2-backlog.md).

**Process**
- One branch and one PR per milestone, into `v1-full`.
- The owner reviews and merges before dependent milestones start.
- Commits are small and conventional (`feat(scope): …`, `fix`, `refactor`, `test`, `docs`, `build`, `chore`).
- Each PR ticks its boxes below and fills in its PR link.

**Definition of done (every item)**
- Tests use fake models only: no API keys or GPUs needed.
- CI is green: ruff, pytest on SQLite and on Postgres, frontend type-check and build.
- An Alembic migration is included whenever the schema changes, and `alembic check` is clean.
- Docs and this checklist are updated, and any new edge cases go into the [v2 backlog](v2-backlog.md).
- The PR is merged by the owner.

## Status overview

| M | Milestone | Branch | Depends on | PR | Status |
|---|---|---|---|---|---|
| M0 | Docs: proposal 002, checklist, backlog, ADRs | `docs/grading-v2-final` | – | – | In review |
| M1 | CI and migrations | `chore/ci-and-migrations` | – | – | In progress (2 commits) |
| M2 | Model router | `feat/llm-router` | M1 | – | Not started |
| M3 | Audit trail and MLflow | `feat/audit-and-tracing` | M2 | – | Not started |
| M4 | Rubric parser | `feat/rubric-parser` | M3 | – | Not started |
| M5 | Grading graph v2 | `feat/grading-graph-v2` | M4 | – | Not started |
| M6 | Review workflow API | `feat/review-workflow-api` | M5 | – | Not started |
| M7 | Review UI | `feat/review-ui` | M6 | – | Not started |
| M8 | Eval harness | `feat/eval-harness` | M5 | – | Not started |
| M9 | Public eval sets | `feat/eval-datasets` | M8 | – | Not started |
| M10 | Hardening | `chore/hardening` | M3, M6 | – | Not started |

---

## M0: Docs
- [x] `docs/proposals/002-grading-v2-architecture.md` (accepted architecture)
- [x] Proposal 001 marked superseded
- [x] This checklist
- [x] `docs/v2-backlog.md`
- [ ] ADRs: 008 and 009 superseded; new ADR-011 to ADR-014
- [ ] `CLAUDE.md` and `README.md` point to 002 and this checklist; retired model ids removed

## M1: CI and migrations
*Alembic versions the Postgres schema. The baseline is today's tables, and each later PR ships a numbered migration. `alembic upgrade head` applies whatever a database is missing, without losing data. It is unrelated to MLflow.*
- [x] fix(ocr): missing `QuestionType` import
- [x] chore(lint): ruff config, unused imports removed
- [ ] Alembic: `alembic.ini` and `alembic/env.py` (app settings, SQLModel metadata, SQLite batch mode); baseline migration that drops enums on downgrade; upgrade → downgrade → upgrade works; `alembic check` clean
- [ ] Startup: no `create_all` in `app/main.py` or `app/core/db.py`; `app/initial_data.py` runs `alembic upgrade head`; docker-compose gets a db healthcheck and a one-shot `migrate` service
- [ ] `requirements.txt` gains alembic; new `requirements-dev.txt` (ruff, pytest, pytest-asyncio, httpx)
- [ ] `.github/workflows/ci.yml`: ruff · pytest on SQLite · Postgres service running `alembic upgrade head`, `alembic check` and pytest · frontend `tsc --noEmit` and `next build`
- [ ] `tests/test_migrations.py` (Postgres only): upgrade/downgrade/upgrade with no drift
- [ ] Remove the ad-hoc `add_*_column.py` and `migrate_exams.py` scripts; STARTUP_GUIDE documents migrations and the `alembic stamp head` procedure for existing databases

**Acceptance:** CI is green on the PR; a fresh `docker compose up` migrates and boots; nothing outside the tests calls `create_all`.

## M2: Model router (open-weight + API)
- [ ] `app/llm/types.py`:
  - `Role` (vision, rubric_parser, grader, evaluator)
  - `ModelTarget`: provider `anthropic` | `openai` | `openweight`; model; base_url; api_key_env; effort; max_tokens; timeout; `external`; `supports_vision`; `supports_json_schema`; `model_revision`; `quantization`
  - `CallContext`, `AttemptRecord`, `LLMResult[T]`
  - Errors: refusal, truncated, output invalid, all targets failed
- [ ] `app/llm/config.py`:
  - Per-role primary target plus fallbacks, set through nested env vars
  - API defaults: vision, rubric_parser and evaluator on `claude-opus-5-5`; grader on `claude-sonnet-5-5`
  - `ALLOW_EXTERNAL_FALLBACK`
  - Validation: the vision role must use a vision-capable model
  - Remove the old `LLM_PROVIDER` / `LLM_*_MODEL` settings
- [ ] `app/llm/models.py`:
  - Build a `ChatAnthropic` or `ChatOpenAI` client per target, once per grading run
  - Structured output via `method="json_schema"`, with `include_raw=True`
  - Open-weight servers use guided decoding; a server without schema support gets a degraded path (schema in the prompt, then Pydantic validation)
  - Image content blocks
- [ ] `app/llm/router.py`:
  - Chain = pinned primary + fallbacks, minus excluded models, minus external targets when external fallback is disallowed
  - Before each call: budget check; then call with a timeout
  - Stop reasons: refusal goes to the next target; truncation gets one retry, then the next target
  - Invalid output: one repair request, then the next target
  - Transport error or timeout: next target
  - Every attempt is recorded
  - The grader's fallback never lands on the evaluator's model
- [ ] `app/llm/budget.py`: per-run call cap and USD cap, sized from pages × questions. Replaces `core/llm_protection.py`.
- [ ] `app/llm/costs.py`: price table; self-hosted targets cost 0
- [ ] `app/llm/recorder.py`: `CallRecorder` protocol (Null and Log versions now; DB version in M3); images recorded as reference plus sha256
- [ ] Open-weight setup:
  - `docs/deploy/open-weight.md`: vLLM/SGLang serving; pinned image, HF revision and quantization; health checks; structured-output backend; vision models; Ollama is for development only
  - `.env.example` profiles: API-only, hybrid, fully local
  - Optional compose profile `openweight` (needs a GPU; not run in CI)
- [ ] Migrate the call sites (OCR answer extraction, graders, orchestrator) and delete the old provider classes
- [ ] Tests:
  - `FakeInvoker` replaces the prompt-sniffing `FakeLLM`; port the existing tests
  - Router unit tests: repair, truncation, refusal → fallback, transport → fallback, **open-weight → Claude** and **Claude → open-weight**, all targets failed, budget, exclusions, external disallowed, attempt records
  - Contract tests against stub HTTP servers shaped like the Anthropic API and the OpenAI/vLLM API: schema present; no temperature, forced tool choice or prefill; image blocks; response mapping
  - Live smoke tests (`@pytest.mark.live`) for Claude and for a running vLLM/Ollama endpoint, skipped when unavailable

**Acceptance:** provider classes exist only under `app/llm/`; every call yields an `AttemptRecord`; switching any role between Claude and a self-hosted open-weight model takes config only.

## M3: Audit trail and MLflow
- [ ] Migration:
  - New tables: `grading_runs`, `llm_calls`, `submission_pages`, `transcriptions` (versioned), `answer_grades` (versioned), `grade_events`
  - Projection columns on `submission_answers` and `submissions`
  - `NEEDS_REVIEW` added to the enum (irreversible, run in an autocommit block)
  - VARCHAR for new status columns; JSONB on Postgres
- [ ] Append-only enforcement: Postgres triggers allow updating only `is_current`; an ORM guard does the same for SQLite
- [ ] `app/audit/`:
  - `DbCallRecorder`: a short transaction per call, committed immediately
  - `RunRecorder`: start, heartbeat, finish, config snapshot and hash
- [ ] Idempotent tasks:
  - The API creates the run; `grade_submission_task(run_id)` takes an advisory lock
  - Terminal run ⇒ no-op; stale heartbeat ⇒ abort and retry
  - Celery `visibility_timeout` longer than the task `time_limit`
- [ ] MLflow:
  - `app/observability/tracing.py`: autolog, plus a root span per run, only when `MLFLOW_TRACKING_URI` is set
  - Trace id stored on `llm_calls`
  - Tracing can never fail a run
  - Compose profile `observability`
- [ ] Tests:
  - A failed run keeps its `llm_calls`
  - Every attempt is recorded
  - Updates and deletes are rejected
  - Snapshot content is correct
  - A duplicate task delivery is a no-op
  - With MLflow off, nothing changes

**Acceptance:** any grade can be reconstructed from the tables: its spec, its transcript, every call and every round.

## M4: Rubric parser
- [ ] `app/rubrics/schema.py` (RubricSpec v1) and `validate.py` (pure functions): sum equals max, unique ids, points > 0, `pass_fail` rules, subject enum, `derived` rule
- [ ] Migration:
  - Append-only `rubric_specs` table
  - New `questions` columns: `rubric_spec_id`, `rubric_status`, `rubric_input_hash`
- [ ] Parser prompt with few-shot examples for: pass/fail or MCQ, explicit marks, implicit marks, empty rubric (derived)
- [ ] Triggers:
  - After a question sync or Excel import commits, a changed hash runs `parse_rubric_task` on the `rubric` queue (locks the row, skips stale tasks)
  - `ensure_rubric_specs()` parses lazily when a run starts
- [ ] API:
  - GET and PUT `…/questions/{qid}/rubric-spec`
  - POST `…/rubric-spec/reparse`
  - GET `/exams/{id}/rubric-status`
  - `QuestionRead` gains status, derived flag and a summary
- [ ] Tests:
  - Validation table
  - A hash change enqueues a parse; no change enqueues nothing
  - An invalid spec blocks only its own question
  - Teacher edit and re-parse
  - Tenancy

**Acceptance:** an invalid spec never reaches the grader.

## M5: Grading graph v2
- [ ] `app/grading/` package:
  - `state.py`, `graph.py`, `nodes/{context,ocr,question}.py`, `checks.py`
  - `schemas.py`: grader output, revision output, evaluator output (own assessment + agreement + feedback), page transcription
  - `prompts/`: versioned templates, subject personas, few-shot examples per rubric kind
  - `persist.py`, `sampling.py`
- [ ] Submission graph: context → per-page transcription `Send` → stitching in code → per-question `Send` → aggregate; `max_concurrency` setting
- [ ] Per-question flow:
  1. Precheck: no answer found, invalid rubric, or low OCR confidence ⇒ escalate
  2. Grade
  3. Checks (one repair allowed)
  4. Grader flags ⇒ escalate
  5. Evaluate (own view first) ⇒ effective agreement in code
  6. Revise or push back, at most 2 times ⇒ finalize or escalate
- [ ] Final transaction: transcriptions, answer grades, projections, events, totals; status GRADED or NEEDS_REVIEW. FAILED only for OCR failure, exhausted budget or no questions.
- [ ] Spot-check sampler: seeded by run id; default 0%
- [ ] Delete the replaced code: `app/agents/`, `core/langgraph_setup.py`, `services/triplet_service.py`, `rubric_from_text`, unused OCR methods, legacy schemas
- [ ] Tests:
  - Agree in round 1 (2 calls per answer)
  - Revise once, then agree
  - Push-back accepted
  - 2 revisions ⇒ escalation with both positions stored
  - LLM reports high agreement but the score gap is large ⇒ treated as disagreement
  - Repair paths
  - Illegible flag skips the evaluator
  - Blank answer escalates without a grader call
  - Invalid rubric blocks only its question
  - Fallback recorded; grader and evaluator use different models
  - Page stitching
  - Transcript edit regrades only that question
  - Budget breach ⇒ FAILED, with calls kept
  - Ported regressions: labels, answers out of order, soft-deleted questions

**Acceptance:** an end-to-end fake run produces full audit rows and correct statuses.

## M6: Review workflow API
- [ ] `app/workflow/` state machine: every transition writes a grade event; invalid transitions return 409
- [ ] Endpoints:
  - Review queue; review detail; page image (authorized)
  - Transcript edit with reason ⇒ regrade of that question
  - Per-criterion override: mandatory reason, same checks, optimistic concurrency
  - Resolve; approve/unapprove; exam-level publish
  - Audit timeline (raw request and response bodies for admins only)
  - Exam config: threshold, spot-check %
- [ ] Fix: students see only PUBLISHED submissions, in a reduced view
- [ ] Tests:
  - State table
  - Override validation
  - Approve is blocked while reviews are open
  - Publish affects only approved submissions
  - Student visibility
  - Tenancy
  - Previous versions are preserved

**Acceptance:** a teacher can resolve every escalation and publish using the API alone.

## M7: Review UI
- [ ] Design pass first, with the available skills:
  - `frontend-design`: visual direction, typography, layout
  - `ui-ux-pro-max`: review-workflow UX, accessibility, dense data
  - `design-system`: status and flag colour tokens, spacing, type scale, as CSS variables
  - Keep Next.js and CSS Modules
- [ ] Types and services for review and rubrics; NEEDS_REVIEW badge
- [ ] Exam page: rubric status badges; parsed-rubric drawer (criteria editor, points-sum indicator, re-parse); Review button; "Publish approved" button
- [ ] Review queue page
- [ ] Submission review page:
  - Page image
  - Editable transcript
  - Criteria with highlighted evidence
  - Grader and evaluator positions side by side
  - Override modal with a mandatory reason
  - Resolve and approve
  - Audit timeline

**Acceptance:** `tsc` and the build pass; the whole review flow works against the API; accessibility checks pass; Playwright screenshots are attached to the PR.

## M8: Eval harness
- [ ] `backend/evals/`:
  - Manifest format: exam, rubric text, scripts, teacher scores, optional gold transcripts
  - `run.py --config --mode full|grade_only --repeats`
  - Configs: loop on/off, effort, threshold, and a **model matrix (Claude-only, hybrid, fully open-weight, per role)**
- [ ] Metrics:
  - MAE, QWK (in-house, unit-tested), exact and within-1 agreement
  - Escalation rate, revision flip rate, evaluator drift from its own view
  - OCR character error rate, cost, latency, bootstrap confidence intervals
  - Results logged to MLflow; `compare.py`
- [ ] CI smoke test with a synthetic golden set

**Acceptance:** one command compares two configs on the owner's golden set.

## M9: Public eval sets (after M8)
- [ ] Research and licence-check public Q/A datasets with human scores and rubrics or scoring guides, per level. Candidates to verify: ASAP-SAS, ASAP-AES, ASAP++, ELLIPSE, SciEntsBank, Mohler/Texas, SAF, college chemistry/engineering short-answer sets, open-ended maths sets, handwritten-answer sets. Flag commercial-use restrictions.
- [ ] Converters into our manifest format; seeded samples of about 50–100 answers per dataset
- [ ] Suites: **middle school**, **high school**, **college**; grade-only (typed answers) plus a handwriting/OCR suite where the licence allows
- [ ] A download script puts data into `GOLDEN_SET_DIR` (never committed); `docs/evals/datasets.md` records licence and citation per dataset; non-commercial sets stay out of the default suites
- [ ] Baseline runs (Claude-only vs hybrid vs open-weight) recorded in MLflow and `docs/evals/baseline.md`

**Acceptance:** `python -m evals.run --suite middle|high|college` works end to end.

## M10: Hardening
- [ ] Storage abstraction for MinIO/S3, with presigned URLs
- [ ] Redis token-bucket rate limits and a per-target circuit breaker in the router
- [ ] Hash-locked dependencies, Dependabot, pre-commit (ruff, gitleaks, detect-private-key)
- [ ] `worker_max_tasks_per_child`, a retention job for `llm_calls` bodies, structlog bound to `run_id`
- [ ] Clear the frontend lint debt, then enable `npm run lint` in CI

---

## Owner inputs needed
- [ ] API key(s) for live smoke tests (M2, M5)
- [ ] 5–10 teacher-graded scripts for the golden set (M8)
- [ ] A GPU host or cloud GPU running vLLM/SGLang, for open-weight evals and fallback tests. Until then these paths are verified with stub servers in CI and Ollama locally.

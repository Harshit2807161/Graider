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
| M0 | Docs: proposal 002, checklist, backlog, ADRs | `docs/grading-v2-final` | – | [#5](https://github.com/Harshit2807161/Graider/pull/5) | Merged |
| M1 | CI and migrations | `chore/ci-and-migrations` | – | [#6](https://github.com/Harshit2807161/Graider/pull/6) | Merged |
| M2 | Model router | `feat/llm-router` | M1 | [#7](https://github.com/Harshit2807161/Graider/pull/7) | Merged |
| M3 | Audit trail and observability | `feat/audit-and-tracing` | M2 | [#8](https://github.com/Harshit2807161/Graider/pull/8) | Merged |
| M4 | Rubric parser | `feat/rubric-parser` | M3 | [#9](https://github.com/Harshit2807161/Graider/pull/9) | Merged |
| M4b | Document intake (Proposal 003) | `feat/document-intake` | M4 | [#11](https://github.com/Harshit2807161/Graider/pull/11) | Merged |
| M4c | Exam documents (Proposal 003) | `feat/exam-documents` | M4b | [#12](https://github.com/Harshit2807161/Graider/pull/12) | Merged |
| M5 | Grading graph v2 | `feat/grading-graph-v2` | M4c | [#13](https://github.com/Harshit2807161/Graider/pull/13) | In review |
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
- [x] ADRs: 008 and 009 superseded; new ADR-011 to ADR-014
- [x] `CLAUDE.md` and `README.md` point to 002 and this checklist; retired model ids removed from README (historical docs and ADRs keep them as written)

## M1: CI and migrations
*Alembic versions the Postgres schema. The baseline is today's tables, and each later PR ships a numbered migration. `alembic upgrade head` applies whatever a database is missing, without losing data. It is unrelated to tracing.*
- [x] fix(ocr): missing `QuestionType` import
- [x] chore(lint): ruff config, unused imports removed
- [x] Alembic: `alembic.ini` and `alembic/env.py` (app settings, SQLModel metadata, SQLite batch mode); baseline migration that drops enums on downgrade; upgrade → downgrade → upgrade works; `alembic check` clean
- [x] Startup: no `create_all` in `app/main.py` or `app/core/db.py`; `app/initial_data.py` runs `alembic upgrade head`; docker-compose gets a db healthcheck and a one-shot `migrate` service
- [x] `requirements.txt` gains alembic; new `requirements-dev.txt` (ruff, pytest, pytest-asyncio, httpx)
- [x] `.github/workflows/ci.yml`: ruff · pytest on SQLite · Postgres service running `alembic upgrade head`, `alembic check` and pytest · frontend `tsc --noEmit` and `next build`
- [x] `tests/test_migrations.py` (Postgres only): upgrade/downgrade/upgrade with no drift
- [x] Remove the ad-hoc `add_*_column.py` and `migrate_exams.py` scripts; STARTUP_GUIDE documents migrations and the `alembic stamp head` procedure for existing databases

**Acceptance:** CI is green on the PR; a fresh `docker compose up` migrates and boots; nothing outside the tests calls `create_all`.

## M2: Model router (open-weight + API)
- [x] `app/llm/types.py`:
  - `Role` (vision, rubric_parser, grader, evaluator)
  - `ModelTarget`: provider `anthropic` | `openai` | `openweight`; model; base_url; api_key_env; effort; max_tokens; timeout; `external`; `supports_vision`; `supports_json_schema`; `model_revision`; `quantization`
  - `CallContext`, `AttemptRecord`, `LLMResult[T]`
  - Errors: refusal, truncated, output invalid, all targets failed
- [x] `app/llm/config.py`:
  - Per-role primary target plus fallbacks, set through nested env vars
  - API defaults: vision, rubric_parser and evaluator on `claude-opus-5-5`; grader on `claude-sonnet-5-5`
  - `LLM__ALLOW_EXTERNAL_FALLBACK`
  - Validation: the vision role must use a vision-capable model
  - Remove the old `LLM_PROVIDER` / `LLM_*_MODEL` settings
- [x] `app/llm/invoker.py` (named `models.py` in the plan):
  - Build a `ChatAnthropic` or `ChatOpenAI` client per target, once per grading run
  - Structured output via `method="json_schema"`, with `include_raw=True`
  - Open-weight servers use guided decoding; a server without schema support gets a degraded path (schema in the prompt, then Pydantic validation)
  - Image content blocks
- [x] `app/llm/router.py`:
  - Chain = pinned primary + fallbacks, minus excluded models (applied to fallbacks only, so a misconfiguration can't empty the chain), minus external targets when external fallback is disallowed
  - Before each call: budget check; then call with a timeout
  - Stop reasons: refusal goes to the next target; truncation gets one retry, then the next target
  - Invalid output: one repair request, then the next target
  - Transport error or timeout: next target
  - Every attempt is recorded
  - The grader's fallback never lands on the evaluator's model
- [x] `app/llm/budget.py`: per-run call cap and USD cap. Call cap = `LLM__MAX_CALLS_BASE` + `LLM__MAX_CALLS_PER_QUESTION` × questions (the page count isn't known until OCR runs). Replaces `core/llm_protection.py`.
- [x] `app/llm/costs.py`: price table; self-hosted targets cost 0
- [x] `app/llm/recorder.py`: `CallRecorder` protocol (Null and Log versions now; DB version in M3); images recorded as reference plus sha256
- [x] Open-weight setup:
  - `docs/deploy/open-weight.md`: vLLM/SGLang serving; pinned image, HF revision and quantization; health checks; structured-output backend; vision models; Ollama is for development only
  - `.env.example` profiles: API-only, hybrid, fully local
  - Optional `docker-compose.openweight.yml` with a vLLM server (needs a GPU; not run in CI). A compose profile didn't work: Compose resolves the required `${VLLM_*:?}` variables even when the profile is inactive.
- [x] Migrate the call sites (OCR answer extraction, graders, orchestrator) and delete the old provider classes. Also removed the dead OCR methods (question/rubric extraction), which had no callers and depended on the old provider; they are no longer on M5's list.
- [x] Tests:
  - `FakeInvoker` replaces the prompt-sniffing `FakeLLM`; port the existing tests
  - Router unit tests: repair, truncation, refusal → fallback, transport → fallback, **open-weight → Claude** and **Claude → open-weight**, all targets failed, budget, exclusions, external disallowed, attempt records
  - Contract tests against stub HTTP servers shaped like the Anthropic API and the OpenAI/vLLM API: schema present; no temperature, forced tool choice or prefill; image blocks; response mapping
  - Live smoke tests (`@pytest.mark.live`) for Claude and for a running vLLM/Ollama endpoint, skipped when unavailable. **Open-weight: passing**, fully local on Ollama: OCR with `qwen3-vl:4b-instruct-q4_K_M`; structured output, grading (correct > wrong) and the full graph with `qwen3:4b-instruct-2507-q4_K_M`. Claude: not run yet (needs `ANTHROPIC_API_KEY`).
- [x] Local dev profile (D): Ollama with Qwen3-VL-4B-Instruct (OCR) and Qwen3-4B-Instruct-2507 (text roles), no API key needed. The worker reuses one event loop per process (bug found by the live test).

**Acceptance:** provider classes exist only under `app/llm/`; every call yields an `AttemptRecord`; switching any role between Claude and a self-hosted open-weight model takes config only.

## M3: Audit trail and observability
*Scope trimmed after researching production audit practice and tracing-tool docs (see [audit-trail.md](audit-trail.md)). Tables are added in the milestone that writes them, and machinery that needs a policy decision first went to the backlog.*
- [x] Migration: `grading_runs` (status, trigger, config snapshot + hash, code version, totals, Langfuse trace link) and `llm_calls` (one row per attempt, failures included); JSONB on Postgres, VARCHAR statuses
- [x] Append-only `llm_calls`: Postgres triggers reject UPDATE/DELETE (row-level) and TRUNCATE (statement-level)
- [x] `app/audit/`: `DbCallRecorder` (one short transaction per attempt, **fails closed**: no grade without its record) and run lifecycle (status only moves forward; config snapshot taken in the worker)
- [x] Idempotent tasks: the API creates the run, `grade_submission_task(run_id)` skips finished runs, and Celery `visibility_timeout` (2h) exceeds the task hard limit (35 min)
- [x] Langfuse (optional, replaces MLflow after comparing 9 tools, see [observability.md](observability.md)): client per process after fork, flushed on worker shutdown; one trace per run (id derived from the run id; session = submission; tag = trigger; release = code version); LangGraph nodes and every model call nested via a LangChain configure hook; model calls named `role.purpose` with question/round/attempt metadata; images never exported (media upload off + mask); `docker-compose.langfuse.yml` self-hosts it, wired to the worker
- [x] Tests: success records every call and config; failure keeps calls and reason; redelivery is a no-op; audit-write failure fails the run; forward-only status; tracing off by default; regrade creates a new run; append-only triggers (Postgres)
- [x] E2E: graded a submission fully locally (Ollama) with self-hosted Langfuse on; see the PR for the verified trace, cost and dashboard results
- Moved: versioned transcriptions/grades and `NEEDS_REVIEW` → M5; append-only human actions → M6; tamper-evidence, retention, erasure, export → [backlog](v2-backlog.md)

**Acceptance:** every model call of every grading run is recorded, linked to its run and submission, and can't be changed; a grade is never stored without its audit record.

## M4: Rubric parser
- [x] `app/rubrics/schema.py` (RubricSpec v1, model output `ParsedRubric`, teacher edit) and `validate.py` (pure): at least one criterion, count matches, unique non-empty ids and descriptions, points > 0 adding up to max score, `pass_fail` = one criterion worth everything, `derived` iff no rubric text; subject enum enforced by the schema
- [x] Migrations:
  - Append-only `rubric_specs` (version, source ai/teacher, ready/invalid + reasons, spec, input hash + inputs, parser prompt version, model, producing `llm_call_id`, editor)
  - `questions.rubric_status` (missing/pending/ready/invalid/error), `rubric_input_hash`, `rubric_error`
  - `llm_calls.question_id`, with a check that every call belongs to a run or a question
- [x] Parser prompt (`rubric-parser-v2`) with few-shot examples: pass/fail (MCQ), explicit marks, unmarked points, levels of credit for one point (one criterion, lower levels as exact points in notes), marks that don't add up (kept and flagged, never fudged), empty rubric (derived)
- [x] Triggers:
  - Question sync and Excel import queue `parse_rubric_task` (queue `rubric`) for questions whose text, rubric, max score or type changed; the task skips stale and already-parsed inputs, locks the question row and discards results whose inputs changed meanwhile
  - `ensure_rubric_specs()` parses missing specs when a grading run starts
  - Undoing an edit reuses the earlier spec; a failed re-parse keeps the current spec in use
- [x] API: GET/PUT `…/questions/{qid}/rubric-spec`, POST `…/rubric-spec/reparse`, GET `/exams/{id}/rubric-status`; `QuestionRead` gains status, error, derived flag and summary
- [x] Grading uses the spec's criteria (replacing the line-splitting of rubric text); an invalid or unparsed spec fails the run before OCR, with each question's reasons
- [x] Tests: validation table; parse/store/link; invalid kept with reasons; failure keeps attempts; stale and redelivered tasks; mid-parse edits discarded; undo reuses spec; failed re-parse; changed questions queue a parse and unchanged don't; Excel import; teacher edit (valid and rejected) and re-parse; tenancy; invalid spec never reaches the grader; teacher fix lets the regrade through; append-only triggers (Postgres)
- [x] Live (`pytest -m live`): seven rubric shapes (incl. prose with full/half marks and terse shorthand) against Qwen3-4B via Ollama, 21/21 across three runs
- [x] E2E: question save → Redis `rubric` queue → Celery worker (macOS solo pool, and the Linux Docker image's default prefork pool) → Ollama → `rubric_specs` + `llm_calls` + Langfuse trace
- Changes from the plan:
  - No `questions.rubric_spec_id` pointer: the current spec is the newest version for the question's current inputs, so there's nothing to keep in sync
  - The parser prompt version is recorded on each spec but is not part of the input hash, so a prompt change doesn't discard teachers' edited specs (re-parse explicitly; see backlog)
  - Until NEEDS_REVIEW exists (M5), an invalid spec fails the whole run instead of escalating its question

**Acceptance:** an invalid spec never reaches the grader. ✔

## M4b: Document intake
*From [Proposal 003](proposals/003-document-ingestion.md) §4, §5.1–5.2, §8.*
- [x] File identification by content (`filetype`, PDF/ZIP/OLE/RTF signatures, UTF-8 text): extension must be allowed and match the bytes; mislabelled images accepted as what they are
- [x] Safety: per-file size cap, ZIP inspection before parsing (entry count, inflation / zip bombs, macros), password-protected and damaged PDFs refused with a clear reason, page and pixel caps
- [x] Pages: PDFs via pypdfium2 at 200 DPI (long edge ≤ 2576 px), judged per page (digital / mixed / scanned; scanner OCR layers and garbled text ignored); images via Pillow + pi-heif (EXIF rotation, transparency, multi-page TIFF, GIF first frame, photo straightening with OpenCV, gentle contrast); plain text as text pages
- [x] Office (DOCX, DOC, ODT, RTF, PPTX) → PDF via the sandboxed Gotenberg 8.37 container (compose: internal network without internet, read-only, no capabilities, resource limits; CI service); the user's file name never reaches it
- [x] `documents` + `document_pages` tables; pages made once per document; failures recorded with a user-safe reason; old submissions adopted from `original_file_url`
- [x] Uploads: one or many files per submission (`files`, page order), every supported format; grading reads pages (image + typed text hint); pdf2image and poppler removed
- [x] Frontend: answer upload takes several files in any supported format (minimal; M7 does the UI)
- [x] Tests: every format generated in code (one small HEIC fixture), every refusal reason, pages per format, documents service, upload API; real Word/ODT/RTF conversion when `GOTENBERG_URL` is set (CI); SQLite tests now enforce foreign keys like Postgres
- [x] E2E with real student handwriting (DrawEduMath, CC BY-NC 4.0; AIED-Unplugged, CC BY 4.0; samples not committed): one submission of a HEIC whiteboard photo + a scanned PDF + a Word document with a pasted photo, uploaded through the API, converted by Gotenberg, transcribed by Qwen3-VL-4B. All three answers were transcribed exactly in one 6,176-token call (Ollama's default 4,096 would have truncated it). Grading by the 4B text model was too strict on two answers (backlog)

**Acceptance:** any supported file, or several, can be uploaded as one student's answers and is graded from normalised pages; unsupported or unsafe files are refused with the reason.

## M4c: Exam documents
*From [Proposal 003](proposals/003-document-ingestion.md) §5.3–5.4, modes E3–E7.*
- [x] Question labels from the paper (`label` e.g. `2(b)`, `printed_label`, `choice_group`); grading uses them when every question has a unique one (else Q1..Qn); choice groups ("attempt either 5 or 6") stored in `exams.config`
- [x] Exam document upload with a declared role (question paper, rubric, question paper with rubric, blank copy), same checks as answer uploads
- [x] Extraction: one vision call per page (page kind, questions with canonical labels / context / marks / type, rubric items, choice groups, instructions, total marks); prompt `exam-page-v2` with a worked example
- [x] Merge in code (roles decide what each page gives, continuation across pages joined, a scheme's repeated questions ignored); rubric linked by exact label, leftovers by one text call limited to real labels or `none`; marks taken from the rubric when not printed (flagged)
- [x] Checks: blocking (no questions, missing label/text/marks, duplicate labels, bad choice groups) and warnings (total mismatch with choice groups counted once, no rubric, unmatched rubric, page role mismatch, handwriting on a blank copy, answer pages)
- [x] Versioned `exam_drafts`: teacher edits are new versions; confirm is refused while blocking issues remain, updates questions in place by label, replaces the rest, stores choice groups, queues M4 rubric parsing; a rubric alone adds rubrics to existing questions (`rubric_only`)
- [x] Calls recorded against the draft (`llm_calls.exam_draft_id`), one trace per extraction, page roles saved for M5, readable failure reasons
- [x] API: `POST/GET /exams/{id}/documents`, `POST/GET /exams/{id}/drafts`, `GET/PUT /exams/{id}/drafts/{draft_id}`, `POST …/confirm`
- [x] Tests: labels, merge and checks (pure), extraction → draft → confirm with fake models, teacher edit clearing a blocking issue, in-place update keeping graded answers, rubric-only, failures, redelivery, tenancy; SQLite + Postgres
- [x] Live: generated paper + marking scheme with Qwen3-VL-4B, 3/3 runs; real CBSE Class X Science 2025–26 sample paper + marking scheme (Section A, 7 pages, local only): 15 questions with marks and linked answers, and the model's two real mistakes (a duplicated label, a choice group naming parts it hadn't listed) blocked confirmation as intended
- Changes from the plan: a flat list of gradable questions, each carrying its parent's shared text as `context` (no `parent_id` tree); choice groups in `exams.config`; drafts name their documents explicitly; draft rows keep their content but their status moves

**Acceptance:** a question paper, a rubric, both, or a blank copy become a checked draft; nothing reaches the exam's questions until the teacher confirms a draft without blocking issues.

## M5: Grading graph v2
- [x] `app/grading/`: `schemas.py` (page answers, grade, evaluator review, revision; built per exam/question so labels and criterion ids are enums), `prompts.py` (`grading-v1`: transcription, grader with worked examples for partial credit and pass/fail, independent revision, fresh-eyes evaluator, subject personas), `checks.py`, `stitch.py`, `choices.py`, `sampling.py`, `question.py`, `transcribe.py`, `graph.py`, `persist.py`
- [x] Submission graph (LangGraph): pages read in parallel (`Send`) → stitching in code → questions graded in parallel (`Send`); `GRADING_MAX_CONCURRENCY`
- [x] Per-question flow: precheck (no answer, no ready spec ⇒ escalate, no call) → grade (quoted evidence) → checks (+1 repair) → grader flags ⇒ escalate → evaluate (own view first) → effective agreement in code → revise/push back ≤ 2 ⇒ finalize or escalate with every round kept; low OCR confidence, repeated attempts and spot checks keep the proposed score but escalate
- [x] Final transaction: transcription and answer-grade versions (append-only except `is_current`; one current per answer), `submission_answers` projection, unassigned segments, totals, status `GRADED` / `NEEDS_REVIEW`; `FAILED` only for unreadable pages, exhausted budget or no questions
- [x] Choice groups: unattempted alternatives aren't graded (one escalates if an answer is still owed); extra alternatives don't count (exam `choice_policy` best/first); maxima count each group once
- [x] Scoped runs (`question_ids`, trigger `transcript_edit`) regrade only those questions from their current transcriptions (a teacher's transcript is kept)
- [x] Spot-check sampler seeded by run and question; default 0%
- [x] Config snapshot includes grading thresholds and prompt versions
- [x] Deleted: `app/agents/`, `core/langgraph_setup.py`, triplet and OCR services, legacy grading schemas (the subject now comes from the rubric spec: no tagging call)
- [x] Tests: checks (bounds, pass/fail, evidence, replies, rejections), agreement (gap and per-criterion tolerance), stitching, choice groups, the loop (agree in round 1 = 2 calls, revise then agree, push-back accepted, 2 revisions ⇒ escalation with both positions, high stated agreement with a large gap, repair, double failure, illegible flag skips the evaluator, blank answer and invalid rubric make no call, fallbacks avoid the other examiner's model, budget), the pipeline (versions, labels, parsed rubric, cross-page and out-of-order answers, soft-deleted questions, unreadable pages, a failing question escalates alone, invalid rubric blocks only its question, regrades, no state between runs, budget, choice groups, transcript-edit regrade); append-only rules (Postgres)
- [x] Live: the M4b real-handwriting submission (HEIC whiteboard photo, pencil scan PDF, Word file with a photo) through the whole v2 pipeline with local models (Qwen3-VL-4B reading; Qwen3-4B as **both** grader and evaluator), three runs. Mechanics verified: 3 files → 3 pages read → answers stitched → graded and evaluated → versions and totals saved (12 calls). Quality isn't meaningful with one 4B model as both examiners: the transcription dropped a circled final answer in 2 of 3 runs (prompt rule added, `grading-v2`), the grader made inconsistent strict calls and the evaluator agreed every time. The safety nets worked: a grade the model couldn't produce and two zero-confidence readings escalated instead of being finalised. Grading quality needs Claude (the default) or distinct, stronger models: measured in M8
- Changes from the plan: `grade_events` comes with the human actions in M6; the per-question loop is plain async code inside the graph's grade node (one graph per submission, not a nested graph); the append-only rules are enforced by Postgres triggers only (no SQLite ORM guard; the Postgres CI job runs them)

**Acceptance:** an end-to-end fake run produces full audit rows and correct statuses. ✔

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
  - Results logged to Langfuse (datasets + experiments); `compare.py`
- [ ] CI smoke test with a synthetic golden set

**Acceptance:** one command compares two configs on the owner's golden set.

## M9: Public eval sets (after M8)
- [ ] Research and licence-check public Q/A datasets with human scores and rubrics or scoring guides, per level. Candidates to verify: ASAP-SAS, ASAP-AES, ASAP++, ELLIPSE, SciEntsBank, Mohler/Texas, SAF, college chemistry/engineering short-answer sets, open-ended maths sets, handwritten-answer sets. Flag commercial-use restrictions.
- [ ] Converters into our manifest format; seeded samples of about 50–100 answers per dataset
- [ ] Suites: **middle school**, **high school**, **college**; grade-only (typed answers) plus a handwriting/OCR suite where the licence allows
- [ ] A download script puts data into `GOLDEN_SET_DIR` (never committed); `docs/evals/datasets.md` records licence and citation per dataset; non-commercial sets stay out of the default suites
- [ ] Baseline runs (Claude-only vs hybrid vs open-weight) recorded in Langfuse and `docs/evals/baseline.md`

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

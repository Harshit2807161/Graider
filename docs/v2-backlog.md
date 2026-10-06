# v2 backlog

These items are deliberately out of scope for grading v1 ([Proposal 002](proposals/002-grading-v2-architecture.md)). Edge cases found during implementation get added under "Found during implementation", with the milestone and PR they came from.

## Deferred by decision (2026-10-05)

| Item | Why deferred | Notes |
|---|---|---|
| Rubric edited **after** answers were graded | Owner: skip for v1 | Options: mark existing grades "graded with an older rubric" plus a teacher-triggered regrade, or auto-regrade. Grades already record their spec version, so this can be added without losing history. |
| Turning spot-checks on | v1 ships the mechanism at 0% | Pick per-exam rates once the eval baseline exists. |
| Claude server-side refusal-fallback beta | Owner: adds complexity | Our own fallback chain handles refusals. If enabled later, record and treat it like a chain fallback. |
| Per-org data-egress policy and budgets UI | v1 has a global `ALLOW_EXTERNAL_FALLBACK` and per-run caps | Per-org override, monthly USD budgets, alerts. |
| Bulk class-PDF splitting | Needs a page → student mapping | Split by page markers, a roster QR code, or teacher assignment. |
| Teacher exemplar few-shots | Needs graded examples per question | Use teacher overrides as anchors for that question. |
| Student portal | Out of scope | Students see published results only (v1 API). |
| Code-verified answers (e.g. sympy for numeric answers) | Owner principle: code checks only; numeric verification is a possible extension | Could become an additional *check* that compares the grader's verdict with a computed answer. |
| Gateway in front of the router | Not needed for one service | Revisit (e.g. Envoy AI Gateway) when several services share LLM budgets. |
| Request-id capture for Claude via a `ChatAnthropic` subclass | LangChain doesn't expose the HTTP `request-id` header | Add if Anthropic support tickets need it. |
| httpOnly cookie auth with refresh tokens | Security hardening beyond v1 | Currently a bearer token stored in a JS cookie. |

## Audit trail: deferred after M3 research (see docs/audit-trail.md)

| Item | Why deferred | Notes |
|---|---|---|
| Tamper evidence beyond triggers | Needs an ops decision (key management, WORM storage) | Hash-chain per run (metadata + payload digests, not payloads) with daily PII-free anchors in S3 Object Lock; scheduled verifier; app DB role with INSERT/SELECT only on audit tables |
| Retention tiers, purge jobs, legal holds | Needs a records policy / legal input | Starting point from research: decision records per the institution's schedule; raw payloads max(6 months, appeal window); Langfuse traces short-lived (automatic retention is an Enterprise feature when self-hosted; otherwise a scheduled delete via the Langfuse API). AI Act Arts. 19/26 require ≥ 6 months |
| Erasure-compatible payload store | GDPR status of crypto-shredding is unsettled | Separate payloads (transcripts, raw responses) per student, encrypted with a per-student key; erase = delete key, keep tombstone + hashes |
| Per-student export, logging reads of audit data | GDPR Art. 15, FERPA 99.10/99.32 | API export of runs, calls and decisions for one student; audit-reader role, row-level security per school |
| Provider request ids and hidden SDK retries | LangChain doesn't expose Anthropic's `request-id`; SDKs retry internally (default 2) | Option: subclass `ChatAnthropic` or set `max_retries=0` and retry in the router so every HTTP attempt gets a row |
| "Started" call rows written before sending | An in-flight attempt is lost if the process dies mid-call | Would need an update to finalize the row, which conflicts with append-only; consider a separate `call_started` event row |
| Langfuse trace retention and deletion | Self-hosted Langfuse OSS has no automatic retention (Enterprise feature) | Scheduled job deleting traces older than N days via the public API; delete a student's traces on erasure requests (traces carry the submission id) |
| EU AI Act classification and Art. 6(3) assessment | Legal | Annex III 3(b) "evaluate learning outcomes"; obligations from 2 Dec 2027 |

## Found during implementation

_(Append entries as `- [M#, PR #] description: proposed handling`.)_

- [M2] **Budget sizing by pages:** the call budget is sized from the question count, because the page count is only known after the PDF is rasterized. Proposed: in M5, top up the budget per page once the context node knows the page count.
- [M2] **Grader and evaluator on the same model:** nothing prevents configuring the same primary model for both roles, which removes the "fresh eyes" independence. Proposed: a config warning (or validation error) when they match; fallback exclusion already covers fallbacks.
- [M2, resolved] **Event loop per Celery task:** found by the live Ollama test. LangChain caches async HTTP clients per process, bound to the event loop that created them, and the worker ran each task with `asyncio.run()`, so the second task in a worker failed with "Event loop is closed". Fixed by running every task on one event loop per worker process (`app/worker.py: run_in_worker_loop`), with no changes to the router.
- [M2, evidence for M5/M8] **Local Qwen3-4B (Ollama, laptop CPU/GPU) through the current graph:**
  - Structured output worked first time on every call (no repairs or truncation).
  - Each call took 26–64s, so a question costs about 3 minutes with one evaluator round.
  - The evaluator rejected round 1 in 2/2 runs. The grader then *lowered* its score (3.0 → 0.5 in one run, → 2.0 in the other) for the same answer.
  - Takeaways: same-answer inconsistency plus the grader caving to the evaluator is exactly what M5's push-back rule and M8's flip-rate/variance metrics target; a 4B model is only a development profile.
- [M2, evidence for M8/M9] **Local OCR with Qwen3-VL-4B-Instruct (Ollama):** a rendered two-answer sheet in a handwriting-style font was read in about 10s. Both answers went under the right question labels, and the math answer was exact. The prose answer came back as "carbon díoxído" (diacritics added to handwriting-style letters). It's still readable for grading, but measure character error rate on real handwriting before using a 4B VLM beyond development.
- [M3] **One trace per run with LangGraph is span-heavy** (100+ spans for 2 questions: graph node spans plus model calls). Fine for debugging; if volume becomes a problem, sample with `LANGFUSE_SAMPLE_RATE` rather than reduce what the audit tables store.
- [M4] **Re-parse AI specs after a parser prompt change.** The prompt version is stored on every spec but deliberately not part of the input hash (that would discard teachers' edited specs). Add an admin command that re-parses AI-sourced specs made with an older prompt version.
- [M4] **A question edit replaces a teacher's edited spec.** Any change to the question text, rubric, max score or type triggers a fresh parse, so a typo fix also drops the teacher's manual spec (it stays in history). Consider offering to carry the edited spec over when only the question text changed.
- [M4] **Small open-weight parsers skip warnings and add detail.** Qwen3-4B kept marks correctly in all live runs, but sometimes omitted the "split was inferred" warning and filled `expected_answer` with examples not in the rubric. Compare parser models in the M8 evals before using a small model for this role.
- [M4] **Students can read rubric text.** `GET /exams/{id}` (members) returns `rubric_criteria` to students. Pre-existing; restrict to staff with the student portal work.
- [M4] **macOS dev workers need `--pool=solo`.** Celery's prefork pool fails on macOS (spawned children); Linux/Docker is unaffected. Documented in STARTUP_GUIDE.
- [Proposal 003] **Printable Gr8r answer booklets** (QR code + question-number box on every page) for deterministic page → student/question mapping, as Crowdmark and Gradescope do. Not now (owner, 2026-10-06).
- [Proposal 003] **Class-batch scans** (many students in one file): cover sheets/QR, boundary detection in small page windows, roster matching, thumbnail review. After M5 (owner, 2026-10-06).
- [M4b] **Ollama's default context is 4096 tokens** and it silently truncates longer prompts; one 200-DPI page is ~3,800 Qwen3-VL image tokens. Documented in docs/deploy/open-weight.md (`OLLAMA_CONTEXT_LENGTH`). Consider sending one page per OCR request for small-context servers.
- [M4b] **Photos rotated by 90°/180° without EXIF** are not turned upright (only EXIF rotation and perspective are fixed). Detect orientation in M4c's page classification and re-render.
- [M4b] **Converter cold start under memory pressure.** Gotenberg's first LibreOffice start timed out (20 s default) on a laptop low on memory; a retried conversion works. Consider `--libreoffice-start-timeout=60s` and retrying a 503 once.
- [M4b] **Upload is all-or-nothing per request** and files are read into memory (per-file cap 50 MB, 30 files). Streaming to object storage (M10) would lift this.
- [M4b, evidence for M5/M8] **Real handwriting, small local grader.** With real student work (whiteboard photo, pencil scan, photo in Word) Qwen3-VL-4B transcribed every answer exactly, but Qwen3-4B graded two of three too strictly: it called "3y - 4 + 2y = 6 + 4" invalid algebra (1/2 instead of 2/2) and gave half a mark for correct rounding (0.5/2 instead of 1/2). Same pattern as the M2 findings; M5's evaluator push-back and M8's grader comparison are the fix, not the 4B model.


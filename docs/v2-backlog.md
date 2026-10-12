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
- [M4c] **Real paper with a 4B extractor (CBSE Class X Science SQP 2025–26, Section A).** Good on numbering, marks, MCQ options, instructions and total, and on linking the marking scheme's answers; ~80 s per page. Mistakes: an alternative question ("for visually impaired students") labelled as a second "1"; an internal choice inside a question ("attempt either subpart A or B") turned into a choice group of parts it never listed; two consecutive assertion–reason questions taken as an either/or pair. The first two are caught as blocking issues; the third isn't. Prompt work for M8: internal choices as parts, alternatives for visually impaired students, what "OR" applies to. Compare Claude vs open models on real papers.
- [M4c] **Draft editing replaces the whole content.** The API takes the full corrected draft (fine for the M7 editor); no partial patch.
- [M4c] **Exam documents can't be removed** once uploaded (drafts name the ones they use). Add delete/archive for documents no confirmed draft uses.
- [M4c] **Confirming after grading.** Confirming a new draft changes questions that may already be graded; grades aren't recomputed (same as rubric edits after grading, deferred).
- [M5] **Scoped regrades and choice groups.** A run scoped to some questions decides which alternatives count from the in-run grades plus the other questions' current grades, but can't mark an out-of-scope grade as not counted (rows are append-only); a full regrade fixes it. Rare: needs a transcript edit on one alternative of a choice both of which were answered.
- [M5] **Escalated answers in totals.** A proposed score of an escalated answer counts toward the provisional total (shown with NEEDS_REVIEW); an escalation without a score counts 0 until the teacher resolves it (M6).
- [M5] **Diagrams and drawn answers** are transcribed as a bracketed description; graded only as well as that description. Consider passing the page crop to the grader for questions whose rubric expects a drawing.
- [M5, evidence for M8] **The local profile can't judge grading quality.** Profile D runs grader and evaluator on the same 4B model, so the evaluator isn't independent (it agreed with every grade, right or wrong, in the live runs). For local work, use a different (ideally stronger) model as evaluator; compare configurations in M8. The 4B reader also confused fields once (a segment whose text was "unassigned", confidence 0) and missed circled final answers despite the prompt rule; low-confidence escalation caught the former.
- [M6] **Choice groups after an override.** An overridden answer keeps whether it counts; if a teacher raises the extra alternative above the counted one, which one counts doesn't switch (best policy). A regrade recounts.
- [M6] **Corrections after publishing.** Published results are final in the state machine. Needs a reviewed path (unpublish with reason and student notification, or a published correction).
- [M6] **Concurrent actions on SQLite.** Teacher actions lock the submission row on Postgres; SQLite (tests only) has no row locks.
- [M7] **Overview summary endpoint.** The overview loads each exam's sheets (newest 12 exams); a summary endpoint would scale and count everything.
- [M7] **Failure codes.** The UI explains failed sheets by matching the error text (`components/features/review/failure.ts`); a failure code stored next to `current_step` would be sturdier. Likewise contexts return message strings, not codes.
- [M7] **Side-by-side transcript correction** next to the page image, and a viewer mode that follows the answer being read.
- [M7] **Class pages.** Classes have no detail page (overview rows don't link) and don't show linked exams.
- [M7] **Shared skeleton and spin animations** are duplicated across a few CSS modules (CSS Modules scope keyframes).
- [Student results] **Per-criterion marks for students** (today: per-question marks and feedback) and a printable or downloadable graded copy.
- [CBSE run, 2026-10-11] **Diagrams score 0 without escalating.** A drawn answer leaves nothing in the transcript, the grader says "no diagram" and the grade is final. Until page crops reach the grader (M5 item above), escalate any question whose rubric expects a drawing. See [the run](evals/cbse-x-science-2025/README.md).
- [CBSE run] **Bilingual question papers** (Hindi and English on alternating pages) extract as duplicate questions. Detect the repeated numbering and keep one language, or let the teacher pick.
- [CBSE run] **The evidence check discards correct grades** (11.5 marks, 5 of 15 escalations). Each quote must be one unbroken piece of the transcript. Match quoted lines separately, after dropping control characters and added quote marks, and on failure keep the proposed score and escalate instead of dropping it (`grading/checks.py`, `grading/question.py`).
- [CBSE run] **Garbled symbols in transcripts.** The small reader wrote control characters for arrows and apostrophes (`\x02` followed by "1"); stripping them leaves stray digits. Map the known pairs when the page is read, and compare readers in M8.
- [CBSE run] **A draft stays `pending` forever** when extraction raises anything other than a document or model error. Mark it failed on any exception.
- [CBSE run] **No budget covers a whole exam.** Extraction ($5) and each rubric parse ($1) have fixed caps, and a model without a price is not counted at all. Add an exam-level or org-level cap, and refuse to start with an unpriced API model.
- [CBSE run] **Tests read `backend/.env`.** With `LLM__*` set there, 5 tests fail on model names. Make the test settings ignore the env file.
- [CBSE run] **Internal choices inside one question** ("(a) … OR (b) …") only validate when entered as two questions in a choice group; as one question the criteria add up to more than the maximum. The draft editor should offer the split.

- [CBSE run] **Answers are filed under the wrong question** (about 15.5 marks, the largest loss). Pages are read in isolation, so a page starting with a bare "(b)" has no question, and printed booklet page numbers were read as question numbers. Cheap: tell the reader both rules, and attach unassigned top-of-page text to the previous answer with a flag. Design: after reading, one text-only pass over all segments in order assigns them to questions, with separate fields for new question, new sub-part and continuation.
- [CBSE run] **The page reader sees only the first 200 characters of a question** (`grading/prompts.py`), so parts that share a passage look identical. Give it the number, the sub-part structure and the part's own text.
- [CBSE run] **One struck word removes a whole segment.** `crossed_out` is per segment and stitching drops flagged segments. Use it for fully struck blocks only, have the reader leave struck words out inline, and flag an answer that lost a segment.
- [CBSE run] **"Repeated attempts" fires on sub-parts and page breaks** (6 escalations, no real second attempt found). It follows from the reader's definition of a new start; fix with the routing change above.
- [CBSE run] **Nothing checks that a page was fully read.** Diagrams and whole sub-answers were skipped without trace. A cheap second read per page listing the question numbers and drawings present would catch a mismatch.
- [CBSE run] **The evaluator cannot catch reading or filing errors**: it reads the same transcript. It agreed first time on 33 of 34 answers, wrong ones included, for 46% of grading spend. Consider running it selectively and spending the saving on reading.
- [CBSE run] **A marking scheme extracted as questions loses its rubric.** On rubric pages the merge reads only `rubric_items`; the model put every entry under `questions`. Use those when `rubric_items` is empty, and warn when a rubric document yields no items.
- [Site review, 2026-10-12] **The evaluator is not a blind second marker.** It scores first, but the grader's marks are in the same request, and in the real run it moved towards the grader (35(a): 0 → 0.5 → 1 on one criterion, both drifting up). A fresh professor reader called this the single biggest trust gap. Option: a separate call for the evaluator's own scores before it sees the grader's, with both stored.

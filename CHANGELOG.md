# Changelog

Notable changes to Gr8r, newest first.
- **Format:** based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). There are no version numbers yet; entries follow the grading v2 milestones in [docs/grading-v2-checklist.md](docs/grading-v2-checklist.md).
- **Process:** each milestone PR into `v1-full` adds its entry here.

## [Unreleased]

### M7: Review UI ([#15](https://github.com/Harshit2807161/Graider/pull/15), in review)

#### Added
- **Review screen** for one answer sheet: the page images beside the answers; for each answer the reason it needs review and what to do, the transcript with the evidence highlighted, the criteria, both examiners' positions and replies, earlier versions; accept, change scores, correct the transcript, approve, regrade, history.
- **Review queue** across an exam, most urgent first.
- **Exam page** as a workflow: questions and rubrics (rubric editor), answer sheets grouped by what needs action, review, publish; grading settings.
- **Overview** with next steps, and a responsive shell (drawer on small screens, skip link).

#### Changed
- **The whole portal refined on the existing design** with the ui-ux-pro-max skill: shared tokens, dialogs, status badges, error banners; plain-language messages instead of raw errors; sign-in copy without an accuracy claim. Brand shown as Gr8r.
- **Verified accessible:** AA contrast, keyboard paths and responsive layouts checked on every page.

#### Fixed
- **Photo ingestion** kept a colour cast on coloured ink (a whiteboard photo turned magenta), which the model also saw.
- Frontend lint problems (30 → 0); loading buttons lost their label and keyboard focus.

## M6: Review workflow API ([#14](https://github.com/Harshit2807161/Graider/pull/14), 2026-10-09)

### Added
- **Teacher actions on grades**, each recorded as a grade event (who, why, before and after) and saved as a new version, never a change:
  - **override** every criterion's score, with a mandatory reason; the scores pass the same checks as the model's, and a stale edit is refused instead of overwriting someone else's;
  - **resolve** an escalated answer by accepting its proposed score;
  - **correct a transcript** (mandatory reason), which regrades only that question from the teacher's text;
  - **regrade**, **approve** (refused while answers still need review), **unapprove**, and **publish** an exam's approved submissions.
- **Submission state machine** (Proposal 002 §9): moves the current state doesn't allow are refused (409); published results are final.
- **Review endpoints:** review queue (escalated first, then lowest evaluator agreement), review detail (pages, rubric spec, transcript, grade with every evaluator round, earlier versions), page images, and an audit timeline (runs, model calls, versions, actions; raw model requests and responses for owners and admins).
- **Per-exam grading settings:** agreement threshold, spot-check rate, choice policy.

### Fixed
- **Students see only their own published results,** reduced to scores and feedback. Before, they could read transcripts and grading details as soon as grading finished.

## M5: Grading v2 ([#13](https://github.com/Harshit2807161/Graider/pull/13), 2026-10-09)

### Added
- **Page reading and stitching:**
  - Pages are read in parallel into answer segments labelled with the exam's labels, or `unassigned`.
  - Code stitches them into one answer per question: continued text joined across pages, crossed-out work left out of the answer, unplaced work kept for the teacher (`submissions.unassigned_segments`).
- **Evaluator–optimizer loop for every question** (Proposal 002 §7):
  - the grader scores each rubric criterion with quoted evidence;
  - code checks the result (one repair allowed);
  - an independent evaluator scores the answer itself first;
  - effective agreement is worked out in code;
  - the grader revises or pushes back, at most 2 times, before escalating with every round stored.
- **Per-question escalation:**
  - Reasons: `no_answer_found`, `rubric_invalid`, `low_ocr_confidence`, `multiple_attempts`, `check_failed`, `grader_flag:*`, `evaluator_disagreement`, `all_models_failed`, `spot_check` (default 0%).
  - New submission status `NEEDS_REVIEW`.
- **Versioned `transcriptions` and `answer_grades`:** exactly one current version per answer. On Postgres the only change allowed afterwards is switching `is_current`. Results are saved in one transaction.
- **Choice questions:** only the attempted alternative is graded, and each group counts once in the total. An extra alternative doesn't count; the exam's `choice_policy` (best or first) decides which.
- **Scoped runs** (`question_ids`, trigger `transcript_edit`) regrade only some questions from their current transcripts.
- **Run config snapshot** now also records the grading thresholds and the prompt versions.

### Changed
- **A whole submission fails only** when its pages can't be read, the budget runs out, or there are no questions. Everything else escalates that one answer.
- **The question's subject** comes from its rubric spec; the tagging call is gone.

### Removed
- The old tagger, subject graders and LangGraph orchestrator (`app/agents/`), plus the triplet and OCR services and the legacy grading schemas.

## M4c: Exam documents ([#12](https://github.com/Harshit2807161/Graider/pull/12), 2026-10-07)

### Added
- **Upload exam documents** with a role: question paper, rubric, question paper with rubric, or blank copy.
- **Extraction into a draft**, in the background. One vision call per page finds:
  - the page's kind;
  - questions: canonical label (`2(b)`), printed label, the parent question's shared text as context, marks, type;
  - rubric items, choice groups, instructions and total marks.
- **Merging and linking in code.** Rubric items attach to questions by label; only leftovers go to one text call, whose answers are restricted to the real labels.
- **Checks on every draft:**
  - **Blocking:** no questions, missing label/text/marks, duplicate labels, a broken choice group.
  - **Warnings:** total mismatch, no rubric, unmatched rubric items, a page that looks like a different role, handwriting on a blank copy.
- **Versioned drafts:**
  - teacher edits create new versions;
  - confirming is refused while blocking issues remain;
  - confirming updates questions in place by label, so graded answers stay attached, then queues rubric parsing;
  - a rubric document on its own adds rubrics to existing questions.
- **New question fields:** `label`, `printed_label` and `choice_group`. Grading uses the paper's labels when every question has a unique one.

## M4b: Document intake ([#11](https://github.com/Harshit2807161/Graider/pull/11), 2026-10-07)

### Added
- **Any supported file format, one or many files per submission:**
  - PDF: digital, scanned or mixed;
  - Word, ODT, RTF, PowerPoint;
  - JPEG, PNG, WebP, HEIC, multi-page TIFF, GIF, BMP;
  - plain text.
- **Every upload is identified by its content and checked:** extension and content must match; zip bombs, macros and password-protected or damaged PDFs are refused; size, page and pixel limits apply.
- **Pages:**
  - PDFs are rendered at 200 DPI (long edge capped at 2576 px), with the typed text kept for digital pages;
  - images are turned upright using their metadata, and phone photos of a page are straightened;
  - office files are converted in a sandboxed Gotenberg/LibreOffice container on a private network with no internet access.
- **New tables:** `documents` and `document_pages`. Pages are made once; failures are recorded with a reason; old submissions are adopted automatically.

### Changed
- Upgraded to SQLAlchemy 2.1 with the psycopg 3 driver, with automatic server-side prepared statements turned off.
- SQLite tests now enforce foreign keys, as Postgres does.

### Removed
- `pdf2image` and the poppler system dependency.

## Proposal 003: Document ingestion ([#10](https://github.com/Harshit2807161/Graider/pull/10), 2026-10-06)

### Added
- **The plan for every entry mode and file format.**
  - **How the exam arrives (E1–E8):** typed, spreadsheet, question paper, paper plus rubric, combined, rubric only, blank copy, no rubric.
  - **How answers arrive (S1–S6):** answer booklet, answers on the printed paper, everything in one document, typed answers, several photos, a whole-class scan.
  - Also covers the tooling, the security measures and the milestone plan (M4b, M4c).

## M4: Rubric parser ([#9](https://github.com/Harshit2807161/Graider/pull/9), 2026-10-06)

### Added
- **LLM-parsed rubric specs.**
  - The prompt (`rubric-parser-v2`) has worked examples for pass/fail, explicit marks, unmarked points, levels of credit, marks that don't add up (kept and flagged, never fudged), and no rubric (criteria derived from the question).
  - Code checks every spec: points add up to the maximum, ids are unique, pass/fail means one criterion.
- **Append-only `rubric_specs` versions.** Questions are parsed in the background when they change, and lazily when grading starts. Teachers can edit or re-parse a spec.
- **Specs reach the graders** in place of the old line-by-line splitting of rubric text.

## M3: Audit trail and observability ([#8](https://github.com/Harshit2807161/Graider/pull/8), 2026-10-06)

### Added
- **`grading_runs` and append-only `llm_calls`.**
  - Every model call is recorded, failures included.
  - If an audit row can't be written, the run fails.
  - Runs are idempotent and their status only moves forward.
  - Each run snapshots the model config it used.
- **Optional Langfuse tracing** (self-hosted or EU cloud):
  - one trace per run;
  - model calls named by role and purpose;
  - images never exported.

  It replaced MLflow after a comparison of nine tools (ADR-015).

## M2: Model router ([#7](https://github.com/Harshit2807161/Graider/pull/7), 2026-10-06)

### Added
- **A router over LangChain chat models,** with roles (vision, rubric_parser, grader, evaluator), fallback chains, a per-run call and cost budget, repair of invalid output, and portable strict JSON schemas.
- **Backends:** Claude, OpenAI, and self-hosted open-weight models via vLLM, SGLang or Ollama.
- **Ready-made configuration profiles:** all API, hybrid, fully self-hosted, and local development on Ollama.

## M1: CI and migrations ([#6](https://github.com/Harshit2807161/Graider/pull/6), 2026-10-06)

### Added
- **Alembic schema migrations.** The app never calls `create_all`; a `migrate` service runs migrations in Docker Compose.
- **GitHub Actions:** ruff; pytest on SQLite and on Postgres (with `alembic upgrade` and `check`); frontend type-check and build.

## M0: Grading v2 plan ([#5](https://github.com/Harshit2807161/Graider/pull/5), 2026-10-06)

### Added
- **Planning documents:** Proposal 002 (the grading v2 architecture), the feature checklist, the v2 backlog, and ADR-011 to ADR-014.

## Bug fixes on `v1-full` (2026-10-04)

### Fixed
- **Dependencies, Docker and environment setup.** `.env` settings are honoured, and timestamps are timezone-aware.
- **Security:** removed hard-coded credentials and unmaintained crypto libraries.
- **Tenant scoping:** org, class, exam and submission endpoints are limited to members of the organisation.
- **Uploads and imports:** safe question sync, strict Excel import, and safe uploads.
- **Grading:** scores now land on the right question, with its rubric.
- **Frontend:** builds again, and its API calls match the backend.

### Removed
- The legacy session upload API and dead modules.

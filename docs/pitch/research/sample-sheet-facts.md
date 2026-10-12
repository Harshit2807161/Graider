# Sample sheet: facts from the codebase (survey of 2026-10-12)

Condensed from a Sonnet survey of the repo. Full detail is in the session; what matters for planning:

## Components
- `HighlightedText`, `ExaminerRounds`, `format.ts` and `QuestionCard` (with `canScore=false`, `canEditTranscript=false`, `busy=false`, no-op handlers; the action footer then disappears) render from props with no API or navigation imports. `QuestionCard` is `"use client"` for hover/pin state only and prerenders in a static export.
- `PageViewer` fetches images through `reviewService` → axios; needs a static variant with `<img src>` to a static file, same markup and `PageViewer.module.css`.
- Needs from `frontend/app/globals.css`: the tokens, `.sr-only`, `:focus-visible`, Inter as `--font-inter`. No dark mode exists in the product.
- Dependencies: next 16.1.6, react 19.2.3, lucide-react, clsx. `@/*` path alias → the site needs its own alias or copies.
- Review tokens: `--evidence-bg #fef08a` (the highlight), `--grader-color` indigo-600, `--evaluator-color` teal-700. Primary indigo-600 on slate; type scale 0.75–1.875rem.

## The real run's data (`review.json`, 51 questions, 29 graded / 15 escalated / 7 not attempted)
- Correctly graded written answers with clear quoted evidence, first-round full agreement: **21** (mirror formula, page 4; check the line `1/v = 5 / 2` against the page, likely a misread), **24(b)** (plant transport, page 7; two long quotes, and a choice group with 24(a) "not attempted"), **25** (chemical change, page 8; short, refers to a picture not in the data), **39(a)-(b)** (photosynthesis, page 30; long case-study stem, LaTeX equation).
- Wrong without a flag (never show as correct): 23, 33, 34(b), 38(a)-(b).
- **No escalation in the run has an honest reason.** All 15 are mis-filing or the evidence-check bug. The best examiner discussion is **35(a)** (pages 23–24): three rounds, grader 3.0 → 3.5 → 4.0 of 5, evaluator 3.5 → 4.0 → 4.0, effective agreement 0.79 → 0.79 → 1.0, finalised at 4/5; escalated only by a spurious `multiple_attempts` flag.
- `review.json` has no images; page images must be rendered from `answer_book.pdf` (CBSE's document). Question text and criteria wording derive from CBSE's paper and marking scheme. No student name or roll number in the data.
- Escalation texts shown to teachers: "No answer found on the pages", "The rubric isn't ready", "Handwriting hard to read", "Several attempts at this answer", "The grade failed the checks", "The two examiners disagree", "The AI couldn't grade it", "Random spot check", "Grader: off topic".

## Facts and their sources
- CBSE run: 31 pages, 118 calls, $0.222, 61 s, `NEEDS_REVIEW` (README line ~82); models gpt-4.1-mini (vision, rubric, grader) and gpt-4.1 (evaluator); costs from token counts and list prices, not an invoice.
- Defaults (`backend/app/llm/config.py:60-63`): vision, rubric_parser, evaluator = claude-opus-5-5; grader = claude-sonnet-5-5. The defaults have not been run on this paper.
- Thresholds (`backend/app/core/config.py:40-44`): agreement 0.8 (exam can set 0.5–1.0), max revisions 2, criterion tolerance 0.25, OCR confidence 0.5, spot check 0.
- Escalation reasons (`backend/app/models/grading.py:31-39`).
- Audit (`docs/audit-trail.md`): runs with config snapshot and git SHA; one `llm_calls` row per attempt with request, raw and parsed response, tokens, cost, latency; images stored as reference + hash, never bytes; grade events with actor, reason, before/after; versions never changed; fail-closed if an audit write fails.
- Storage: uploads and page images on disk under `UPLOAD_DIR` (`./data/uploads`); everything else in Postgres. Page images served only to authorised staff or the student after publish, `Cache-Control: private, no-store`.
- **Not built:** encryption at rest, retention, purge, per-student erasure or export, read logging (backlog). Deletes are soft; files stay on disk.
- Langfuse (optional): images masked, text (transcripts, rubrics, feedback) sent; self-hosted or EU cloud under a DPA.
- Who gets page images: only the vision role; its provider can be Anthropic, OpenAI or self-hosted open-weight. `LLM__ALLOW_EXTERNAL_FALLBACK` (default true) decides whether a self-hosted primary may fall back to an API. Prompts carry no student names.
- Repo: `Harshit2807161/Graider`, private; the CBSE PDFs and `review.json` are committed. No logo, domain, pricing or company name in the repo.

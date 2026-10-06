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

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

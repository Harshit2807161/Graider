# budget-per-page (M2 backlog: budget sizing by pages)

Status: done. The item was already resolved in code.

- `run_grading` (backend/app/services/grading_service.py) renders the pages (`_pages`) before it opens
  the budget, and sizes the cap as `max_calls_for(questions) + 2 * len(pages)`. This came in with
  commit 1174745. Scoped regrades read no pages, so they add nothing.
- No `top_up` method is needed. Added a regression test:
  `tests/test_pipeline.py::test_call_budget_is_topped_up_by_two_per_page` (3-page scanned PDF, checks the cap).

Remaining: mark the backlog item resolved (docs/v2-backlog.md was left alone on purpose).

Test: `cd backend && pytest tests/test_grading.py tests/test_pipeline.py -q`

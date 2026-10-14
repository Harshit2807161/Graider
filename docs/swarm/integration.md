# Swarm integration (swarm/backlog-sweep)

Integrator report, 14 Oct 2026, cut at 19:30 IST.

## Merged
bilingual-papers, budget-per-page, evidence-check, failure-codes, frontend-class-detail,
garbled-symbols, gotenberg-retry, reparse-old-prompt-specs, rubric-as-questions,
same-model-warning, stale-rubric-flag, struck-words, tests-ignore-env, and
reader-question-context (merge d85925a; conflicts in backend/app/grading/transcribe.py and
backend/tests/test_grading_v2.py resolved by keeping clean_transcript_text on segments, the
struck-words rules and the new question-context prompt with its tests). Branches merged after
d85925a by the coordinator (e.g. overview-summary) are not covered by the results below.

## Results at d85925a
- `pytest -q -x --ignore=tests/test_llm_live.py`: 334 passed, 10 skipped, 153 warnings in 320.13s
- `ruff check app tests alembic`: All checks passed!
- No `fix(integration)` commits were needed on the backend.

## Still open
- Frontend `npx tsc --noEmit` / `npm run lint` not completed before the cut. A tsc run during
  the overview-summary merge reported conflict markers in frontend/app/dashboard/page.tsx
  (lines 34-38); the file was clean when checked straight afterwards. Re-run tsc and lint.

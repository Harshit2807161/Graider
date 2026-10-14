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

## Final head (19:29 IST, after all 27 branches merged)

- ruff: All checks passed. Frontend `tsc --noEmit`: clean. `npm run lint`: ran clean.
- `tests/test_grading_v2.py tests/test_llm_router.py tests/test_exam_documents.py`: 105 passed.
- `tests/test_api.py tests/test_review.py tests/test_pipeline.py tests/test_student_results.py tests/test_rubrics.py tests/test_tracing.py tests/test_audit.py`: **122 passed, 6 failed**.
  All 6 are in `tests/test_api.py::TestRubricSpecs` and fail with `KeyError: 'questions'` on `GET /exams/{id}`:
  the merge of `rubric-hidden-from-students` (student/staff response models on `read_exam`) with `overview-summary`
  (the `/summary` route inserted above it) left the staff response without `questions`. Start there:
  `backend/app/api/v1/endpoints/exams.py` around `read_exam`, compare with `swarm/rubric-hidden-from-students`.
- Not yet merged: nothing. Branch `swarm/bilingual-ui` is empty (no draft editor exists in the frontend).
- Workflow reviewer notes worth acting on: the grader/evaluator same-model warning is only emitted from `get_router()`
  outside a run, so it never fires in the worker; call it from `run_router()` too.

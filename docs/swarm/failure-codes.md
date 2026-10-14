# failure-codes

Done: `submissions.failure_code` (model + migration a3c9e1f2b7d4), FailureCode enum in app/core/constants.py,
set in grading_service on FAILED (GradingFailure / budget / LLMError / internal), exposed on SubmissionRead
(review detail embeds it), pipeline tests assert the code.
Remaining: verify tsc, ruff, pytest (frontend failure.ts now prefers failure_code).
Test: cd backend && .venv/bin/pytest tests/test_pipeline.py tests/test_migrations.py tests/test_review.py -q

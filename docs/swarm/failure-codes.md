# failure-codes

Done: `submissions.failure_code` (model + hand-written migration a3c9e1f2b7d4, Postgres was down), FailureCode
enum in app/core/constants.py, set in grading_service on FAILED, exposed on SubmissionRead (the review detail
embeds it), pipeline tests assert the code. Frontend explainFailure prefers failure_code, falls back to text.
Remaining: run test_migrations / `alembic check` against Postgres (skipped locally: no MIGRATIONS_DATABASE_URL).
Test: cd backend && .venv/bin/pytest tests/test_pipeline.py tests/test_migrations.py tests/test_review.py -q

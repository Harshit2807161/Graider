# langfuse-retention

Done: `app/admin/langfuse_retention.py` (client + `purge` + CLI), tests in `tests/test_tracing.py`, docs in `docs/observability.md`.
Remaining: schedule the daily job in deployment (cron/Celery beat); run-ID traces for rubric/exam use other metadata, not covered by --submission-id.
Test: `pytest tests/test_tracing.py -q` (fake httpx transport, no network).

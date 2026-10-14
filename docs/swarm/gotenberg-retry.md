# gotenberg-retry

Done: convert_to_pdf retries once (1.5 s sleep, structlog warning) on HTTP 503 or connect/read timeout;
compose gotenberg gets --libreoffice-start-timeout=60s; STARTUP_GUIDE mentions the flag and the retry;
3 unit tests added in backend/tests/test_ingestion.py.
Remaining: nothing.
Test: cd backend && pytest tests/test_ingestion.py -q

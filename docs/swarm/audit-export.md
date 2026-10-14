# Per-student audit export (backlog: GDPR Art. 15, FERPA)

Done
- `GET /api/v1/orgs/{org_id}/students/{membership_id}/export` (owner/admin via `deps.require_org_role`) in `backend/app/api/v1/endpoints/orgs.py`
- Response schemas in `backend/app/schemas/student_export.py`: membership (+ email, name), each non-deleted submission in the org with runs, llm_calls metadata (no request/response bodies), transcription and grade versions, submission answers, grade events
- Test `test_owner_exports_everything_recorded_about_one_student` in `backend/tests/test_review.py` (owner 200 with all sections, teacher 403, other-org membership 404)

Remaining
- Frontend download button; CLAUDE.md API table row; optional erasure tooling (separate backlog item)

How to test
- `cd backend && pytest tests/test_audit.py tests/test_review.py -q && ruff check app tests alembic`

# stale-rubric-flag

Done: backend `rubric_outdated` on GET /submissions/{id}/review questions and GET /exams/{id}/review-queue rows
(grade's spec id != question's current ready spec id); test in backend/tests/test_review.py (18 pass).
Remaining: frontend pill "Graded with an older rubric" in components/features/review grade header.
Test: backend/.venv/bin/pytest tests/test_review.py -q; frontend npx tsc --noEmit && npm run lint.

# stale-rubric-flag

Done: backend `rubric_outdated` on GET /submissions/{id}/review questions and GET /exams/{id}/review-queue rows
(grade's spec id != question's current ready spec id); test in backend/tests/test_review.py (18 pass).
Frontend: QuestionCard shows a "Graded with an older rubric" StatusBadge (review tone); types updated. Nothing remaining.
Test: backend/.venv/bin/pytest tests/test_review.py -q; frontend npx tsc --noEmit && npm run lint.

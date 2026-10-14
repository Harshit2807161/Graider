# Per-criterion marks for students

Done:
- Backend: `StudentCriterionMark` (name, score, max_points) in `backend/app/schemas/exam.py`; `StudentAnswerView.criteria`.
  The student view of GET /submissions/{id} fills it from the current AnswerGrade, naming criteria from the rubric spec
  the grade used. No evidence, justification or evaluator rounds.
- Test: `backend/tests/test_student_results.py::test_a_student_sees_criterion_marks_without_the_reasoning`.

Remaining:
- Frontend: render criteria under each question on the student result page (in progress).

How to test:
- `cd backend && pytest tests/test_student_results.py tests/test_review.py -q && ruff check app tests alembic`
- `cd frontend && npx tsc --noEmit`

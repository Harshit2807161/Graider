# Internal choice split (draft editor)

## Done
- `backend/app/exam_drafts/choices.py`: `suggest_internal_choice_split(question) -> SuggestedSplit | None`
  (standalone OR / Or / या / अथवा line, or inline `(a) ... OR (b) ...` / `(i) ... OR (ii) ...`; skipped when
  the question is already in a choice group or the rubric's written marks fit within the question's marks).
- `checks.check_content` emits a warning `internal_choice` with `details.suggested_split`
  (`label`, `parts[{label, text, marks}]`, `pick`). `Issue` gained an optional `details` dict.
- Tests in `backend/tests/test_exam_documents.py` (4 new).

## Remaining
- Frontend: "Split into 2(a) / 2(b)" button on the `internal_choice` issue in the draft editor that replaces the
  question with the two parts and adds a choice group (pick 1) in the local draft before save.

## How to test
cd backend && pytest tests/test_exam_documents.py -q && ruff check app tests alembic

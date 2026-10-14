# bilingual-papers

Done: `merge.fold_bilingual_duplicates` joins a repeated question label whose text is in a different
dominant Unicode script (e.g. Devanagari vs Latin); the Latin text is kept, the other goes to the new
optional `DraftQuestion.alternate_language_text`, marks/pages are combined. `check_content` emits a
non-blocking `bilingual_duplicate` warning per such question. Same-script repeats are unchanged
(blocking `duplicate_label`).

Remains (later): let the teacher choose which language to keep; show the alternate text in the draft UI.

Test: `cd backend && pytest tests/test_exam_documents.py -q` (24 pass).

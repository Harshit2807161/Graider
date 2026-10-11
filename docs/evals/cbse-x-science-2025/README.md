# First real-paper run: CBSE Class X Science 2025 (set 31/1/3)

One real board paper, its official marking scheme and one real handwritten answer book, run through the
whole pipeline on 2026-10-11 with OpenAI models and a hard $2 budget. This is a smoke test on real
material, not an accuracy measurement: CBSE does not publish the marks of the answer book.

## Files
| File | What it is |
|---|---|
| `papers/question_paper.pdf` | Board question paper, set 31/1/3, Hindi and English (27 pages) |
| `papers/marking_scheme.pdf` | Official marking scheme for 31/1/3 (9 pages) |
| `papers/answer_book.pdf` | A real handwritten answer book, published by CBSE as a model answer (31 pages) |
| `questions.json` | The exam as entered: 51 gradable parts with rubric text, 9 choice groups, 80 marks |
| `build_questions.py` | Rebuilds `questions.json` from the two PDFs' text layers |
| `run.py` | Runs the paper through a running Gr8r and saves the results |
| `runs/2026-10-11-gpt-4.1-mini/` | This run: `results.csv` (one row per part) and `review.json` (everything the review screen shows) |

The PDFs are public on cbse.gov.in (`cbsenew/question-paper/2025/X/086_Science.zip`,
`cbsenew/Marking-Scheme/2025/X/Science.zip`, `cbsenew/model-answer/2025/X/Science.zip`). The marking
scheme here is pages 27–35 of the 31/1/1–3 file and the answer book is without its cover page. The
answer book is from set 31/1/3: its multiple-choice answers match that set's questions and no other.
They are CBSE's documents; keep this repository private while they are in it.

## Review this run without running anything
- **Scores:** `runs/2026-10-11-gpt-4.1-mini/results.csv`.
- **Why each score:** `review.json` has, for every part, the rubric criteria, the transcript of the
  student's answer with its page segments, each criterion's score with quoted evidence and
  justification, the evaluator's rounds, flags and the escalation reason. Open `papers/answer_book.pdf`
  beside it to compare the transcript with the handwriting.
- **A quick look:**
  ```bash
  python - <<'PY'
  import json
  r = json.load(open("runs/2026-10-11-gpt-4.1-mini/review.json"))
  q = next(q for q in r["questions"] if q["label"] == "23")   # any label from results.csv
  print(q["transcription"]["text"]); print(json.dumps(q["grade"]["criteria"], indent=1))
  PY
  ```

## Run it yourself
This makes paid model calls: about $0.30 for one run with the models below.

1. Start Gr8r (`STARTUP_GUIDE.md`): API, worker, Postgres, Redis. The first superuser can create the
   organization; any other staff user must pass `--org-id`.
2. In `backend/.env`, choose the models and **give every model a price**, or the USD cap does not count
   its calls. Profile E in `backend/.env.example` is what this run used. Set
   `LLM__MAX_COST_USD_PER_SUBMISSION` (this run: 1.45; it needed 0.22).
3. Run it, from `backend/` so its virtualenv is used:
   ```bash
   python ../docs/evals/cbse-x-science-2025/run.py --email you@example.com --name 2026-10-12-claude
   ```
   It asks before spending, prints the totals, saves `runs/<name>/` and lists every part whose score
   or status differs from this run. Commit that folder to share your run.
4. To see it as a teacher would, open the link it prints (the review screen).

Things to know:
- Rubric parsing is not deterministic. The script asks for a fresh parse of invalid rubrics twice;
  any still invalid are listed, and those parts are escalated instead of graded.
- The only budget across the whole exam is your own. To watch spend:
  `select count(*), round(sum(cost_usd)::numeric, 4) from llm_calls;`
- To stop a run, stop the worker **and** clear its queue (`redis-cli del celery unacked unacked_index`),
  or the task is picked up again when a worker starts.
- `run.py` has not completed a full run yet: a second run was stopped during grading, so everything
  up to the upload is exercised and the saving of results was checked only against this run's data.

## Setup
- Branch `v1-full` at `189db45`, plus the fix in this branch. Postgres 15, Redis, one Celery worker.
- Models: `gpt-4.1-mini` for page reading, rubric parsing and grading; `gpt-4.1` as the evaluator.
  Prices were set with `LLM__PRICES` (the built-in table has Claude only, and an unpriced model is
  not counted against the USD cap).
- Budget: `LLM__MAX_COST_USD_PER_SUBMISSION`, and a watchdog that sums `llm_calls.cost_usd` every
  3 seconds and kills the worker at a global cap. The app's own caps are per stage ($5 per extraction,
  $1 per rubric parse, configurable per submission), so nothing in the app caps a whole exam.

## What happened

| Stage | Calls | Cost (USD) | Result |
|---|---|---|---|
| Exam extraction from the two PDFs, first try | 34 | 0.127 | Crashed: NUL character in model output (fixed here) |
| Exam extraction, second try | 37 | 0.087 | Draft unusable: 149 questions, 130 blocking issues |
| Rubric parsing (39 questions, then 51) | 95 | 0.077 | 50 of 51 valid after re-parses; 1 fixed by hand |
| Grading the answer book | 118 | 0.222 | 61 seconds; `NEEDS_REVIEW`, provisional 42/80 |
| **Total** | **284** | **0.513** | |

Costs are computed from recorded token counts and list prices, not from an OpenAI invoice. A second run,
started to test `run.py` and stopped during grading, cost a further $0.115 (108 calls); its results
were not kept.

### Extraction did not survive a bilingual paper
The question paper prints every question in Hindi and in English. The draft had both copies of each
question (56 duplicate labels), no marks on the one-mark questions (70 missing), mislabelled case-study
parts, and no rubric attached to any question although all nine marking-scheme pages were classified
as rubric. The blocking checks stopped it from being confirmed, as designed.

The rubric was lost in the merge: the model put all 79 marking-scheme entries under `questions` and none
under `rubric_items`, and on rubric pages the merge reads only `rubric_items` (`exam_drafts/merge.py`).

The exam was then entered as typed questions instead: `build_questions.py` cuts the English text and the
marking scheme by question number from the PDFs' text layers, and splits each "(a) OR (b)" question
into two alternatives in a choice group. That gave 51 gradable parts, 9 choice groups, 80 marks.

### Grading
Per-part results are in `results.csv`.

| Outcome | Parts | Notes |
|---|---|---|
| Graded, no review needed | 29 | 19 of the 20 multiple-choice answers, all correct |
| Escalated for review | 15 | 6 repeated attempts, 5 failed checks, 3 no answer found, 1 off topic |
| Not attempted (other alternative answered) | 7 | Choice groups worked |

The answer book is a high-scoring script that CBSE published as a model, so 42/80 is far too low.

### Where the marks went
A read-only review after the run compared 16 of the 31 page images, and the recorded page-reading
output for all 31, with the transcripts and grades. Most of the 38 missing marks were lost before
grading began, when pages were read and answers were filed under questions. The mark figures assume
the script deserved full marks, so they are upper bounds; only the evidence-check figure is exact,
because the grader had awarded those marks. The script has not been hand-marked.

| Failure | Marks | Escalated? | Kind |
|---|---|---|---|
| A. Answers filed under the wrong question | about 15.5 | Mostly, under misleading reasons | Design gap, prompt bug, and how the exam was entered |
| B. Evidence check discards correct grades | 11.5 | Yes, all five | Implementation bug |
| C. Reader skips content (diagrams, whole sub-answers) | about 7 | Partly | Weak model, and nothing checks coverage |
| D. One struck word deletes a whole segment | about 4 | Partly | Schema and prompt bug |

**A. Mis-filing.** Each page is read on its own, so the reader has no idea which question a page
continues.
- A page that starts with a bare sub-part has no question number. Page 13 holds 28(b) and (c) and was
  filed under 22(b), so 28 scored 1/3. Page 22's table for 34(b)(iii) was filed under 29. Page 30's
  continuation of 38(c)(ii) and page 31's answer to 39(c)(i) were both filed under 39(c)(ii), which the
  grader then flagged as off topic.
- The booklet's printed page numbers were read as question numbers. Page 25 is printed "26" and
  continues 36(b); it was filed under 26. Page 29 is printed "30"; 38(b) and 38(c)(ii) were filed
  under 30. So 38(a)–(b) got 1/2 without review, and 38(c)(i) was "no answer found" although the
  student answered the other alternative.
- The page reader sees only the first 200 characters of each question (`grading/prompts.py`). The
  case-study parts were entered with the shared passage first, so 37(a)–(b), 37(c)(i) and 37(c)(ii)
  looked identical, and the answers to 37(a) and (b) landed on the (c) parts.
- Page 17's opening lines continue 31 but were marked as starting an answer, and stitching only
  attaches unassigned text that is marked as a continuation, so they stayed unassigned.
- "Repeated attempts" is a symptom of the above, not a real second attempt: the prompt treats every
  new sub-part or page as a start. Of the six such escalations, four contained another question's
  text (26, 29, 30, 37(c)(ii)) and two were page breaks only (28, 35(a)).

**B. Evidence check.** Each quote must be one unbroken piece of the transcript, and a failure after one
repair drops the score. In 2 and 31 the quote differs only by control characters and added quote
marks. In 22(a) and 32(a) the grader quoted several separate lines for one criterion; 36(b) has both
problems. Matching quoted lines separately would pass 10 of the 11 failing criteria. The control
characters are garbled symbols from the model (an arrow became `\x02` followed by "1"), so stripping
them leaves stray digits.

**C. Skipped content.** The Hydra diagram (page 6), both ray diagrams (page 14) and the test-tube
diagram (page 18) left nothing in the transcript, although the circuits on pages 10 and 11 were
described. 27(a) on page 9 and the diagram and legend for 34(b)(i) on page 21 were skipped entirely.
Nothing checks that a page was fully read, and the grader never sees the image, so a rule such as
"deduct ½ if arrows are missing" cannot be applied. 23 and 34(b) scored 0 for their drawings without
being escalated. The pages may also have been downscaled by the provider (inferred from token counts).

**D. Crossed-out work.** "Crossed out" is one yes/no per segment, and stitching drops flagged segments.
On pages 10, 21 and 24 a single struck word removed the whole segment: 27(b) (so 27 was "no answer
found"), a mark in 33 and a mark in 35(a).

**Silent errors.** Of the 10 written parts graded without review, 4 have a wrong counted score: 23
(0/2), 33 (2/3), 34(b) (1/5) and 38(a)–(b) (1/2), about 8 marks. The evaluator agreed in the first
round on 33 of 34 graded answers, including all of these. It reads the same transcript as the grader,
so it cannot catch a reading or filing error; it took 46% of grading spend and changed one score.

Not verified: the true marks; 15 of the pages, which were checked from recorded output only; whether
a stronger reader fixes mis-filing (the missing context is structural, so probably only in part).

## What this says about the product
1. The plumbing holds on real material: 31 handwritten pages were read and 44 answers graded or
   escalated in about a minute for 22 cents, with every call recorded.
2. A small model reads clean handwriting well. The marks were lost in deciding which question a
   piece of writing belongs to, and in what the reader left out.
3. The design verifies everything after the transcript (quotes, a second examiner), and this run's
   errors were before it. Reading pages in isolation does not work for booklets where sub-parts
   cross pages.
4. A total cannot be trusted yet: four written answers were wrong without any flag.
5. Next, before spending more: hand-mark this script from the examiner's ticks, then change one thing
   at a time (the same code with a stronger reader; the cheap fixes with the same reader), and add a
   mid-scoring, messier script, because a model answer cannot show over-marking. The 50 teacher-marked
   sheets in the Mendeley exam set (CC BY 4.0) have per-question marks.

New backlog items from this run are in [docs/v2-backlog.md](../../v2-backlog.md) under "CBSE run".

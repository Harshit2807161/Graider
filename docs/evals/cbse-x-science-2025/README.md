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
Where the marks went:

- **Diagrams are not read.** Questions that ask for a labelled diagram or ray diagram scored 0 with the
  justification "no diagram is drawn", and were not escalated (23, 29, part of 34(b)). The page
  transcript has no trace of the drawing. This is the worst failure: a silent wrong mark.
- **The evidence check rejects correct grades.** All five `check_failed` escalations are "quote not found
  in the answer". The quotes differ from the transcript only in control characters the model wrote for
  arrows and dots (`\x02`, `\x1e`), LaTeX escaping, a joined line break, or an ellipsis.
- **Answers are cut short or lost.** 34(b) kept only its first part, and the continuation of 31 on
  page 17 ended up unassigned. 27 and 38(c)(i) came back as "no answer found"; these two were not
  checked against the pages.
- **Case-study parts landed on the wrong label.** The answers to 37(a) and 37(b) were filed under
  37(c)(i) and 37(c)(ii), so 37(a)–(b) was "no answer found". The labels invented for this run
  (`37(a)-(b)`) did not help.
- **"Repeated attempts" fires on ordinary answers** (six times), including a correct 3/3.

## What this says about the product
1. The plumbing holds on real material: 31 handwritten pages were read and 44 answers graded or
   escalated in about a minute for 22 cents, with every call recorded.
2. Clean handwriting is read well by a small model. Structure is the problem: bilingual papers,
   diagrams, multi-page answers and sub-part labels.
3. A total cannot be trusted yet, and escalation does not catch the diagram case.
4. This needs a marked script to mean anything. Next: the same paper with a stronger reader, and the
   50 teacher-marked sheets in the Mendeley exam set (CC BY 4.0), which have per-question marks.

New backlog items from this run are in [docs/v2-backlog.md](../../v2-backlog.md) under "CBSE run".

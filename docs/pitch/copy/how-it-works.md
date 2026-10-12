# How it works (`/how-it-works`)

Audience: anyone who wants the pipeline step by step: a head of department checking the method, a professor, an investor's technical adviser. Real screenshots go in the marked slots.
Primary CTA: See a graded sheet.

## H1

How Gr8r marks an answer sheet

## Lede

From the marking scheme to a published result, in seven steps. At each step, this page says what Gr8r does, what it checks, and what it hands to a teacher.

Button: **See a graded sheet**

---

## Step 1. The exam and its marking scheme

Heading: 1. The exam and its marking scheme

Body:
A teacher enters the questions and the marking scheme: typed in, imported from an Excel sheet, or drafted from the question paper and marking-scheme PDFs and then corrected and confirmed by the teacher. Questions keep the labels printed on the paper, such as 2(b), and "attempt any one" questions are grouped so that only one alternative counts.

Gr8r turns each question's marking scheme into a list of criteria, each with its points and any partial-credit levels. Code checks the list: every criterion has a description and points, and the points add up to the question's marks. A teacher can read the list and replace it. A question whose list fails the checks is not marked; its answers go to the teacher.

Screenshot slot: [a question with its parsed criteria]

---

## Step 2. Uploading the answer sheets

Heading: 2. Uploading the answer sheets

Body:
A student's answers can be one file or several: scanned PDFs, phone photos (JPEG, PNG, HEIC and others), Word, ODT, RTF or PowerPoint files. Gr8r identifies each file by its contents, not its name, and refuses encrypted PDFs, files with macros, and files over the size, page or pixel limits. PDFs are turned into page images; photos are rotated upright and straightened.

---

## Step 3. Reading the pages

Heading: 3. Reading the pages

Body:
A vision model reads every page at the same time. It copies out only what the student wrote, not the printed questions, and labels each piece of writing with the question it answers, using the paper's own labels. It notes how confident it is and which work is crossed out.

Code then puts each answer together. A piece of writing marked as a continuation joins the answer before it, so a long answer can run across pages. Crossed-out work is left out. Writing that couldn't be placed under any question is kept and shown to the teacher.

Screenshot slot: [a page image beside its transcript]

---

## Step 4. Marking each answer

Heading: 4. Marking each answer

Body:
Each question is marked separately. For every criterion the grader gives a score, a quote from the student's answer as evidence, and a justification. Then code checks the result: every criterion scored once and within its points, a quote for every score above zero, and each quote found in the student's answer. If the check fails, the grader gets one chance to repair it; if it fails again, the answer goes to the teacher.

The grader can also flag an answer as illegible, off topic, answering another question, or incompletely read. A flag sends the answer to the teacher.

If no answer is found for a question, it is never given zero automatically; it goes to the teacher. For an "attempt any one" question, the alternatives the student didn't answer are marked "not attempted" and don't count.

---

## Step 5. The second examiner

Heading: 5. The second examiner

Body:
A second model, different from the grader, is told to score every criterion itself first, and then to review the grader's marks and evidence and say where it disagrees, point by point. Both are in the same request, so its own scores are an instruction it follows, not a blind second marking. Gr8r records its own scores separately from its review.

Gr8r compares the two. They count as agreeing only if their totals are close enough (the exam sets how close) and no single criterion is more than a quarter of its points apart. If they disagree, the grader revises: it accepts or rejects each of the second examiner's points, with a reason. After at most two revisions, an answer still in dispute goes to the teacher with both positions.

The second examiner reads the same transcript as the grader. It checks the marking, not the reading.

Screenshot slot: [the examiner rounds for one answer]

---

## Step 6. What goes to the teacher, and why

Heading: 6. What goes to the teacher, and why

Body: Each answer Gr8r won't settle on its own carries one of these reasons, in these words, on the teacher's screen.

| Reason the teacher sees | What happened | What Gr8r proposes |
|---|---|---|
| No answer found on the pages | Gr8r couldn't find an answer to this question | No mark; the teacher looks at the pages |
| The rubric isn't ready | The marking scheme for this question failed the checks | No mark until the criteria are fixed |
| Handwriting hard to read | The page reader was not confident about this answer | Its proposed mark, for the teacher to confirm |
| Several attempts at this answer | The answer seems to be written more than once | Its proposed mark, for the teacher to confirm |
| The grade failed the checks | Quotes or scores failed the code checks, even after a repair | Usually no mark; the teacher marks it |
| The two examiners disagree | Still apart after two revisions | The grader's mark, with both positions shown |
| The AI couldn't grade it | Every model for this step failed | The teacher marks it |
| Random spot check | Picked at random, if the exam has spot checks on | Its proposed mark, for the teacher to confirm |
| Grader: off topic (or illegible, another question, incompletely read) | The grader flagged the answer | No mark; the teacher marks it |

The whole sheet fails, and nothing is marked, only if its pages can't be read, the cost limit for the sheet runs out, or the exam has no questions. Gr8r never records a made-up mark.

---

## Step 7. The teacher's review and sign-off

Heading: 7. The teacher's review and sign-off

Body:
Teachers see answers needing review first. For each one they can accept the proposed mark, set every criterion's score themselves (a reason is required), or correct the transcript (with a reason), which marks that answer again. When no answer on a sheet needs review, a teacher can approve it. Approved sheets are published to students for the whole exam at once. Students see only their own published results: marks, feedback and their pages.

Nothing is overwritten. Each change adds a new version, and the earlier ones stay readable.

Screenshot slot: [the review screen with an escalated answer]

---

## The record behind every result

Heading: The record behind every result

Each marking attempt is saved as a run, along with the models, settings and code version it used. Within a run, each model call is recorded with what was sent, what came back, the tokens, cost and time; page images are recorded as a reference and a fingerprint. Transcripts and grades are saved as versions and never changed afterwards. Teacher actions are recorded with who, when, why, and the before and after.

If Gr8r can't write one of these records, it stops the run, so no result is saved with a gap in its record.

---

## The models

Heading: The models

| Role | What it does | Default | Can also run on |
|---|---|---|---|
| Page reader | Reads page images | Claude Opus 5.5 | OpenAI, or an open-weight model you host |
| Rubric reader | Turns marking schemes into criteria | Claude Opus 5.5 | OpenAI, or an open-weight model you host |
| Grader | Marks each criterion with evidence | Claude Sonnet 5.5 | OpenAI, or an open-weight model you host |
| Second examiner | Scores each answer itself, then reviews the grader | Claude Opus 5.5 | OpenAI, or an open-weight model you host |

Each role has fallbacks, and the grader's and second examiner's fallbacks never use each other's model. The defaults haven't been run on a real answer book yet; our first real test used small OpenAI models. We haven't measured which open-weight models are good enough for each role.

---

## What it does well today, and what it sends to you

Heading: What it does well today, and what it sends to you

**Does well today**
- Neat handwriting, scanned or photographed.
- Answers written out in words, and working in numbers and formulas.
- Multiple-choice answers.
- Marking schemes that give marks for separate points, with partial marks.
- "Attempt any one" questions: only the attempted one is marked, and each group counts once.
- Long answers across pages, when the question number is written.

**Sends to the teacher instead of guessing**
- An answer it can't find.
- A page it can't read with confidence.
- An answer that seems to be written twice.
- A mark it can't support with a quote.
- Two examiners still apart after two revisions.
- A marking scheme that fails the checks.
- An answer flagged as illegible, off topic, answering another question, or incompletely read.

**Not yet**
- **Drawings and diagrams.** A drawing leaves nothing in the transcript and the grader never sees the image, so a drawn answer can score low without being flagged. A teacher should mark these.
- **Sub-parts across pages.** Each page is read on its own, so a page starting with a bare "(b)" can be filed under the wrong question, and a booklet's printed page number can be mistaken for a question number. A fix is in progress.
- **Crossed-out words.** One struck word can make the reader drop the whole passage around it. A fix is in progress.
- **Reading errors the second examiner can't see.** It reads the same transcript as the grader, so a misread or misfiled answer gets past it. The teacher's review of the page is the check.
- **Untidy handwriting.** We haven't tested it properly yet; our one real test used a neat answer book.
- **Drafting the exam from PDFs.** On the board paper we tested, the draft wasn't usable, and the questions were entered from the paper's text instead.
- **Measured accuracy against teachers' marks.** We are measuring it now, and we'll publish the method and every case before any figure.

---

## Closing

Heading: See it on a real answer book

Body: Three answers from a CBSE Class X Science 2025 answer book, with every criterion, quote and examiner round.

CTA: **See a graded sheet**

---

## Claims used

- Exam entry: typed, Excel import, draft from PDFs confirmed by teacher; labels like 2(b); choice groups: `.claude/CLAUDE.md` (data model, API table)
- Rubric spec checks (description, points > 0, sum equals question marks); teacher replacement; invalid spec escalates: `backend/app/rubrics/validate.py` lines 14 to 51; `.claude/CLAUDE.md` (pipeline step 2, API `PUT rubric-spec`)
- Upload formats, detection by bytes, safety checks, rendering, rotation and straightening: `.claude/CLAUDE.md` (document intake, API table); `backend/app/ingestion/`
- Pages read in parallel; student's writing only; segment labels, confidence, crossed out; stitching; unplaced kept: `.claude/CLAUDE.md` (pipeline step 3); `backend/app/grading/prompts.py` line 34; `review.json` segment fields
- Grade checks (each criterion once, within points, quote for score above 0, quote in answer), one repair: `backend/app/grading/checks.py` lines 22 to 55; `.claude/CLAUDE.md` (pipeline step 4)
- Grader flags: `backend/app/grading/schemas.py` line 8
- No auto-zero; not attempted alternatives not counted: `.claude/CLAUDE.md` (pipeline steps 3 and 4); `review.json` (24(a) `not_attempted`, `counted: false`)
- Evaluator own view first; effective agreement; 0.25 tolerance; accept/reject replies; at most 2 revisions; threshold per exam: `.claude/CLAUDE.md` (pipeline step 4, settings, API `grading-settings`); `backend/app/grading/checks.py` lines 86 to 99
- Evaluator reads the same transcript: eval README ("Silent errors"); `docs/v2-backlog.md`
- Escalation reasons and teacher-facing wording: `backend/app/models/grading.py` lines 31 to 43; `docs/pitch/research/sample-sheet-facts.md` (escalation texts)
- Proposed score kept on low confidence, repeated attempts, spot checks: `.claude/CLAUDE.md` (pipeline step 4)
- Run fails only on unreadable pages, budget, no questions; never a made-up score: `.claude/CLAUDE.md` (failure rules)
- Review actions, approval refused while answers need review, publish at exam level, students see own published: `.claude/CLAUDE.md` (statuses, API table); `CHANGELOG.md` M6, M7, "Student results"
- Audit: runs with config snapshot and git SHA; calls with request, response, tokens, cost, latency; images as reference and hash; versions immutable; fail-closed: `docs/audit-trail.md`; `docs/pitch/research/sample-sheet-facts.md`
- Model defaults and providers; fallbacks avoid each other's model: `backend/app/llm/config.py` lines 60 to 63; `docs/deploy/open-weight.md`; `.claude/CLAUDE.md` (pipeline step 4)
- Defaults not run on a real answer book; open-weight not measured: `docs/pitch/research/sample-sheet-facts.md`; `docs/deploy/open-weight.md`
- Limitations (drawings, filing, printed page numbers, struck words, untidy handwriting, PDF draft on the board paper): `docs/evals/cbse-x-science-2025/README.md` sections A to D and "Extraction did not survive"; `docs/v2-backlog.md` (CBSE run)

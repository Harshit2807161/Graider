# Home (`/`)

Audience: anyone arriving cold. In a few seconds they should know what Gr8r does, whether their exams are handwritten enough for it, and which page is theirs.
Primary CTA: Request a pilot. Secondary: See a graded sheet.

## H1

AI marking for handwritten answer sheets. It shows its working.

## Lede

Gr8r reads each handwritten page, awards each mark on your own marking scheme with a quote from the student's answer as evidence, has a second model check the grade, and sends anything it can't settle to the teacher instead of guessing. Nothing is published until a teacher approves it.

Buttons: **Request a pilot** · See a graded sheet

---

## Section 1. One answer, marked

Heading: One answer, marked

Body:
Question 21 from a CBSE Class X Science 2025 answer book that CBSE published as a model answer. The marking scheme gives this question three criteria. Beside each one is the mark Gr8r gave, the line from the student's working that earned it, and the reason.

Caption under the excerpt:
Question 21, scanned page 4. The red ticks on the page belong to CBSE's examiner, not to Gr8r.

Link: See the whole sample

---

## Section 2. How a mark is made

Heading: How a mark is made

1. **Read.** Gr8r reads every page and copies out the student's writing, answer by answer, under the question number the student wrote.
2. **Mark.** Each criterion in your marking scheme gets a score, a quote from the student's writing, and a reason. If the quote isn't in the student's answer, the score doesn't count.
3. **Check.** A second, different model scores the same answer itself, then reviews the first model's marks and evidence. If they still disagree after two rounds of revision, the answer goes to the teacher.
4. **Sign off.** Your teachers see every mark with its evidence, change any mark they disagree with (a reason is required), and approve. Students see a result only after that, and every change is kept.

Link: How it works, step by step

---

## Section 3. Who it's for

Heading: Who it's for

**Schools and coaching institutes**
Unit tests, pre-boards and mock tests, marked on your own marking scheme. Your teachers sign off every result before a student sees it. Internal exams only.
Link: For schools

**College professors**
Read the reasoning behind every mark, compare it with your own marking on one course, and run it on API models or on models you host.
Link: For professors

**Investors**
The product works end to end and every mark can be audited. The evaluation against teachers' marks is still running.
Link: For investors

---

## Section 4. What we can show today

Heading: What we can show today

- **Every mark has its evidence.** Each mark names a criterion from your marking scheme and quotes the student's writing. The code checks that the quote really is in the student's answer before the mark counts.
- **A second examiner on every answer.** A different model scores every answer itself, then reviews the first model's marks and evidence.
- **It doesn't guess.** An answer Gr8r can't find, a page it can't read with confidence, or a mark the two models can't agree on goes to a teacher. A missing answer is never given zero automatically.
- **Everything is kept.** Every model call, every version of every transcript and mark, and every teacher's change is recorded, so any result can be traced back.
- **A real answer book, end to end.** In our first test on a real handwritten answer book (31 pages, a CBSE Class X Science 2025 model answer), Gr8r read every page and marked or sent on 44 answers in about a minute, for about 22 US cents in model costs on small OpenAI models. That was one run in October 2026: a test that the system works, not a measure of how often its marks are right.

---

## Section 5. What it does well today, and what it sends to you

Heading: What it does well today, and what it sends to you

Intro: Gr8r gets some marks wrong. This list says where it is reliable today, which answers it hands to your teachers, and what it can't do yet.

**Does well today**
- Neat handwriting, scanned or photographed.
- Answers written out in words, and working in numbers and formulas.
- Multiple-choice answers.
- Marking schemes that give marks for separate points, including half marks.
- "Attempt any one" questions: only the attempted one is marked, and the question counts once.
- Long answers that run across pages, when the student writes the question number.

**Sends to your teacher instead of guessing**
- An answer it can't find on the pages.
- A page it can't read with confidence.
- An answer that seems to be written twice.
- A mark it can't support with a quote.
- Two examiners who still disagree after two rounds.
- A marking scheme it couldn't turn into clear criteria.
- An answer the marking model flags as illegible or off topic.

**Not yet**
- Drawings and diagrams. A drawing leaves nothing in the transcript today, so a drawn answer can get a low mark without being sent to the teacher. Your teachers should check every answer with a drawing.
- Answer books where a sub-part continues on a new page without its number. Gr8r can file that writing under the wrong question. We are fixing it.
- Measured accuracy against teachers' marks. We are measuring it, and we will publish the method and every case before we publish a figure.

---

## Section 6. Closing

Heading: Try it on one exam

Body:
The pilot is free: one exam, one class, four weeks. We agree the success criteria with you in writing before we start, and at the end you decide whether to continue on per-sheet pricing or stop.

CTA: **Request a pilot**

---

## Claims used

- Mechanism sentence (reads pages, marks on your scheme with quoted evidence, second model, escalates instead of guessing): `docs/pitch/positioning.md` ("The mechanism, in one sentence")
- Nothing published until a teacher approves; teacher can change any mark with a reason; every change kept: `CHANGELOG.md` M6, M7, "Student results"; `docs/pitch/positioning.md` proof table
- Q21 excerpt, three criteria, scanned page 4, CBSE examiner's ticks on the page: `docs/evals/cbse-x-science-2025/runs/2026-10-11-gpt-4.1-mini/review.json` (label 21); `docs/evals/cbse-x-science-2025/papers/answer_book.pdf` page 4
- Answer book is a CBSE-published model answer, CBSE Class X Science 2025: `docs/evals/cbse-x-science-2025/README.md` ("Files")
- Quote must be in the transcript before a score counts: Proposal 002 §2 decisions 6 and 8; `backend/app/grading/checks.py`
- Second, different model scores first (instructed; the grader's marks are in the same request), then reviews (`backend/app/grading/prompts.py` `EVALUATOR_RULES`); at most two revisions then the teacher: Proposal 002 §2 decision 7; `backend/app/grading/question.py`; `.claude/CLAUDE.md` (grading pipeline step 4)
- Missing answer never auto-zeroed; escalation reasons list: CHANGELOG M5; Proposal 002 §7.3; `backend/app/models/grading.py` (`EscalationReason`); `backend/app/grading/schemas.py` (`GRADER_FLAGS`)
- Every model call, version and teacher action recorded append-only: `docs/audit-trail.md`; Proposal 002 §8
- 31 pages, 44 answers marked or escalated, 61 s, about $0.22, gpt-4.1-mini and gpt-4.1, October 2026, smoke test not accuracy: `docs/evals/cbse-x-science-2025/README.md` ("What happened", "What this says about the product")
- Half marks in marking schemes: `backend/app/rubrics/parser.py` (levels of credit)
- "Attempt any one" handled, counted once: CHANGELOG M5; `review.json` (choice groups)
- Phone photos accepted, rotation and straightening: `.claude/CLAUDE.md` (document intake)
- Drawings leave nothing in the transcript and can score 0 without a flag: `docs/v2-backlog.md` ("Diagrams score 0 without escalating"); eval README section C
- Sub-parts across pages mis-filed: `docs/v2-backlog.md` ("Answers are filed under the wrong question"); eval README section A
- Pilot terms (free, one exam, one class, four weeks, written success criteria, paid-or-stop): `docs/pitch/checkpoint-1.md` answer 5; pricing per sheet, no number: answer 6

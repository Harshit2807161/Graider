# For college professors (`/professors`)

Audience: a professor or lecturer who runs one course and controls its assessments. They want the method in detail, a way to check any mark, and a fair comparison with their own marking.
Primary CTA: Try it on one course.

## H1

Check every mark it gives. Compare its marking with yours.

## Lede

Gr8r marks handwritten answers against your rubric. Each mark cites a criterion and a quote from the student's writing, a second model scores it again and reviews the first model's evidence, and anything the two can't settle comes to you. You can read the whole reasoning, override with a reason, and put its marks beside your own.

Button: **Try it on one course**

---

## Section 1. How a mark is decided

Heading: How a mark is decided

1. **Your rubric becomes a checked spec.** Gr8r turns your rubric into criteria, each with its points and any partial-credit levels ("half the points if only the formula is given"). The spec is checked in code: criteria must add up to the question's marks, and a question whose spec fails the checks is sent to you instead of being marked. You can read the spec and replace it with your own.
2. **Pages are read, then answers are put together.** A vision model reads each page and labels each piece of writing with the question it answers, skipping printed text and work the student crossed out. Code then joins answers that run across pages. Writing it can't place under any question is kept and shown to you.
3. **The grader marks each criterion with evidence.** For every criterion it gives a score, a quote from the transcript, and a justification. Code checks that each quote is in the transcript and that scores stay within each criterion's points. One repair is allowed; after that the answer comes to you. The grader can also flag an answer as illegible, off topic, answering another question, or incompletely read, and a flag sends it to you.
4. **A second examiner scores it again.** A different model is told to score every criterion itself before it reviews the grader's marks, then to compare and send back specific points. The grader's marks are in the same request, so this is an instruction the model follows, not a blind second marking; the record keeps its own scores apart from its review so you can see both.
5. **They settle it, or you do.** If the two totals are too far apart, or any single criterion differs by more than a quarter of its points, the grader revises, accepting or rejecting each point with a reason. After at most two revisions, an answer they still disagree on comes to you with both positions.
6. **Some answers come to you anyway.** Low confidence in reading a page, what looks like a second attempt, and an optional random sample of answers are sent to you with the proposed mark kept.

How close the two examiners must be is set per exam. If the grader's model fails, its fallback is chosen so that it never matches the evaluator's model, and the other way round.

---

## Section 2. What you can check

Heading: What you can check

For any answer you can open the page image beside the transcript, with the quoted words highlighted, and read each criterion's score and justification. Below that are the second examiner's scores and reasons for each round, and the grader's reply to each point.

Nothing is changed in place. Transcripts and grades are versioned, so a correction or a regrade adds a new version and the earlier ones stay readable.

Each model call is recorded with what was sent, what came back, the tokens, the cost and the time taken. Owners and admins can open the raw inputs and outputs from a submission's timeline. Page images are recorded as a reference and a fingerprint rather than stored a second time.

Teacher actions are recorded too: overrides, accepted escalations, transcript corrections, regrades, approvals and publishing, each with who did it, the reason, and the before and after.

Image slot: [screenshot of the examiner rounds on a sample answer]
Link: See a graded sheet

---

## Section 3. When you disagree

Heading: When you disagree

You can set every criterion's score yourself. A reason is required, and your scores go through the same checks as the grader's.

If Gr8r misread a word, correct the transcript (again with a reason) and that answer is marked again. You can also regrade a whole sheet.

When a sheet is right, approve it. Only approved sheets can be published to students, and each student sees only their own published results.

---

## Section 4. Models

Heading: Which models it runs on

Body:
Every model role (reading pages, reading the rubric, grading, second examiner) can run on Claude, on OpenAI, or on an open-weight model you host with vLLM or SGLang. Each role has a primary model and fallbacks, and switching is a configuration change. A setting forbids a self-hosted model from falling back to an external API, so pages need not leave your servers.

By default, the page reader, rubric reader and second examiner use Claude Opus 5.5, and the grader uses Claude Sonnet 5.5. These defaults have not yet been run on a real answer book; our first real test used smaller OpenAI models.

---

## Section 5. Compare it with your own marking

Heading: Compare it with your own marking

Body:
Mark one test yourself, as you normally would. Gr8r marks the same sheets with your rubric, without seeing your marks. Then you compare the two, answer by answer and criterion by criterion: where it agreed, where it sent the answer to you, and where it was wrong without saying so. That last group matters most, and we count it separately.

You keep the comparison. With your permission, and with no student details, we'd like to publish it alongside the method.

CTA: **Try it on one course**

---

## Section 6. What it does well today, and what it sends to you

Heading: What it does well today, and what it sends to you

**Does well today**
- Neat handwriting, scanned or photographed.
- Answers written out in words, and derivations and calculations written as text and formulas.
- Multiple-choice answers.
- Rubrics that give points for separate criteria, with partial credit.
- "Attempt any one" questions: only the attempted alternative is marked, and the group counts once.
- Long answers across pages when the question number is written.

**Sends to you instead of guessing**
- An answer it can't find. It never gives a zero for that on its own.
- A page it can't read with confidence.
- What looks like a second attempt at the same answer.
- A mark it can't support with a quote that passes the check.
- Two examiners still apart after two revisions.
- A rubric that fails the checks.
- An answer flagged as illegible, off topic, answering another question, or incompletely read.

**Not yet, and why it matters to you**
- **Drawings and diagrams.** A drawing leaves nothing in the transcript, and the grader never sees the image, so a drawn answer can score low without being flagged.
- **Reading and filing errors pass the second examiner.** The second examiner reads the same transcript as the grader. It checks the marking, not the reading, so a misread word or an answer filed under the wrong question gets through it. Your review of the page is the check for those.
- **Sub-parts across pages.** Each page is read on its own, so a page that starts with a bare "(b)" can be filed under the wrong question. A fix is in progress.
- **Crossed-out words.** One struck word can make the reader drop the whole passage around it. A fix is in progress.
- **Measured accuracy.** We haven't published an accuracy figure because we don't have one yet. The first hand-marked comparison is under way, and the method and every case will be public before any figure is.

---

## Section 7. Questions professors ask first

Heading: Questions professors ask first

**Can it read my students' handwriting?**
It read a neat 31-page answer book well in our one real test (a CBSE Class X Science 2025 model answer, October 2026); we haven't tested untidy handwriting properly yet. Low-confidence pages come to you, and you can correct any transcript.

**Does it give partial credit the way my rubric does?**
Yes, if the rubric says how. Partial-credit levels become part of each criterion, and each criterion can be scored partially. Read the spec before marking starts, and replace it if it's wrong.

**What does it cost per script?**
In our first test, the model costs were about 22 US cents for a 31-page answer book on small OpenAI models, worked out from token counts and list prices for one run. The default Claude models cost more; we haven't measured how much on a real script yet. A trial on one course is free.

**What happens to my students' data?**
Gr8r stores the scripts, page images and marks; your organisation's staff and our team (for support) can open them. Page images go to the page-reading model's provider and text goes to the grading models' providers; by default all of these are Anthropic. No student name is put into a prompt, though anything written on the page goes with its image. There is no automatic deletion yet; we delete on request. The details are on the data page.
Link: Privacy and data

**What if it's wrong?**
Sometimes it will be, and sometimes without a flag. Nothing reaches a student until you approve the sheet, and every override is recorded with your reason.

**Does it mark diagrams?**
No, not yet. Mark questions that need a drawing yourself.

**Is it for university or board examinations?**
It's for assessments you set and mark: internal tests, assignments and mid-terms. It is not for board examinations.

**How long does setup take?**
Upload the question paper and rubric for a draft, import an Excel sheet, or type the questions in; then read each criterion before marking starts. We haven't timed a full setup; we do the first one with you.

**Can I check the method?**
Yes. This page and How it works describe it, and every mark on your course comes with its full record: criteria, quotes and both examiners' rounds. Owners and admins of your organisation can also open the raw input and output of every model call.

**Can it run on open-weight models?**
Yes. Any role can use a model you serve with vLLM or SGLang, and external fallback can be switched off. We haven't measured which open models are good enough for reading handwriting, which is the hardest role, so treat that as something to test.

---

## Closing

Heading: Try it on one course

Body: One test, your rubric, your marks beside Gr8r's marks.

CTA: **Try it on one course**

---

## Claims used

- Each mark cites a criterion and a quote; code checks quote in transcript; one repair then escalation: Proposal 002 §2 decisions 6 and 8, §7; `backend/app/grading/checks.py`; `.claude/CLAUDE.md` (pipeline step 4)
- Rubric becomes a checked spec; invalid spec escalates; teacher can replace it: `backend/app/rubrics/`; `.claude/CLAUDE.md` (pipeline step 2; API `PUT rubric-spec`, 422 on failed checks)
- Partial-credit levels in criteria: `backend/app/rubrics/parser.py` lines 73 to 123
- Pages read in parallel, segments labelled by question, own writing only, crossed-out excluded, unplaced kept, stitching in code: `.claude/CLAUDE.md` (pipeline step 3)
- Grader flags (illegible, off topic, answers another question, incomplete transcription) escalate: `backend/app/grading/schemas.py` (`GRADER_FLAGS`); `.claude/CLAUDE.md` (pipeline step 4)
- Evaluator instructed to score first, grader's marks in the same request (`backend/app/grading/prompts.py` `EVALUATOR_RULES`, `schemas.py` `review_schema`), then reviews; effective agreement; per-criterion tolerance 0.25 of points; revisions accept/reject each point; at most 2 revisions; escalation `evaluator_disagreement`: `.claude/CLAUDE.md` (pipeline step 4, settings); `backend/app/core/config.py` lines 40 to 44; `backend/app/grading/question.py`
- Low OCR confidence, repeated attempts, spot checks escalate with proposed score kept: `.claude/CLAUDE.md` (pipeline step 4)
- Agreement threshold set per exam: `.claude/CLAUDE.md` API table (`grading-settings`)
- Fallbacks avoid each other's model: `.claude/CLAUDE.md` (pipeline step 4)
- Versions never changed in place; model calls recorded with request, response, tokens, cost, latency; images as reference and hash; grade events with actor, reason, before and after; raw bodies for owner/admin: `docs/audit-trail.md`; `docs/pitch/research/sample-sheet-facts.md` ("Audit"); `.claude/CLAUDE.md` API table (`timeline`, `bodies=true`)
- Override, transcript correction regrades, regrade, approve, publish, students see own published only: `.claude/CLAUDE.md` (statuses, API table); `CHANGELOG.md` M6, M7
- Model roles on Claude, OpenAI or open-weight via vLLM/SGLang; fallbacks; external fallback switch: `docs/deploy/open-weight.md`; Proposal 002 §5
- Defaults Opus 5.5 / Sonnet 5.5, not run on this paper: `backend/app/llm/config.py` lines 60 to 63; `docs/pitch/research/sample-sheet-facts.md`
- Open-weight quality not measured: `docs/deploy/open-weight.md` ("an empirical question")
- Second examiner reads same transcript, can't catch reading or filing errors: eval README ("Silent errors"); `docs/v2-backlog.md`
- Drawings, sub-parts across pages, one struck word drops a segment: `docs/v2-backlog.md` (CBSE run items); eval README sections A, C, D
- First test: 31 pages, neat model answer book, about $0.22 from token counts and list prices: eval README ("What happened", "What this says about the product")
- Data handling and providers: `docs/pitch/research/sample-sheet-facts.md`; Proposal 002 §11
- Hand-marked comparison is the next step: eval README ("What this says about the product" point 5)

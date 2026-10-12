# Gr8r pilot offer

Between **[school or coaching centre]** ("the school") and **Graider**, Delhi, India ("Gr8r").

## The pilot

A free pilot of Gr8r on one internal exam for one class, up to about 200 handwritten answer sheets, over four weeks. Gr8r reads each handwritten page, marks each answer against your own marking scheme with a quote from the student's writing as evidence, has a second model check the mark, and sends anything it can't settle to your teacher instead of guessing. No result reaches a student until your teacher has approved it.

Gr8r is for internal exams such as unit tests, pre-boards and mock tests. **It is not for board-exam marking**, and this pilot covers no board exam.

| Exam | Class or batch | Number of sheets (up to about 200) | Start date |
|---|---|---|---|
| ______ | ______ | ______ | ______ |

## What the school provides

The answer sheets, scanned or photographed (PDFs and phone photos both work); the question paper and the marking scheme your teachers use; one teacher's time to review Gr8r's marks in the review queue, change any mark they disagree with (giving a reason) and approve the results; and honest feedback, during the pilot and in a short call at the end. The school also names one contact person.

## What Gr8r provides

**Setup:** we enter the exam and marking scheme, and your teacher checks and confirms it before any sheet is marked; we create logins for your staff.
**Marking:** every sheet in the pilot.
**The review screen:** for each answer, the transcript of the student's writing, the mark for each criterion with its quoted evidence and justification, the second examiner's view, and the reason for anything sent to the teacher.
**A written report** at the end: how many marks your teacher accepted without change, what was changed and why, what was sent for review and why, the time per sheet, and what went wrong.

## Timeline

Week 1: setup, and your teacher confirms the marking scheme. Week 2: sheets are uploaded and marked. Weeks 2 and 3: your teacher reviews and approves. Week 4: the written report and the decision.

## Success criteria

These are agreed in writing, per pilot, before the pilot starts. The defaults below are a proposal; fill in the blanks together.

1. Of the answers Gr8r marks without sending them to the teacher, the teacher accepts at least **___%** of the marks without change. (Suggested range: 75 to 90%.)
2. The teacher's average time per sheet, including review, is under **___ minutes**. (Suggested range: 2 to 5 minutes. To compare, the teacher also times their own marking of ten sheets by hand.)
3. Every answer Gr8r sends for review is reviewed by the teacher. (Gr8r will not let a sheet be approved while any of its answers is waiting for review.)

Other criteria agreed: ____________________________________________

## Data handling

Gr8r keeps the uploaded sheets and their page images as files on the server it runs on, and the transcripts, marks, model calls and teacher actions in its database; encryption at rest and a fixed retention period are planned but not yet built. To read and mark the sheets, page images are sent to the provider of the page-reading model (Anthropic or OpenAI) and the answer text and marking scheme to the providers of the marking and checking models; Gr8r puts no student names into what it sends, but a name written on a page is part of that page's image (providers for this pilot: ______________). Every model can instead run on a self-hosted open-weight model, with a setting that stops any fallback to an outside provider, if the school wants that set-up.

## After the pilot

Conversion date: **______** (the end of week four). On that date the school decides, in writing, one of three things: to continue on a paid basis, priced per answer sheet at a rate agreed then; to put Gr8r into its next budget discussion, with the month and the approver named in writing; or to stop. If the school stops, nothing is owed, and nothing is charged automatically. The pilot is not extended for free.

## Signatures

| For the school | For Graider (Gr8r) |
|---|---|
| Name: ______________ | Name: Kirtan Jain |
| Designation: ______________ | Designation: Co-founder |
| Signature: ______________ | Signature: ______________ |
| Date: ______________ | Date: ______________ |

---
Sources: `docs/pitch/positioning.md` (mechanism, internal exams only, what we do not say, data providers), `docs/pitch/checkpoint-1.md` (pilot terms accepted 2026-10-12, pricing per sheet with no number), `docs/pitch/campaign-plan.md` (written criteria and conversion date), `docs/pitch/research/sample-sheet-facts.md` (storage, encryption and retention not built, who gets page images, external-fallback switch), `.claude/CLAUDE.md` (accepted file types, approval refused while answers need review).

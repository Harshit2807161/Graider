# For investors (`/investors`)

Audience: pre-seed investors. They want to know whether this is a real product with a path to measured accuracy, or a thin layer over a model. The site supports the deck; the deck carries the numbers.
Primary CTA: Talk to the founders.

## H1

Marking handwritten exams, with the teacher in the loop.

## Lede

Gr8r is vertical AI for one job: marking handwritten answer sheets against a school's own marking scheme. The product works end to end today. What it doesn't have yet is a measured accuracy figure, and the work of getting one is under way and will be published in full.

Button: **Talk to the founders**

---

## Section 1. The job

Heading: The job

Body:
Schools, coaching institutes and colleges run their own tests all year: unit tests, pre-boards, mock tests, internal assessments. They are written by hand and marked by the same teachers who teach. Gr8r takes the first pass of that marking, on the institution's own marking scheme, and gives every mark a reason a teacher can check against the page.

The head of the institution buys it and the teacher uses it, but it is the student, and often the parent, who has to accept the result. That is why the product has one fixed rule: no mark reaches a student until a teacher has approved it.

---

## Section 2. Why now

Heading: Why now

Body:
Current models read neat handwriting well: in our one test so far, a small model transcribed a 31-page model answer book and marked it against criteria for about 22 US cents in model costs. Handwritten answer books are also being scanned: in 2026 CBSE moved Class 12 marking on-screen, the rollout drew public complaints about scan quality and portal security, and CBSE said AI was not used to mark papers; teachers marked them.

Our reading of it is that marking is moving onto scans and screens, and that people will expect any automated part to be checkable. We don't sell to boards; Gr8r is for exams that institutions set and mark themselves.

---

## Section 3. What exists

Heading: What exists today

- **A working multi-tenant product.** Organisations, classes, exams, teachers and students with separate roles; upload of PDFs, phone photos and office documents; marking in the background; a review screen for teachers; publishing to students.
- **A method you can audit.** Each mark cites a criterion and a quote from the student's answer, checked in code. A second, different model scores every criterion itself and then reviews the first model's marks; disagreement goes to revision, at most twice, then to a teacher. An answer that can't be found is escalated, never given zero.
- **A full record.** Every model call, every version of every transcript and grade, and every teacher action is stored append-only, so any result can be traced from the published mark back to the page.
- **Not tied to one model vendor.** Every model role can run on Claude, OpenAI or a self-hosted open-weight model, with fallbacks, and a switch stops a self-hosted installation from falling back to outside providers.
- **An evaluation harness.** A script runs a real paper, marking scheme and answer book through the whole product and saves every answer's record for review.

---

## Section 4. What has been measured

Heading: What has been measured, and what hasn't

Body:
One real run so far. We took a CBSE Class X Science 2025 paper, its official marking scheme and a 31-page handwritten answer book that CBSE published as a model answer. Gr8r read every page and marked or escalated 44 answers in about a minute, for about 22 US cents in model costs on small OpenAI models; that is one run in October 2026, with costs worked out from token counts and list prices, not an invoice.

It was a smoke test, not an accuracy measurement. It showed the system holds together on real material, and it showed where marks go wrong: mostly before marking starts, in reading pages and deciding which question a piece of writing belongs to. Some answers got a wrong mark without a flag. We wrote all of this up, and those failures are the first things being fixed.

We publish no accuracy figure until we have a comparison against marks given by hand. When we do, we'll publish the method and caveats with it, and every case, including the wrong marks that were not flagged.

Link: How we will publish results [shown only when `/results` is live]

---

## Section 5. What's next

Heading: What's next

1. **Hand-marked comparison.** Mark the first answer book by hand, then change one thing at a time: a stronger page reader, then the cheap fixes to reading and filing. Add messier, mid-scoring scripts, because a model answer can't show over-marking.
2. **Design partners.** Free four-week pilots with schools and coaching institutes on one exam and one class each, with success criteria written down before we start and a paid-or-stop decision at the end.
3. **Pricing per sheet.** Pilots are free; after a pilot, institutions pay per sheet marked.

---

## Section 6. The ask

Heading: The ask

Body:
We're looking for design partners now and for investors who want to back measured accuracy next. If you know a school, a coaching institute or a professor who would run a pilot, or you'd like to see the deck, talk to us.

CTA: **Talk to the founders**

Below the button: Kirtan Jain, Parth Agarwal and Harshit Dhankhar, Delhi. [Contact email slot]

---

## Claims used

- Product works end to end, multi-tenant, roles, upload formats, background marking, review screen, publishing: `.claude/CLAUDE.md` (project overview, data model, API table); `CHANGELOG.md` M4b to M7, "Student results"
- Method (criterion and quote checked in code, second model, at most two revisions, escalation, no auto-zero): Proposal 002 §2 decisions 6 to 8, §7.3; `backend/app/grading/checks.py`; `backend/app/grading/question.py`; CHANGELOG M5
- Append-only record of calls, versions and actions: `docs/audit-trail.md`; Proposal 002 §8
- Claude, OpenAI or open-weight per role; fallbacks; external-fallback switch: Proposal 002 §5; `docs/deploy/open-weight.md`
- Evaluation harness (`run.py` runs a paper and saves the review data): `docs/evals/cbse-x-science-2025/README.md` ("Run it yourself")
- CBSE OSM 2026 sentence (CONFIRMED, used in the "safe to say" wording): `docs/pitch/research/claims.md` §1
- The CBSE run: 31 pages, 44 answers, about a minute (61 s), about $0.22 on gpt-4.1-mini and gpt-4.1, October 2026, from token counts and list prices: eval README ("What happened")
- Smoke test, marks lost in reading and filing, some wrong without a flag: eval README ("Where the marks went", "Silent errors", "What this says about the product")
- Next steps (hand-mark, one change at a time, messier mid-scoring scripts): eval README ("What this says about the product" point 5)
- Pilot terms and per-sheet pricing with no number: `docs/pitch/checkpoint-1.md` answers 5 and 6
- Founders and city: `docs/pitch/checkpoint-1.md` answers 1 and 2
- "Design partners now, measured accuracy next": `docs/pitch/positioning.md` (audience table, investors row)

# Gr8r positioning

Status: draft for checkpoint 1 (2026-10-12). Everything on the site and in the pitch materials derives from this page. Change it here first.

## The category, in plain words

**AI marking for handwritten answer sheets.**

Not "assessment platform", not "edtech", not "grading copilot". A principal, a professor and an investor all know what an answer sheet is and what marking is. The word "handwritten" is the first filter: if a visitor's exams are typed, this isn't for them, and they should know in two seconds.

## The headline

> **AI marking for handwritten answer sheets. It shows its working.**

"Shows its working" is what a student is told to do in an exam, and it is the one thing Gr8r does that the category doesn't: every mark points to a rubric criterion, a quote from the student's own writing, and a justification, with a second examiner's view and a teacher's sign-off. It is the site's device as well as its headline (see the design brief at checkpoint 2): the quoted-evidence highlight, the examiner's marks in the margin.

Alternatives, if Kirtan prefers a flatter line:
- "Marks handwritten answer sheets. Shows every mark's reason."
- "Handwritten answer sheets, marked criterion by criterion, with the evidence beside every mark."

## The mechanism, in one sentence

> Gr8r reads each handwritten page, awards each mark on your own marking scheme with a quote from the student's answer as evidence, has a second model check the grade, and sends anything it can't settle to the teacher instead of guessing.

Two supporting sentences that may follow it anywhere:
- Nothing is published until a teacher approves it; a teacher can change any mark, with a reason, and every change is kept.
- Every model call, every version of every grade and every teacher action is recorded, so a result can always be traced back.

## What we say to each audience

| Audience | Their question | Our answer | Their next step |
|---|---|---|---|
| **Schools and coaching institutes** (principal, trustee or director, coaching-centre head) | Can this check our unit tests, pre-boards and mock tests faster, on our marking scheme, without a parent-facing disaster? | Marks handwritten sheets against your own marking scheme, criterion by criterion, in about a minute a sheet. Your teachers see every mark with its evidence, change what they disagree with, and sign off before any student sees a result. Internal exams only; we don't touch board marking. | **Request a pilot** on one exam, one class, with written success criteria. |
| **College professors** (one course each, assessments they control) | How does it decide a mark, and can I check it? | Each mark cites a criterion from your rubric and a quote from the student's writing. A second model scores the answer itself before it reviews the first grade, and disagreements come to you. You can read the whole reasoning, override with a reason, and compare its marks with yours. Runs on API models or on open-weight models you host. | **Try it on one course**: one test, your rubric, your marking beside its marking. |
| **Investors** (pre-seed) | Is this a real product with a path to measured accuracy, or a wrapper? | Vertical AI for assessment with the teacher in the loop. A working multi-tenant product, an auditable method (evidence, second examiner, escalation, versions), a cost per sheet in cents, model-agnostic by design, and an evaluation harness being run on real board papers. The ask is design partners now, measured accuracy next. | **Talk to the founders.** The site supports the deck; the deck carries the numbers. |

Order on the site: schools first, professors second, investors third. Depth of method: professors get the most.

## Proof we can show today (every item traceable in the repo)

| Claim | Source |
|---|---|
| Each mark cites a rubric criterion, a quote from the student's answer and a justification; code checks that the quote is in the transcript before a score counts | Proposal 002 §2 decisions 6 and 8; `backend/app/grading/checks.py` |
| A second, different model scores each answer itself first, then reviews the grader's evidence in the same call (it is a check, not a blind second marking); disagreement beyond a threshold goes to revision (at most 2) and then to the teacher | Proposal 002 §2 decision 7; `backend/app/grading/question.py` |
| An answer the system can't find is never given zero automatically; it is escalated. Other escalation reasons: invalid rubric, low reading confidence, repeated attempts, failed checks, grader flags (illegible, off topic), evaluator disagreement | CHANGELOG M5; Proposal 002 §7.3 |
| Teachers can override every criterion's score with a mandatory reason, correct a transcript, approve, unapprove and publish; results are published only after approval; students see only published results | CHANGELOG M6, M7, "Student results" |
| Every model call, every version of every transcript and grade, and every teacher action is stored append-only | `docs/audit-trail.md`; Proposal 002 §8 |
| A real 31-page handwritten CBSE answer book was read and its 44 answers graded or escalated in about a minute (61 s) for about 22 US cents in model costs, on small OpenAI models | `docs/evals/cbse-x-science-2025/README.md` ("What happened", "What this says about the product") |
| Any model role can run on Claude, OpenAI, or a self-hosted open-weight model (vLLM / SGLang), with fallback either way and a switch to forbid external fallback | Proposal 002 §5; `docs/deploy/open-weight.md` |
| Accepts PDFs, photos (JPEG, PNG, HEIC, …; rotation and straightening applied), Word/ODT/PowerPoint; uploads are checked (encrypted PDFs, macros, size caps) before use | `.claude/CLAUDE.md` document intake; `backend/app/ingestion/` |
| "Attempt any one" choice questions are handled: only the attempted alternative is marked, each group counts once | CHANGELOG M5 |
| Marking scheme can be typed, imported from Excel, or extracted from the question paper and marking-scheme PDFs into a draft the teacher confirms | API table in `.claude/CLAUDE.md` (exam documents, drafts) |
| Prompts carry question and answer text only, never student names | Proposal 002 §11 |

## What we do not say (until it is true)

- No accuracy, agreement or "matches teachers X%" figure. The one real run is a smoke test (42/80 on a model answer book, with the marks lost mostly in page reading and filing; four wrong scores unflagged). Design the slot on a results page; publish nothing there until a hand-marked comparison exists.
- No customer names, logos, testimonials, user counts, "trusted by", or certifications (no ISO, SOC 2, or DPDP compliance claim).
- No "reads diagrams": drawings leave nothing in the transcript today and a drawn answer can score 0 without a flag (backlog, CBSE run). Until the fix lands, the limitations section must say drawings are not marked and go to the teacher, and the launch check must confirm which is true.
- No "any language" or "Hindi handwriting" claim until it has been tried on real Hindi sheets. The question is on Kirtan's list.
- No board-exam marking. Internal exams, unit tests, pre-boards, mock tests, college internal assessments.
- No price. Cost per sheet in model costs is a fact we can show with its source; a price is Kirtan's call (checkpoint 1).
- No encryption-at-rest, retention-period, deletion or erasure claim: none exists in the product today (soft delete only; files stay on disk). The privacy page says what is true and lists these as planned, not done.
- No "student data never leaves your servers": true only on the fully self-hosted profile. By default page images go to the vision model's provider (Anthropic or OpenAI); text goes to the grader's and evaluator's providers. Say exactly that.
- No "replaces teachers" or "saves X hours": no measurement yet. "About a minute a sheet" is a measured fact about one run; say it as that.

## The honest section ("What it does well today, and what it sends to you")

Every audience page carries this, written for that audience. It is a feature, not a disclaimer: of the competitors surveyed only CoGrader publishes limitations, none offers a graded sheet a visitor can inspect, and no Indian competitor surveyed publishes a method (one publishes a per-page price) (`research/claims.md` §6).

Does well today: clean handwriting; answers in text; multiple-choice (19 of 20 correct in the real run); marking schemes with point-wise criteria; choice questions; long answers that run across pages when the question number is written.

Sends to you (escalates) rather than guessing: an answer it can't find; a page it can't read confidently; an answer written twice; a mark it can't support with a quote; two examiners that still disagree after two rounds; an invalid rubric; anything the grader flags as illegible or off topic.

Not yet: drawings and diagrams; answer books where sub-parts continue across pages without a number (being fixed); measured accuracy against teachers (being measured). Hindi and regional languages: untested.

## Tone and words

- Indian English: marks, marking scheme, answer sheet, answer book, checking (in schools' own words), "attempt any one". British spelling.
- Plain sentences, specific nouns, no superlatives, no "revolutionise", no "seamless", no "AI-powered" as a brag.
- Say "a teacher" and "your teachers", not "educators". Say "the student's writing", not "content".
- Numbers always with their source and their caveat in the same breath.
- The name is Gr8r (read "grader"). Lower case r's; no tagline attached to the logo.

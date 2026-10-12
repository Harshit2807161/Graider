# Privacy and data (`/privacy`)

Audience: a principal, a school's administrator or IT person, a parent who asks, a professor. They want to know what happens to answer sheets and student details, in words they can check.
Primary CTA: none.

## H1

What happens to your answer sheets

## Lede

This page says what Gr8r stores, where, who can see it, which outside companies process it, and how long it is kept. It describes the product as it is built today, including what it doesn't do yet.

Notice box (top of page):
This page describes Gr8r as built on [date of publishing]. A lawyer will review it before we make any statement about compliance with any law. We make no compliance or certification claim here.

---

## Section 1. What Gr8r stores

Heading: What Gr8r stores, and where

| What | Examples | Where it is kept |
|---|---|---|
| Accounts | Name, email address, role in your organisation; passwords are stored only as a one-way hash | Gr8r's database |
| Student details | Name, email address, and any extra details your organisation adds, such as a roll number; the classes each student is in | Gr8r's database |
| Exams | Questions, marking schemes, the criteria Gr8r made from them, and every earlier version of those criteria | Gr8r's database |
| Exam documents | Question papers, marking schemes and blank copies you upload | Files on Gr8r's server disk |
| Answer sheets | The files you upload, as uploaded | Files on Gr8r's server disk |
| Page images | Each page of an answer sheet as an image, made from the upload | Files on Gr8r's server disk; any text found in a digital file is kept in the database |
| Transcripts and marks | The text Gr8r read from each answer, the marks, quoted evidence, reasons, feedback, both examiners' rounds, and every earlier version | Gr8r's database |
| Teacher actions | Changes to marks, corrected transcripts, approvals and publishing, each with who did it, when, the reason, and the before and after | Gr8r's database |
| Model call records | For each call to a model: what was sent, what came back, the model, tokens, cost and time. Page images are recorded as a reference and a fingerprint, not stored a second time | Gr8r's database |

Where the servers are: [slot: hosting provider and region, to be filled in before the first pilot].

What Gr8r doesn't do today: it doesn't encrypt the files or the database itself. Whether the disks are encrypted depends on the server they run on, and we'll state that here once the hosting is fixed.

---

## Section 2. Who can see it

Heading: Who can see a student's answer sheet

| Who | What they can see | When |
|---|---|---|
| Teachers, administrators and owners in your organisation on Gr8r (for example class teachers, heads of department, the exam cell, the principal) | Every exam, answer sheet, page image, transcript, mark and history in your organisation. Access is by organisation, not by class: a teacher can open any class's sheets in your organisation | Always |
| Owners and administrators of your organisation | In addition, the full inputs and outputs of each model call, from a sheet's timeline | Always |
| The student, if your organisation gives them an account | Their own results only: marks, feedback and the images of their own pages. Not the transcripts or the examiners' discussion | Only after a teacher approves the sheet and the exam's results are published |
| Parents | Nothing. Gr8r has no parent accounts | Never |
| Other schools and organisations on Gr8r | Nothing from your organisation | Never |
| Gr8r's team | Gr8r's administrator account can open any organisation's data, for support. People who run the servers can read the database and files | [slot: who on the team has this access, and how it is logged] |
| Model providers | What each model needs for its step (see the next table) | While marking |

Page images are sent to browsers with instructions not to cache them.

---

## Section 3. Which outside companies process what

Heading: Which model providers see what

Gr8r uses AI models from outside companies for four steps. Which company runs each step is a setting of the Gr8r installation, not of each school; by default all four are Anthropic. On our hosted service, ask us which providers your pilot will use.

| Step | What is sent | Default provider | Other options |
|---|---|---|---|
| Reading pages | Images of the answer-sheet pages, the question labels, and the start of each question's text. Also the pages of a question paper or marking scheme you upload to build an exam | Anthropic | OpenAI, or a model you host |
| Reading marking schemes | Question text and marking-scheme text | Anthropic | OpenAI, or a model you host |
| Marking | The question, the marking criteria and the transcript of the student's answer | Anthropic | OpenAI, or a model you host |
| Second examiner | The same, plus the first model's marks | Anthropic | OpenAI, or a model you host |

- **Names stay out of prompts.** Gr8r never puts a student's name, email or roll number into a prompt. A page image is sent as it is, though, so anything written on the page, such as a name on the cover, goes with it.
- **Fallbacks.** If a model fails, Gr8r can try another, which may be at another provider. Every attempt is recorded. On a self-hosted installation, a setting stops any fallback to an outside provider.
- **How long providers keep it.** Each provider keeps what it receives under its own terms for API customers. [slot: links to Anthropic's and OpenAI's API data terms, and any agreement we have with them; confirm before publishing.]

---

## Section 4. How long it is kept

Heading: How long it is kept, and how to delete it

| | Today |
|---|---|
| Automatic deletion | None. Gr8r doesn't delete anything automatically today |
| Deleting in the app | Deleting an exam or a class in Gr8r hides it. The records stay in the database and the files stay on disk |
| Deletion on request | Your organisation's owner can ask us to delete your organisation's data, and we delete it. Until then, files stay on disk |
| Model call records and versions | Kept as a permanent record by design; deleting them is part of a deletion request |

Not built yet, and planned:
- retention periods and automatic deletion;
- deleting or exporting one student's data on request, from within Gr8r;
- a log of who viewed which sheet;
- encryption of files and records by Gr8r itself.

Until these exist, we won't say that Gr8r has them.

---

## Section 5. Running Gr8r on your own servers

Heading: Running Gr8r on your own servers

Body:
Gr8r can be installed on your own servers, with every model step run on open-weight models you host. With fallback to outside providers switched off, page images and text stay on your servers. We haven't yet measured how well open-weight models read handwriting and mark, so this option needs testing before you rely on it.

---

## Section 6. Tracing

Heading: The optional tracing tool

Body:
Gr8r can send a trace of each marking run to Langfuse, a tool for inspecting model calls. It is off unless it is set up. When it is on, page images are masked and never sent; text is sent, including transcripts, marking schemes and feedback. Langfuse can be self-hosted or used from its EU cloud. [slot: whether tracing is on for the hosted service; if it is, name where it runs.]

---

## Section 7. This website

Heading: This website

| What | Who processes it | Why |
|---|---|---|
| The pilot request form | Resend, which emails it to us | So we can reply to you |
| The bot check on the form | Cloudflare Turnstile | To stop spam |
| Hosting this site | [slot: hosting provider] | To serve the pages |

What you send through the form is used only to reply about a pilot. It doesn't go into Gr8r. [slot: whether the site uses cookies or analytics; if none, say "This site sets no cookies and runs no analytics."]

---

## Section 8. Questions and requests

Heading: Questions and requests

Body: For a question about your data, or to ask us to delete it, write to [contact email]. Graider, Delhi, India.

---

## Claims used

- Users: email, full name, hashed password (bcrypt); memberships with role and `profile_data` (e.g. roll number); enrolments: `backend/app/models/user.py` lines 15 to 50; `.claude/CLAUDE.md` (auth, data model)
- Exams, criteria versions: `.claude/CLAUDE.md` (data model, `rubric_specs` append-only)
- Uploads and page images on disk under `UPLOAD_DIR`; everything else in Postgres: `docs/pitch/research/sample-sheet-facts.md` ("Storage"); `.claude/CLAUDE.md` (files, `DocumentPage` text layer)
- Transcripts, grades, rounds, versions; grade events with actor, reason, before and after; `llm_calls` with request, response, tokens, cost, latency, images as reference and hash: `docs/audit-trail.md`; `.claude/CLAUDE.md` (data model)
- No encryption at rest, retention, purge, per-student erasure or export, read logging; soft deletes; files stay on disk: `docs/pitch/research/sample-sheet-facts.md` ("Not built"); `docs/audit-trail.md` (planned retention and erasure)
- Staff roles (owner, admin, teacher) see the organisation's data; no per-class restriction: `backend/app/api/deps.py` (`STAFF_ROLES`, `require_org_role`); `backend/app/api/v1/endpoints/submissions.py`
- Raw model bodies for owner/admin: `.claude/CLAUDE.md` API table (`timeline`, `bodies=true`)
- Students see own published results, marks, feedback, own page images: `.claude/CLAUDE.md` (statuses, API table); `CHANGELOG.md` "Student results"
- No parent role: `backend/app/models/user.py` (`Role`: owner, admin, teacher, student)
- Organisations isolated: `.claude/CLAUDE.md` (tests: tenant isolation in `test_api.py`, `test_review.py`)
- Superuser can access every organisation: `backend/app/api/deps.py` line 83; `.claude/CLAUDE.md` API table (`GET /orgs/` superuser: all)
- Page images `Cache-Control: private, no-store`: `docs/pitch/research/sample-sheet-facts.md` ("Storage")
- Model roles, defaults all Anthropic, alternatives OpenAI or self-hosted: `backend/app/llm/config.py` lines 60 to 63; `docs/deploy/open-weight.md`
- Page reader gets question labels and first 200 characters of each question: eval README section A; `backend/app/grading/prompts.py`
- Exam documents read by a model to build drafts: `.claude/CLAUDE.md` (`exam_drafts/`)
- Names never in prompts: Proposal 002 §11
- Fallbacks recorded; external fallback switch: Proposal 002 §11; `backend/app/llm/config.py` line 66
- Self-hosted profile keeps data local unless fallback configured; open-weight quality unmeasured: `docs/deploy/open-weight.md` (profile C, section 1)
- Langfuse optional, images masked, text sent, self-hosted or EU cloud: `docs/observability.md` line 102; `docs/pitch/research/sample-sheet-facts.md`
- Resend for the form, Turnstile: `docs/pitch/checkpoint-1.md` item 12 and answer 12
- Graider, Delhi: `docs/pitch/checkpoint-1.md` answer 2

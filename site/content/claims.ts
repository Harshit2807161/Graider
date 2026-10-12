import type { Claim } from "./types";

/** Every factual claim the site makes, with where it comes from (a repo path or a URL).
 *  Add a claim here before using it in copy. Sources from docs/pitch/copy/*.md ("Claims used"). */
export const claims: Claim[] = [
    {
        id: "mechanism",
        text: "Reads each page, marks each point of the marking scheme with a quote as evidence, has a second model check the grade, sends what it can't settle to the teacher.",
        source: "docs/pitch/positioning.md (\"The mechanism, in one sentence\")",
    },
    {
        id: "approval",
        text: "Nothing is published until a teacher approves it; a teacher can change any mark with a reason; every change is kept.",
        source: "CHANGELOG.md M6, M7, \"Student results\"",
    },
    {
        id: "quote-check",
        text: "A mark above zero needs a quote, and the quote must be in the student's answer, or the mark doesn't count.",
        source: "backend/app/grading/checks.py; Proposal 002 §2 decisions 6 and 8",
    },
    {
        id: "second-examiner",
        text: "A second, different model scores the answer itself, then reviews the first model's marks; still apart after two revisions, the answer goes to the teacher.",
        source: "backend/app/grading/question.py; backend/app/grading/prompts.py (EVALUATOR_RULES)",
    },
    {
        id: "never-auto-zero",
        text: "A missing answer is never given zero automatically; the escalation reasons listed on the home page.",
        source: "CHANGELOG.md M5; backend/app/models/grading.py (EscalationReason); backend/app/grading/schemas.py (GRADER_FLAGS)",
    },
    {
        id: "cbse-run",
        text: "One 31-page answer book read and graded in about a minute (61 s) for about 22 US cents in model costs; 15 answers sent to the teacher.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"What happened\", \"Grading\")",
    },
    {
        id: "sample-errors",
        text: "Q35(a): the vasectomy line was read as crossed out (0/1 against the CBSE examiner's tick); the ovary point was credited without the hormones; escalated as several attempts because of a page break.",
        source: "docs/evals/cbse-x-science-2025/runs/2026-10-11-gpt-4.1-mini/review.json (35(a)); eval README sections A and D",
    },
    {
        id: "q21-misread",
        text: "Q21: the transcript line \"1/v = 5 / 2\" misreads a cancelled fraction; no point relied on it.",
        source: "review.json (label 21); answer_book.pdf page 4",
    },
    {
        id: "choice-questions",
        text: "\"Attempt any one\": only the attempted alternative is marked and the question counts once; the exam's setting picks the better or the first if both are answered.",
        source: "CHANGELOG.md M5; .claude/CLAUDE.md (choice_policy); review.json (24(a), 24(b))",
    },
    {
        id: "not-yet",
        text: "Drawings leave nothing in the transcript; sub-parts continued on a new page without a number can be mis-filed; no accuracy measurement yet.",
        source: "docs/v2-backlog.md; docs/evals/cbse-x-science-2025/README.md sections A and C",
    },
    {
        id: "pilot",
        text: "The pilot is free: one exam, one class, four weeks, success criteria agreed in writing, then per-sheet pricing or stop.",
        source: "docs/pitch/checkpoint-1.md answers 5 and 6",
    },
    {
        id: "pilot-terms",
        text: "Pilot terms on /pilot: up to about 200 sheets, setup with a teacher checking the marking points, logins, two review sessions, a written report, a contact person; at the end continue paid per sheet, put Gr8r into the next budget discussion with the month and approver named, or stop with nothing owed.",
        source: "docs/pitch/materials/pilot-offer.md; docs/pitch/checkpoint-1.md item 5 and answer 5 (two review sessions); docs/pitch/copy/pilot.md",
    },
    {
        id: "pilot-form",
        text: "The pilot form is emailed through Resend and checked by Cloudflare Turnstile; nothing from it goes into Gr8r.",
        source: "site/worker/README.md; site/worker/src/index.ts (nothing stored, the email is the record)",
    },

    // ----- The CBSE test run and the sample (docs/evals/cbse-x-science-2025/) -----
    {
        id: "cbse-source",
        text: "The sample answer book is from CBSE's Class X Science 2025 exam (set 31/1/3); CBSE published it as a model answer; the question paper, marking scheme and answer book are public on cbse.gov.in.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"Files\")",
    },
    {
        id: "cbse-run-setup",
        text: "The run was on 11 October 2026 with gpt-4.1-mini (page reading, rubric parsing, grading) and gpt-4.1 (second examiner); the defaults are larger Claude models that have not been run on this paper; costs come from token counts and list prices, not an invoice.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"Setup\", \"What happened\"); docs/evals/cbse-x-science-2025/runs/2026-10-11-gpt-4.1-mini/review.json (created_at, grader_model, evaluator_model); docs/pitch/research/sample-sheet-facts.md (\"Facts and their sources\")",
    },
    {
        id: "run-44-answers",
        text: "The run produced 44 graded or escalated answers: 29 graded without review and 15 sent to the teacher (6 repeated attempts, 5 failed checks, 3 no answer found, 1 off topic); 7 alternatives were not attempted.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"Grading\" table); runs/2026-10-11-gpt-4.1-mini/results.csv",
    },
    {
        id: "smoke-test",
        text: "The run was a smoke test, not an accuracy measurement: most marks were lost before grading (reading pages, filing answers under questions), and four written answers were graded wrong without a flag.",
        source: "docs/evals/cbse-x-science-2025/README.md (intro, \"Where the marks went\", \"Silent errors\", \"What this says about the product\")",
    },
    {
        id: "no-sound-escalation",
        text: "None of the 15 answers sent to the teacher in the run went for a sound reason: each traces to a filing error, the evidence-check bug or the struck-word bug.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"Where the marks went\" A, B, D, with results.csv); docs/pitch/research/sample-sheet-facts.md; docs/pitch/checkpoint-1.md item 7",
    },
    {
        id: "mcq-run",
        text: "19 of the 20 multiple-choice answers were graded without review, all correct; the 20th was sent to the teacher for a failed evidence check.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"Grading\" table); runs/2026-10-11-gpt-4.1-mini/results.csv (label 2)",
    },
    {
        id: "q21-marks",
        text: "Q21 is worth 2 marks in three points (0.5, 0.5, 1); grader and second examiner gave 2/2 and agreed in the first round; both gave the half mark for the signs because they are right in the first equation.",
        source: "runs/2026-10-11-gpt-4.1-mini/review.json (label 21, grade.rounds[0])",
    },
    {
        id: "q24-marks",
        text: "Q24 is \"attempt any one\": (a) blood clotting or (b) transport in plants; the student answered (b) on scanned page 7 (printed page 8), two points of one mark each, 2/2; (a) is not attempted and does not count.",
        source: "runs/2026-10-11-gpt-4.1-mini/review.json (labels 24(a), 24(b)); site/public/sample/pages/p07.webp",
    },
    {
        id: "q35a-rounds",
        text: "Q35(a) (five points, one mark each, across scanned pages 23 and 24): grader 3, then 3.5, then 4; second examiner 3.5, then 4, then 4; the uterus point moved 0, 0.5, 1; settled at 4/5 after three rounds.",
        source: "runs/2026-10-11-gpt-4.1-mini/review.json (label 35(a), grade.rounds); docs/pitch/research/sample-sheet-facts.md",
    },
    {
        id: "q35a-escalation",
        text: "Q35(a) was sent to the teacher as \"Several attempts at this answer\"; the reader took the move from page 23 to page 24 for a second attempt; the same fault sent other answers (26, 28, 29, 30, 37(c)(ii)) to the teacher.",
        source: "runs/2026-10-11-gpt-4.1-mini/review.json (35(a) escalation_reason); docs/evals/cbse-x-science-2025/README.md (section A, \"two were page breaks only (28, 35(a))\")",
    },
    {
        id: "neat-handwriting",
        text: "A small model read the neat 31-page answer book well; untidy handwriting has not been tested properly.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"What this says about the product\" points 2 and 5); docs/v2-backlog.md ([M4b] real handwriting, photo)",
    },
    {
        id: "reading-limits",
        text: "Reading limits seen in the run: one struck word can drop the whole segment around it; a booklet's printed page number can be read as a question number; the second examiner reads the same transcript as the grader so it cannot catch reading or filing errors; drawings leave nothing in the transcript and the grader never sees the image.",
        source: "docs/evals/cbse-x-science-2025/README.md (sections A, C, D, \"Silent errors\"); docs/v2-backlog.md (CBSE run items)",
    },
    {
        id: "draft-unusable",
        text: "Drafting the exam from the question-paper and marking-scheme PDFs did not work on the bilingual board paper; the questions were entered from the paper's text instead.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"Extraction did not survive a bilingual paper\")",
    },
    {
        id: "next-steps-plan",
        text: "Planned next: hand-mark the first answer book from the examiner's ticks, then change one thing at a time (stronger reader, then cheap fixes), and add mid-scoring, messier scripts; teacher-marked sets with per-question marks exist (a Mendeley exam set, CC BY 4.0).",
        source: "docs/evals/cbse-x-science-2025/README.md (\"What this says about the product\" point 5)",
    },
    {
        id: "cbse-osm-2026",
        text: "In 2026 CBSE moved Class 12 marking on-screen, the rollout drew public complaints about scan quality and portal security, and CBSE said AI was not used to mark papers; teachers marked them.",
        source: "docs/pitch/research/claims.md section 1 (CONFIRMED, \"Safe to say publicly\"); https://www.businesstoday.in/india/story/ai-was-not-used-cbse-defends-digital-marking-amid-class-12-result-row-531878-2026-05-17",
    },
    {
        id: "default-cost",
        text: "The default Claude models cost more per token than the small OpenAI models used in the run.",
        source: "backend/app/llm/costs.py (lines 14-15: Opus 5.5 4/20, Sonnet 5.5 2/10 USD per million tokens); backend/.env.example (line 104: gpt-4.1-mini 0.40/1.60, gpt-4.1 2/8)",
    },

    // ----- Setting up an exam and uploading sheets -----
    {
        id: "exam-entry",
        text: "A teacher enters questions and marking scheme by typing, by Excel import, or by drafting from the question paper and marking-scheme PDFs, then corrects and confirms the draft; questions keep the paper's labels (2(b)) and choice groups are grouped so one alternative counts.",
        source: ".claude/CLAUDE.md (API table: /exams/{id}/questions, /questions/upload, /drafts); CHANGELOG.md M4c",
    },
    {
        id: "rubric-checks",
        text: "Each marking scheme becomes a list of criteria with points; code checks that every criterion has a description and points above zero and that they add up to the question's marks; a question whose list fails is not marked and its answers go to the teacher; a teacher can read and replace the list.",
        source: "backend/app/rubrics/validate.py (lines 14-51); backend/app/grading/question.py (lines 169-170); .claude/CLAUDE.md (API: rubric-spec, 422 on failed checks)",
    },
    {
        id: "partial-credit",
        text: "Levels of credit (\"half marks if only the formula is given\") are kept as notes of one criterion, written as exact points.",
        source: "backend/app/rubrics/parser.py (SYSTEM_PROMPT rule 3, lines 121-124)",
    },
    {
        id: "upload-formats",
        text: "A student's answers can be one file or several: PDF, phone photos (JPEG, PNG, WebP, HEIC, TIFF, GIF, BMP), Word, ODT, RTF, PowerPoint or text; Word, ODT, RTF and PowerPoint need the sandboxed converter to be set up.",
        source: "CHANGELOG.md M4b; .claude/CLAUDE.md (Document intake); backend/.env.example (GOTENBERG_URL)",
    },
    {
        id: "upload-safety",
        text: "Each upload is identified by its contents, not its name; encrypted PDFs, files with macros, and files over the size, page or pixel limits are refused.",
        source: "CHANGELOG.md M4b; .claude/CLAUDE.md (Document intake)",
    },
    {
        id: "photo-handling",
        text: "Phone photos of a page are straightened and turned upright using their orientation metadata; a photo rotated 90 or 180 degrees without that metadata is not turned upright.",
        source: "CHANGELOG.md M4b; docs/v2-backlog.md ([M4b] photos rotated without EXIF)",
    },

    // ----- How a mark is made -----
    {
        id: "page-reading",
        text: "A vision model reads every page (in parallel), copies only the student's writing, labels each piece with the question it answers from the paper's own labels, and notes its confidence and what is crossed out.",
        source: "backend/app/grading/prompts.py (TRANSCRIBE_SYSTEM, lines 31-47); backend/app/grading/schemas.py (page_answers_schema, lines 16-32); .claude/CLAUDE.md (pipeline step 3)",
    },
    {
        id: "stitching",
        text: "In code, an unnumbered continuation joins the answer before it (across pages), crossed-out work is left out of the answer, and writing that can't be placed is kept and shown to the teacher.",
        source: "backend/app/grading/stitch.py; frontend/app/dashboard/exams/[id]/submissions/[submissionId]/page.tsx (unassigned_segments shown)",
    },
    {
        id: "grader-checks",
        text: "The grader scores each criterion with quoted evidence and a justification; code checks every criterion is scored once, within its points, with a quote found in the answer for any score above zero; one repair is allowed, then the answer goes to the teacher. A criterion scored zero has no quote.",
        source: "backend/app/grading/checks.py (lines 22-57); backend/app/grading/question.py (lines 115-129); backend/app/grading/prompts.py (GRADER_RULES, lines 61-62)",
    },
    {
        id: "grader-flags",
        text: "The grader can flag an answer as illegible, off topic, answering another question, or incompletely transcribed; a flag sends it to the teacher with no mark.",
        source: "backend/app/grading/schemas.py (line 8); backend/app/grading/question.py (lines 131-135)",
    },
    {
        id: "agreement-rule",
        text: "The two examiners agree only if their totals are close enough (the exam sets the threshold, 0.5 to 1) and no single criterion is more than a quarter of its points apart; after at most two revisions, an answer still in dispute goes to the teacher with both positions.",
        source: "backend/app/grading/checks.py (lines 86-104); backend/app/grading/question.py (lines 175-196); backend/app/core/config.py (lines 16-18); .claude/CLAUDE.md (API: grading-settings)",
    },
    {
        id: "examiner-not-blind",
        text: "The second examiner is told to score every criterion itself first, but the grader's marks are in the same request; its own scores are stored apart from its review; it reads the same transcript as the grader.",
        source: "backend/app/grading/prompts.py (EVALUATOR_RULES, lines 88-96); backend/app/grading/question.py (lines 137-142); backend/app/grading/schemas.py (review_schema); docs/v2-backlog.md (Site review item)",
    },
    {
        id: "revision-replies",
        text: "In a revision the grader accepts or rejects each of the second examiner's points with a rationale; a rejected point must leave that score unchanged.",
        source: "backend/app/grading/schemas.py (revision_schema); backend/app/grading/prompts.py (REVISION_RULES); backend/app/grading/checks.py (check_replies, check_rejections)",
    },
    {
        id: "escalation-wording",
        text: "The teacher sees each escalation in these words: No answer found on the pages; The rubric isn't ready; Handwriting hard to read; Several attempts at this answer; The grade failed the checks; The two examiners disagree; The AI couldn't grade it; Random spot check; Grader: illegible / off topic / answers another question / transcript looks incomplete.",
        source: "frontend/types/review.types.ts (ESCALATION_TEXT, lines 184-197)",
    },
    {
        id: "escalation-proposals",
        text: "No mark is proposed for no answer, an invalid rubric, failed checks, a grader flag or all models failing; the proposed mark is kept for low reading confidence, repeated attempts, a spot check and examiner disagreement.",
        source: "backend/app/grading/question.py (lines 164-211); docs/proposals/002-grading-v2-architecture.md (7.3a)",
    },
    {
        id: "run-failure",
        text: "A whole sheet fails only if its pages can't be read, the cost or call limit runs out, or the exam has no questions; Gr8r never records a made-up mark.",
        source: ".claude/CLAUDE.md (Grading pipeline, failure rules); docs/proposals/002-grading-v2-architecture.md (7.4)",
    },
    {
        id: "spot-check",
        text: "An optional random sample of graded answers can be sent to the teacher anyway; the rate is set per exam and is 0 by default.",
        source: "backend/app/grading/question.py (lines 34-46, 209-210); backend/app/core/config.py (line 20); docs/proposals/002-grading-v2-architecture.md (decision 13)",
    },

    // ----- Models -----
    {
        id: "model-defaults",
        text: "Defaults: Claude Opus 5.5 for the page reader, rubric reader and second examiner; Claude Sonnet 5.5 for the grader.",
        source: "backend/app/llm/config.py (lines 60-63)",
    },
    {
        id: "model-providers",
        text: "Each model role can run on Claude, OpenAI, or an open-weight model you host (vLLM or SGLang); switching is configuration; fallbacks are optional; a setting stops a self-hosted model falling back to an outside API.",
        source: "docs/deploy/open-weight.md (intro, sections 1 and 4); backend/.env.example (lines 29-31); backend/app/llm/config.py (lines 24, 65)",
    },
    {
        id: "fallback-independence",
        text: "The grader's fallbacks never use the second examiner's model and the other way round.",
        source: "backend/app/grading/question.py (lines 116-120, 140); docs/deploy/open-weight.md (section 4)",
    },
    {
        id: "open-weight-unmeasured",
        text: "Which open-weight models are good enough for each role, handwriting reading above all, has not been measured.",
        source: "docs/deploy/open-weight.md (section 1, \"an empirical question\")",
    },
    {
        id: "images-to-reader-only",
        text: "Only the page reader is sent page images (and the same role reads uploaded question papers and marking schemes to build a draft); the rubric reader, grader and second examiner work from text.",
        source: "backend/app/grading/transcribe.py (lines 34-41); backend/app/exam_drafts/extract.py (line 99); backend/app/rubrics/parser.py (line 152); backend/app/grading/question.py",
    },
    {
        id: "no-names-in-prompts",
        text: "Prompts carry question and answer text only, never student names, emails or roll numbers; a page image goes as it is, so anything written on the page goes with it. The page reader is given each question's label and its first 200 characters.",
        source: "docs/proposals/002-grading-v2-architecture.md (section 11); backend/app/grading/prompts.py (transcribe_prompt, line 51); docs/evals/cbse-x-science-2025/README.md (section A)",
    },

    // ----- Teacher actions, students, record -----
    {
        id: "teacher-actions",
        text: "A teacher can accept an escalated answer's proposed mark, set every criterion's score (reason required; same checks as the model's), correct a transcript (reason required; that answer is marked again), or have a sheet marked again.",
        source: "CHANGELOG.md M6; .claude/CLAUDE.md (API: override, resolve, transcript, regrade)",
    },
    {
        id: "approve-publish",
        text: "A sheet can't be approved while any answer on it needs review; publishing is for the whole exam's approved sheets; a student sees only their own published results: marks, feedback and their own pages, not transcripts or the examiners' discussion.",
        source: ".claude/CLAUDE.md (statuses, API table); CHANGELOG.md M6 (Fixed), \"Student results\"",
    },
    {
        id: "review-queue",
        text: "Teachers see answers needing review first.",
        source: ".claude/CLAUDE.md (API: /exams/{id}/review-queue, escalated first)",
    },
    {
        id: "versions-kept",
        text: "Transcripts and grades are saved as versions and never changed afterwards; a correction or regrade adds a new version and the earlier ones stay readable.",
        source: ".claude/CLAUDE.md (Data model); docs/proposals/002-grading-v2-architecture.md (8.2)",
    },
    {
        id: "audit-record",
        text: "Each run records the models, settings and code version; each model call records what was sent, what came back, tokens, cost and time (page images as a reference and SHA-256 fingerprint); teacher actions record who, when, why, before and after; if an audit row can't be written the run fails.",
        source: "docs/audit-trail.md (\"What is recorded\", \"Fail closed\"); CHANGELOG.md M3; .claude/CLAUDE.md (Data model: GradeEvent)",
    },
    {
        id: "raw-bodies",
        text: "Owners and admins can open the raw inputs and outputs of each model call from a sheet's timeline.",
        source: "backend/app/api/v1/endpoints/review.py (lines 272-282); .claude/CLAUDE.md (API: timeline, bodies=true)",
    },
    {
        id: "product-scope",
        text: "The product is a multi-tenant web app with organisations, classes, exams and the roles owner, admin, teacher and student; marking runs in the background; there are no parent accounts.",
        source: ".claude/CLAUDE.md (Project overview, Data model); backend/app/core/constants.py (Role)",
    },

    // ----- Data handling (privacy page) -----
    {
        id: "data-stored",
        text: "Accounts (name, email, role; password stored only as a bcrypt hash), student details (including profile data such as a roll number), exams and criteria versions, transcripts, marks, teacher actions and model-call records are in the database; exam documents, uploads and page images are files on the server disk, with a digital file's text layer in the database.",
        source: "backend/app/models/user.py (lines 15-50); backend/app/core/security.py; .claude/CLAUDE.md (Files, Data model); docs/pitch/research/sample-sheet-facts.md (\"Storage\")",
    },
    {
        id: "access-rules",
        text: "Teachers, admins and owners can open every sheet in their organisation (access is by organisation, not by class); Gr8r's administrator account can open any organisation's data; other organisations see nothing of yours.",
        source: "backend/app/api/deps.py (lines 21, 69-89); backend/app/api/v1/endpoints/review.py (line 55); .claude/CLAUDE.md (Testing: tenant isolation)",
    },
    {
        id: "no-read-log",
        text: "Gr8r does not yet log who viewed which sheet.",
        source: "docs/audit-trail.md (\"Deliberately not done yet\"); docs/pitch/research/sample-sheet-facts.md (\"Not built\")",
    },
    {
        id: "page-no-cache",
        text: "Page images are served with Cache-Control: private, no-store.",
        source: "backend/app/api/v1/endpoints/review.py (line 269)",
    },
    {
        id: "provider-defaults",
        text: "By default all four model steps use Anthropic; which company runs each step is an installation setting.",
        source: "backend/app/llm/config.py (lines 60-63); docs/deploy/open-weight.md (section 1)",
    },
    {
        id: "retention-gaps",
        text: "Not built: encryption of files and records by Gr8r itself, retention periods and automatic deletion, per-student export or deletion, read logging. Deleting an exam or class only hides it; the records stay in the database and the files stay on disk.",
        source: "docs/audit-trail.md (\"Deliberately not done yet\"); docs/pitch/research/sample-sheet-facts.md (\"Not built\"); backend/app/crud/base.py (lines 73-77)",
    },
    {
        id: "append-only-record",
        text: "Model-call records, transcript and grade versions and teacher actions are append-only by design (database triggers).",
        source: "docs/proposals/002-grading-v2-architecture.md (8.2); docs/audit-trail.md",
    },
    {
        id: "self-hosted-egress",
        text: "Gr8r can be installed on your own servers with every step on open-weight models; with external fallback switched off, page images and text stay on your servers.",
        source: "docs/deploy/open-weight.md (sections 1 and 4); backend/app/llm/config.py (line 65)",
    },
    {
        id: "langfuse-optional",
        text: "Langfuse tracing is off unless configured; when on, page images are masked and never sent, text (transcripts, marking schemes, feedback) is sent; Langfuse can be self-hosted or used from its EU cloud.",
        source: "docs/observability.md (Privacy, lines 100-107); docs/proposals/002-grading-v2-architecture.md (8.3); backend/app/core/config.py (lines 23-27)",
    },

    // ----- Company and people -----
    {
        id: "company",
        text: "Gr8r (read \"grader\") is made by Graider, based in Delhi, India.",
        source: "docs/pitch/checkpoint-1.md (answer 2); docs/pitch/positioning.md (\"Tone and words\")",
    },
    {
        id: "founders",
        text: "Founders: Kirtan Jain, Parth Agarwal and Harshit Dhankhar, all IIT Patna graduates of 2025, with the education and work listed on /about.",
        source: "docs/pitch/founders.md; docs/pitch/checkpoint-1.md (answer 1). Founders' paragraphs await Kirtan's approval; see docs/pitch/claims-register.md for two wordings that overstate",
    },
    {
        id: "harshit-wrote-most",
        text: "Harshit Dhankhar wrote most of Gr8r.",
        source: "docs/pitch/founders.md (principal author, about 155 commits); git shortlog -sne --all (143 + 13 commits under his two names of about 220)",
    },
    {
        id: "no-accuracy-figure",
        text: "No accuracy, agreement or teacher-match figure exists or is published; the site must not state one until a hand-marked comparison exists.",
        source: "docs/pitch/positioning.md (\"What we do not say\"); docs/evals/cbse-x-science-2025/README.md (\"smoke test\")",
    },
];

export default claims;

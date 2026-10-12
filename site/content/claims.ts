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
        source: "docs/pitch/materials/pilot-offer.md; docs/pitch/copy/pilot.md",
    },
    {
        id: "pilot-form",
        text: "The pilot form is emailed through Resend and checked by Cloudflare Turnstile; nothing from it goes into Gr8r.",
        source: "site/worker/README.md; site/worker/src/index.ts (nothing stored, the email is the record)",
    },
];

export default claims;

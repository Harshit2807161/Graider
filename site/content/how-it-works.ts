import type { HowItWorksContent } from "./types-info";

/** How it works (`/how-it-works`). Copy from docs/pitch/copy/how-it-works.md, trimmed; every claim's
 *  source is listed at the end of that draft. The escalation reasons are the product's own texts
 *  (frontend/types/review.types.ts, ESCALATION_TEXT). */
const howItWorks: HowItWorksContent = {
    meta: {
        title: "How Gr8r marks an answer sheet",
        description: "From the marking scheme to a published result, step by step: what Gr8r does, what code checks, what it hands to a teacher, and what it records.",
    },

    head: {
        title: "How Gr8r marks an answer sheet",
        lede: "From the marking scheme to a published result, in seven steps. For each step: what Gr8r does, what it checks, and what it hands to a teacher.",
        cta: { label: "See a graded sheet", href: "/sample/" },
    },

    pipeline: {
        id: "steps",
        heading: "The seven steps",
        checksLabel: "Done by code, not by a model",
        steps: [
            {
                title: "The exam and its marking scheme",
                body: [
                    { body: "A teacher enters the questions and the marking scheme: typed in, imported from an Excel sheet, or drafted from the question paper and marking-scheme PDFs and then corrected and confirmed by the teacher. Questions keep the labels printed on the paper, such as 2(b), and “attempt any one” questions are grouped so that only one alternative counts." },
                    { body: "Gr8r turns each question’s marking scheme into a list of criteria, each with its points and any partial-credit levels. A teacher can read the list and replace it." },
                ],
                checks: [
                    "Every criterion has a description and points.",
                    "The points add up to the question’s marks.",
                    "A question whose list fails these checks is not marked; its answers go to the teacher.",
                ],
            },
            {
                title: "Uploading the answer sheets",
                body: [
                    { body: "A student’s answers can be one file or several: scanned PDFs, phone photos (JPEG, PNG, HEIC and others), Word, ODT, RTF or PowerPoint files. PDFs are turned into page images; photos are rotated upright and straightened." },
                ],
                checks: [
                    "Each file is identified by its contents, not its name.",
                    "Encrypted PDFs, files with macros, and files over the size, page or pixel limits are refused.",
                ],
            },
            {
                title: "Reading the pages",
                body: [
                    { body: "A vision model reads every page at the same time. It copies out only what the student wrote, not the printed questions, and labels each piece of writing with the question it answers, using the paper’s own labels. It notes how confident it is and which work is crossed out." },
                ],
                checks: [
                    "Each answer is put together from its pieces: writing marked as a continuation joins the answer before it, so a long answer can run across pages.",
                    "Crossed-out work is left out.",
                    "Writing that couldn’t be placed under any question is kept and shown to the teacher.",
                ],
            },
            {
                title: "Marking each answer",
                body: [
                    { body: "Each question is marked separately. For every criterion the grader gives a score, a quote from the student’s answer as evidence, and a justification." },
                    { body: "The grader can also flag an answer as illegible, off topic, answering another question, or incompletely read. A flag sends the answer to the teacher." },
                    { body: "If no answer is found for a question, it is never given zero automatically; it goes to the teacher. For an “attempt any one” question, the alternatives the student didn’t answer are marked “not attempted” and don’t count." },
                ],
                checks: [
                    "Every criterion is scored once, and within its points.",
                    "Every score above zero has a quote.",
                    "Each quote is found in the student’s answer.",
                    "If the check fails, the grader gets one chance to repair it; if it fails again, the answer goes to the teacher.",
                ],
            },
            {
                title: "The second examiner",
                body: [
                    { body: "A second model, different from the grader, is told to score every criterion itself first, and then to review the grader’s marks and evidence and say where it disagrees, point by point. Both are in the same request, so its own scores are an instruction it follows, not a blind second marking. Gr8r records its own scores separately from its review." },
                    { body: "If the two disagree, the grader revises: it accepts or rejects each of the second examiner’s points, with a reason." },
                    { body: "The second examiner reads the same transcript as the grader. It checks the marking, not the reading." },
                ],
                checks: [
                    "The two count as agreeing only if their totals are close enough (the exam sets how close) and no single criterion is more than a quarter of its points apart.",
                    "After at most two revisions, an answer still in dispute goes to the teacher with both positions.",
                ],
            },
            {
                title: "What goes to the teacher, and why",
                body: [
                    { body: "Each answer Gr8r won’t settle on its own carries one of these reasons, in these words, on the teacher’s screen." },
                ],
                table: {
                    caption: "The reasons an answer goes to the teacher, as the teacher sees them, with what happened and what Gr8r proposes.",
                    columns: ["Reason the teacher sees", "What happened", "What Gr8r proposes"],
                    widths: ["30%", "38%", "32%"],
                    rows: [
                        ["No answer found on the pages", "Gr8r couldn’t find an answer to this question", "No mark; the teacher looks at the pages"],
                        ["The rubric isn’t ready", "The marking scheme for this question failed the checks", "No mark until the criteria are fixed"],
                        ["Handwriting hard to read", "The page reader was not confident about this answer", "Its proposed mark, for the teacher to confirm"],
                        ["Several attempts at this answer", "The answer seems to be written more than once", "Its proposed mark, for the teacher to confirm"],
                        ["The grade failed the checks", "Quotes or scores failed the code checks, even after a repair", "Usually no mark; the teacher marks it"],
                        ["The two examiners disagree", "Still apart after two revisions", "The grader’s mark, with both positions shown"],
                        ["The AI couldn’t grade it", "Every model for this step failed", "The teacher marks it"],
                        ["Random spot check", "Picked at random, if the exam has spot checks on", "Its proposed mark, for the teacher to confirm"],
                        ["Grader: off topic (or illegible, answers another question, transcript looks incomplete)", "The grader flagged the answer", "No mark; the teacher marks it"],
                    ],
                },
                after: [
                    { body: "The whole sheet fails, and nothing is marked, only if its pages can’t be read, the cost limit for the sheet runs out, or the exam has no questions. Gr8r never records a made-up mark." },
                ],
            },
            {
                title: "The teacher’s review and sign-off",
                body: [
                    { body: "Teachers see answers needing review first. For each one they can accept the proposed mark, set every criterion’s score themselves, or correct the transcript, which marks that answer again." },
                    { body: "When no answer on a sheet needs review, a teacher can approve it. Approved sheets are published to students for the whole exam at once. Students see only their own published results: marks, feedback and their pages." },
                    { body: "Nothing is overwritten. Each change adds a new version, and the earlier ones stay readable." },
                ],
                checks: [
                    "A changed mark or a corrected transcript needs a reason.",
                    "A sheet can’t be approved while any answer on it needs review.",
                    "A student sees a result only after it is approved and published.",
                ],
            },
        ],
    },

    illustration: {
        id: "one-answer",
        heading: "One answer, on the teacher’s screen",
        intro: [
            { body: "Question 21 from a CBSE Class X Science 2025 answer book, as Gr8r’s review screen shows it: the page, the text Gr8r read from it, each criterion with its quote and reason, and the second examiner’s view." },
        ],
        desk: "q21",
        link: { label: "See all three answers", href: "/sample/" },
    },

    record: {
        id: "record",
        heading: "The record behind every result",
        body: [
            { lead: "Runs.", body: "Each marking attempt is saved as a run, along with the models, settings and code version it used." },
            { lead: "Model calls.", body: "Within a run, each model call is recorded with what was sent, what came back, the tokens, cost and time. Page images are recorded as a reference and a fingerprint, not stored a second time." },
            { lead: "Transcripts and grades.", body: "Saved as versions and never changed afterwards." },
            { lead: "Teacher actions.", body: "Recorded with who, when, why, and the before and after." },
        ],
        after: [
            { body: "If Gr8r can’t write one of these records, it stops the run, so no result is saved with a gap in its record." },
        ],
    },

    models: {
        id: "models",
        heading: "The models",
        intro: [
            { body: "Each role can run on an API model or on an open-weight model you host. Only the page reader is sent the page images; the other three work from text." },
        ],
        table: {
            caption: "The four model roles, what each does, its default model, and what else it can run on.",
            columns: ["Role", "What it does", "Default", "Can also run on"],
            widths: ["20%", "32%", "18%", "30%"],
            rows: [
                ["Page reader", "Reads page images", "Claude Opus 5.5", "OpenAI, or an open-weight model you host"],
                ["Rubric reader", "Turns marking schemes into criteria", "Claude Opus 5.5", "OpenAI, or an open-weight model you host"],
                ["Grader", "Marks each criterion with evidence", "Claude Sonnet 5.5", "OpenAI, or an open-weight model you host"],
                ["Second examiner", "Scores each answer itself, then reviews the grader", "Claude Opus 5.5", "OpenAI, or an open-weight model you host"],
            ],
        },
        after: [
            { body: "Each role has fallbacks, and the grader’s and second examiner’s fallbacks never use each other’s model." },
            { body: "The defaults haven’t been run on a real answer book yet; our first real test used small OpenAI models. We haven’t measured which open-weight models are good enough for each role." },
        ],
    },

    honest: {
        id: "today",
        heading: "What it does well today, and what it sends to you",
        groups: [
            {
                heading: "Does well today",
                items: [
                    { body: "Neat handwriting, scanned or photographed." },
                    { body: "Answers written out in words, and working in numbers and formulas." },
                    { body: "Multiple-choice answers." },
                    { body: "Marking schemes that give marks for separate points, with partial marks." },
                    { body: "“Attempt any one” questions: only the attempted one is marked, and each group counts once." },
                    { body: "Long answers across pages, when the question number is written." },
                ],
            },
            {
                heading: "Sends to the teacher instead of guessing",
                items: [
                    { body: "An answer it can’t find." },
                    { body: "A page it can’t read with confidence." },
                    { body: "An answer that seems to be written twice." },
                    { body: "A mark it can’t support with a quote." },
                    { body: "Two examiners still apart after two revisions." },
                    { body: "A marking scheme that fails the checks." },
                    { body: "An answer flagged as illegible, off topic, answering another question, or incompletely read." },
                ],
            },
            {
                heading: "Not yet",
                items: [
                    { lead: "Drawings and diagrams.", body: "A drawing leaves nothing in the transcript and the grader never sees the image, so a drawn answer can score low without being flagged. A teacher should mark these." },
                    { lead: "Sub-parts across pages.", body: "Each page is read on its own, so a page starting with a bare “(b)” can be filed under the wrong question, and a booklet’s printed page number can be mistaken for a question number. A fix is in progress." },
                    { lead: "Crossed-out words.", body: "One struck word can make the reader drop the whole passage around it. A fix is in progress." },
                    { lead: "Reading errors the second examiner can’t see.", body: "It reads the same transcript as the grader, so a misread or misfiled answer gets past it. The teacher’s review of the page is the check." },
                    { lead: "Untidy handwriting.", body: "We haven’t tested it properly yet; our one real test used a neat answer book." },
                    { lead: "Drafting the exam from PDFs.", body: "On the board paper we tested, the draft wasn’t usable, and the questions were entered from the paper’s text instead." },
                    { lead: "Measured accuracy against teachers’ marks.", body: "We are measuring it now, and we’ll publish the method and every case before any figure." },
                ],
            },
        ],
    },

    closing: {
        heading: "See it on a real answer book",
        body: "Three answers from a CBSE Class X Science 2025 answer book, with every criterion, quote and examiner round.",
        primary: { label: "See a graded sheet", href: "/sample/" },
        secondary: { label: "Request a pilot", href: "/pilot/" },
    },
};

export default howItWorks;

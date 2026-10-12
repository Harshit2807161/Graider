import home from "./home";
import type { ProfessorsContent } from "./types-audience";

/** /professors: for a professor or lecturer who runs one course and wants the method in detail.
 *  Copy from docs/pitch/copy/professors.md, trimmed (FAQ items the method sections already answer
 *  are dropped; "spec" is said as "list of criteria"); the sources of every claim are listed at the
 *  end of that draft. The answer rows reuse the home page's Q35(a) with its notes (home.ts). */
const professors: ProfessorsContent = {
    meta: {
        title: "For college professors",
        description: "How Gr8r decides a mark on a handwritten answer, how a second model checks it, what comes to you, and how to compare its marking with yours on one course.",
    },

    hero: {
        title: ["Check every mark it gives.", "Compare its marking with yours."],
        lede: "Gr8r marks handwritten answers against your rubric. Each mark cites a criterion and a quote from the student’s writing, a second model scores it again and reviews the first model’s evidence, and anything the two can’t settle comes to you. You can read the whole reasoning, override with a reason, and put its marks beside your own.",
        primary: { label: "Try it on one course", href: "/pilot/" },
        secondary: { label: "See a graded sheet", href: "/sample/" },
    },

    method: {
        id: "method",
        heading: "How a mark is decided",
        steps: [
            { title: "Your rubric becomes a checked list of criteria.", body: "Gr8r turns your rubric into criteria, each with its points and any partial-credit levels (“half the points if only the formula is given”). The list is checked in code: criteria must add up to the question’s marks, and a question whose criteria fail the checks is sent to you instead of being marked. You can read the list and replace it with your own." },
            { title: "Gr8r reads the pages, then puts the answers together.", body: "A vision model reads each page and labels each piece of writing with the question it answers, skipping printed text and work the student crossed out. Code then joins answers that run across pages. Writing it can’t place under any question is kept and shown to you." },
            { title: "The grader marks each criterion with evidence.", body: "For every criterion it gives a score, a quote from the transcript, and a justification. Code checks that each quote is in the transcript and that scores stay within each criterion’s points. One repair is allowed; after that the answer comes to you. The grader can also flag an answer as illegible, off topic, answering another question, or incompletely read, and a flag sends it to you." },
            { title: "A second examiner scores it again.", body: "A different model is told to score every criterion itself before it reviews the grader’s marks, then to compare and send back specific points. The grader’s marks are in the same request, so this is an instruction the model follows, not a blind second marking; the record keeps its own scores apart from its review so you can see both." },
            { title: "They settle it, or you do.", body: "If the two totals are too far apart, or any single criterion differs by more than a quarter of its points, the grader revises, accepting or rejecting each point with a reason. After at most two revisions, an answer they still disagree on comes to you with both positions." },
            { title: "Some answers come to you anyway.", body: "Gr8r also sends you answers on a page it read with low confidence, answers that look like a second attempt, and an optional random sample of answers, with the proposed mark kept." },
        ],
        after: [
            { body: "How close the two examiners must be is set per exam. If the grader’s model fails, its fallback is chosen so that it never matches the second examiner’s model, and the other way round." },
        ],
        link: { label: "How it works, step by step", href: "/how-it-works/" },
    },

    check: {
        id: "check",
        heading: "What you can check",
        intro: [
            { body: "For any answer you can open the page image beside the transcript, with the quoted words highlighted, and read each criterion’s score and justification. Below that are the second examiner’s scores and reasons for each round, and the grader’s reply to each point." },
            { body: "Here is question 35(a) from a CBSE Class X Science 2025 answer book that CBSE published as a model answer. It runs across two pages, and Gr8r made two mistakes on it: the notes under the rows say what they were and how the answer reached a teacher." },
        ],
        answers: [home.wrong.answers[0]],
        after: [
            { body: "Nothing is changed in place. Transcripts and grades are versioned, so a correction or a regrade adds a new version and the earlier ones stay readable." },
            { body: "Each model call is recorded with what was sent, what came back, the tokens, the cost and the time taken. Owners and admins can open the raw inputs and outputs from each answer sheet’s timeline. Page images are recorded as a reference and a fingerprint rather than stored a second time." },
            { body: "Teacher actions are recorded too: overrides, proposed marks accepted, transcript corrections, regrades, approvals and publishing, each with who did it, the reason, and the before and after." },
        ],
        link: home.wrong.link,
    },

    disagree: {
        id: "disagree",
        heading: "When you disagree",
        body: [
            { body: "You can set every criterion’s score yourself. A reason is required, and your scores go through the same checks as the grader’s." },
            { body: "If Gr8r misread a word, correct the transcript (again with a reason) and that answer is marked again. You can also have a whole sheet marked again." },
            { body: "When a sheet is right, approve it. Only approved sheets can be published to students, and each student sees only their own published results." },
        ],
    },

    models: {
        id: "models",
        heading: "Which models it runs on",
        body: [
            { body: "Every model role (reading pages, reading the rubric, grading, second examiner) can run on Claude, on OpenAI, or on an open-weight model you host with vLLM or SGLang. Each role has a primary model and fallbacks, and switching is a configuration change. A setting forbids a self-hosted model from falling back to an external API, so pages need not leave your servers." },
            { body: "We haven’t measured which open models are good enough for reading handwriting, so treat that as something to test." },
            { body: "By default, the page reader, rubric reader and second examiner use Claude Opus 5.5, and the grader uses Claude Sonnet 5.5. These defaults have not yet been run on a real answer book; our first real test used smaller OpenAI models." },
        ],
    },

    compare: {
        id: "compare",
        heading: "Compare it with your own marking",
        body: [
            { body: "Mark one test yourself, as you normally would. Gr8r marks the same sheets with your rubric, without seeing your marks. Then you compare the two, answer by answer and criterion by criterion: where it agreed, where it sent the answer to you, and where it was wrong without saying so. That last group matters most, and we count it separately." },
            { body: "You keep the comparison. With your permission, and with no student details, we’d like to publish it alongside the method." },
        ],
    },

    honest: {
        id: "today",
        heading: "What it does well today, and what it sends to you",
        intro: "Where it is reliable today, what it hands to you instead of guessing, and what it can’t do yet, with why each gap matters to you.",
        groups: [
            {
                heading: "Does well today",
                items: [
                    "Neat handwriting, scanned or photographed.",
                    "Answers written out in words, and derivations and calculations written as text and formulas.",
                    "Multiple-choice answers.",
                    "Rubrics that give points for separate criteria, with partial credit.",
                    "“Attempt any one” questions: only the attempted alternative is marked, and the question counts once.",
                    "Long answers across pages when the question number is written.",
                ],
            },
            {
                heading: "Sends to you instead of guessing",
                items: [
                    "An answer it can’t find. It never gives a zero for that on its own.",
                    "A page it can’t read with confidence.",
                    "What looks like a second attempt at the same answer.",
                    "A mark it can’t support with a quote that passes the check.",
                    "Two examiners still apart after two revisions.",
                    "A rubric that fails the checks.",
                    "An answer flagged as illegible, off topic, answering another question, or incompletely read.",
                ],
            },
            {
                heading: "Not yet, and why it matters to you",
                items: [
                    "Drawings and diagrams. A drawing leaves nothing in the transcript, and the grader never sees the image, so a drawn answer can score low without being flagged.",
                    "Reading and filing errors pass the second examiner. It reads the same transcript as the grader and checks the marking, not the reading, so a misread word or an answer filed under the wrong question gets through it. Your review of the page is the check for those.",
                    "Sub-parts across pages. Each page is read on its own, so a page that starts with a bare “(b)” can be filed under the wrong question. A fix is in progress.",
                    "Crossed-out words. One struck word can make the reader drop the whole passage around it. A fix is in progress.",
                    "Measured accuracy. We haven’t published an accuracy figure because we don’t have one yet. The first hand-marked comparison is under way, and the method and every case will be public before any figure is.",
                ],
            },
        ],
    },

    faq: {
        id: "questions",
        heading: "Questions professors ask first",
        items: [
            {
                question: "Can it read my students’ handwriting?",
                answer: ["It read a neat 31-page answer book well in our one real test (a CBSE Class X Science 2025 model answer, October 2026); we haven’t tested untidy handwriting properly yet. Low-confidence pages come to you, and you can correct any transcript."],
            },
            {
                question: "Does it give partial credit the way my rubric does?",
                answer: ["Yes, if the rubric says how. Partial-credit levels become part of each criterion, and each criterion can be scored partially. Read the criteria before marking starts, and replace them if they’re wrong."],
            },
            {
                question: "What does it cost per script?",
                answer: ["In our first test, the model costs were about 22 US cents for a 31-page answer book on small OpenAI models, worked out from token counts and list prices for one run. The default Claude models cost more; we haven’t measured how much on a real script yet. A trial on one course is free."],
            },
            {
                question: "What happens to my students’ data?",
                answer: [
                    "Gr8r stores the scripts, page images and marks; your organisation’s staff and our team (for support) can open them. Page images go to the page-reading model’s provider and text goes to the grading models’ providers; by default all of these are Anthropic.",
                    "No student name is put into a prompt, though anything written on the page goes with its image. There is no automatic deletion yet; we delete on request. The details are on the data page.",
                ],
                link: { label: "Privacy and data", href: "/privacy/" },
            },
            {
                question: "What if it’s wrong?",
                answer: ["Sometimes it will be, and sometimes without a flag. Nothing reaches a student until you approve the sheet, and every override is recorded with your reason."],
            },
            {
                question: "Is it for university or board examinations?",
                answer: ["It’s for assessments you set and mark: internal tests, assignments and mid-terms. It is not for board examinations."],
            },
            {
                question: "How long does setup take?",
                answer: ["Upload the question paper and rubric for a draft, import an Excel sheet, or type the questions in; then read each criterion before marking starts. We haven’t timed a full setup; we do the first one with you."],
            },
        ],
    },

    closing: {
        heading: "Try it on one course",
        body: "One test, your rubric, your marks beside Gr8r’s marks.",
        cta: { label: "Try it on one course", href: "/pilot/" },
    },
};

export default professors;

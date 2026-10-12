import type { HomeContent } from "./types";

/** The home page (`/`). Copy from docs/pitch/copy/home.md and sample.md, trimmed; sources for every
 *  claim are listed at the end of those drafts and in claims.ts. Marks, points and reasons in the
 *  answer rows come from the sample data, not from here. */
const home: HomeContent = {
    meta: {
        title: "Gr8r: AI marking for handwritten answer sheets",
        description: "Gr8r marks handwritten answer sheets on your own marking scheme, quotes the student’s words as evidence for every mark, and sends what it can’t settle to the teacher.",
    },

    hero: {
        title: ["AI marking for handwritten answer sheets.", "It shows its working."],
        lede: "Gr8r reads each handwritten page, awards each mark on your own marking scheme with a quote from the student’s answer as evidence, has a second model check the grade, and sends anything it can’t settle to the teacher instead of guessing. Nothing is published until a teacher approves it.",
        primary: { label: "Request a pilot", href: "/pilot/" },
        secondary: { label: "See a graded sheet", href: "/sample/" },
    },

    heroFigure: {
        alt: "Page 7 of a handwritten CBSE Class X science answer book: the student’s answer to question 24(b), on transport in plants, in blue ink on ruled paper. Drawn over it for this illustration, from Gr8r’s grade record: yellow highlights on the two passages Gr8r quoted as evidence, and its mark for each, 1 out of 1, in red in the right margin.",
        caption: "Page 7, question 24(b). In yellow, the words Gr8r quoted as evidence; in the margin, its mark for each point. Both are drawn on the scan from Gr8r’s grade record for this illustration; the product shows them with the transcript, not on the scan. The red ticks on the writing are CBSE’s examiner’s.",
    },

    runLine: {
        text: "One real 31-page answer book, on small OpenAI models in October 2026: read and graded in about a minute, for about 22\u00a0US cents in model costs. Fifteen of its 44 answers were sent to the teacher.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"What happened\"; \"Grading\": 15 escalated for review)",
    },

    marked: {
        id: "marked",
        heading: "One answer, marked",
        intro: [
            { body: "Question 24(b) from a CBSE Class X Science 2025 answer book that CBSE published as a model answer, then question 21, a calculation. Each row is one point of the marking scheme: the mark Gr8r gave, the words from the student’s writing that earned it, and the reason." },
        ],
        answers: [
            {
                question: "24(b)",
                caption: "Question 24(b), scanned page 7. The yellow highlights are drawn on the scan from Gr8r’s grade record for this illustration; the product shows them in the transcript, not on the scan. The red ticks on the page belong to CBSE’s examiner, not to Gr8r.",
            },
            {
                question: "21",
                caption: "Question 21, scanned page 4. The yellow highlights are drawn on the scan from Gr8r’s grade record for this illustration; the product shows them in the transcript, not on the scan. The red ticks on the page belong to CBSE’s examiner, not to Gr8r.",
                notes: {
                    c1: "The student never wrote “u = −10 cm” or “f = −15 cm” on its own line. Both examiners gave the half mark because the signs are right in this first equation. Your marking scheme may want the values written out; a teacher decides.",
                },
            },
        ],
        link: { label: "See the whole sample", href: "/sample/" },
    },

    steps: {
        id: "how",
        heading: "How a mark is made",
        steps: [
            { title: "Read.", body: "Gr8r reads every page and copies out the student’s writing, answer by answer, under the question it answers." },
            { title: "Mark.", body: "Each point in your marking scheme gets a score and a reason, and every point that earns marks has a quote from the student’s writing. If the quote isn’t in the student’s answer, the score doesn’t count." },
            { title: "Check.", body: "A second, different model scores the same answer itself, then reviews the first model’s marks and evidence. If they still disagree after two rounds of revision, the answer goes to the teacher." },
            { title: "Sign off.", body: "Your teachers see every mark with its evidence, change any mark they disagree with (a reason is required), and approve. Students see a result only after that, and every change is kept." },
        ],
        link: { label: "How it works, step by step", href: "/how-it-works/" },
    },

    wrong: {
        id: "wrong",
        heading: "What it got wrong, and what happened next",
        intro: [
            { body: "Question 35(a), from the same answer book, runs across two pages. Gr8r made two mistakes on it. The notes under the rows say what they were and how the answer reached a teacher." },
        ],
        answers: [
            {
                question: "35(a)",
                caption: "Question 35(a), scanned pages 23 and 24. The yellow highlights are drawn on the scan from Gr8r’s grade record for this illustration; the product shows them in the transcript, not on the scan. The red ticks on the pages belong to CBSE’s examiner, not to Gr8r.",
                notes: {
                    c1: "This point asks for the eggs and the female hormones. The student names only the eggs, and Gr8r still gave the full mark. A teacher can change it, with a reason.",
                    c5: "Wrong. The student struck out a false start just above this line, and Gr8r’s reader took the vasectomy line as crossed out too, so neither examiner ever saw the word. CBSE’s examiner’s tick credits it. The answer went to the teacher, though for another reason: a page break read as a second attempt.",
                },
            },
        ],
        after: [
            { body: "The grader and the second examiner also went three rounds over the uterus point before they agreed. Every round, with the words each relied on, is on the sample page." },
        ],
        link: { label: "See the three rounds", href: "/sample/#q35a" },
    },

    reasons: {
        id: "sent",
        heading: "What it sends to you instead of guessing",
        intro: "When Gr8r can’t settle an answer, it doesn’t guess. The answer goes to the teacher with the reason in plain words and, where it has one, the mark it proposes. It sends:",
        items: [
            "An answer it can’t find on the pages.",
            "A page it can’t read with confidence.",
            "An answer that seems to be written twice.",
            "A mark it can’t support with a quote.",
            "Two examiners who still disagree after two rounds.",
            "A marking scheme it couldn’t turn into clear points.",
            "An answer the marking model flags as illegible or off topic.",
        ],
        after: "Gr8r never gives a missing answer zero automatically.",
        slip: {
            label: "Sent to you",
            reason: "The two examiners disagree",
            detail: "The examiners still disagree after revising. Both positions are attached, point by point.",
            caption: "Illustration, not from the CBSE run: the note a teacher gets when the grader and the second examiner still disagree after two revisions.",
        },
        example: {
            question: "24(a)",
            heading: "Not attempted is not a zero",
            body: [
                "Question 24 says “attempt any one”. This student answered (b), so Gr8r marked (a) “not attempted” and counted question 24 once.",
                "If a student answers both, the exam’s setting decides which one counts: the better one, or the first one written.",
            ],
            caption: "Question 24(a), from the same answer book.",
        },
    },

    audiences: {
        id: "who",
        heading: "Who it’s for",
        audiences: [
            {
                name: "Schools and coaching institutes.",
                body: "Unit tests, pre-boards and mock tests, marked on your own marking scheme. Your teachers sign off every result before a student sees it. Internal exams only.",
                link: { label: "For schools", href: "/schools/" },
            },
            {
                name: "College professors.",
                body: "Read the reasoning behind every mark, compare it with your own marking on one course, and run it on API models or on models you host.",
                link: { label: "For professors", href: "/professors/" },
            },
            {
                name: "Investors.",
                body: "The product works end to end and every mark can be audited. We haven’t measured it against teachers’ marks yet; the first hand-marked comparison is planned, and we will publish the method and every case before any figure.",
                link: { label: "For investors", href: "/investors/" },
            },
        ],
    },

    honest: {
        id: "today",
        heading: "What it does well today, and what it can’t do yet",
        intro: "Gr8r gets some marks wrong. This list says where it is reliable today and what it can’t do yet. What it hands to your teachers instead of guessing is in the section above.",
        groups: [
            {
                heading: "Does well today",
                items: [
                    "Neat handwriting, scanned or photographed.",
                    "Answers written out in words, and working in numbers and formulas.",
                    "Multiple-choice answers.",
                    "Marking schemes that give marks for separate points, including half marks.",
                    "“Attempt any one” questions: only the attempted one is marked, and the question counts once.",
                    "Long answers that run across pages, when the student writes the question number.",
                ],
            },
            {
                heading: "Not yet",
                items: [
                    "Drawings and diagrams. A drawing leaves nothing in the transcript today, so a drawn answer can get a low mark without being sent to the teacher. Your teachers should check every answer with a drawing.",
                    "Answer books where a sub-part continues on a new page without its number. Gr8r can file that writing under the wrong question. It is on our fix list.",
                    "Measured accuracy against teachers’ marks. We haven’t measured it yet; the first hand-marked comparison is planned, and we will publish the method and every case before any figure.",
                ],
            },
        ],
    },

    closing: {
        heading: "Try it on one exam",
        body: "The pilot is free: one exam, one class, four weeks. We agree the success criteria with you in writing before we start, and at the end you decide whether to continue on per-sheet pricing or stop.",
        cta: { label: "Request a pilot", href: "/pilot/" },
    },
};

export default home;

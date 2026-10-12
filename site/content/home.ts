import type { HomeContent } from "./types";

/** The home page (`/`). Copy from docs/pitch/copy/home.md and sample.md, cut to the shortest true
 *  version; sources for every claim are in claims.ts. Marks, points and reasons in the answer rows
 *  come from the sample data (content/sample-data/review.json), not from here. */
const home: HomeContent = {
    meta: {
        title: "Gr8r: AI marking for handwritten answer sheets",
        description: "Gr8r marks handwritten answer sheets on your own marking scheme, quotes the student’s words as evidence for every mark, and sends what it can’t settle to the teacher.",
    },

    hero: {
        title: ["AI marking for handwritten answer sheets.", "It shows its working."],
        lede: "Gr8r reads each handwritten page, awards each mark on your own marking scheme with a quote from the student’s answer as evidence, has a second model check the grade, and sends anything it can’t settle to the teacher instead of guessing.",
        primary: { label: "Request a pilot", href: "/pilot/" },
        secondary: { label: "See a graded sheet", href: "/sample/" },
        tabsLabel: "Answers from one real answer book",
        tabs: [
            { question: "24(b)" },
            {
                question: "21",
                notes: { c1: { text: "The values are never written out; both examiners gave the half mark for the signs." } },
            },
            {
                question: "35(a)",
                notes: {
                    c1: { label: "Generous.", text: "The student names the eggs but not the hormones." },
                    c5: { label: "Wrong.", text: "The reader took the vasectomy line as crossed out. CBSE’s examiner ticked it." },
                },
            },
        ],
        rowsHint: "Each row is one point of the marking scheme. Choose a row to show its evidence on the page.",
        page: "Page {page}",
        illustration: "Highlights and marks are drawn on the scans from Gr8r’s grade record for this illustration; the product shows them with the transcript. The small red ticks on the writing are CBSE’s examiner’s.",
        marksAlt: "Drawn over it from Gr8r’s grade record: yellow highlights on the words quoted as evidence, and Gr8r’s mark for each point in red.",
    },

    runLine: {
        text: "One real 31-page answer book, on small OpenAI models in October 2026: read and graded in about a minute, for about 22 US cents in model costs. Fifteen of its 44 answers were sent to the teacher.",
        source: "docs/evals/cbse-x-science-2025/README.md (\"What happened\"; \"Grading\": 15 escalated for review)",
    },

    marked: {
        id: "marked",
        heading: "One answer, marked",
        intro: "From a CBSE Class X Science 2025 answer book: each row is one point of the marking scheme, with Gr8r’s mark, the words that earned it and the reason.",
        answers: [
            { question: "24(b)", points: ["c1", "c2"] },
            {
                question: "21",
                points: ["c1", "c2", "c3"],
                notes: { c1: "The student never wrote “u = −10 cm” or “f = −15 cm” on its own line; both examiners gave the half mark for the signs in this equation. A teacher decides." },
            },
        ],
        link: { label: "See the whole sample", href: "/sample/" },
    },

    strips: [
        { alt: "Page 23 of the answer book in the student’s handwriting: “(II) Fallopian tube → It is the site of fertilisation of female gamete (egg) and male gamete (sperm).” Highlighted as evidence, with Gr8r’s mark, 1 out of 1." },
        { alt: "Page 24 of the answer book: “(ii) Two contraceptive methods used by males → (a) Mechanical barriers – condoms.” Highlighted as evidence, with Gr8r’s mark, 1 out of 1." },
    ],

    steps: {
        id: "how",
        heading: "How a mark is made",
        steps: [
            { title: "Read.", body: "Gr8r copies out every page’s handwriting, answer by answer." },
            { title: "Mark.", body: "Each point of your marking scheme gets a score, a reason and a quote; a quote that isn’t in the answer doesn’t count." },
            { title: "Check.", body: "A second model scores the answer itself; still apart after two revisions, it goes to the teacher." },
            { title: "Sign off.", body: "Your teachers change any mark, with a reason, and approve. Students see results only after that." },
        ],
        link: { label: "How it works, step by step", href: "/how-it-works/" },
    },

    wrong: {
        id: "wrong",
        heading: "What it got wrong, and what happened next",
        question: "35(a)",
        point: "c5",
        body: [
            "On question 35(a) Gr8r’s reader took the vasectomy line as crossed out, so neither examiner saw the word; CBSE’s examiner ticked it.",
            "The answer still reached a teacher, though for another reason (a page break read as a second attempt), and the two examiners went three rounds over the uterus point before they agreed.",
        ],
        wrongLabel: "Wrong: read as crossed out",
        missedAlt: "Page 24: a struck-out “(b) Intra-uter”, then “(b) Surgical method → vasectomy. In this the vas deferens of male is blocked, which prevents sperm transfer.” Gr8r gave this point 0 out of 1; the line it missed is circled in red.",
        rounds: {
            heading: "The three rounds",
            grader: "Grader",
            examiner: "Second examiner",
            round: "Round {n}",
            next: "Next round",
            point: "Uterus point",
            agreed: "Agreed",
            apart: "Apart",
        },
        link: { label: "See every round on the sample page", href: "/sample/#q35a" },
    },

    honest: {
        id: "today",
        heading: "What it does well today, and what it can’t do yet",
        groups: [
            {
                heading: "Does well today",
                items: [
                    "Neat handwriting, scanned or photographed.",
                    "Answers in words, and working in numbers and formulas.",
                    "Multiple-choice answers.",
                    "Marking schemes with separate points and half marks.",
                    "“Attempt any one” questions, counted once.",
                ],
            },
            {
                heading: "Can’t do yet",
                items: [
                    "Drawings and diagrams: a drawn answer can get a low mark without reaching the teacher.",
                    "A sub-part continued on a new page without its number: it can be filed under the wrong question.",
                    "Measured accuracy against teachers’ marks: not measured yet. We will publish the method and every case before any figure.",
                ],
            },
        ],
        after: "Anything it can’t settle goes to your teachers with the reason. A missing answer is never given zero automatically.",
    },

    audiences: {
        id: "who",
        heading: "Who it’s for",
        audiences: [
            {
                name: "Schools and coaching institutes.",
                body: "Unit tests, pre-boards and mock tests, on your own marking scheme. Internal exams only.",
                link: { label: "For schools", href: "/schools/" },
            },
            {
                name: "College professors.",
                body: "Read the reasoning behind every mark and compare it with your own.",
                link: { label: "For professors", href: "/professors/" },
            },
            {
                name: "Investors.",
                body: "A working product where every mark can be audited; accuracy not yet measured.",
                link: { label: "For investors", href: "/investors/" },
            },
        ],
    },

    closing: {
        heading: "Try it on one exam",
        gridTitle: "For examiner’s use only",
        cells: [
            { label: "Exams", value: "1" },
            { label: "Classes", value: "1" },
            { label: "Weeks", value: "4" },
            { label: "Fee", value: "Free" },
        ],
        terms: { label: "Success criteria", value: "Agreed with you in writing before we start" },
        body: "At the end, you decide whether to continue on per-sheet pricing or stop.",
        cta: { label: "Request a pilot", href: "/pilot/" },
    },
};

export default home;

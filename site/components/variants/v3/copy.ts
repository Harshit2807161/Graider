/** Copy for home variant v3 ("The answer book").
 *  It lives here only because this variant may not edit `site/content/`; when a variant is chosen,
 *  move it into `content/home.ts` and `content/site.ts`. The h1, lede, CTAs and run line are the
 *  design brief's copy verbatim (docs/pitch/design-brief.md, "The three variants"). */

export interface NavLink {
    label: string;
    href: string;
}

export interface V3Copy {
    brand: string;
    nav: NavLink[];
    menuLabel: string;
    pilot: NavLink;
    hero: {
        marginHead: string;
        h1: [string, string];
        lede: string;
        secondary: NavLink;
        /** The run line. `{sentToTeacher}` is a slot filled from `run.sentToTeacher`. */
        runLine: string;
    };
    /** Figures from docs/evals/cbse-x-science-2025/README.md. Slot, not typed into components. */
    run: { sentToTeacher: string };
    sample: {
        id: string;
        heading: string;
        intro: string;
        pageLabel: (page: number) => string;
        /** Said beside the criterion that earned nothing and why the answer went to the teacher. */
        c5Note: string;
        sameLine: string;
    };
    rounds: {
        heading: string;
        intro: string;
    };
    grid: {
        heading: string;
        caption: string;
        columns: [string, string, string];
        notAttempted: string;
        notSent: string;
        sentPrefix: string;
        choseOther: (label: string) => string;
        illustration: { qno: string; marks: string; reason: string };
    };
    closing: string;
}

const copy: V3Copy = {
    brand: "Gr8r",
    nav: [
        { label: "Schools", href: "#" },
        { label: "Professors", href: "#" },
        { label: "Investors", href: "#" },
        { label: "How it works", href: "#" },
        { label: "Sample", href: "#sample" },
    ],
    menuLabel: "Menu",
    pilot: { label: "Request a pilot", href: "#" },
    hero: {
        marginHead: "Q. No.",
        h1: ["AI marking for handwritten answer sheets.", "It shows its working."],
        lede: "Gr8r reads each handwritten page, awards each mark on your own marking scheme with a quote from the student’s answer as evidence, has a second model check the grade, and sends anything it can’t settle to the teacher instead of guessing.",
        secondary: { label: "See a graded sheet", href: "#sample" },
        runLine: "One real 31-page answer book: read and graded in about a minute, for about 22\u00a0US cents in model costs. {sentToTeacher} answers sent to the teacher.",
    },
    run: { sentToTeacher: "Four" },
    sample: {
        id: "sample",
        heading: "Question 35(a), marked criterion by criterion",
        intro: "Pages 23 and 24 of a real CBSE answer book. Each row is one criterion of the marking scheme: the student’s words that earned the mark are highlighted on the page, and the mark is in the margin.",
        pageLabel: (page) => `Page ${page}`,
        c5Note: "The reading took this (b) as crossed out, because the student struck out a first (b) just above it. So this criterion got 0, and the answer went to the teacher as “Several attempts at this answer”.",
        sameLine: "Evidence: the same line as above.",
    },
    rounds: {
        heading: "Two examiners, three rounds",
        intro: "A second model marked the answer on its own first, then read the grader’s evidence. They disagreed on one criterion, the uterus: the grader gave 0, the evaluator ½. After two revisions both gave it the full mark, and 4 of 5 for the answer.",
    },
    grid: {
        heading: "For examiner’s use only",
        caption: "Three answers from this answer book, and one illustration. The last row is not from this answer book: it shows how an answer is sent to the teacher when the two examiners still disagree after two revisions.",
        columns: ["Q. No.", "Marks", "Sent to the teacher"],
        notAttempted: "Not attempted",
        notSent: "No",
        sentPrefix: "Yes:",
        choseOther: (label) => `No: the student chose ${label}`,
        illustration: { qno: "Illustration", marks: "Held for the teacher", reason: "The two examiners disagree" },
    },
    closing: "Request a pilot on one exam, one class, with written success criteria.",
};

export default copy;

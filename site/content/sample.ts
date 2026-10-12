import type { SampleContent } from "./types";

/** The sample page (`/sample`). Copy from docs/pitch/copy/sample.md, trimmed; its sources are listed
 *  at the end of that draft. The answer book’s total never appears on this page. The figures inside
 *  the product’s own answer card (agreement, reading confidence) are the product’s UI on real data. */
const sample: SampleContent = {
    meta: {
        title: "A graded answer book, as a teacher sees it",
        description: "Three answers from a real handwritten CBSE answer book, marked by Gr8r: the page, the text it read, each mark with the student’s words that earned it, and the second examiner’s view.",
    },
    title: "A graded answer book, as a teacher sees it",
    lede: "Three answers from a real handwritten answer book, marked by Gr8r. For each one you can see the page, the text Gr8r read from it, the marking scheme’s points, the mark for each point with the student’s words that earned it, and what the second examiner said. Where Gr8r got something wrong, we say so.",

    lookingAt: {
        id: "looking",
        heading: "What you’re looking at",
        body: [
            { body: "The answer book is from CBSE’s Class X Science exam of 2025 (set 31/1/3). CBSE published it as a model answer, so it is a strong student’s script, written neatly. It carries no student name." },
            { body: "The questions and marking scheme are CBSE’s. Gr8r turned each question’s marking scheme into the points you see here; the wording of the points is Gr8r’s." },
            { body: "Gr8r marked it on 11 October 2026 with small OpenAI models: gpt-4.1-mini read the pages and marked, and gpt-4.1 was the second examiner. Gr8r’s default models are larger, and their marks on this book may differ." },
            { body: "The red ticks on the pages belong to CBSE’s examiner. Gr8r’s marks are the ones beside the page." },
        ],
        source: "Question paper, marking scheme and answer book: Central Board of Secondary Education, Class X Science 2025, published at cbse.gov.in.",
    },

    reading: {
        id: "reading",
        heading: "How to read a point",
        intro: "Each line in the answer card is one point from the marking scheme. Read it left to right:",
        items: [
            { lead: "The point,", body: "in words: what the answer has to contain." },
            { lead: "The mark:", body: "what Gr8r gave, out of what the point is worth, for example 0.5 / 0.5." },
            { lead: "The evidence:", body: "the student’s own words, quoted. The same words are highlighted in the transcript, so you can find them on the page. A mark above zero must have a quote, and the quote must be in the student’s answer, or the mark doesn’t count." },
            { lead: "The reason:", body: "one or two sentences on why the evidence earns the mark." },
        ],
        after: "Under the points are the second examiner’s marks for the same points and its reasons. If the two examiners disagreed, you’ll see each round.",
    },

    desks: [
        {
            id: "q21",
            heading: "Question 21. Mirror formula",
            question: "An object is placed at a distance of 10 cm in front of a concave mirror of focal length 15 cm. Use mirror formula to determine the position of the image formed by this mirror.",
            intro: [
                { body: "A calculation worth 2 marks, in three points: the first two are worth half a mark each, the third one mark. Both examiners agreed on every point in the first round." },
            ],
            answer: "21",
            pages: [4],
            pageCaptions: { 4: "21, 22" },
            notes: [
                { body: "Scanned page 4 (printed page 5)." },
                { lead: "The signs.", body: "The student never wrote “u = −10 cm” or “f = −15 cm” on its own line. Both examiners gave the half mark because the signs are right in the first equation, and the second examiner said so in its reason. Your marking scheme may want the values written out. The record shows exactly what each examiner relied on, so a teacher can decide." },
                { lead: "One misread line.", body: "Look at the fourth line of the transcript. The student cancelled a fraction, and Gr8r copied it as “1/v = 5 / 2”. That’s a misreading. It didn’t change the mark, because no point relied on that line, but it is the kind of slip a teacher’s look at the page is there to catch." },
            ],
        },
        {
            id: "q24",
            heading: "Question 24(a). Not attempted, and why that isn’t a zero",
            intro: [
                { body: "Question 24 says “attempt any one”: (a) on blood clotting, or (b) on transport in plants. This student answered (b), on scanned page 7 (printed page 8). Gr8r marked (b), marked (a) “not attempted”, and counted question 24 once." },
                { body: "“Not attempted” is not a mark of zero and not a problem for the teacher. It only means the student chose the other alternative. If the student had answered both, the exam’s setting decides which one counts: the better one, or the first one written." },
            ],
            answer: "24(b)",
            pages: [7],
            pageCaptions: { 7: "24(b)" },
            notes: [
                { body: "Scanned page 7 (printed page 8). Question 24(b): two points, one mark each." },
            ],
        },
        {
            id: "q35a",
            heading: "Question 35(a). Two examiners, three rounds",
            question: "(i) Write the functions of the ovary, fallopian tube and uterus. (ii) State briefly two contraceptive methods used by human males.",
            intro: [
                { body: "Five marks, one for each point. The answer runs across two pages." },
            ],
            answer: "35(a)",
            pages: [23, 24],
            pageCaptions: { 23: "35(a)", 24: "35(a), 36(b)" },
            notes: [
                { body: "Scanned pages 23 and 24 (printed pages 24 and 25). The answer runs across both pages." },
            ],
            roundsBelow: true,
            after: [
                { lead: "Round 1.", body: "The grader gave 3 out of 5. It gave nothing for the uterus point, because the student describes nourishing the foetus but never says the uterus is where the embryo implants. The second examiner, scoring each point itself before reviewing the grader, gave half a mark for the same point: the description shows some understanding. The two were half a mark apart on a one-mark point, which is too far, so the grader had to answer. It accepted the point and moved to 3.5." },
                { lead: "Round 2.", body: "The second examiner went further: “provides necessary conditions if egg is fertilised” and the mention of the placenta cover the uterus’s role, so it would give the full mark. The grader accepted again and moved to 4." },
                { lead: "Round 3.", body: "Both gave 4 out of 5, point for point, and the answer was settled." },
                { lead: "What to take from it.", body: "The uterus point is a judgement call. Another teacher might stop at half a mark. Every step of the argument is on the record, with the words each examiner relied on, so the teacher can see where the extra half mark came from and disagree." },
            ],
        },
    ],

    correction: {
        id: "correction",
        heading: "What a teacher would correct on 35(a)",
        body: [
            { body: "Both examiners gave nothing for the second contraceptive method, vasectomy, and both were wrong. On scanned page 24, the student wrote “(b) Surgical method → vasectomy”. The line above it, a false start, is struck through. Gr8r’s reader treated the whole passage as crossed out and left it out of the transcript, so neither examiner ever saw the word." },
            { body: "This is a reading error, and the second examiner can’t catch reading errors: it reads the same transcript as the grader. A teacher looking at page 24 would see the line and add the mark. We are fixing the cause, so that one struck word no longer removes the writing around it." },
            { body: "Gr8r also gave the ovary point its full mark, although the point asks for the female hormones too and the student names only the eggs. A teacher can change that mark, with a reason." },
            { body: "In this run, 35(a) was also sent to the teacher, with the reason “Several attempts at this answer”. That reason was wrong: the reader took the move from page 23 to page 24 for a second attempt. It is the same fault that sent other answers in this run to the teacher for the wrong reasons, and it is on our list to fix." },
        ],
    },

    escalation: {
        id: "sent",
        heading: "When Gr8r sends an answer to the teacher",
        body: [
            { body: "When Gr8r can’t settle an answer, it doesn’t guess. The answer goes to the top of the teacher’s list with the reason in plain words and, where it has one, the mark it proposes. The teacher accepts the proposed mark or sets the marks themselves, with a reason." },
            { body: "None of the answers this run sent to the teacher went for a sound reason. Each was caused by a filing error or a bug we’re fixing. So rather than present one of them as a good example, we show the note as an illustration." },
        ],
        slip: {
            label: "Sent to you",
            reason: "The two examiners disagree",
            detail: "The examiners still disagree after revising. Both positions are attached, point by point.",
            caption: "Illustration, not from the CBSE run: an answer the two examiners still disagree on after two revisions. The teacher accepts the proposed mark or changes the marks and gives a reason; either way, the decision is recorded with the teacher’s name.",
        },
    },

    closing: {
        heading: "See it on your own answer sheets",
        body: "In a pilot, Gr8r marks one exam of yours on your own marking scheme, and your teachers review every mark like this.",
        cta: { label: "Request a pilot", href: "/pilot/" },
    },
};

export default sample;

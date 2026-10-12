/** Copy for home variant v1. It lives here only because this variant may not edit `content/`;
 *  if v1 is chosen it moves into `content/home.ts` and `content/site.ts` (typed there).
 *  h1, lede, CTAs and the run line are verbatim from docs/pitch/design-brief.md; everything else is
 *  drawn from docs/pitch/positioning.md and the run's own record. */

export interface Link {
    label: string;
    href: string;
}

/** Answers the run escalated to the teacher. A slot, not copy: the figure comes from
 *  docs/evals/cbse-x-science-2025/README.md, "Grading" table ("Escalated for review | 15"). */
export const RUN_SENT_TO_TEACHER = 15;

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];

function sentence(n: number): string {
    const word = NUMBER_WORDS[n] ?? String(n);
    return `${word} ${n === 1 ? "answer" : "answers"} sent to the teacher.`;
}

export const v1 = {
    brand: "Gr8r",
    menu: "Menu",
    nav: [
        { label: "Schools", href: "#" },
        { label: "Professors", href: "#" },
        { label: "Investors", href: "#" },
        { label: "How it works", href: "#" },
        { label: "Sample", href: "#sample" },
    ] satisfies Link[],
    pilot: { label: "Request a pilot", href: "#pilot" } satisfies Link,

    hero: {
        title: ["AI marking for handwritten answer sheets.", "It shows its working."],
        lede: "Gr8r reads each handwritten page, awards each mark on your own marking scheme with a quote from the student’s answer as evidence, has a second model check the grade, and sends anything it can’t settle to the teacher instead of guessing.",
        secondary: { label: "See a graded sheet", href: "#sample" } satisfies Link,
        run: `One real 31-page answer book: read and graded in about a minute, for about 22 US cents in model costs. ${sentence(RUN_SENT_TO_TEACHER)}`,
        scanAlt: "Page 23 of a handwritten CBSE Class X science answer book: the student’s answer to question 35(a)(i), the functions of the ovary, fallopian tube and uterus, in blue ink on ruled paper with a red margin.",
        caption: "Page 23, question 35(a). In yellow, the words Gr8r quoted as evidence; in the margin, its mark for each criterion. The small ticks on the writing are the original examiner’s.",
        slipLabel: "Sent to you",
    },

    sample: {
        heading: "One answer, as the teacher sees it",
        intro: "Question 35(a) from the same answer book, in Gr8r’s review screen: what it read, each criterion with the student’s words that earned it, and the rounds between the grader and the second examiner.",
        check: "What to check in this record: the fifth criterion is wrong. On page 24 the student struck out a false start, “(b) Intra-uter”, and the reader took the surgical-method line under it as crossed out too, so vasectomy scored 0; the original examiner’s tick credits it. The answer still went to the teacher, though for another reason: a page break read as a second attempt.",
        secondHeading: "A short one: question 21",
        secondIntro: "Mirror formula, page 4. Three criteria, full marks, and the second examiner agreed in the first round. One line is misread: the transcript has 1/v = 5 / 2 where the page cancels 5 over 10 × 15 to 1 over 2 × 15. No mark depended on it.",
        viewerCaptions: { 23: "Q35(a), part (i)", 24: "Q35(a), part (ii)", 4: "Q21" } as Record<number, string>,
    },

    escalation: {
        heading: "What it sends to you instead of guessing",
        body: "An answer it can’t find, a page it can’t read confidently, an answer written twice, a mark it can’t support with a quote, two examiners that still disagree after two rounds, an invalid rubric, anything the grader flags as illegible or off topic: each comes to the teacher with its reason. An answer it can’t find is never given zero.",
        choiceCaption: "From the run: 24(a) and 24(b) are “attempt any one”. The student answered 24(b), so 24(a) is not marked and does not count.",
        slipReason: "The two examiners disagree",
        slipText: "The examiners still disagree after revising. Both positions are attached, criterion by criterion.",
        slipCaption: "Illustration, not from this run: the slip a teacher gets when the grader and the second examiner are still apart after two revisions.",
    },

    close: {
        heading: "Try it on one exam",
        body: "One exam, one class, your marking scheme, with the success criteria agreed in writing before we start. Your teachers approve every result before a student sees it.",
    },
};

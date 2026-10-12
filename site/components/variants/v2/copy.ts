/** Every word on the v2 home variant. The site keeps copy in `content/`; this variant’s copy sits here
 *  until a direction is chosen, then moves to `content/home.ts`. h1, lede, CTAs and the run line are
 *  verbatim from docs/pitch/design-brief.md (which takes them from docs/pitch/positioning.md). */

/** Answers the run sent to the teacher: the run line’s slot in the design brief. The brief’s draft says
 *  "Four", but docs/evals/cbse-x-science-2025/README.md ("Grading") records 15 escalated for review
 *  (6 repeated attempts, 5 failed checks, 3 no answer found, 1 off topic). To be confirmed. */
export const RUN_ANSWERS_SENT_TO_TEACHER = 15;

const copy = {
    nav: [
        { label: "Schools", href: "/schools/" },
        { label: "Professors", href: "/professors/" },
        { label: "Investors", href: "/investors/" },
        { label: "How it works", href: "/how-it-works/" },
        { label: "Sample", href: "/sample/" },
    ],
    pilot: { label: "Request a pilot", href: "/pilot/" },

    h1: ["AI marking for handwritten answer sheets.", "It shows its working."],
    lede: "Gr8r reads each handwritten page, awards each mark on your own marking scheme with a quote from the student’s answer as evidence, has a second model check the grade, and sends anything it can’t settle to the teacher instead of guessing.",
    secondary: { label: "See a graded sheet", href: "#more-answers" },

    panelTitle: "Question 35(a) on the review screen",
    figcaption: "A real answer book page, Gr8r’s grade for it and the second examiner’s rounds, on the product’s own review screen.",
    caption: {
        page: {
            lead: "The answer book.",
            text: "Pages 23 and 24 of a real Class X science answer book, scanned with a human examiner’s red ticks already on it.",
        },
        grade: {
            lead: "Gr8r’s grade.",
            text: "Each mark names a criterion from the marking scheme and quotes the student’s words that earned it. Further down, the grader and a second examiner go three rounds before they settle.",
        },
        miss: {
            lead: "One mark it got wrong.",
            text: "It took “vasectomy” on page 24 as crossed out, so c5 scored nothing. It did not settle the answer alone: it sent it to the teacher, flagged as written more than once.",
        },
    },
    run: (sent: number) =>
        `One real 31-page answer book: read and graded in about a minute, for about 22 US cents in model costs. ${sent} answers sent to the teacher.`,

    more: {
        h2: "More from the same answer book",
        intro: "The same run, two more questions, shown as the teacher sees them.",
        short: {
            h3: "A short answer: question 21",
            text: "A mirror-formula sum on page 4. Each step the marking scheme asks for is matched to a line of the student’s working, and the second examiner agrees in the first round.",
        },
        sent: {
            h3: "What comes to the teacher",
            text: "Question 24 says “attempt any one”. This student answered (b), so (a) is not marked at all and the question counts once. When a mark can’t be settled, the answer comes to the teacher with its reason instead of a guess.",
            notAttempted: "From the run: question 24(a), the alternative the student left.",
            illustration: "Illustration",
            illustrationTitle: "Answer sent to the teacher",
            illustrationCaption: "Illustration, not from this run: what the teacher sees when the grader and the second examiner still disagree after two revisions. Both positions come with it, and nothing is published until the teacher decides.",
            hint: "The examiners still disagree after revising.",
        },
    },

    close: {
        h2: "Try it on one exam",
        text: "Request a pilot on one exam, one class, with written success criteria.",
    },

    alt: {
        23: "Page 23 of the answer book: the student’s handwritten answer to question 35(a)(i), the functions of the ovary, fallopian tube and uterus, with an examiner’s red ticks.",
        24: "Page 24 of the answer book: the answer to 35(a)(ii), two male contraceptive methods, condoms and vasectomy, with a struck-out line between them and the examiner’s red ticks.",
        4: "Page 4 of the answer book: the student’s working for question 21 with the mirror formula, ending v = +30 cm, with the examiner’s red ticks.",
    } as Record<number, string>,
};

export default copy;

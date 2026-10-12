import type { SchoolsContent } from "./types-audience";
import type { AnswerRows } from "./types";

/** Q24(b) as answer rows (moved from home.ts when the home page became the answer book; unchanged). */
const Q24B_ROWS: AnswerRows = {
    question: "24(b)",
    caption: "Question 24(b), scanned page 7. The yellow highlights are drawn on the scan from Gr8r’s grade record for this illustration; the product shows them in the transcript, not on the scan. The red ticks on the page belong to CBSE’s examiner, not to Gr8r.",
};

/** /schools: for a principal, trustee, director or coaching-centre head with two minutes.
 *  Copy from docs/pitch/copy/schools.md, trimmed; the sources of every claim are listed at the end
 *  of that draft. The answer rows show Q24(b) (data from the sample, caption in Q24B_ROWS above). */
const schools: SchoolsContent = {
    meta: {
        title: "For schools and coaching institutes",
        description: "Gr8r marks the handwritten answer sheets of your own exams against your marking scheme, with a quote from the student’s answer beside every mark. Your teachers check, change and approve every result before a student sees it.",
    },

    hero: {
        title: ["Your handwritten tests, marked on your marking scheme.", "Your teachers sign off every result."],
        lede: "Gr8r marks the answer sheets of your own exams (unit tests, half-yearlies, pre-boards, mock tests) against your marking scheme, one point at a time, with a quote from the student’s answer beside every mark. Your teachers check the marks, change what they disagree with, and approve. No student sees a result before that.",
        primary: { label: "Request a pilot", href: "/pilot/" },
    },

    steps: {
        id: "stack",
        heading: "What happens to a stack of answer sheets",
        steps: [
            { title: "You set up the exam once.", body: "Give us the question paper and your marking scheme. Gr8r turns the marking scheme into a list of points with marks, and a teacher checks it before any sheet is marked." },
            { title: "You upload the sheets.", body: "Scanned PDFs or phone photos. Photos are straightened, and rotated upright when the photo carries orientation data." },
            { title: "Gr8r marks each answer.", body: "Every mark names a point from your marking scheme and quotes the student’s writing. A second model scores the same answer again and checks the first one’s evidence." },
            { title: "Your teachers review.", body: "Answers Gr8r wasn’t sure about come first, each with the reason. A teacher can change any mark, with a reason, and every change is kept." },
            { title: "You publish.", body: "When a teacher approves a sheet, it can be published. Students with an account then see their marks, the feedback and their own pages." },
        ],
    },

    teachers: {
        id: "teachers",
        heading: "What your teachers see",
        intro: [
            { body: "For each answer: the student’s page, the text Gr8r read from it, the marking-scheme points, the mark for each point, and the words in the student’s answer that earned it, highlighted. On the sample page you can also see what the second examiner thought and where the two disagreed." },
        ],
        answers: [Q24B_ROWS],
        after: [
            { body: "If Gr8r sent an answer to the teacher, the reason is at the top in plain words, for example “Handwriting hard to read” or “The two examiners disagree”. The teacher accepts the proposed mark or changes it." },
            { body: "If Gr8r misread a word, the teacher corrects the text and that answer is marked again." },
        ],
        link: { label: "See a graded sheet", href: "/sample/" },
    },

    honest: {
        id: "today",
        heading: "What it does well today, and what it sends to your teachers",
        intro: "Gr8r will get some marks wrong. Here is where it is reliable today, which answers it hands to your teachers, and which questions to keep away from it for now.",
        groups: [
            {
                heading: "Does well today",
                items: [
                    "Neat handwriting, scanned or photographed.",
                    "Written answers, and working in numbers and formulas.",
                    "Multiple-choice answers.",
                    "Marking schemes with separate points, including half marks.",
                    "“Attempt any one” questions: only the one the student answered is marked, and it counts once.",
                    "Long answers that run across pages, when the student writes the question number.",
                ],
            },
            {
                heading: "Sends to your teachers instead of guessing",
                items: [
                    "An answer it can’t find. It is never given zero automatically.",
                    "A page it can’t read with confidence.",
                    "An answer that seems to be written twice.",
                    "A mark it can’t back with a quote from the student’s answer.",
                    "A disagreement between the two examiners that two rounds didn’t settle.",
                    "A marking-scheme point it couldn’t make clear.",
                    "An answer flagged as illegible or off topic.",
                ],
            },
            {
                heading: "Not yet",
                items: [
                    "Drawings and diagrams. A drawing leaves nothing in what Gr8r reads, so a drawn answer can get a low mark without being sent to your teachers. A teacher should mark any question that needs a drawing.",
                    "Answer books where a sub-part continues on a new page without its number. Gr8r can file that writing under the wrong question. It is on our fix list.",
                    "Untidy handwriting. We haven’t tested it properly yet; our one real test used a neat answer book.",
                    "We haven’t yet measured how often Gr8r’s marks match your teachers’. That is what a pilot measures, on your own sheets.",
                ],
            },
        ],
    },

    pilot: {
        id: "pilot",
        heading: "Start with one exam",
        terms: [
            { lead: "Free.", body: "One exam, one class (up to about 200 sheets), four weeks." },
            { lead: "Your success criteria, written down first.", body: "For example: how many of Gr8r’s marks your teachers accept without change, and how much teacher time each sheet takes. You set the targets." },
            { lead: "Two review sessions.", body: "We go through Gr8r’s marks with your teachers twice during the pilot." },
            { lead: "At the end, you decide:", body: "continue on per-sheet pricing, which we agree with you before the pilot ends, or stop." },
        ],
        needs: { lead: "What we need from you:", body: "the question paper, your marking scheme, the answer sheets (scans or phone photos), and a teacher’s time to review the marks." },
        link: { label: "Pilot details", href: "/pilot/" },
    },

    faq: {
        id: "questions",
        heading: "Questions principals ask first",
        items: [
            {
                question: "Can it read our students’ handwriting?",
                answer: ["It reads neat handwriting well: in our one test so far, it read a neat 31-page answer book that CBSE published as a model answer. We haven’t tested untidy handwriting properly yet. When Gr8r can’t read a page with confidence, it sends that answer to your teacher instead of guessing, and a teacher can correct anything it misread."],
            },
            {
                question: "Does it follow our marking scheme, with partial marks?",
                answer: ["Yes. Your marking scheme becomes a list of points with marks, including partial marks such as “half a mark if only the formula is written”. A teacher checks and can edit that list before marking starts. Every mark Gr8r gives points back to one of those items."],
            },
            {
                question: "What does it cost per sheet?",
                answer: ["The pilot is free. After it, pricing is per sheet, and we agree the price with you before the pilot ends. In our first test, the model costs were about 22 US cents for a 31-page answer book, on small models, in one run in October 2026; the larger models Gr8r uses by default cost more."],
            },
            {
                question: "What happens to student data?",
                answer: [
                    "Gr8r stores the answer sheets and marks. In Gr8r they can be opened by your organisation’s teachers and administrators, by each student for their own published results, and by Gr8r’s own team for support.",
                    "To read a page, Gr8r sends the page image to a model provider; by default that is Anthropic. Gr8r never puts a student’s name into a prompt, but anything written on the page goes with the image. We don’t delete data automatically yet; we delete it when you ask. The full details, in tables, are on our data page.",
                ],
                link: { label: "Privacy and data", href: "/privacy/" },
            },
            {
                question: "Does student data have to leave our school?",
                answer: ["When Gr8r hosts the pilot, page images and text go to the model providers named on our data page. Gr8r can also run on your own servers with models you host, so pages need not leave your premises. We haven’t yet measured how well self-hosted models mark."],
            },
            {
                question: "What if it gives a wrong mark?",
                answer: ["It will sometimes. In our first real test, some answers got a wrong mark without being sent to the teacher, mostly because writing was filed under the wrong question or a drawing was skipped. That is why nothing is published until a teacher approves the sheet. Teachers can change any mark with a reason, and every change is kept."],
            },
            {
                question: "Can we use it for board exams?",
                answer: ["No. Gr8r is for exams your school sets and marks itself: unit tests, half-yearlies, pre-boards and mock tests."],
            },
            {
                question: "How long does setup take?",
                answer: ["You give us the question paper and the marking scheme. Gr8r can build a draft of the questions and marking points from the PDFs, you can import them from an Excel sheet, or your teacher can type them in. A teacher checks every point before marking starts. We haven’t timed a full setup yet; in a pilot we do it together with your teacher."],
            },
        ],
    },

    closing: {
        heading: "Try it on one exam, with your own marking scheme",
        body: "Free for one exam and one class, for four weeks, with the success criteria written down before we start.",
        cta: { label: "Request a pilot", href: "/pilot/" },
    },
};

export default schools;

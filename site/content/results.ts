import home from "./home";
import type { ResultsContent } from "./types-info";

/** Results (`/results`): the shape of the comparison with teachers' marks, published empty. Copy from
 *  docs/pitch/copy/results.md, trimmed. Not in the nav, not indexed. No figure goes on this page
 *  until a hand-marked comparison exists; the only numbers are the home page's run line. */
const results: ResultsContent = {
    meta: {
        title: "How Gr8r’s marks compare with a teacher’s",
        description: "How Gr8r’s marks will be compared with marks given by hand: the method, what is counted, and the table every answer will go in. No figure is published until the comparison exists.",
    },

    title: "How Gr8r’s marks compare with a teacher’s",
    lede: "This page will report how Gr8r’s marks compare with marks given by hand, on real answer books, with the method and every case. No figure is published here until a comparison against hand-marked answer books exists.",

    nextRun: {
        value: "TODO: month and year of the next comparison",
        template: "The next comparison is planned for {value}.",
        fallback: "The date of the next comparison will be posted here.",
    },

    method: {
        id: "method",
        heading: "Method",
        body: [
            { lead: "The answer books.", body: "We use answer books whose marks we can check: books marked by hand by a teacher for this comparison, and published sets that come with per-question marks. A model answer alone can’t show over-marking, so we include mid-scoring and untidy scripts." },
            { lead: "The teacher’s marks.", body: "A teacher marks each answer by hand against the marking scheme, before seeing Gr8r’s marks. Where the source gives marks already, we use them and say so." },
            { lead: "Gr8r’s run.", body: "We upload each book as any school would. The models, settings and code version are recorded with the run and listed here. Nothing is tuned on these books." },
        ],
        groupsIntro: "What we count. Every answer falls into exactly one group:",
        groups: [
            { lead: "Matched.", body: "Gr8r’s mark is within a tolerance of the teacher’s, fixed before the run (for example the same mark, or within half a mark), and the answer was not sent to the teacher." },
            { lead: "Sent to the teacher.", body: "Gr8r didn’t settle the answer and gave a reason. We report how many, the reasons, and whether each reason was sound." },
            { lead: "Wrong without a flag.", body: "Gr8r settled the answer, and its mark is outside the tolerance. For a school this is the group that matters most, so it gets its own figure and its own column and is never folded into an average." },
        ],
        caveats: { lead: "Caveats, in plain words.", body: "Every run is dated. Models and Gr8r both change, so later runs may differ, and we’ll date every update. We run this evaluation ourselves; no one outside checks it. With few answers, small differences between runs mean little." },
    },

    cases: {
        id: "cases",
        heading: "Every answer",
        intro: "Every answer in the comparison goes in this table, including the ones Gr8r got wrong. Each row will link to the page image and to Gr8r’s full record for that answer: criteria, quotes, both examiners’ rounds.",
        columns: ["Answer book", "Question", "Type", "Marks", "Teacher’s mark", "Gr8r’s mark", "Difference", "Sent to the teacher?", "Reason sound?", "Wrong without a flag?", "Record"],
        empty: "No answers yet. The table fills when the comparison is run.",
        caption: "Every answer in the comparison, one row each. Empty until the comparison is run.",
        scrollHint: "The table scrolls sideways.",
        legend: {
            id: "columns",
            heading: "What each column holds",
            table: {
                caption: "What each column of the comparison table holds.",
                columns: ["Column", "What it holds"],
                widths: ["30%", "70%"],
                rows: [
                    ["Answer book", "Which book, and its source"],
                    ["Question", "The paper’s label, such as 21 or 35(a)"],
                    ["Type", "Multiple choice, short answer, long answer, calculation, drawing"],
                    ["Marks", "What the question is worth"],
                    ["Teacher’s mark", "The hand-given mark"],
                    ["Gr8r’s mark", "Gr8r’s proposed or final mark"],
                    ["Difference", "Gr8r’s mark minus the teacher’s"],
                    ["Sent to the teacher?", "Yes or no, and the reason shown to the teacher"],
                    ["Reason sound?", "For answers sent to the teacher: was the reason right?"],
                    ["Wrong without a flag?", "Yes when Gr8r settled the answer outside the tolerance"],
                    ["Record", "Links to the page image and the grade record"],
                ],
            },
        },
    },

    sofar: {
        id: "so-far",
        heading: "What has been run so far",
        intro: "One real answer book, as a test of the whole product, not as a comparison with a teacher’s marks:",
        run: home.runLine,
        after: "Three of its answers, including one Gr8r got wrong, are on the sample page.",
        link: { label: "See a graded sheet", href: "/sample/" },
    },
};

export default results;

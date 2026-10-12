import type { InvestorsContent } from "./types-audience";

/** /investors: for pre-seed investors. The site supports the deck; the deck carries the numbers.
 *  Copy from docs/pitch/copy/investors.md, trimmed; the sources of every claim are listed at the end
 *  of that draft. The CBSE on-screen marking sentence is the "safe to say" wording of
 *  docs/pitch/research/claims.md §1 (CONFIRMED). The contact email is still a placeholder, so the
 *  closing button goes to /about/ and no address is shown. */
const investors: InvestorsContent = {
    meta: {
        title: "For investors",
        description: "Gr8r is vertical AI for marking handwritten answer sheets with the teacher in the loop: what exists today, what has been measured and what hasn’t, and what comes next.",
    },

    hero: {
        title: ["Marking handwritten exams, with the teacher in the loop."],
        lede: "Gr8r is vertical AI for one job: marking handwritten answer sheets against a school’s own marking scheme. The product works end to end today. It doesn’t yet have a measured accuracy figure; the work to get one is under way, and we will publish it in full.",
        primary: { label: "Talk to the founders", href: "/about/" },
    },

    job: {
        id: "job",
        heading: "The job",
        body: [
            { body: "Schools, coaching institutes and colleges run their own tests all year: unit tests, pre-boards, mock tests, internal assessments. They are written by hand and marked by the same teachers who teach. Gr8r takes the first pass of that marking, on the institution’s own marking scheme, and gives every mark a reason a teacher can check against the page." },
            { body: "The head of the institution buys it and the teacher uses it, but it is the student, and often the parent, who has to accept the result. That is why the product has one fixed rule: no mark reaches a student until a teacher has approved it." },
        ],
    },

    whyNow: {
        id: "why-now",
        heading: "Why now",
        body: [
            { body: "Current models read neat handwriting well: in our one test so far, a small model transcribed a 31-page model answer book and marked it against criteria for about 22 US cents in model costs. Handwritten answer books are also being scanned: in 2026 CBSE moved Class 12 marking on-screen, the rollout drew public complaints about scan quality and portal security, and CBSE said AI was not used to mark papers; teachers marked them." },
            { body: "We think marking is moving onto scans and screens, and that people will expect any automated part to be checkable. We don’t sell to boards; Gr8r is for exams that institutions set and mark themselves." },
        ],
    },

    exists: {
        id: "exists",
        heading: "What exists today",
        items: [
            { lead: "A working multi-tenant product.", body: "Organisations, classes, exams, teachers and students with separate roles; upload of PDFs, phone photos and office documents; marking in the background; a review screen for teachers; publishing to students." },
            { lead: "A method you can audit.", body: "Each mark cites a criterion and a quote from the student’s answer, checked in code. A second, different model scores every criterion itself and then reviews the first model’s marks; disagreement goes to revision, at most twice, then to a teacher. An answer that can’t be found is sent to a teacher, never given zero." },
            { lead: "A full record.", body: "Every model call, every version of every transcript and grade, and every teacher action is stored append-only, so any result can be traced from the published mark back to the page." },
            { lead: "Not tied to one model vendor.", body: "Every model role can run on Claude, OpenAI or a self-hosted open-weight model, with fallbacks, and a switch stops a self-hosted installation from falling back to outside providers." },
            { lead: "An evaluation harness.", body: "A script runs a real paper, marking scheme and answer book through the whole product and saves every answer’s record for review." },
        ],
        link: { label: "See a graded sheet", href: "/sample/" },
    },

    measured: {
        id: "measured",
        heading: "What has been measured, and what hasn’t",
        body: [
            { body: "One real run so far. We took a CBSE Class X Science 2025 paper, its official marking scheme and a 31-page handwritten answer book that CBSE published as a model answer. Gr8r read every page and marked or sent to the teacher 44 answers in about a minute, for about 22 US cents in model costs on small OpenAI models; that is one run in October 2026, with costs worked out from token counts and list prices, not an invoice." },
            { body: "It was a smoke test, not an accuracy measurement. It showed the system holds together on real material, and it showed where marks go wrong: mostly before marking starts, in reading pages and deciding which question a piece of writing belongs to. Some answers got a wrong mark without a flag. We wrote all of this up, and we are fixing those failures first." },
            { body: "We publish no accuracy figure until we have a comparison against marks given by hand. When we do, we’ll publish the method and caveats with it, and every case, including the wrong marks that were not flagged." },
        ],
    },

    next: {
        id: "next",
        heading: "What’s next",
        steps: [
            { title: "Hand-marked comparison.", body: "Mark the first answer book by hand, then change one thing at a time: a stronger page reader, then the cheap fixes to reading and filing. Add messier, mid-scoring scripts, because a model answer can’t show over-marking." },
            { title: "Design partners.", body: "Free four-week pilots with schools and coaching institutes on one exam and one class each, with success criteria written down before we start and a paid-or-stop decision at the end." },
            { title: "Pricing per sheet.", body: "Pilots are free; after a pilot, institutions pay per sheet marked." },
        ],
    },

    closing: {
        heading: "The ask",
        body: "We’re looking for design partners now and for investors who want to back measured accuracy next. If you know a school, a coaching institute or a professor who would run a pilot, or you’d like to see the deck, talk to us.",
        cta: { label: "Talk to the founders", href: "/about/" },
        note: "Kirtan Jain, Parth Agarwal and Harshit Dhankhar, Delhi.",
    },
};

export default investors;

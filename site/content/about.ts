import type { AboutContent } from "./types-info";

/** About (`/about`). Copy from docs/pitch/copy/about.md; the founders' paragraphs are the
 *  "One-paragraph versions" in docs/pitch/founders.md (Kirtan approves every line). No photos. */
const about: AboutContent = {
    meta: {
        title: "About Gr8r",
        description: "Gr8r is made by Graider, a small company in Delhi, India, founded by three IIT Patna graduates. Why we built it, who we are, and how to reach us.",
    },

    head: {
        title: "About Gr8r",
        lede: "Gr8r (read “grader”) is made by Graider, a small company in Delhi, India. We build one thing: AI marking for handwritten answer sheets that shows its working, so that a teacher can check every mark.",
    },

    // Kirtan's call (founders.md): false drops the sentences that name a founder's current employer
    showCurrentRoles: true,

    why: {
        id: "why",
        heading: "Why we built it",
        body: [
            { body: "Unit tests, pre-boards, mock tests and internal assessments are written by hand and mostly marked by hand. Current models can read neat handwriting and follow a marking scheme. But if a teacher can’t see why a model gave a mark, they have to mark the answer again anyway, and a student or parent has no reason to accept it." },
            { body: "So we built Gr8r around the habit every student is taught: show your working. Every mark refers to an item in the marking scheme and quotes the student’s own words. A second model checks it. What the system can’t settle goes to the teacher, and nothing reaches a student until a teacher approves it. We also say plainly what it can’t do yet, on every page where it matters." },
        ],
    },

    team: {
        id: "team",
        heading: "The team",
        founders: [
            {
                name: "Kirtan Jain",
                education: "Computer science, IIT Patna (2025).",
                work: [
                    { text: "Systems and backend engineer." },
                    { text: "At Samsung Research he works on Android’s window management and built tooling that other engineers use daily.", namesEmployer: true },
                    { text: "Co-author of papers at CIKM 2025 and EMNLP 2024." },
                ],
            },
            {
                name: "Parth Agarwal",
                education: "Electrical and electronics engineering, IIT Patna (2025).",
                work: [
                    { text: "Software engineer at Blinkit; previously at Sprinklr.", namesEmployer: true, withoutEmployer: "Software engineer." },
                ],
            },
            {
                name: "Harshit Dhankhar",
                education: "Mathematics and computing, IIT Patna (2025); MS in computer science at UC San Diego (2027).",
                work: [
                    {
                        text: "Machine-learning researcher and engineer, with work at AWS, UCSD, Paris Dauphine-PSL and IIIT Hyderabad, and papers at the AAAI 2025 QC+AI workshop and IEEE BigData 2023.",
                        namesEmployer: true,
                        withoutEmployer: "Machine-learning researcher and engineer, with papers at the AAAI 2025 QC+AI workshop and IEEE BigData 2023.",
                    },
                    { text: "Wrote most of Gr8r." },
                ],
            },
        ],
    },

    principles: {
        id: "how-we-work",
        heading: "How we work",
        items: [
            "Our sample is a real answer book, and it shows the mistakes Gr8r made on it.",
            "There is no accuracy figure on this site, because we haven’t measured one against teachers’ marks yet. When we have one, we’ll publish the method and every case with it.",
            "Your teachers approve every result, and we delete your data when you ask.",
            "We work on internal exams only. We don’t mark board exams.",
        ],
    },

    contact: {
        id: "contact",
        heading: "Contact",
        emailLine: "Email: {email}",
        noEmail: "Contact details are on their way.",
        address: "Graider, Delhi, India.",
        body: "For a pilot, use the pilot form; it reaches the same people.",
        bodyNoEmail: "For a pilot, use the pilot form.",
        cta: { label: "Request a pilot", href: "/pilot/" },
    },
};

export default about;

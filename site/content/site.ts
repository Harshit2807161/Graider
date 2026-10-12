import type { SiteContent } from "./types";

const site: SiteContent = {
    name: "Gr8r",
    company: "Graider",
    city: "Delhi, India",
    tagline: "AI marking for handwritten answer sheets. It shows its working.",
    // Placeholder: the footer hides any address that starts with "TODO" until a real one is set
    contactEmail: "TODO@example.com",
    footerLine: "Gr8r, by Graider, Delhi, India",
    menuLabel: "Menu",
    skipLink: "Skip to content",
    nav: [
        { label: "Schools", href: "/schools/" },
        { label: "Professors", href: "/professors/" },
        { label: "Investors", href: "/investors/" },
        { label: "How it works", href: "/how-it-works/" },
        { label: "Sample", href: "/sample/" },
    ],
    footerNav: [
        { label: "Pilot", href: "/pilot/" },
        { label: "Privacy and data", href: "/privacy/" },
        { label: "About", href: "/about/" },
    ],
    cta: {
        primary: "Request a pilot",
        secondary: "See a graded sheet",
        pilot: "Request a pilot",
        sample: "See a graded sheet",
    },
    labels: {
        rows: {
            sameLine: "Evidence: the same line as the point above.",
            notAttempted: "Not attempted",
            outOf: "{score} out of {max}",
            question: "Question",
            page: "Page {page}",
        },
        desk: {
            discussion: "Examiner discussion",
            rounds: ["round", "rounds"],
            agreement: "agreement",
            pages: "Answer book pages",
        },
    },
};

export default site;

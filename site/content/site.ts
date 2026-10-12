import type { SiteContent } from "./types";

const site: SiteContent = {
    name: "Gr8r",
    company: "Graider",
    city: "Delhi, India",
    tagline: "AI marking for handwritten answer sheets. It shows its working.",
    contactEmail: "TODO@example.com",
    nav: [
        { label: "Schools", href: "/schools/" },
        { label: "Professors", href: "/professors/" },
        { label: "Investors", href: "/investors/" },
        { label: "How it works", href: "/how-it-works/" },
        { label: "Sample", href: "/sample/" },
    ],
    footerNav: [
        { label: "Pilot", href: "/pilot/" },
        { label: "Privacy", href: "/privacy/" },
        { label: "About", href: "/about/" },
    ],
    cta: {
        primary: "Request a pilot",
        secondary: "See a graded sheet",
        pilot: "Request a pilot",
        sample: "See a graded sheet",
    },
};

export default site;

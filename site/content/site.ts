import type { SiteContent } from "./types";

const site: SiteContent = {
    name: "Gr8r",
    company: "Graider",
    city: "Delhi, India",
    tagline: "TODO copy: tagline",
    contactEmail: "TODO@example.com",
    nav: [
        { label: "Schools", href: "/schools/" },
        { label: "Professors", href: "/professors/" },
        { label: "How it works", href: "/how-it-works/" },
        { label: "Sample", href: "/sample/" },
        { label: "Investors", href: "/investors/" },
        { label: "About", href: "/about/" },
    ],
    footerNav: [
        { label: "Pilot", href: "/pilot/" },
        { label: "Privacy", href: "/privacy/" },
        { label: "About", href: "/about/" },
    ],
    cta: {
        primary: "TODO copy: primary CTA",
        secondary: "TODO copy: secondary CTA",
        pilot: "TODO copy: pilot CTA",
        sample: "TODO copy: sample CTA",
    },
};

export default site;

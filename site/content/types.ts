/** Types for every content module. Copy lives only in site/content/; components render these. */

export interface NavItem {
    label: string;
    href: string;
}

export interface CtaLabels {
    primary: string;
    secondary: string;
    pilot: string;
    sample: string;
}

export interface SiteContent {
    name: string;
    company: string;
    city: string;
    tagline: string;
    contactEmail: string;
    nav: NavItem[];
    footerNav: NavItem[];
    cta: CtaLabels;
}

export interface Cta {
    label: string;
    href: string;
}

export interface Section {
    id: string;
    heading: string;
    body: string[];
    cta?: Cta;
}

/** One module per page. `title` is the page's h1; `intro` the paragraph under it. */
export interface PageContent {
    slug: string;
    title: string;
    description: string;
    intro: string;
    sections: Section[];
}

/** A statement the site makes that needs a source. `source` is a repo path or a URL. */
export interface Claim {
    id: string;
    text: string;
    source: string;
}

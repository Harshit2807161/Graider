/** Section shapes for the information pages (how it works, about, privacy, results). The general
 *  shapes (PageMeta, Para, Cta, ...) stay in types.ts; these are the ones those pages add. */

import type { Cta, PageMeta, Para, ProseSection, RunLine } from "./types";

/** A page's first block without a picture: the h1, the paragraph under it, an optional button. */
export interface PageHead {
    title: string;
    lede: string;
    cta?: Cta;
}

/** A plain table of facts a reader can check. The first cell of each row is the row's header.
 *  On a phone each row stacks: its header first, then each cell under its column's name. */
export interface InfoTable {
    /** For screen readers; also shown under the table when `showCaption` is set */
    caption: string;
    showCaption?: boolean;
    columns: string[];
    /** Column widths from a tablet up, e.g. ["20%", "50%", "30%"] (the phone layout stacks) */
    widths?: string[];
    rows: string[][];
}

/** A heading, paragraphs, a table, and paragraphs or a list after it. */
export interface TableSection {
    id: string;
    heading: string;
    intro?: Para[];
    table: InfoTable;
    after?: Para[];
    /** A list after the table, with an optional line introducing it */
    list?: { intro?: string; items: Para[] };
    /** Paragraphs after the list */
    end?: Para[];
}

/** A line with a value still to be supplied. While `value` starts with "TODO" the page shows
 *  `fallback` (or nothing); once filled, `template` with `{value}` replaced. */
export interface Slot {
    value: string;
    template: string;
    fallback?: string;
}

/* ----- how it works ----- */

/** One step of the pipeline: plain words, then what code (not a model) does at that step. */
export interface PipelineStep {
    title: string;
    body: Para[];
    checks?: string[];
    table?: InfoTable;
    after?: Para[];
}

export interface PipelineSection {
    id: string;
    heading: string;
    /** The heading over each step's list of what code does */
    checksLabel: string;
    steps: PipelineStep[];
}

/** The honest section, with bold lead-ins on its items. */
export interface HonestGroups {
    id: string;
    heading: string;
    intro?: string;
    groups: { heading: string; items: Para[] }[];
}

/** The page's one illustration: one answer on the shared review desk. */
export interface DeskIllustration {
    id: string;
    heading: string;
    intro: Para[];
    /** The id of a desk in content/sample.ts; its question, pages and notes are shown with it */
    desk: string;
    link: Cta;
}

/** The end of a page: the primary button repeated, and one secondary link. */
export interface ClosingPair {
    heading: string;
    body: string;
    primary: Cta;
    secondary?: Cta;
}

export interface HowItWorksContent {
    meta: PageMeta;
    head: PageHead;
    pipeline: PipelineSection;
    illustration: DeskIllustration;
    record: ProseSection & { after: Para[] };
    models: TableSection;
    honest: HonestGroups;
    closing: ClosingPair;
}

/* ----- about ----- */

/** A founder's paragraph: education, then work, one sentence at a time. A sentence that names a
 *  current employer is marked so the page can leave it out (`showCurrentRoles`); `withoutEmployer`
 *  stands in for it when given. */
export interface Founder {
    name: string;
    education: string;
    work: { text: string; namesEmployer?: boolean; withoutEmployer?: string }[];
}

export interface AboutContent {
    meta: PageMeta;
    head: PageHead;
    /** When false, the sentences naming a founder's current employer are dropped */
    showCurrentRoles: boolean;
    why: ProseSection;
    team: { id: string; heading: string; intro?: string; founders: Founder[] };
    principles: { id: string; heading: string; items: string[] };
    contact: {
        id: string;
        heading: string;
        /** "Email: {email}", shown only once site.contactEmail is a real address */
        emailLine: string;
        /** Shown instead while the address is a placeholder */
        noEmail: string;
        address: string;
        /** After the address, with the email shown */
        body: string;
        /** After the address, while there is no email yet */
        bodyNoEmail: string;
        cta: Cta;
    };
}

/* ----- privacy ----- */

export interface PrivacyContent {
    meta: PageMeta;
    head: PageHead;
    /** The notice at the top; `{date}` is replaced by `asOf` */
    notice: string;
    /** The month the page describes the product as of: update it when the page is published */
    asOf: string;
    /** The heading of the list of this page's sections */
    contentsLabel: string;
    stores: TableSection & { servers: Slot; notDone: Para };
    access: TableSection;
    providers: TableSection;
    retention: TableSection;
    selfHosted: ProseSection;
    tracing: ProseSection;
    website: TableSection;
    questions: { id: string; heading: string; emailLine: string; noEmail: string; address: string };
}

/* ----- results ----- */

export interface ResultsContent {
    meta: PageMeta;
    title: string;
    lede: string;
    /** When the next comparison is planned */
    nextRun: Slot;
    method: ProseSection & { groupsIntro: string; groups: Para[]; caveats: Para };
    cases: {
        id: string;
        heading: string;
        intro: string;
        columns: string[];
        /** The one row of the empty table */
        empty: string;
        caption: string;
        /** On a phone, under the table: it scrolls sideways */
        scrollHint: string;
        /** What each column holds */
        legend: TableSection;
    };
    sofar: { id: string; heading: string; intro: string; run: RunLine; after: string; link: Cta };
}

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
    /** Rendered only once it is a real address (a value starting with "TODO" is hidden) */
    contactEmail: string;
    /** The footer's one line about who we are */
    footerLine: string;
    /** The phone menu's button */
    menuLabel: string;
    /** The keyboard skip link at the top of every page */
    skipLink: string;
    nav: NavItem[];
    footerNav: NavItem[];
    cta: CtaLabels;
    /** Words the shared components put around the sample data */
    labels: { rows: CriterionRowsLabels; desk: DeskLabels };
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

/* ---------------------------------------------------------------------------------------------
   Section shapes for designed pages. General on purpose: any page can compose them. The shared
   components in components/site/ render them; a page module (home.ts, sample.ts, ...) fills them.
   --------------------------------------------------------------------------------------------- */

/** Page metadata: the browser title and the search/social description. */
export interface PageMeta {
    title: string;
    description: string;
}

/** The first screen: the h1 (one string per line), the paragraph under it, one or two links. */
export interface Hero {
    title: string[];
    lede: string;
    primary: Cta;
    secondary?: Cta;
}

/** An image's description for screen readers and the caption under it. */
export interface Figure {
    alt: string;
    caption: string;
}

/** One sentence of fact with its figures, shown under a hero. `source` is for editors only. */
export interface RunLine {
    text: string;
    source: string;
}

/** A paragraph, optionally with a bold lead-in ("Round 1.") */
export interface Para {
    lead?: string;
    body: string;
}

/** A heading with paragraphs and an optional link at the end. */
export interface ProseSection {
    id: string;
    heading: string;
    body: Para[];
    link?: Cta;
}

/** One answer shown as rows of the answer book, one row per point of the marking scheme.
 *  The marks, points and reasons come from the sample data; only the words around them live here. */
export interface AnswerRows {
    /** The question's label in the sample data, e.g. "24(b)" */
    question: string;
    /** Under the rows: which page, and whose ticks are on it */
    caption: string;
    /** Sentences under a point, keyed by the point's id in the sample data (the id is never shown) */
    notes?: Record<string, string>;
}

/** A section built from answer rows, e.g. "One answer, marked". */
export interface CriterionRowsSection {
    id: string;
    heading: string;
    intro: Para[];
    answers: AnswerRows[];
    /** Paragraphs after the rows */
    after?: Para[];
    link?: Cta;
}

/** Words the answer rows need around the marks (shared by every page that shows rows). */
export interface CriterionRowsLabels {
    /** Where a point's evidence is the same line as the point above */
    sameLine: string;
    /** For an alternative the student did not attempt */
    notAttempted: string;
    /** For screen readers, around a mark: "{score} out of {max}" */
    outOf: string;
    /** For screen readers, before a question label */
    question: string;
    /** Under a crop: "Page {page}" */
    page: string;
}

/** A sequence of steps, rendered as a numbered list: only for content that really is a sequence. */
export interface StepsSection {
    id: string;
    heading: string;
    steps: { title: string; body: string }[];
    link?: Cta;
}

/** A "sent to you" slip. Always an illustration, and its caption says so. */
export interface SlipContent {
    label: string;
    reason: string;
    detail: string;
    caption: string;
}

/** A list of reasons, a slip as an illustration, and one real answer beside it. */
export interface ReasonsSection {
    id: string;
    heading: string;
    intro: string;
    items: string[];
    after: string;
    slip: SlipContent;
    example: AnswerRows & { heading: string; body: string[] };
}

/** Who the site is for: short paragraphs with a link each (not cards). */
export interface AudiencesSection {
    id: string;
    heading: string;
    audiences: { name: string; body: string; link: Cta }[];
}

/** The honest section: what works today, what goes to the teacher, what doesn't work yet. */
export interface HonestSection {
    id: string;
    heading: string;
    intro: string;
    groups: { heading: string; items: string[] }[];
}

/** The closing call to action: the page's one next step, repeated. */
export interface ClosingCta {
    heading: string;
    body: string;
    cta: Cta;
}

/** The "For examiner's use only" grid: a plain table with a caption. A row marked `illustration`
 *  is drawn dashed and must say in its cells that it is one. */
export interface ExaminerGridContent {
    heading: string;
    caption: string;
    columns: string[];
    rows: { cells: string[]; illustration?: boolean }[];
}

/** One answer on the product's review desk: page viewer, answer card, examiner rounds. */
export interface DeskSection {
    id: string;
    heading: string;
    /** The question as the paper words it (shortened if needed) */
    question?: string;
    /** Paragraphs before the desk */
    intro: Para[];
    /** The question's label in the sample data */
    answer: string;
    /** Answer book pages to show, in order */
    pages: number[];
    /** What is on each page, in the viewer's caption */
    pageCaptions: Record<number, string>;
    /** Notes under the page viewer */
    notes: Para[];
    /** Show the examiner rounds open, at full width under the desk */
    roundsBelow?: boolean;
    /** Paragraphs after the desk */
    after?: Para[];
}

/** Labels the review desk adds around the product's own UI. */
export interface DeskLabels {
    /** The rounds panel's title, as in the product: "Examiner discussion" */
    discussion: string;
    /** Singular and plural: "round", "rounds" */
    rounds: [string, string];
    /** As in the product's panel: "agreement" */
    agreement: string;
    /** The viewer's heading for screen readers */
    pages: string;
}

export interface HomeContent {
    meta: PageMeta;
    hero: Hero;
    heroFigure: Figure;
    runLine: RunLine;
    marked: CriterionRowsSection;
    steps: StepsSection;
    wrong: CriterionRowsSection;
    reasons: ReasonsSection;
    audiences: AudiencesSection;
    honest: HonestSection;
    closing: ClosingCta;
}

export interface SampleContent {
    meta: PageMeta;
    title: string;
    lede: string;
    lookingAt: ProseSection & { source: string };
    reading: { id: string; heading: string; intro: string; items: Para[]; after: string };
    desks: DeskSection[];
    correction: ProseSection;
    escalation: ProseSection & { slip: SlipContent };
    closing: ClosingCta;
}

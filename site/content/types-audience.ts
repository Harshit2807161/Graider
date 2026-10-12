/** Section shapes for the audience pages (/schools, /professors, /investors). They build on the shapes
 *  in types.ts; anything that fits one of those is used as is. */

import type {
    ClosingCta,
    CriterionRowsSection,
    Cta,
    Hero,
    HonestSection,
    PageMeta,
    Para,
    ProseSection,
    StepsSection,
} from "./types";

/** One objection and its answer. The answer is always visible (no accordion). */
export interface FaqItem {
    question: string;
    answer: string[];
    link?: Cta;
}

/** Questions an audience asks first, as plain headings with their answers. */
export interface FaqSection {
    id: string;
    heading: string;
    items: FaqItem[];
}

/** The pilot in short: its terms as bold-led points, what we need, and a link to /pilot/. */
export interface PilotSummary {
    id: string;
    heading: string;
    terms: Para[];
    needs: Para;
    link: Cta;
}

/** A heading with a list of points (each with an optional bold lead-in), e.g. what exists today. */
export interface ListSection {
    id: string;
    heading: string;
    intro?: Para[];
    items: Para[];
    after?: Para[];
    link?: Cta;
}

/** Steps with paragraphs after them (e.g. settings that apply to every step). */
export type StepsWithAfter = StepsSection & { after?: Para[] };

/** The closing call to action with a line under the button (who is behind it). */
export type ClosingWithNote = ClosingCta & { note?: string };

export interface SchoolsContent {
    meta: PageMeta;
    hero: Hero;
    steps: StepsSection;
    teachers: CriterionRowsSection;
    honest: HonestSection;
    pilot: PilotSummary;
    faq: FaqSection;
    closing: ClosingCta;
}

export interface ProfessorsContent {
    meta: PageMeta;
    hero: Hero;
    method: StepsWithAfter;
    check: CriterionRowsSection;
    disagree: ProseSection;
    models: ProseSection;
    compare: ProseSection;
    honest: HonestSection;
    faq: FaqSection;
    closing: ClosingCta;
}

export interface InvestorsContent {
    meta: PageMeta;
    hero: Hero;
    job: ProseSection;
    whyNow: ProseSection;
    exists: ListSection;
    measured: ProseSection;
    next: StepsSection;
    closing: ClosingWithNote;
}

/** Where the home page puts Gr8r's marks on the sample's scanned pages.
 *
 *  HAND-PLACED, like content/sample-marks.ts (which this builds on): the product stores no bounding
 *  boxes. Boxes are % of the page image (1348 x 954 px); `ruleX` / `ruleRight` are the pixel columns
 *  of the page's printed red margin rules, measured on the images, so a strip can line its printed
 *  margin up with the site's own. Scores, points and reasons come from the grade record, never here. */

import { CROPS, HERO_MARKS, type Box } from "@/content/sample-marks";
import { sampleQuestion } from "@/lib/sample";

/** Centre of the printed red double rule on the left of each page, and the one on the right (px). */
export const PAGE_RULES: Record<number, { left: number; right: number }> = {
    4: { left: 216, right: 1214 },
    7: { left: 149, right: 1147 },
    23: { left: 149, right: 1137 },
    24: { left: 205, right: 1205 },
};

export interface SheetPoint {
    /** The point's id in the grade record (never shown) */
    id: string;
    page: number;
    bands: Box[];
    /** Where Gr8r's mark sits on the page: left edge and vertical centre, % of the page */
    mark: { left: number; top: number };
    /** A ring drawn round words the reader missed (no band: nothing earned the mark) */
    missed?: Box;
}

export interface HeroSheet {
    question: string;
    pages: number[];
    points: SheetPoint[];
}

const centre = (bands: Box[]) => {
    const top = Math.min(...bands.map((b) => b.y));
    const bottom = Math.max(...bands.map((b) => b.y + b.h));
    return (top + bottom) / 2;
};

/** The three answers the hero's tabs switch between. */
export const HERO_SHEETS: HeroSheet[] = [
    {
        question: "24(b)",
        pages: [7],
        points: HERO_MARKS.criteria.map((c) => ({
            id: c.id,
            page: 7,
            bands: c.bands,
            mark: { left: HERO_MARKS.marginLeft, top: c.markTop },
        })),
    },
    {
        // The working sits in the left half of page 4; the right margin is narrow, so the marks sit in
        // the empty space right of the working, where CBSE's examiner put the ticks.
        question: "21",
        pages: [4],
        points: [
            { id: "c1", page: 4, bands: CROPS["21/c1"].bands, mark: { left: 50, top: 22.5 } },
            { id: "c2", page: 4, bands: CROPS["21/c1"].bands, mark: { left: 50, top: 31 } },
            { id: "c3", page: 4, bands: CROPS["21/c3"].bands, mark: { left: 48, top: 64.6 } },
        ],
    },
    {
        question: "35(a)",
        pages: [23, 24],
        points: [
            { id: "c1", page: 23, bands: CROPS["35(a)/c1"].bands, mark: { left: 85.4, top: centre(CROPS["35(a)/c1"].bands) } },
            { id: "c2", page: 23, bands: CROPS["35(a)/c2"].bands, mark: { left: 85.4, top: centre(CROPS["35(a)/c2"].bands) } },
            { id: "c3", page: 23, bands: CROPS["35(a)/c3"].bands, mark: { left: 85.4, top: centre(CROPS["35(a)/c3"].bands) } },
            { id: "c4", page: 24, bands: CROPS["35(a)/c4"].bands, mark: { left: 90.2, top: centre(CROPS["35(a)/c4"].bands) } },
            {
                id: "c5", page: 24, bands: [], mark: { left: 90.2, top: 53.4 },
                // "vasectomy" on the line the reader set aside
                missed: { x: 53.6, y: 48.4, w: 20.4, h: 9.0 },
            },
        ],
    },
];

/* ---------------------------------------------------------------------------------------------
   The full-bleed strips between sections: a band of one page at reading size
   --------------------------------------------------------------------------------------------- */

export interface StripSpec {
    question: string;
    point: string;
    page: number;
    /** First and last image row shown, px of the page image */
    y0: number;
    y1: number;
    bands: Box[];
}

export const STRIPS: StripSpec[] = [
    // "(II) Fallopian tube → It is the site of fertilisation of female gamete (egg) and male gamete (sperm)."
    { question: "35(a)", point: "c2", page: 23, y0: 412, y1: 576, bands: CROPS["35(a)/c2"].bands },
    // "(ii) Two contraceptive methods used by males → (a) Mechanical barriers – condoms"
    { question: "35(a)", point: "c4", page: 24, y0: 186, y1: 330, bands: CROPS["35(a)/c4"].bands },
];

/* ---------------------------------------------------------------------------------------------
   Reading the grade record
   --------------------------------------------------------------------------------------------- */

export interface PointRecord {
    id: string;
    description: string;
    points: number;
    score: number | null;
    evidence: string | null;
    justification: string | null;
}

/** A question's points with Gr8r's mark for each, in the marking scheme's order. */
export function pointsOf(label: string): { label: string; text: string; max: number; score: number | null; points: PointRecord[] } {
    const q = sampleQuestion(label);
    if (!q) throw new Error(`Sample question ${label} is missing from content/sample-data/review.json`);
    const scored = new Map((q.grade?.criteria ?? []).map((c) => [c.id, c]));
    return {
        label: q.label,
        text: q.text,
        max: q.max_score,
        score: q.grade?.score ?? null,
        points: (q.rubric_spec?.spec.criteria ?? []).map((c) => {
            const r = scored.get(c.id);
            return {
                id: c.id,
                description: c.description,
                points: c.points,
                score: r?.score ?? null,
                evidence: r?.evidence || null,
                justification: r?.justification ?? null,
            };
        }),
    };
}

export interface RoundRecord {
    round: number;
    graderTotal: number;
    examinerTotal: number;
    /** The one point the two were apart on, per round */
    point: { id: string; grader: number; examiner: number } | null;
}

/** The examiner rounds of a question, with the point they argued over (the first one ever apart). */
export function roundsOf(label: string): { max: number; contested: string | null; rounds: RoundRecord[] } {
    const q = sampleQuestion(label);
    const rounds = q?.grade?.rounds ?? [];
    const contested = rounds.find((r) => r.criteria_apart.length > 0)?.criteria_apart[0] ?? null;
    return {
        max: q?.max_score ?? 0,
        contested,
        rounds: rounds.map((r) => {
            const g = r.grader.find((c) => c.id === contested);
            const e = r.evaluator.find((c) => c.id === contested);
            return {
                round: r.round + 1,
                graderTotal: r.grader_total,
                examinerTotal: r.evaluator_total,
                point: contested && g && e ? { id: contested, grader: g.score, examiner: e.score } : null,
            };
        }),
    };
}

/** "1/1" split for display: the score large, "/max" small. */
export function fmtMark(n: number | null | undefined): string {
    return n == null ? "–" : Number(n.toFixed(2)).toString();
}

/** Where each criterion's evidence sits on the scanned pages.
 *
 *  HAND-PLACED. The product stores no bounding boxes, so every crop and every highlight band below
 *  was placed by eye on the 1348 x 954 page images in `public/sample/pages/` (p04, p23, p24). Values
 *  are percentages of the whole page (x, w of its width; y, h of its height). If the page images are
 *  re-rendered at another size or crop, these must be placed again. */

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Crop {
    page: number;
    /** What the crop shows on a tablet or desktop: the evidence lines with their heading */
    wide: Box;
    /** What it shows on a phone: the few words that carry the mark, large enough to read */
    tight: Box;
    /** Highlighter bands over the words quoted as evidence (none when nothing earned the mark) */
    bands: Box[];
}

export interface Line {
    question: string;
    criterionId: string;
    /** Absent when the evidence is a line already shown in the row above */
    crop?: Crop;
}

/** Size of the page images, for aspect ratios. */
export const PAGE = { width: 1348, height: 954 } as const;

export const LINES: Line[] = [
    {
        question: "35(a)", criterionId: "c1",
        crop: {
            page: 23,
            wide: { x: 11.5, y: 23.3, w: 68.6, h: 17.8 },
            tight: { x: 16.7, y: 27.0, w: 50.4, h: 9.9 },
            bands: [
                { x: 17.2, y: 28.3, w: 61.8, h: 3.8 },
                { x: 16.9, y: 32.5, w: 56.2, h: 3.8 },
                { x: 18.1, y: 36.5, w: 18.4, h: 3.6 },
            ],
        },
    },
    {
        question: "35(a)", criterionId: "c2",
        crop: {
            page: 23,
            wide: { x: 11.5, y: 44.5, w: 72.3, h: 14.4 },
            tight: { x: 16.2, y: 48.4, w: 49.5, h: 10.0 },
            bands: [
                { x: 16.7, y: 49.3, w: 66.4, h: 4.2 },
                { x: 16.3, y: 53.7, w: 64.4, h: 4.2 },
            ],
        },
    },
    {
        question: "35(a)", criterionId: "c3",
        crop: {
            page: 23,
            wide: { x: 11.1, y: 61.8, w: 73.1, h: 34.6 },
            tight: { x: 14.8, y: 65.2, w: 30.0, h: 9.9 },
            bands: [
                { x: 17.2, y: 66.2, w: 58.6, h: 4.0 },
                { x: 16.3, y: 70.4, w: 67.5, h: 4.2 },
                { x: 15.2, y: 74.8, w: 64.3, h: 4.0 },
                { x: 15.9, y: 79.0, w: 61.6, h: 4.3 },
                { x: 15.7, y: 83.5, w: 63.6, h: 4.0 },
                { x: 15.1, y: 87.7, w: 58.8, h: 4.0 },
                { x: 16.3, y: 91.7, w: 63.8, h: 4.0 },
            ],
        },
    },
    {
        question: "35(a)", criterionId: "c4",
        crop: {
            page: 24,
            wide: { x: 10.0, y: 20.4, w: 75.3, h: 10.5 },
            tight: { x: 22.1, y: 24.7, w: 51.7, h: 6.1 },
            bands: [{ x: 22.6, y: 25.7, w: 50.7, h: 4.2 }],
        },
    },
    {
        // Nothing earned this mark, so no band: the crop shows what the reading set aside
        question: "35(a)", criterionId: "c5",
        crop: {
            page: 24,
            wide: { x: 10.0, y: 46.1, w: 76.0, h: 17.3 },
            tight: { x: 15.7, y: 46.3, w: 56.1, h: 9.4 },
            bands: [],
        },
    },
    {
        question: "21", criterionId: "c1",
        crop: {
            page: 4,
            wide: { x: 16.3, y: 20.1, w: 29.7, h: 9.7 },
            tight: { x: 16.3, y: 20.1, w: 29.7, h: 9.7 },
            bands: [{ x: 17.1, y: 21.5, w: 16.9, h: 7.0 }],
        },
    },
    { question: "21", criterionId: "c2" },
    {
        question: "21", criterionId: "c3",
        crop: {
            page: 4,
            wide: { x: 16.5, y: 61.3, w: 72.5, h: 16.0 },
            tight: { x: 16.9, y: 61.6, w: 48.4, h: 15.3 },
            bands: [
                { x: 18.5, y: 62.7, w: 20.6, h: 4.9 },
                { x: 17.2, y: 67.9, w: 71.4, h: 4.4 },
                { x: 18.9, y: 72.5, w: 46.0, h: 3.8 },
            ],
        },
    },
];

/** What each crop shows, for screen readers (the student's words as written, spelling kept). */
export const ALT: Record<string, string> = {
    "35(a)/c1": "Page 23, the student's handwriting: “(I) Ovary → Produces female gametes, eggs which take part in the process of fertilisation.”",
    "35(a)/c2": "Page 23: “(II) Fallopian tube → It is the site of fertilisation of female gamete (egg) and male gamete (sperm).”",
    "35(a)/c3": "Page 23: “(III) Uterus → Provides nutrients for nourishment of foetus. It has thick and spongy lining which provides necessary conditions if egg is fertilised. During pregnancy Placenta develops which helps to provide nutrients from mother's body and removal of waste from body of foetus.”",
    "35(a)/c4": "Page 24: “(ii) Two contraceptive methods used by males → (a) Mechanical barriers – condoms”",
    "35(a)/c5": "Page 24: a struck-out “(b) Intra-uter”, then “(b) Surgical method → vasectomy. In this the vas deferens of male is blocked, which prevents sperm transfer.”",
    "21/c1": "Page 4, the first line of working: 1/v − 1/10 = −1/15",
    "21/c3": "Page 4: “v = +30 cm. Position of image formed by mirror = +30 cm on the other side of mirror.”",
};

export function linesFor(question: string): Line[] {
    return LINES.filter((line) => line.question === question);
}

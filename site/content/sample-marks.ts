/** Where Gr8r’s evidence and marks sit on the sample’s scanned pages, and what each page shows.
 *
 *  HAND-PLACED. The product stores no bounding boxes, so every band, crop and mark position below was
 *  placed by eye on the page images in `public/sample/pages/` (1348 x 954 px each) and checked with
 *  an overlay. All values are percentages of the whole page: x / left and w / width of its width,
 *  y / top and h / height of its height, so they stay on the same words at any rendered size.
 *  If a page image is re-rendered or re-cropped, place them again.
 *
 *  Scores, points and reasons are not here: they come from the grade record (sample-data/review.json).
 *  The alt texts are copy: the student’s words as written, spelling kept. */

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Size of every image in public/sample/pages/ */
export const PAGE_IMAGE = { width: 1348, height: 954 } as const;

/** The image file for a scanned page number. */
export function pageSrc(page: number): string {
    return `/sample/pages/p${String(page).padStart(2, "0")}.webp`;
}

/** What each scanned page shows, for screen readers. */
export const PAGE_ALT: Record<number, string> = {
    4: "Page 4 of the answer book: the student’s working for question 21 with the mirror formula, ending v = +30 cm, with the CBSE examiner’s red ticks.",
    7: "Page 7 of the answer book: the student’s handwritten answer to question 24(b), why transport in plants is slower than in animals and what phloem does, in blue ink on ruled paper with a red margin and the CBSE examiner’s red ticks.",
    23: "Page 23 of the answer book: the student’s handwritten answer to question 35(a)(i), the functions of the ovary, fallopian tube and uterus, with the CBSE examiner’s red ticks.",
    24: "Page 24 of the answer book: the answer to 35(a)(ii), two male contraceptive methods, condoms and vasectomy, with a struck-out false start between them and the CBSE examiner’s red ticks.",
};

/* ---------------------------------------------------------------------------------------------
   The home page’s examined page: Q24(b) on page 7
   --------------------------------------------------------------------------------------------- */

export interface SheetMarks {
    page: number;
    question: string;
    /** Left edge of the margin column the marks sit in (right of the printed red rule), % of width */
    marginLeft: number;
    criteria: {
        /** The point’s id in the grade record (never shown) */
        id: string;
        /** Highlighter bands over the quoted evidence, one per handwritten line, in reading order */
        bands: Box[];
        /** Vertical centre of the margin mark, % of height */
        markTop: number;
    }[];
}

export const HERO_MARKS: SheetMarks = {
    page: 7,
    question: "24(b)",
    marginLeft: 86.6,
    criteria: [
        {
            // "The transport system in plants is relatively slower than in animals because plants are mainly
            //  composed of dead cells. Plants are stationary and don’t require energy to perform activities
            //  when compared to humans animals."
            id: "c1",
            bands: [
                { x: 12.2, y: 25.0, w: 67.4, h: 4.4 },
                { x: 12.9, y: 29.6, w: 68.5, h: 4.2 },
                { x: 12.6, y: 34.0, w: 63.5, h: 4.0 },
                { x: 12.6, y: 38.2, w: 66.0, h: 4.2 },
                { x: 13.7, y: 41.6, w: 69.8, h: 4.8 },
            ],
            markTop: 35.7,
        },
        {
            // "Phloem is a vascular tissue mainly composed of living cells. It helps in translocation of food.
            //  This means to transport of soluble products of photosynthesis, amino acids and hormones in plants."
            id: "c2",
            bands: [
                { x: 12.2, y: 67.6, w: 70.0, h: 4.2 },
                { x: 12.2, y: 72.0, w: 69.5, h: 4.2 },
                { x: 12.2, y: 76.3, w: 68.5, h: 4.2 },
                { x: 12.2, y: 80.6, w: 72.8, h: 4.2 },
                { x: 12.2, y: 84.8, w: 14.0, h: 4.2 },
            ],
            markTop: 77.5,
        },
    ],
};

/* ---------------------------------------------------------------------------------------------
   Crops for the answer rows: one window onto the page per point of the marking scheme
   --------------------------------------------------------------------------------------------- */

export interface Crop {
    page: number;
    /** What the crop shows on a tablet or desktop: the evidence lines */
    wide: Box;
    /** What it shows on a phone: the words that carry the mark, large enough to read */
    tight: Box;
    /** Highlighter bands over the quoted words (none when nothing earned the mark) */
    bands: Box[];
    alt: string;
}

/** Crops by "question/point id". A point without a crop is shown with its quote as text. */
export const CROPS: Record<string, Crop> = {
    "24(b)/c1": {
        page: 7,
        wide: { x: 4.5, y: 19.8, w: 81.0, h: 27.2 },
        tight: { x: 12.0, y: 33.4, w: 47.3, h: 4.8 },
        bands: HERO_MARKS.criteria[0].bands,
        alt: "Page 7, the student’s handwriting: “(b)(i) The transport system in plants is relatively slower than in animals because plants are mainly composed of dead cells. Plants are stationary and don’t require energy to perform activities when compared to animals.”",
    },
    "24(b)/c2": {
        page: 7,
        wide: { x: 4.5, y: 65.5, w: 81.0, h: 24.0 },
        tight: { x: 35.8, y: 71.8, w: 46.5, h: 4.6 },
        bands: HERO_MARKS.criteria[1].bands,
        alt: "Page 7: “(ii) Phloem is a vascular tissue mainly composed of living cells. It helps in translocation of food. This means to transport of soluble products of photosynthesis, amino acids and hormones in plants.”",
    },
    "21/c1": {
        page: 4,
        wide: { x: 16.3, y: 20.1, w: 29.7, h: 9.7 },
        tight: { x: 16.3, y: 20.1, w: 29.7, h: 9.7 },
        bands: [{ x: 17.1, y: 21.5, w: 16.9, h: 7.0 }],
        alt: "Page 4, the first line of working: 1/v − 1/10 = −1/15",
    },
    "21/c3": {
        page: 4,
        wide: { x: 16.5, y: 61.3, w: 72.5, h: 16.0 },
        tight: { x: 16.9, y: 61.6, w: 48.4, h: 15.3 },
        bands: [
            { x: 18.5, y: 62.7, w: 20.6, h: 4.9 },
            { x: 17.2, y: 67.9, w: 71.4, h: 4.4 },
            { x: 18.9, y: 72.5, w: 46.0, h: 3.8 },
        ],
        alt: "Page 4: “v = +30 cm. Position of image formed by mirror = +30 cm on the other side of mirror.”",
    },
    "35(a)/c1": {
        page: 23,
        wide: { x: 11.5, y: 23.3, w: 68.6, h: 17.8 },
        tight: { x: 16.7, y: 27.0, w: 50.4, h: 9.9 },
        bands: [
            { x: 17.2, y: 28.3, w: 61.8, h: 3.8 },
            { x: 16.9, y: 32.5, w: 56.2, h: 3.8 },
            { x: 18.1, y: 36.5, w: 18.4, h: 3.6 },
        ],
        alt: "Page 23, the student’s handwriting: “(I) Ovary → Produces female gametes, eggs which take part in the process of fertilisation.”",
    },
    "35(a)/c2": {
        page: 23,
        wide: { x: 11.5, y: 44.5, w: 72.3, h: 14.4 },
        tight: { x: 16.2, y: 48.4, w: 49.5, h: 10.0 },
        bands: [
            { x: 16.7, y: 49.3, w: 66.4, h: 4.2 },
            { x: 16.3, y: 53.7, w: 64.4, h: 4.2 },
        ],
        alt: "Page 23: “(II) Fallopian tube → It is the site of fertilisation of female gamete (egg) and male gamete (sperm).”",
    },
    "35(a)/c3": {
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
        alt: "Page 23: “(III) Uterus → Provides nutrients for nourishment of foetus. It has thick and spongy lining which provides necessary conditions if egg is fertilised. During pregnancy Placenta develops which helps to provide nutrients from mother’s body and removal of waste from body of foetus.”",
    },
    "35(a)/c4": {
        page: 24,
        wide: { x: 10.0, y: 20.4, w: 75.3, h: 10.5 },
        tight: { x: 22.1, y: 24.7, w: 51.7, h: 6.1 },
        bands: [{ x: 22.6, y: 25.7, w: 50.7, h: 4.2 }],
        alt: "Page 24: “(ii) Two contraceptive methods used by males → (a) Mechanical barriers – condoms”",
    },
    "35(a)/c5": {
        // Nothing earned this mark, so no band: the crop shows the line the reading set aside
        page: 24,
        wide: { x: 10.0, y: 46.1, w: 76.0, h: 17.3 },
        tight: { x: 15.7, y: 46.3, w: 56.1, h: 9.4 },
        bands: [],
        alt: "Page 24: a struck-out “(b) Intra-uter”, then “(b) Surgical method → vasectomy. In this the vas deferens of male is blocked, which prevents sperm transfer.”",
    },
};

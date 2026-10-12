/** Where Gr8r's marks sit on the hero scan (page 23, question 35(a)).
 *
 *  HAND-PLACED. The product stores no bounding boxes, so every number below was placed by eye on
 *  `public/sample/pages/p23.webp` (1348 x 954 px) and checked with an overlay. All values are
 *  percentages of the image's width (left, width) and height (top, height), so they stay on the same
 *  words at any rendered size. If the image is re-rendered or re-cropped, place them again.
 *
 *  Scores and criterion ids are not here: they come from the grade record (`review.json`). */

export interface Band {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface CriterionMarks {
    /** Criterion id in the grade record, e.g. "c1" */
    id: string;
    /** Highlighter bands over the evidence quote, one per handwritten line, in reading order */
    bands: Band[];
    /** Vertical centre of the margin mark, % of image height */
    markTop: number;
}

export interface SheetMarks {
    image: { src: string; width: number; height: number; page: number };
    question: string;
    /** Left edge of the examiner's margin column (right of the printed red rule), % of width */
    marginLeft: number;
    criteria: CriterionMarks[];
    /** The "sent to you" slip, clipped over the top right of the page */
    slip: { left: number; top: number; width: number };
}

export const HERO_MARKS: SheetMarks = {
    image: { src: "/sample/pages/p23.webp", width: 1348, height: 954, page: 23 },
    question: "35(a)",
    marginLeft: 86.6,
    criteria: [
        {
            // "Produces female gametes ,eggs which take part in the the process of fertilisation."
            id: "c1",
            bands: [
                { left: 17.2, top: 27.7, width: 61.6, height: 4.2 },
                { left: 16.8, top: 32.1, width: 56.1, height: 4.2 },
                { left: 18.1, top: 36.3, width: 18.5, height: 4.0 },
            ],
            markTop: 32.4,
        },
        {
            // "It is the site of fertilisation of female gamete (egg) and male gamete (sperm)."
            id: "c2",
            bands: [
                { left: 16.6, top: 49.1, width: 66.5, height: 4.4 },
                { left: 16.3, top: 53.5, width: 64.4, height: 4.4 },
            ],
            markTop: 53.6,
        },
        {
            // "Provides nutrients for nourishment of foetus. ... removal of waste from body of foetus."
            id: "c3",
            bands: [
                { left: 17.2, top: 66.5, width: 58.5, height: 4.2 },
                { left: 16.3, top: 70.6, width: 67.5, height: 4.2 },
                { left: 15.3, top: 74.8, width: 64.2, height: 4.4 },
                { left: 16.0, top: 79.2, width: 61.3, height: 4.2 },
                { left: 16.0, top: 83.4, width: 63.4, height: 4.4 },
                { left: 15.0, top: 87.8, width: 63.1, height: 4.2 },
                { left: 16.5, top: 91.8, width: 63.6, height: 4.2 },
            ],
            markTop: 81.2,
        },
    ],
    // Over the printed dot code at the top right: covers no writing
    slip: { left: 57, top: -2.5, width: 36 },
};

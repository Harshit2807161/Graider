import type { CSSProperties } from "react";
import type { Figure } from "@/content/types";
import { HERO_MARKS, PAGE_IMAGE, pageSrc, pageSrcSmall, type SheetMarks } from "@/content/sample-marks";
import { withBase } from "@/lib/base";
import { sampleQuestion } from "@/lib/sample";
import { markText } from "./format";
import styles from "./ExaminedPage.module.css";

// The page's one load moment (ms): each point's highlight bands sweep in line by line, then its red
// mark appears in the margin; then the next point. About 1.2 s in all. The CSS durations (band
// 200 ms, mark 220 ms) match these numbers; under reduced motion the final state shows at once.
const START = 150;
const LINE_STEP = 60;
const BAND_TIME = 200;
const NEXT_POINT = 60;

type Timed = CSSProperties & { "--delay": string };
const at = (ms: number): Timed => ({ "--delay": `${Math.round(ms)}ms` });
const pct = (n: number) => `${n}%`;

function sequence(marks: SheetMarks) {
    const timeline: { bands: number[]; mark: number }[] = [];
    let t = START;
    for (const c of marks.criteria) {
        const bands = c.bands.map((_, i) => t + i * LINE_STEP);
        const mark = t + (c.bands.length - 1) * LINE_STEP + BAND_TIME;
        timeline.push({ bands, mark });
        t = mark + NEXT_POINT;
    }
    return timeline;
}

/** A real scanned page with Gr8r's marks on it: yellow bands on the words quoted as evidence and a
 *  red tick and mark per point in the margin. Scores come from the grade record; positions from the
 *  hand-placed marks in content/sample-marks.ts. The marks are drawn for sighted readers; the alt
 *  text says what they are. */
export default function ExaminedPage({ figure, marks = HERO_MARKS }: { figure: Figure; marks?: SheetMarks }) {
    const q = sampleQuestion(marks.question);
    const points = new Map((q?.rubric_spec?.spec.criteria ?? []).map((c) => [c.id, c.points]));
    const scored = new Map((q?.grade?.criteria ?? []).map((c) => [c.id, c.score]));
    const timeline = sequence(marks);

    return (
        <figure className={styles.figure}>
            <div className={styles.sheet}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                <img src={withBase(pageSrc(marks.page))}
                     srcSet={`${withBase(pageSrcSmall(marks.page))} 720w, ${withBase(pageSrc(marks.page))} 1348w`}
                     sizes="(max-width: 820px) 100vw, 624px"
                     width={PAGE_IMAGE.width} height={PAGE_IMAGE.height} alt={figure.alt}
                     className={styles.scan} fetchPriority="high" decoding="async" />
                <div className={styles.marks} aria-hidden="true">
                    {marks.criteria.map((c, ci) => (
                        <div key={c.id}>
                            {c.bands.map((b, bi) => (
                                <span key={bi} className={styles.band} style={{
                                    left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h),
                                    ...at(timeline[ci].bands[bi]),
                                }} />
                            ))}
                            <span className={styles.mark} style={{ left: pct(marks.marginLeft), top: pct(c.markTop), ...at(timeline[ci].mark) }}>
                                <svg className={styles.tick} viewBox="0 0 24 24" focusable="false">
                                    <path d="M3 13.5 L9 19.5 L21.5 4.5" pathLength={1} />
                                </svg>
                                <span className={styles.score}>{markText(scored.get(c.id), points.get(c.id))}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <figcaption className={styles.caption}>{figure.caption}</figcaption>
        </figure>
    );
}

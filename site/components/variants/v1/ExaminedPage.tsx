import type { CSSProperties } from "react";
import { escalationText } from "@product/types/review.types";
import { fmt } from "@product/components/features/review/format";
import { withBase } from "@/lib/base";
import { sampleQuestion } from "@/lib/sample";
import { v1 } from "./copy";
import { HERO_MARKS } from "./marks";
import Slip from "./Slip";
import styles from "./ExaminedPage.module.css";

// Load sequence (ms): each criterion's bands sweep in line by line, then its margin mark; the slip last.
// About 1.2 s in all; the CSS durations (band 200 ms, mark 220 ms) match these numbers.
const START = 150;
const LINE_STEP = 30;
const BAND_TIME = 200;
const AFTER_BANDS = -40;     // the mark starts as the last band finishes
const NEXT_CRITERION = 0;

type Timed = CSSProperties & { "--delay": string };
const at = (ms: number): Timed => ({ "--delay": `${Math.round(ms)}ms` });
const pct = (n: number) => `${n}%`;

/** When each band, each margin mark and the slip start, in reading order. */
function sequence() {
    const timeline: { bands: number[]; mark: number }[] = [];
    let t = START;
    for (const c of HERO_MARKS.criteria) {
        const bands = c.bands.map((_, i) => t + i * LINE_STEP);
        const mark = t + (c.bands.length - 1) * LINE_STEP + BAND_TIME + AFTER_BANDS;
        timeline.push({ bands, mark });
        t = mark + NEXT_CRITERION;
    }
    return { timeline, slipAt: t };
}

const { timeline, slipAt } = sequence();

/** The hero: the real scan of page 23 with Gr8r's marks for Q35(a) laid over it. Scores come from
 *  the grade record; positions from the hand-placed `HERO_MARKS`. */
export default function ExaminedPage() {
    const q = sampleQuestion(HERO_MARKS.question);
    const grade = q?.grade;
    const points = new Map((q?.rubric_spec?.spec.criteria ?? []).map((c) => [c.id, c.points]));
    const scored = new Map((grade?.criteria ?? []).map((c) => [c.id, c.score]));

    const { image } = HERO_MARKS;

    return (
        <figure className={styles.figure}>
            <div className={styles.sheet}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are unoptimized */}
                <img src={withBase(image.src)} width={image.width} height={image.height} alt={v1.hero.scanAlt}
                     className={styles.scan} fetchPriority="high" decoding="async" />

                <div className={styles.marks} aria-hidden="true">
                    {HERO_MARKS.criteria.map((c, ci) => {
                        const score = scored.get(c.id);
                        const max = points.get(c.id);
                        return (
                            <div key={c.id}>
                                {c.bands.map((b, bi) => (
                                    <span key={bi} className={styles.band} style={{
                                        left: pct(b.left), top: pct(b.top), width: pct(b.width), height: pct(b.height),
                                        ...at(timeline[ci].bands[bi]),
                                    }} />
                                ))}
                                <span className={styles.mark} style={{
                                    left: pct(HERO_MARKS.marginLeft), top: pct(c.markTop), ...at(timeline[ci].mark),
                                }}>
                                    <svg className={styles.tick} viewBox="0 0 24 24" focusable="false">
                                        <path d="M3 13.5 L9 19.5 L21.5 4.5" pathLength={1} />
                                    </svg>
                                    <span className={styles.score}>{fmt(score)}/{fmt(max)}</span>
                                    <span className={styles.criterion}>{c.id}</span>
                                </span>
                            </div>
                        );
                    })}
                </div>

                {grade?.escalation_reason && (
                    <div className={styles.slip} style={{
                        left: pct(HERO_MARKS.slip.left), top: pct(HERO_MARKS.slip.top), width: pct(HERO_MARKS.slip.width),
                        ...at(slipAt),
                    }}>
                        <Slip label={v1.hero.slipLabel} reason={escalationText(grade.escalation_reason)}
                              detail={`Q${HERO_MARKS.question}, proposed ${fmt(grade.score)} of ${fmt(q?.max_score)}`} compact />
                    </div>
                )}
            </div>
            <figcaption className={styles.caption}>{v1.hero.caption}</figcaption>
        </figure>
    );
}

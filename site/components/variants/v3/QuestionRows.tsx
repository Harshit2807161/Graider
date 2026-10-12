import type { CSSProperties, ReactNode } from "react";
import type { QuestionReview } from "@product/types/review.types";
import copy from "./copy";
import { markSpoken, markText } from "./format";
import { ALT, linesFor } from "./marks";
import ScanCrop from "./ScanCrop";
import styles from "./book.module.css";

/** Load sequence for the one animated answer (ms): each criterion's bands wipe in, a beat apart,
 *  then the red marks follow down the margin, then the answer's total at the top: about 1.2 s. */
const BAND_START = 100;
const BAND_STEP = 150;      // between criteria
const BAND_INNER = 30;      // between the lines of one quote
const MARK_START = 820;
const MARK_STEP = 50;

function Mark({ score, outOf, delay }: { score: number | null | undefined; outOf: number | null | undefined; delay?: number }) {
    return (
        <span className={styles.mark} style={delay != null ? ({ "--d": `${delay}ms` } as CSSProperties) : undefined}>
            <span aria-hidden="true">{markText(score)}<span className={styles.outOf}>/{markText(outOf)}</span></span>
            <span className="sr-only">{markSpoken(score, outOf)}</span>
        </span>
    );
}

/** One answer as rows of the book: the question with its total in the margin, then one row per
 *  criterion with the scan crop, what the criterion asks, and its mark in the margin. */
export default function QuestionRows({ q, animate = false, explain, heading }: {
    q: QuestionReview;
    animate?: boolean;
    /** Extra words under a criterion, by criterion id */
    explain?: Record<string, string>;
    /** A section heading set above the question, in the question's own row */
    heading?: ReactNode;
}) {
    const grade = q.grade;
    const spec = new Map((q.rubric_spec?.spec.criteria ?? []).map((c) => [c.id, c]));
    const scored = new Map((grade?.criteria ?? []).map((c) => [c.id, c]));
    const lines = linesFor(q.label);
    // The paper's text without its line breaks, and without the "(a)" the label already carries
    const part = /\(([a-z])\)$/.exec(q.label)?.[1];
    const text = q.text.replace(/\s+/g, " ").replace(part ? new RegExp(`^\\(${part}\\)\\s*`) : /^$/, "").replace(/\s+:/g, ":").trim();
    const totalDelay = MARK_START + lines.length * MARK_STEP + 40;

    return (
        <div className={animate ? styles.animated : undefined}>
            <div className={`${styles.row} ${heading ? styles.questionHead : ""}`}>
                <div className={styles.margin}>
                    <span className={styles.qno}><span className="sr-only">Question </span>{q.label}</span>
                    <Mark score={grade?.score} outOf={q.max_score} delay={animate ? totalDelay : undefined} />
                </div>
                <div className={styles.writing}>
                    {heading}
                    <p className={styles.questionText}>{text}</p>
                </div>
            </div>
            {lines.map((line, i) => {
                const criterion = spec.get(line.criterionId);
                const result = scored.get(line.criterionId);
                const delays = animate && line.crop
                    ? line.crop.bands.map((_, j) => BAND_START + i * BAND_STEP + j * BAND_INNER)
                    : undefined;
                const showReason = result != null && result.score === 0;
                return (
                    <div key={line.criterionId} className={styles.row}>
                        <div className={styles.margin}>
                            <Mark score={result?.score} outOf={criterion?.points} delay={animate ? MARK_START + i * MARK_STEP : undefined} />
                        </div>
                        <div className={`${styles.writing} ${styles.line}`}>
                            {line.crop ? (
                                <ScanCrop crop={line.crop} alt={ALT[`${q.label}/${line.criterionId}`] ?? ""}
                                          caption={copy.sample.pageLabel(line.crop.page)} delays={delays} />
                            ) : (
                                <p><mark className={styles.quote}>{result?.evidence}</mark></p>
                            )}
                            <div className={styles.criterion}>
                                <p>{criterion?.description}</p>
                                {!line.crop && <p className={styles.reason}>{copy.sample.sameLine}</p>}
                                {showReason && result?.justification && (
                                    <p className={styles.reason}><strong>Grader:</strong> {result.justification}</p>
                                )}
                                {explain?.[line.criterionId] && <p className={styles.reason}>{explain[line.criterionId]}</p>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

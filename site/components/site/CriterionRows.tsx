import type { AnswerRows } from "@/content/types";
import { CROPS } from "@/content/sample-marks";
import site from "@/content/site";
import { sampleQuestion } from "@/lib/sample";
import { fill, markSpoken, markText } from "./format";
import ScanCrop from "./ScanCrop";
import styles from "./CriterionRows.module.css";

function Mark({ score, max, muted = false }: { score: number | null | undefined; max: number | null | undefined; muted?: boolean }) {
    const [s, m] = markText(score, max).split("/");
    return (
        <span className={muted ? `${styles.mark} ${styles.markMuted}` : styles.mark}>
            <span aria-hidden="true">{s}<span className={styles.outOf}>/{m}</span></span>
            <span className="sr-only">{markSpoken(score, max)}</span>
        </span>
    );
}

/** The paper's question text on one line, without the "(b)" its label already carries. */
function questionText(label: string, text: string): string {
    const part = /\(([a-z])\)$/.exec(label)?.[1];
    const flat = text.replace(/\s+/g, " ").replace(/\s+([:?.,;])/g, "$1").trim();
    return part ? flat.replace(new RegExp(`^\\(${part}\\)\\s*`), "") : flat;
}

/** One answer as rows of the answer book: the question with Gr8r's mark for it, then one row per
 *  point of the marking scheme with its mark in the margin, a crop of the handwriting with the
 *  quoted words highlighted, the point in words and the marking model's one-line reason. On a phone
 *  the mark sits above its crop. Everything but `answer.caption` and `answer.notes` comes from the
 *  grade record. */
export default function CriterionRows({ answer, headingLevel = 3 }: { answer: AnswerRows; headingLevel?: 3 | 4 }) {
    const q = sampleQuestion(answer.question);
    if (!q) throw new Error(`Sample question ${answer.question} is missing from content/sample-data/review.json`);
    const labels = site.labels.rows;
    const grade = q.grade;
    const attempted = grade != null && grade.status !== "not_attempted";
    const criteria = q.rubric_spec?.spec.criteria ?? [];
    const scored = new Map((grade?.criteria ?? []).map((c) => [c.id, c]));
    const H = headingLevel === 3 ? "h3" : "h4";

    return (
        <article className={styles.answer} aria-labelledby={`answer-${q.question_id}`}>
            <div className={`${styles.row} ${styles.head}`}>
                <div className={styles.margin}>
                    <H id={`answer-${q.question_id}`} className={styles.qno}>
                        <span className="sr-only">{labels.question} </span>{q.label}
                    </H>
                    {attempted
                        ? <Mark score={grade.score} max={q.max_score} />
                        : <span className={styles.status}>{labels.notAttempted}</span>}
                </div>
                <div className={styles.writing}>
                    <p className={styles.questionText}>{questionText(q.label, q.text)}</p>
                </div>
            </div>

            {attempted && criteria.map((c, i) => {
                const result = scored.get(c.id);
                const crop = CROPS[`${q.label}/${c.id}`];
                const sameAsAbove = !crop && i > 0 && result?.evidence && result.evidence === scored.get(criteria[i - 1].id)?.evidence;
                const note = answer.notes?.[c.id];
                return (
                    <div key={c.id} className={styles.row}>
                        <div className={styles.margin}>
                            <Mark score={result?.score} max={c.points} />
                        </div>
                        <div className={`${styles.writing} ${styles.line}`}>
                            {crop ? (
                                <ScanCrop crop={crop} caption={fill(labels.page, { page: crop.page })} />
                            ) : result?.evidence ? (
                                <div>
                                    <p className={styles.quoteLine}><mark className={styles.quote}>{result.evidence}</mark></p>
                                    {sameAsAbove && <p className={styles.cropCaption}>{labels.sameLine}</p>}
                                </div>
                            ) : <div />}
                            <div className={styles.criterion}>
                                <p className={styles.point}>{c.description}</p>
                                {result?.justification && <p className={styles.reason}>{result.justification}</p>}
                                {note && <p className={styles.note}>{note}</p>}
                            </div>
                        </div>
                    </div>
                );
            })}

            <p className={styles.caption}>{answer.caption}</p>
        </article>
    );
}

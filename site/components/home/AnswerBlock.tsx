import type { HomeAnswer } from "@/content/types";
import { CROPS } from "@/content/sample-marks";
import site from "@/content/site";
import Crop from "./Crop";
import { InkMark, Reveal } from "./Ink";
import { pointsOf } from "./sheets";
import styles from "./AnswerBlock.module.css";

/** The paper's question text on one line, without the "(b)" its label already carries. */
function questionText(label: string, text: string): string {
    const part = /\(([a-z])\)$/.exec(label)?.[1];
    const flat = text.replace(/\s+/g, " ").replace(/\s+([:?.,;])/g, "$1").trim();
    return part ? flat.replace(new RegExp(`^\\(${part}\\)\\s*`), "") : flat;
}

/** One answer as lines of the answer book: the question with its total in the margin, then one line
 *  per point: Gr8r's mark in the margin, the handwriting at reading size with the quoted words
 *  highlighted, the point and the reason. Marks, points and reasons come from the grade record. */
export default function AnswerBlock({ answer }: { answer: HomeAnswer }) {
    const q = pointsOf(answer.question);
    const labels = site.labels.rows;
    const shown = answer.points.map((id) => q.points.find((p) => p.id === id)).filter((p) => p != null);

    return (
        <article className={styles.answer} aria-labelledby={`answer-${answer.question}`}>
            <div className={`${styles.line} ${styles.head}`}>
                <div className={styles.margin}>
                    <h3 id={`answer-${answer.question}`} className={styles.qno}>
                        <span className="sr-only">{labels.question} </span>{q.label}
                    </h3>
                    <InkMark score={q.score} max={q.max} size="m" tick={false} className={styles.total} />
                </div>
                <p className={styles.question}>{questionText(q.label, q.text)}</p>
            </div>

            {shown.map((p, i) => {
                const crop = CROPS[`${q.label}/${p.id}`];
                const prev = i > 0 ? shown[i - 1] : null;
                const sameAsAbove = !crop && prev?.evidence && prev.evidence === p.evidence;
                const note = answer.notes?.[p.id];
                return (
                    <Reveal key={p.id} className={styles.line}>
                        <div className={styles.margin}>
                            <InkMark score={p.score} max={p.points} size="l" className={styles.mark} />
                        </div>
                        <div className={styles.writing}>
                            {crop ? (
                                <Crop page={crop.page} wide={crop.wide} tight={crop.tight} bands={crop.bands} alt={crop.alt} />
                            ) : p.evidence ? (
                                <p className={styles.typed}>
                                    <mark className={styles.quote}>{p.evidence}</mark>
                                    {sameAsAbove && <span className={styles.same}>{labels.sameLine}</span>}
                                </p>
                            ) : null}
                            <div className={styles.text}>
                                <p className={styles.point}>{p.description}</p>
                                <div>
                                    {p.justification && <p className={styles.reason}>{p.justification}</p>}
                                    {note && <p className={styles.note}>{note}</p>}
                                </div>
                            </div>
                        </div>
                    </Reveal>
                );
            })}
        </article>
    );
}

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Criterion, EvaluatorRound } from "@/types/review.types";
import styles from "./review.module.css";

function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

/** The grader's and the evaluator's positions, round by round: scores side by side, the
 *  evaluator's points and the grader's replies (accepted or pushed back, with reasons). */
export default function ExaminerRounds({ rounds, criteria }: { rounds: EvaluatorRound[]; criteria: Criterion[] }) {
    const describe = new Map(criteria.map((c) => [c.id, c]));
    return (
        <ol className={styles.rounds}>
            {rounds.map((round) => {
                const evaluator = new Map(round.evaluator.map((c) => [c.id, c]));
                return (
                    <li key={round.round} className={styles.round}>
                        <div className={styles.roundHead}>
                            <strong>{round.round === 0 ? "First review" : `After revision ${round.round}`}</strong>
                            <span>
                                Agreement {fmt(round.effective_agreement)}
                                {round.effective_agreement !== round.agreement && ` (stated ${fmt(round.agreement)})`}
                            </span>
                        </div>
                        <table className={styles.compareTable}>
                            <thead>
                                <tr>
                                    <th scope="col">Criterion</th>
                                    <th scope="col" className={styles.graderCol}>Grader</th>
                                    <th scope="col" className={styles.evaluatorCol}>Evaluator</th>
                                </tr>
                            </thead>
                            <tbody>
                                {round.grader.map((g) => {
                                    const apart = round.criteria_apart.includes(g.id);
                                    const spec = describe.get(g.id);
                                    return (
                                        <tr key={g.id} className={cn(apart && styles.apartRow)}>
                                            <th scope="row">
                                                <span className={styles.criterionId}>{g.id}</span> {spec?.description ?? ""}
                                                {apart && <span className={styles.apartTag}>apart</span>}
                                            </th>
                                            <td className={styles.graderCol}>{fmt(g.score)}</td>
                                            <td className={styles.evaluatorCol}>
                                                {fmt(evaluator.get(g.id)?.score)}
                                                {evaluator.get(g.id)?.reason && (
                                                    <span className={styles.roundReason}>{evaluator.get(g.id)?.reason}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className={styles.totalRow}>
                                    <th scope="row">Total</th>
                                    <td className={styles.graderCol}>{fmt(round.grader_total)}</td>
                                    <td className={styles.evaluatorCol}>{fmt(round.evaluator_total)}</td>
                                </tr>
                            </tbody>
                        </table>
                        {round.feedback.length > 0 && (
                            <ul className={styles.points}>
                                {round.feedback.map((point, i) => {
                                    const reply = round.replies?.find((r) => r.feedback_index === i);
                                    return (
                                        <li key={i}>
                                            <p><span className={styles.evaluatorLabel}>Evaluator on {point.criterion_id}:</span> {point.point}</p>
                                            {reply && (
                                                <p className={styles.reply}>
                                                    {reply.decision === "accept"
                                                        ? <Check size={14} aria-hidden="true" className={styles.accepted} />
                                                        : <X size={14} aria-hidden="true" className={styles.rejected} />}
                                                    <span className={styles.graderLabel}>
                                                        Grader {reply.decision === "accept" ? "accepted" : "pushed back"}:
                                                    </span>{" "}
                                                    {reply.rationale}
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {round.summary && <p className={styles.roundSummary}>{round.summary}</p>}
                    </li>
                );
            })}
        </ol>
    );
}

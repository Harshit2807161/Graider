import React from "react";
import { Check, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Criterion, EvaluatorRound } from "@/types/review.types";
import styles from "./ExaminerRounds.module.css";

function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

function roundName(round: number): string {
    return round === 0 ? "First review" : `After revision ${round}`;
}

/** The grader's and the evaluator's positions, round by round: scores side by side, the
 *  evaluator's points and the grader's replies (accepted or pushed back, with reasons). */
export default function ExaminerRounds({ rounds, criteria }: { rounds: EvaluatorRound[]; criteria: Criterion[] }) {
    const describe = new Map(criteria.map((c) => [c.id, c]));
    return (
        <ol className={styles.rounds}>
            {rounds.map((round) => {
                const evaluator = new Map(round.evaluator.map((c) => [c.id, c]));
                const apartCount = round.criteria_apart.length;
                return (
                    <li key={round.round} className={styles.round}>
                        <div className={styles.roundHead}>
                            <span className={styles.roundTitle}>
                                <span className={styles.roundNumber} aria-hidden="true">{round.round + 1}</span>
                                {roundName(round.round)}
                            </span>
                            <span className={styles.pills}>
                                <span className={styles.pill}>
                                    Agreement {fmt(round.effective_agreement)}
                                    {round.effective_agreement !== round.agreement && ` (stated ${fmt(round.agreement)})`}
                                </span>
                                {apartCount > 0 && (
                                    <span className={cn(styles.pill, styles.pillApart)}>
                                        {apartCount} {apartCount === 1 ? "criterion" : "criteria"} apart
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className={styles.tableWrap}>
                            <table className={styles.compare}>
                                <caption className="sr-only">Scores per criterion, {roundName(round.round).toLowerCase()}</caption>
                                <thead>
                                    <tr>
                                        <th scope="col">Criterion</th>
                                        <th scope="col" className={styles.narrow}>
                                            <span className={styles.who}><span className={cn(styles.dot, styles.dotGrader)} aria-hidden="true" />Grader</span>
                                        </th>
                                        <th scope="col">
                                            <span className={styles.who}><span className={cn(styles.dot, styles.dotEvaluator)} aria-hidden="true" />Evaluator</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {round.grader.map((g) => {
                                        const apart = round.criteria_apart.includes(g.id);
                                        const spec = describe.get(g.id);
                                        const theirs = evaluator.get(g.id);
                                        return (
                                            <tr key={g.id} className={cn(apart && styles.apartRow)}>
                                                <th scope="row">
                                                    <span className={styles.criterionId}>{g.id}</span> {spec?.description ?? ""}
                                                    {apart && <span className={styles.apartTag}>apart</span>}
                                                </th>
                                                <td className={cn(styles.num, styles.graderCell)}>
                                                    {fmt(g.score)}{spec && <span className="sr-only"> of {fmt(spec.points)}</span>}
                                                </td>
                                                <td className={cn(styles.num, styles.evaluatorCell)}>
                                                    {fmt(theirs?.score)}{spec && <span className="sr-only"> of {fmt(spec.points)}</span>}
                                                    {theirs?.reason && <span className={styles.cellReason}>{theirs.reason}</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className={styles.totalRow}>
                                        <th scope="row">Total</th>
                                        <td className={cn(styles.num, styles.graderCell)}>{fmt(round.grader_total)}</td>
                                        <td className={cn(styles.num, styles.evaluatorCell)}>{fmt(round.evaluator_total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {round.feedback.length > 0 && (
                            <ul className={styles.thread} aria-label={`Evaluator's points, ${roundName(round.round).toLowerCase()}`}>
                                {round.feedback.map((point, i) => {
                                    const reply = round.replies?.find((r) => r.feedback_index === i);
                                    const accepted = reply?.decision === "accept";
                                    return (
                                        <li key={i} className={styles.message}>
                                            <span className={cn(styles.avatar, styles.avatarEvaluator)} aria-hidden="true">E</span>
                                            <div>
                                                <p className={styles.messageHead}>
                                                    <span className={cn(styles.speaker, styles.evaluatorName)}>Evaluator</span>
                                                    on <span className={styles.criterionId}>{point.criterion_id}</span>
                                                    <span className="sr-only">:</span>
                                                </p>
                                                <p>{point.point}</p>
                                                {reply && (
                                                    <div className={styles.reply}>
                                                        <span className={cn(styles.avatar, styles.avatarGrader)} aria-hidden="true">G</span>
                                                        <div>
                                                            <p className={styles.messageHead}>
                                                                <span className={cn(styles.speaker, styles.graderName)}>Grader</span>
                                                                <span className={cn(styles.decision, accepted ? styles.accepted : styles.rejected)}>
                                                                    {accepted
                                                                        ? <Check size={12} aria-hidden="true" />
                                                                        : <CornerDownRight size={12} aria-hidden="true" />}
                                                                    {accepted ? "accepted" : "pushed back"}
                                                                </span>
                                                                <span className="sr-only">:</span>
                                                            </p>
                                                            <p>{reply.rationale}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {round.summary && <p className={styles.roundSummary}><strong>Evaluator&apos;s summary:</strong> {round.summary}</p>}
                    </li>
                );
            })}
        </ol>
    );
}

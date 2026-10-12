import { escalationText, type QuestionReview } from "@product/types/review.types";
import copy from "./copy";
import { markSpoken, markText } from "./format";
import styles from "./book.module.css";

/** The cover's "For examiner's use only" grid as a plain table: real rows from the sample, then
 *  one row that is an illustration and says so (in the row and in the caption). */
export default function ExaminerGrid({ questions, all }: { questions: QuestionReview[]; all: QuestionReview[] }) {
    const { grid } = copy;
    const sentText = (q: QuestionReview): string => {
        const grade = q.grade;
        if (grade?.status === "escalated") return `${grid.sentPrefix} “${escalationText(grade.escalation_reason)}”`;
        if (grade?.status === "not_attempted" && q.choice_group) {
            const chosen = all.find((o) => o.choice_group === q.choice_group && o.question_id !== q.question_id && o.grade?.counted);
            if (chosen) return grid.choseOther(chosen.label);
        }
        return grid.notSent;
    };
    return (
        <div className={styles.gridWrap}>
            <table className={styles.grid}>
                <caption>{grid.caption}</caption>
                <thead>
                    <tr>
                        {grid.columns.map((c) => <th key={c} scope="col">{c}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {questions.map((q) => {
                        const grade = q.grade;
                        const attempted = grade != null && grade.status !== "not_attempted";
                        return (
                            <tr key={q.question_id}>
                                <th scope="row">{q.label}</th>
                                <td className={styles.gridMarks}>
                                    {attempted ? (
                                        <span className={styles.gridMark}>
                                            <span aria-hidden="true">{markText(grade.score)}/{markText(q.max_score)}</span>
                                            <span className="sr-only">{markSpoken(grade.score, q.max_score)}</span>
                                        </span>
                                    ) : (
                                        <span className={styles.gridMuted}>{grid.notAttempted}</span>
                                    )}
                                </td>
                                <td>{sentText(q)}</td>
                            </tr>
                        );
                    })}
                    <tr className={styles.illustration}>
                        <th scope="row">{grid.illustration.qno}</th>
                        <td className={styles.gridMarks}>{grid.illustration.marks}</td>
                        <td>{grid.sentPrefix} “{grid.illustration.reason}”</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

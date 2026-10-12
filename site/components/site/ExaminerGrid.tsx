import type { ExaminerGridContent } from "@/content/types";
import styles from "./ExaminerGrid.module.css";

/** The cover's "For examiner's use only" grid as a plain table, for results and pilot terms. The
 *  first cell of each row is its row header. A row marked `illustration` is drawn dashed; its cells
 *  must say it is one. Nothing is computed here: every cell comes from the content module. */
export default function ExaminerGrid({ grid, headingId }: { grid: ExaminerGridContent; headingId?: string }) {
    return (
        <div className={styles.wrap}>
            <table className={styles.grid} aria-labelledby={headingId}>
                <caption>{grid.caption}</caption>
                <thead>
                    <tr>
                        {grid.columns.map((c) => <th key={c} scope="col">{c}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {grid.rows.map((row, i) => (
                        <tr key={i} className={row.illustration ? styles.illustration : undefined}>
                            {row.cells.map((cell, j) => j === 0
                                ? <th key={j} scope="row">{cell}</th>
                                : <td key={j}>{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

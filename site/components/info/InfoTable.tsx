import type { InfoTable as InfoTableContent } from "@/content/types-info";
import styles from "./info.module.css";

/** A plain table of facts (privacy, models, escalation reasons). The first cell of each row is its
 *  row header. On a phone each row stacks: the row header, then every other cell under its column's
 *  name, so the page never scrolls sideways. The explicit roles keep the table's semantics when the
 *  phone layout turns its parts into blocks. Nothing is computed here: every cell is content. */
export default function InfoTable({ table, className }: { table: InfoTableContent; className?: string }) {
    const [first, ...rest] = table.columns;
    const classes = [styles.table, table.widths && styles.fixed, className].filter(Boolean).join(" ");
    return (
        <table role="table" className={classes}>
            <caption className={table.showCaption ? styles.caption : "sr-only"}>{table.caption}</caption>
            {table.widths && (
                <colgroup>{table.widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            )}
            <thead role="rowgroup">
                <tr role="row">
                    <th role="columnheader" scope="col">{first}</th>
                    {rest.map((c) => <th key={c} role="columnheader" scope="col">{c}</th>)}
                </tr>
            </thead>
            <tbody role="rowgroup">
                {table.rows.map((row) => (
                    <tr key={row[0]} role="row">
                        <th role="rowheader" scope="row">{row[0]}</th>
                        {row.slice(1).map((cell, j) => (
                            <td key={j} role="cell" data-label={rest[j]}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

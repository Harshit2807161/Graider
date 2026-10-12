import type { ReactNode } from "react";
import { Paras } from "@/components/site/Prose";
import s from "@/components/site/page.module.css";
import type { TableSection } from "@/content/types-info";
import InfoTable from "./InfoTable";

/** A page section built round one fact table: heading, paragraphs, the table, then paragraphs, an
 *  optional list and closing paragraphs. `children` go after the table, before the list. */
export default function TableBlock({ section, tinted = false, level = 2, children }: {
    section: TableSection;
    tinted?: boolean;
    level?: 2 | 3;
    children?: ReactNode;
}) {
    const H = level === 2 ? "h2" : "h3";
    const body = (
        <>
            <div className={s.sectionHead}>
                <H id={`${section.id}-h`} className={level === 2 ? s.h2 : s.h3}>{section.heading}</H>
                {section.intro && <div className={s.prose}><Paras paras={section.intro} /></div>}
            </div>
            <InfoTable table={section.table} />
            {section.after && <div className={`${s.prose} ${s.after}`}><Paras paras={section.after} /></div>}
            {children}
            {section.list && (
                <div className={`${s.prose} ${s.after}`}>
                    {section.list.intro && <p>{section.list.intro}</p>}
                    <ul className={s.list}>
                        {section.list.items.map((item) => (
                            <li key={item.body}>{item.lead && <><strong>{item.lead}</strong>{" "}</>}{item.body}</li>
                        ))}
                    </ul>
                </div>
            )}
            {section.end && <div className={`${s.prose} ${s.after}`}><Paras paras={section.end} /></div>}
        </>
    );

    if (level === 3) return <div id={section.id} aria-labelledby={`${section.id}-h`} role="group">{body}</div>;
    return (
        <section id={section.id} className={tinted ? `${s.section} ${s.tinted}` : s.section} aria-labelledby={`${section.id}-h`}>
            <div className={s.container}>{body}</div>
        </section>
    );
}

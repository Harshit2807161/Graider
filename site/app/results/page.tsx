import type { Metadata } from "next";
import { slotText } from "@/components/info/slot";
import TableBlock from "@/components/info/TableBlock";
import { MoreLink, Paras } from "@/components/site/Prose";
import RunLine from "@/components/site/RunLine";
import s from "@/components/site/page.module.css";
import content from "@/content/results";
import r from "./results.module.css";

// Not in the nav and not indexed until a hand-marked comparison is published here
export const metadata: Metadata = {
    title: content.meta.title,
    description: content.meta.description,
    robots: { index: false },
};

export default function Page() {
    const { method, cases, sofar } = content;
    const nextRun = slotText(content.nextRun);

    return (
        <>
            <section className={s.pageHead} aria-labelledby="results-title">
                <div className={s.container}>
                    <h1 id="results-title" className={s.h1Page}>{content.title}</h1>
                    <p className={s.lede}>{content.lede}</p>
                    {nextRun && <p className={r.next}>{nextRun}</p>}
                </div>
            </section>

            <section id={method.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${method.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${method.id}-h`} className={s.h2}>{method.heading}</h2>
                    <div className={s.prose}>
                        <Paras paras={method.body} />
                        <p><strong>{method.groupsIntro}</strong></p>
                        <ul className={s.list}>
                            {method.groups.map((g) => (
                                <li key={g.lead}><strong>{g.lead}</strong> {g.body}</li>
                            ))}
                        </ul>
                        <Paras paras={[method.caveats]} />
                    </div>
                </div>
            </section>

            <section id={cases.id} className={s.section} aria-labelledby={`${cases.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${cases.id}-h`} className={s.h2}>{cases.heading}</h2>
                        <div className={s.prose}><p>{cases.intro}</p></div>
                    </div>
                    {/* The one wide table on the site: it scrolls inside its frame, never the page */}
                    <div className={r.scroller} role="region" aria-labelledby={`${cases.id}-h`} tabIndex={0}>
                        <table className={r.grid}>
                            <caption className="sr-only">{cases.caption}</caption>
                            <thead>
                                <tr>{cases.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={cases.columns.length} className={r.empty}><span className={r.emptyText}>{cases.empty}</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className={r.hint}>{cases.scrollHint}</p>
                    <div className={r.legend}>
                        <TableBlock section={cases.legend} level={3} />
                    </div>
                </div>
            </section>

            <section id={sofar.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${sofar.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${sofar.id}-h`} className={s.h2}>{sofar.heading}</h2>
                    <div className={s.prose}><p>{sofar.intro}</p></div>
                    <RunLine run={sofar.run} className={r.run} />
                    <div className={`${s.prose} ${r.afterRun}`}><p>{sofar.after}</p></div>
                    <MoreLink link={sofar.link} />
                </div>
            </section>
        </>
    );
}

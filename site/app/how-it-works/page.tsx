import type { Metadata } from "next";
import Link from "next/link";
import InfoTable from "@/components/info/InfoTable";
import info from "@/components/info/info.module.css";
import { MoreLink, Paras } from "@/components/site/Prose";
import ReviewDesk from "@/components/site/ReviewDesk";
import s from "@/components/site/page.module.css";
import content from "@/content/how-it-works";
import sample from "@/content/sample";
import h from "./how-it-works.module.css";

export const metadata: Metadata = { title: content.meta.title, description: content.meta.description };

export default function Page() {
    const { head, pipeline, illustration, record, models, honest, closing } = content;
    const desk = sample.desks.find((d) => d.id === illustration.desk);
    if (!desk) throw new Error(`Desk ${illustration.desk} is missing from content/sample.ts`);

    return (
        <>
            <section className={s.pageHead} aria-labelledby="hiw-title">
                <div className={s.container}>
                    <h1 id="hiw-title" className={s.h1Page}>{head.title}</h1>
                    <p className={s.lede}>{head.lede}</p>
                    {head.cta && (
                        <div className={s.actions}>
                            <Link href={head.cta.href} className={s.primary}>{head.cta.label}</Link>
                        </div>
                    )}
                </div>
            </section>

            <section id={pipeline.id} className={s.section} aria-labelledby={`${pipeline.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${pipeline.id}-h`} className={`${s.h2} ${h.stepsHeading}`}>{pipeline.heading}</h2>
                    <ol className={h.steps} role="list">
                        {pipeline.steps.map((step, i) => (
                            <li key={step.title} className={h.step}>
                                <span className={h.number} aria-hidden="true">{i + 1}</span>
                                <div className={h.stepText}>
                                    <h3 id={`step-${i + 1}`} className={s.h3}>
                                        <span className="sr-only">{i + 1}. </span>{step.title}
                                    </h3>
                                    <div className={s.prose}><Paras paras={step.body} /></div>
                                </div>
                                {step.checks && (
                                    <div className={h.checks}>
                                        <p className={h.checksLabel}>{pipeline.checksLabel}</p>
                                        <ul className={h.checkList}>
                                            {step.checks.map((c) => <li key={c}>{c}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {step.table && (
                                    <div className={h.stepTable}>
                                        <InfoTable table={step.table} />
                                        {step.after && <div className={`${s.prose} ${h.stepAfter}`}><Paras paras={step.after} /></div>}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section id={illustration.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${illustration.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${illustration.id}-h`} className={s.h2}>{illustration.heading}</h2>
                        <div className={s.prose}>
                            <Paras paras={illustration.intro} />
                            {desk.question && <p className={s.question}>{desk.question}</p>}
                        </div>
                    </div>
                    <ReviewDesk answer={desk.answer} pages={desk.pages} pageCaptions={desk.pageCaptions}
                                notes={desk.notes} roundsBelow={desk.roundsBelow} />
                    <MoreLink link={illustration.link} />
                </div>
            </section>

            <section id={record.id} className={s.section} aria-labelledby={`${record.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${record.id}-h`} className={s.h2}>{record.heading}</h2>
                    </div>
                    <dl className={info.rows}>
                        {record.body.map((p) => (
                            <div key={p.lead} className={info.row}>
                                <dt className={info.rowLabel}>{p.lead?.replace(/\.$/, "")}</dt>
                                <dd className={info.rowBody}>{p.body}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className={`${s.prose} ${s.after}`}><Paras paras={record.after} /></div>
                </div>
            </section>

            <section id={models.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${models.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${models.id}-h`} className={s.h2}>{models.heading}</h2>
                        {models.intro && <div className={s.prose}><Paras paras={models.intro} /></div>}
                    </div>
                    <InfoTable table={models.table} />
                    {models.after && <div className={`${s.prose} ${s.after}`}><Paras paras={models.after} /></div>}
                </div>
            </section>

            <section id={honest.id} className={s.section} aria-labelledby={`${honest.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${honest.id}-h`} className={s.h2}>{honest.heading}</h2>
                        {honest.intro && <div className={s.prose}><p>{honest.intro}</p></div>}
                    </div>
                    <div className={h.groups}>
                        {honest.groups.map((g) => (
                            <div key={g.heading} className={h.group}>
                                <h3 className={s.h3}>{g.heading}</h3>
                                <ul className={`${s.list} ${h.groupList}`}>
                                    {g.items.map((item) => (
                                        <li key={item.body}>{item.lead && <><strong>{item.lead}</strong>{" "}</>}{item.body}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={`${s.section} ${s.tinted} ${s.closing}`} aria-labelledby="closing-h">
                <div className={s.container}>
                    <h2 id="closing-h" className={s.h2}>{closing.heading}</h2>
                    <div className={s.prose}><p>{closing.body}</p></div>
                    <div className={s.actions}>
                        <Link href={closing.primary.href} className={s.primary}>{closing.primary.label}</Link>
                        {closing.secondary && <Link href={closing.secondary.href} className={s.secondary}>{closing.secondary.label}</Link>}
                    </div>
                </div>
            </section>
        </>
    );
}

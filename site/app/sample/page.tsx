import type { Metadata } from "next";
import Link from "next/link";
import { MoreLink, Paras } from "@/components/site/Prose";
import ReviewDesk from "@/components/site/ReviewDesk";
import Slip from "@/components/site/Slip";
import s from "@/components/site/page.module.css";
import sample from "@/content/sample";
import own from "./page.module.css";

export const metadata: Metadata = { title: sample.meta.title, description: sample.meta.description };

export default function Page() {
    const { lookingAt, reading, desks, correction, escalation, closing } = sample;

    return (
        <>
            <section className={`${s.pageHead} ${own.hero}`} aria-labelledby="sample-title">
                <div className={s.container}>
                    <h1 id="sample-title" className={s.h1Page}>{sample.title}</h1>
                    <p className={s.lede}>{sample.lede}</p>
                    <div className={s.actions}>
                        <Link href={closing.cta.href} className={s.primary}>{closing.cta.label}</Link>
                    </div>
                </div>
            </section>

            <section id={lookingAt.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${lookingAt.id}-h`}>
                <div className={s.container}>
                    <div className={s.pair}>
                        <div>
                            <h2 id={`${lookingAt.id}-h`} className={s.h2}>{lookingAt.heading}</h2>
                            <div className={s.prose}><Paras paras={lookingAt.body} /></div>
                            <p className={`${s.small} ${s.linkRow}`}>{lookingAt.source}</p>
                        </div>
                        <div>
                            <h2 id={`${reading.id}-h`} className={s.h2}>{reading.heading}</h2>
                            <div className={s.prose}>
                                <p>{reading.intro}</p>
                                <ul className={s.list}>
                                    {reading.items.map((item) => (
                                        <li key={item.body}>{item.lead && <><strong>{item.lead}</strong>{" "}</>}{item.body}</li>
                                    ))}
                                </ul>
                                <p>{reading.after}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {desks.map((desk) => (
                <section key={desk.id} id={desk.id} className={s.section} aria-labelledby={`${desk.id}-h`}>
                    <div className={s.container}>
                        <div className={s.sectionHead}>
                            <h2 id={`${desk.id}-h`} className={s.h2}>{desk.heading}</h2>
                            <div className={s.prose}>
                                {desk.question && <p className={s.question}>{desk.question}</p>}
                                <Paras paras={desk.intro} />
                            </div>
                        </div>
                        <ReviewDesk answer={desk.answer} pages={desk.pages} pageCaptions={desk.pageCaptions}
                                    notes={desk.notes} roundsBelow={desk.roundsBelow} />
                        {desk.after && <div className={`${s.prose} ${s.after}`}><Paras paras={desk.after} /></div>}
                    </div>
                </section>
            ))}

            <section id={correction.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${correction.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${correction.id}-h`} className={s.h2}>{correction.heading}</h2>
                    <div className={s.prose}><Paras paras={correction.body} /></div>
                    <MoreLink link={correction.link} />
                </div>
            </section>

            <section id={escalation.id} className={s.section} aria-labelledby={`${escalation.id}-h`}>
                <div className={s.container}>
                    <div className={s.pair}>
                        <div>
                            <h2 id={`${escalation.id}-h`} className={s.h2}>{escalation.heading}</h2>
                            <div className={s.prose}><Paras paras={escalation.body} /></div>
                        </div>
                        <Slip slip={escalation.slip} />
                    </div>
                </div>
            </section>

            <section className={`${s.section} ${s.tinted} ${s.closing}`} aria-labelledby="closing-h">
                <div className={s.container}>
                    <h2 id="closing-h" className={s.h2}>{closing.heading}</h2>
                    <div className={s.prose}><p>{closing.body}</p></div>
                    <div className={s.actions}>
                        <Link href={closing.cta.href} className={s.primary}>{closing.cta.label}</Link>
                    </div>
                </div>
            </section>
        </>
    );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Closing, LeadList, StepList } from "@/components/audience/Blocks";
import { MoreLink, Paras } from "@/components/site/Prose";
import s from "@/components/site/page.module.css";
import investors from "@/content/investors";
import x from "./page.module.css";

export const metadata: Metadata = { title: investors.meta.title, description: investors.meta.description };

/** For investors: the job and why now, what exists today (each item true today), what has been
 *  measured and what hasn't, what's next, and the ask. The deck carries the numbers. */
export default function Page() {
    const { hero, job, whyNow, exists, measured, next, closing } = investors;

    return (
        <>
            <section className={s.pageHead} aria-labelledby="investors-title">
                <div className={s.container}>
                    <h1 id="investors-title" className={`${s.h1Page} ${x.title}`}>
                        {hero.title.map((line) => <span key={line} className={s.titleLine}>{line}</span>)}
                    </h1>
                    <p className={s.lede}>{hero.lede}</p>
                    <div className={s.actions}>
                        <Link href={hero.primary.href} className={s.primary}>{hero.primary.label}</Link>
                    </div>
                </div>
            </section>

            <div className={`${s.section} ${s.tinted}`}>
                <div className={s.container}>
                    <div className={`${s.pair} ${x.twin}`}>
                        {[job, whyNow].map((part) => (
                            <section key={part.id} id={part.id} className={x.part} aria-labelledby={`${part.id}-h`}>
                                <h2 id={`${part.id}-h`} className={s.h2}>{part.heading}</h2>
                                <div className={s.prose}><Paras paras={part.body} /></div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>

            <section id={exists.id} className={s.section} aria-labelledby={`${exists.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${exists.id}-h`} className={s.h2}>{exists.heading}</h2>
                    </div>
                    <LeadList items={exists.items} wide />
                    <MoreLink link={exists.link} />
                </div>
            </section>

            <section id={measured.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${measured.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${measured.id}-h`} className={s.h2}>{measured.heading}</h2>
                    <div className={s.prose}><Paras paras={measured.body} /></div>
                </div>
            </section>

            <section id={next.id} className={s.section} aria-labelledby={`${next.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${next.id}-h`} className={s.h2}>{next.heading}</h2>
                    </div>
                    <StepList steps={next.steps} />
                </div>
            </section>

            <Closing closing={closing} note={closing.note} />
        </>
    );
}

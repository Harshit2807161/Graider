import type { Metadata } from "next";
import Link from "next/link";
import { Closing, FaqList, HonestGroups, StepList } from "@/components/audience/Blocks";
import CriterionRows from "@/components/site/CriterionRows";
import { MoreLink, Paras } from "@/components/site/Prose";
import s from "@/components/site/page.module.css";
import professors from "@/content/professors";
import x from "./page.module.css";

export const metadata: Metadata = { title: professors.meta.title, description: professors.meta.description };

/** For college professors: the most depth on method. How a mark is decided, a real answer with its
 *  mistakes, what you can change, which models, how to compare with your own marking, the limits. */
export default function Page() {
    const { hero, method, check, disagree, models, compare, honest, faq, closing } = professors;

    return (
        <>
            <section className={s.pageHead} aria-labelledby="professors-title">
                <div className={s.container}>
                    <h1 id="professors-title" className={`${s.h1Page} ${x.title}`}>
                        {hero.title.map((line) => <span key={line} className={s.titleLine}>{line}</span>)}
                    </h1>
                    <p className={s.lede}>{hero.lede}</p>
                    <div className={s.actions}>
                        <Link href={hero.primary.href} className={s.primary}>{hero.primary.label}</Link>
                        {hero.secondary && <Link href={hero.secondary.href} className={s.secondary}>{hero.secondary.label}</Link>}
                    </div>
                </div>
            </section>

            <section id={method.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${method.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${method.id}-h`} className={s.h2}>{method.heading}</h2>
                    </div>
                    <StepList steps={method.steps} wide />
                    {method.after && <div className={`${s.prose} ${s.after}`}><Paras paras={method.after} /></div>}
                    <MoreLink link={method.link} />
                </div>
            </section>

            <section id={check.id} className={s.section} aria-labelledby={`${check.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${check.id}-h`} className={s.h2}>{check.heading}</h2>
                        <div className={s.prose}><Paras paras={check.intro} /></div>
                    </div>
                    {check.answers.map((a) => <CriterionRows key={a.question} answer={a} />)}
                    {check.after && <div className={`${s.prose} ${s.after}`}><Paras paras={check.after} /></div>}
                    <MoreLink link={check.link} />
                </div>
            </section>

            <div className={`${s.section} ${s.tinted}`}>
                <div className={s.container}>
                    <div className={`${s.pair} ${x.twin}`}>
                        {[disagree, models].map((part) => (
                            <section key={part.id} id={part.id} className={x.part} aria-labelledby={`${part.id}-h`}>
                                <h2 id={`${part.id}-h`} className={s.h2}>{part.heading}</h2>
                                <div className={s.prose}><Paras paras={part.body} /></div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>

            <section id={compare.id} className={s.section} aria-labelledby={`${compare.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${compare.id}-h`} className={s.h2}>{compare.heading}</h2>
                    <div className={s.prose}><Paras paras={compare.body} /></div>
                </div>
            </section>

            <section id={honest.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${honest.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${honest.id}-h`} className={s.h2}>{honest.heading}</h2>
                        <div className={s.prose}><p>{honest.intro}</p></div>
                    </div>
                    <HonestGroups honest={honest} />
                </div>
            </section>

            <section id={faq.id} className={s.section} aria-labelledby={`${faq.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${faq.id}-h`} className={`${s.h2} ${x.faqHead}`}>{faq.heading}</h2>
                    <FaqList items={faq.items} />
                </div>
            </section>

            <Closing closing={closing} />
        </>
    );
}

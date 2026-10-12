import type { Metadata } from "next";
import Link from "next/link";
import { Closing, FaqList, HonestGroups, LeadList, StepList } from "@/components/audience/Blocks";
import CriterionRows from "@/components/site/CriterionRows";
import { MoreLink, Paras } from "@/components/site/Prose";
import s from "@/components/site/page.module.css";
import schools from "@/content/schools";
import x from "./page.module.css";

export const metadata: Metadata = { title: schools.meta.title, description: schools.meta.description };

/** For schools and coaching institutes. A principal with two minutes gets the whole story from the
 *  first two screens: what it does and who signs off (hero), what happens to the sheets (the steps,
 *  beside the hero from desktop up), then what the teachers see on a real answer. */
export default function Page() {
    const { hero, steps, teachers, honest, pilot, faq, closing } = schools;

    return (
        <>
            <section className={x.hero} aria-labelledby="schools-title">
                <div className={x.heroText}>
                    <h1 id="schools-title" className={`${s.title} ${x.title}`}>
                        {hero.title.map((line) => <span key={line} className={s.titleLine}>{line}</span>)}
                    </h1>
                    <p className={s.lede}>{hero.lede}</p>
                    <div className={s.actions}>
                        <Link href={hero.primary.href} className={s.primary}>{hero.primary.label}</Link>
                    </div>
                </div>
                <section id={steps.id} className={x.heroSteps} aria-labelledby={`${steps.id}-h`}>
                    <h2 id={`${steps.id}-h`} className={x.stepsHead}>{steps.heading}</h2>
                    <StepList steps={steps.steps} />
                </section>
            </section>

            <section id={teachers.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${teachers.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${teachers.id}-h`} className={s.h2}>{teachers.heading}</h2>
                        <div className={s.prose}><Paras paras={teachers.intro} /></div>
                    </div>
                    {teachers.answers.map((a) => <CriterionRows key={a.question} answer={a} />)}
                    {teachers.after && <div className={`${s.prose} ${s.after}`}><Paras paras={teachers.after} /></div>}
                    <MoreLink link={teachers.link} />
                </div>
            </section>

            <section id={honest.id} className={s.section} aria-labelledby={`${honest.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${honest.id}-h`} className={s.h2}>{honest.heading}</h2>
                        <div className={s.prose}><p>{honest.intro}</p></div>
                    </div>
                    <HonestGroups honest={honest} />
                </div>
            </section>

            <section id={pilot.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${pilot.id}-h`}>
                <div className={s.container}>
                    <div className={s.pair}>
                        <div>
                            <h2 id={`${pilot.id}-h`} className={`${s.h2} ${x.pilotHead}`}>{pilot.heading}</h2>
                            <LeadList items={pilot.terms} />
                        </div>
                        <div className={x.pilotNeeds}>
                            <div className={s.prose}><Paras paras={[pilot.needs]} /></div>
                            <MoreLink link={pilot.link} />
                        </div>
                    </div>
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

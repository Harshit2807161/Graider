import type { Metadata } from "next";
import Link from "next/link";
import CriterionRows from "@/components/site/CriterionRows";
import ExaminedPage from "@/components/site/ExaminedPage";
import { MoreLink, Paras } from "@/components/site/Prose";
import RunLine from "@/components/site/RunLine";
import Slip from "@/components/site/Slip";
import s from "@/components/site/page.module.css";
import home from "@/content/home";

export const metadata: Metadata = { title: { absolute: home.meta.title }, description: home.meta.description };

export default function Home() {
    const { hero, heroFigure, runLine, marked, steps, wrong, reasons, audiences, honest, closing } = home;

    return (
        <>
            <section className={s.hero} aria-labelledby="home-title">
                <div className={s.heroText}>
                    <h1 id="home-title" className={s.title}>
                        {hero.title.map((line) => <span key={line} className={s.titleLine}>{line}</span>)}
                    </h1>
                    <p className={s.lede}>{hero.lede}</p>
                    <div className={s.actions}>
                        <Link href={hero.primary.href} className={s.primary}>{hero.primary.label}</Link>
                        {hero.secondary && <Link href={hero.secondary.href} className={s.secondary}>{hero.secondary.label}</Link>}
                    </div>
                </div>
                <div className={s.heroScan}>
                    <ExaminedPage figure={heroFigure} />
                </div>
                <RunLine run={runLine} className={s.heroRun} />
            </section>

            <section id={marked.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${marked.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${marked.id}-h`} className={s.h2}>{marked.heading}</h2>
                        <div className={s.prose}><Paras paras={marked.intro} /></div>
                    </div>
                    {marked.answers.map((a) => <CriterionRows key={a.question} answer={a} />)}
                    <MoreLink link={marked.link} />
                </div>
            </section>

            <section id={steps.id} className={s.section} aria-labelledby={`${steps.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${steps.id}-h`} className={s.h2}>{steps.heading}</h2>
                    </div>
                    <ol className={s.steps}>
                        {steps.steps.map((step) => (
                            <li key={step.title}><p><strong>{step.title}</strong> {step.body}</p></li>
                        ))}
                    </ol>
                    <MoreLink link={steps.link} />
                </div>
            </section>

            <section id={wrong.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${wrong.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${wrong.id}-h`} className={s.h2}>{wrong.heading}</h2>
                        <div className={s.prose}><Paras paras={wrong.intro} /></div>
                    </div>
                    {wrong.answers.map((a) => <CriterionRows key={a.question} answer={a} />)}
                    {wrong.after && <div className={`${s.prose} ${s.after}`}><Paras paras={wrong.after} /></div>}
                    <MoreLink link={wrong.link} />
                </div>
            </section>

            <section id={reasons.id} className={s.section} aria-labelledby={`${reasons.id}-h`}>
                <div className={s.container}>
                    <div className={s.pair}>
                        <div>
                            <h2 id={`${reasons.id}-h`} className={s.h2}>{reasons.heading}</h2>
                            <div className={s.prose}><p>{reasons.intro}</p></div>
                            <ul className={`${s.list} ${s.linkRow}`}>
                                {reasons.items.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                            <div className={`${s.prose} ${s.linkRow}`}><p>{reasons.after}</p></div>
                        </div>
                        <Slip slip={reasons.slip} />
                    </div>
                    <div className={s.example}>
                        <h3 className={s.h3}>{reasons.example.heading}</h3>
                        <div className={s.prose}>{reasons.example.body.map((p) => <p key={p}>{p}</p>)}</div>
                        <CriterionRows answer={reasons.example} headingLevel={4} />
                    </div>
                </div>
            </section>

            <section id={audiences.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${audiences.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${audiences.id}-h`} className={s.h2}>{audiences.heading}</h2>
                    </div>
                    <div className={s.audiences}>
                        {audiences.audiences.map((a) => (
                            <div key={a.name}>
                                <p><strong>{a.name}</strong> {a.body}</p>
                                <Link href={a.link.href} className={s.link}>{a.link.label}</Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id={honest.id} className={s.section} aria-labelledby={`${honest.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${honest.id}-h`} className={s.h2}>{honest.heading}</h2>
                        <div className={s.prose}><p>{honest.intro}</p></div>
                    </div>
                    <div className={s.groups}>
                        {honest.groups.map((g) => (
                            <div key={g.heading}>
                                <h3 className={s.h3}>{g.heading}</h3>
                                <ul className={s.list}>{g.items.map((item) => <li key={item}>{item}</li>)}</ul>
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
                        <Link href={closing.cta.href} className={s.primary}>{closing.cta.label}</Link>
                    </div>
                </div>
            </section>
        </>
    );
}

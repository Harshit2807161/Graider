import type { Metadata } from "next";
import PilotForm from "@/components/pilot/PilotForm";
import { MoreLink, Paras } from "@/components/site/Prose";
import s from "@/components/site/page.module.css";
import pilot from "@/content/pilot";
import p from "./page.module.css";

export const metadata: Metadata = { title: pilot.meta.title, description: pilot.meta.description };

export default function Page() {
    const { terms, ask, judge, notes, form } = pilot;

    return (
        <>
            <section className={`${s.pageHead} ${p.hero}`} aria-labelledby="pilot-title">
                <div className={s.container}>
                    <h1 id="pilot-title" className={s.h1Page}>{pilot.title}</h1>
                    <p className={s.lede}>{pilot.lede}</p>
                    <div className={s.actions}>
                        <a href={pilot.jump.href} className={s.primary}>{pilot.jump.label}</a>
                    </div>
                </div>
            </section>

            <section id={terms.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${terms.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${terms.id}-h`} className={s.h2}>{terms.heading}</h2>
                    </div>
                    <dl className={p.terms}>
                        {terms.terms.map((t) => (
                            <div key={t.term} className={p.term}>
                                <dt>{t.term}</dt>
                                <dd>
                                    {t.detail}
                                    {t.list && <ul className={p.termList}>{t.list.map((item) => <li key={item}>{item}</li>)}</ul>}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <div className={s.section}>
                <div className={`${s.container} ${p.columns}`}>
                    <section id={ask.id} aria-labelledby={`${ask.id}-h`}>
                        <h2 id={`${ask.id}-h`} className={s.h2}>{ask.heading}</h2>
                        <ul className={`${s.list} ${p.listAfterHeading}`}>{ask.items.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                    <section id={judge.id} aria-labelledby={`${judge.id}-h`}>
                        <h2 id={`${judge.id}-h`} className={s.h2}>{judge.heading}</h2>
                        <div className={s.prose}>
                            {judge.intro && <p>{judge.intro}</p>}
                            <ul className={s.list}>{judge.items.map((item) => <li key={item}>{item}</li>)}</ul>
                            {judge.after && <p>{judge.after}</p>}
                        </div>
                    </section>
                </div>
            </div>

            <div className={`${s.section} ${s.tinted}`}>
                <div className={`${s.container} ${p.formPair}`}>
                    <section id={notes.id} className={p.notes} aria-labelledby={`${notes.id}-h`}>
                        <h2 id={`${notes.id}-h`} className={s.h2}>{notes.heading}</h2>
                        <div className={s.prose}><Paras paras={notes.items} /></div>
                        <MoreLink link={notes.link} />
                    </section>
                    <section id={form.id} className={p.request} aria-labelledby={`${form.id}-h`}>
                        <h2 id={`${form.id}-h`} className={s.h2}>{form.heading}</h2>
                        <PilotForm content={form} />
                    </section>
                </div>
            </div>
        </>
    );
}

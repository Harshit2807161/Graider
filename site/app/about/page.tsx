import type { Metadata } from "next";
import Link from "next/link";
import info from "@/components/info/info.module.css";
import { contactEmail } from "@/components/info/slot";
import { Paras } from "@/components/site/Prose";
import s from "@/components/site/page.module.css";
import content from "@/content/about";
import type { Founder } from "@/content/types-info";
import a from "./about.module.css";

export const metadata: Metadata = { title: content.meta.title, description: content.meta.description };

/** A founder's work, without the sentences naming a current employer when those are off. */
function work(f: Founder, showCurrentRoles: boolean): string {
    return f.work.flatMap((w) => {
        if (showCurrentRoles || !w.namesEmployer) return [w.text];
        return w.withoutEmployer ? [w.withoutEmployer] : [];
    }).join(" ");
}

export default function Page() {
    const { head, showCurrentRoles, why, team, principles, contact } = content;
    const email = contactEmail();

    return (
        <>
            <section className={s.pageHead} aria-labelledby="about-title">
                <div className={s.container}>
                    <h1 id="about-title" className={s.h1Page}>{head.title}</h1>
                    <p className={s.lede}>{head.lede}</p>
                </div>
            </section>

            <section id={why.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${why.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${why.id}-h`} className={s.h2}>{why.heading}</h2>
                    <div className={s.prose}><Paras paras={why.body} /></div>
                </div>
            </section>

            <section id={team.id} className={s.section} aria-labelledby={`${team.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${team.id}-h`} className={s.h2}>{team.heading}</h2>
                        {team.intro && <div className={s.prose}><p>{team.intro}</p></div>}
                    </div>
                    <ul className={info.rows} role="list">
                        {team.founders.map((f) => (
                            <li key={f.name} className={info.row}>
                                <div>
                                    <h3 className={info.rowLabel} translate="no">{f.name}</h3>
                                    <p className={a.education}>{f.education}</p>
                                </div>
                                <p className={info.rowBody}>{work(f, showCurrentRoles)}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section id={principles.id} className={`${s.section} ${s.tinted}`} aria-labelledby={`${principles.id}-h`}>
                <div className={s.container}>
                    <div className={s.sectionHead}>
                        <h2 id={`${principles.id}-h`} className={s.h2}>{principles.heading}</h2>
                    </div>
                    <ul className={s.list}>
                        {principles.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            </section>

            <section id={contact.id} className={`${s.section} ${s.closing}`} aria-labelledby={`${contact.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${contact.id}-h`} className={s.h2}>{contact.heading}</h2>
                    <div className={s.prose}>
                        <p className={a.contactLine}>
                            {email
                                ? <>{contact.emailLine.split("{email}")[0]}<a href={`mailto:${email}`} className={info.inlineLink}>{email}</a>{contact.emailLine.split("{email}")[1]}</>
                                : contact.noEmail}
                        </p>
                        <p translate="no">{contact.address}</p>
                        <p>{email ? contact.body : contact.bodyNoEmail}</p>
                    </div>
                    <div className={s.actions}>
                        <Link href={contact.cta.href} className={s.primary}>{contact.cta.label}</Link>
                    </div>
                </div>
            </section>
        </>
    );
}

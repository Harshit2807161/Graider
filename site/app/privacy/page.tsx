import type { Metadata } from "next";
import info from "@/components/info/info.module.css";
import { contactEmail, slotText } from "@/components/info/slot";
import TableBlock from "@/components/info/TableBlock";
import { Paras } from "@/components/site/Prose";
import s from "@/components/site/page.module.css";
import content from "@/content/privacy";
import p from "./privacy.module.css";

export const metadata: Metadata = { title: content.meta.title, description: content.meta.description };

export default function Page() {
    const { head, stores, access, providers, retention, selfHosted, tracing, website, questions } = content;
    const email = contactEmail();
    const servers = slotText(stores.servers);
    const contents = [stores, access, providers, retention, selfHosted, tracing, website, questions];
    const [before, after] = questions.emailLine.split("{email}");

    return (
        <>
            <section className={s.pageHead} aria-labelledby="privacy-title">
                <div className={s.container}>
                    <h1 id="privacy-title" className={s.h1Page}>{head.title}</h1>
                    <p className={s.lede}>{head.lede}</p>
                    <p className={p.notice}>{content.notice.replace("{date}", content.asOf)}</p>
                    <nav className={p.contents} aria-labelledby="contents-h">
                        <h2 id="contents-h" className={p.contentsLabel}>{content.contentsLabel}</h2>
                        <ul className={p.contentsList}>
                            {contents.map((c) => (
                                <li key={c.id}><a href={`#${c.id}`} className={p.contentsLink}>{c.heading}</a></li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </section>

            <TableBlock section={stores} tinted>
                <div className={`${s.prose} ${s.after}`}>
                    {servers && <p>{servers}</p>}
                    <p><strong>{stores.notDone.lead}</strong> {stores.notDone.body}</p>
                </div>
            </TableBlock>

            <TableBlock section={access} />
            <TableBlock section={providers} tinted />
            <TableBlock section={retention} />

            {[selfHosted, tracing].map((sec, i) => (
                <section key={sec.id} id={sec.id} className={i === 0 ? `${s.section} ${s.tinted}` : s.section} aria-labelledby={`${sec.id}-h`}>
                    <div className={s.container}>
                        <h2 id={`${sec.id}-h`} className={s.h2}>{sec.heading}</h2>
                        <div className={s.prose}><Paras paras={sec.body} /></div>
                    </div>
                </section>
            ))}

            <TableBlock section={website} tinted />

            <section id={questions.id} className={s.section} aria-labelledby={`${questions.id}-h`}>
                <div className={s.container}>
                    <h2 id={`${questions.id}-h`} className={s.h2}>{questions.heading}</h2>
                    <div className={s.prose}>
                        <p>
                            {email
                                ? <>{before}<a href={`mailto:${email}`} className={info.inlineLink}>{email}</a>{after}</>
                                : questions.noEmail}
                        </p>
                        <p translate="no">{questions.address}</p>
                    </div>
                </div>
            </section>
        </>
    );
}

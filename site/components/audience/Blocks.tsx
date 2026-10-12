import Link from "next/link";
import s from "@/components/site/page.module.css";
import type { ClosingCta, HonestSection, Para, StepsSection } from "@/content/types";
import type { FaqItem } from "@/content/types-audience";
import b from "./Blocks.module.css";

/** Blocks the audience pages share. They render inside a page's own <section>; the page decides the
 *  section's id, heading and background. Classes come from the shared page.module.css where the home
 *  page has one, so the pages read as one site. */

/** A real sequence, numbered. `wide` lays it out in two columns from desktop up, as on the home page. */
export function StepList({ steps, wide = false }: { steps: StepsSection["steps"]; wide?: boolean }) {
    return (
        <ol className={wide ? `${b.steps} ${b.stepsWide}` : b.steps}>
            {steps.map((step) => (
                <li key={step.title}><p><strong>{step.title}</strong> {step.body}</p></li>
            ))}
        </ol>
    );
}

/** Points with a bold lead-in, as a plain list (not cards). */
export function LeadList({ items, wide = false }: { items: Para[]; wide?: boolean }) {
    return (
        <ul className={wide ? `${b.leads} ${b.leadsWide}` : b.leads}>
            {items.map((item) => (
                <li key={item.body}>{item.lead && <><strong>{item.lead}</strong>{" "}</>}{item.body}</li>
            ))}
        </ul>
    );
}

/** The honest section's groups (does well, sends to you, not yet), side by side from desktop up. */
export function HonestGroups({ honest }: { honest: HonestSection }) {
    return (
        <div className={honest.groups.length === 3 ? `${b.groups} ${b.groups3}` : b.groups}>
            {honest.groups.map((g) => (
                <div key={g.heading}>
                    <h3 className={`${s.h3} ${b.groupHead}`}>{g.heading}</h3>
                    <ul className={s.list}>{g.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
            ))}
        </div>
    );
}

/** Questions as plain headings with their answers always visible: an objection's answer should never
 *  need a click. Question on the left and answer on the right from a wide tablet up. */
export function FaqList({ items }: { items: FaqItem[] }) {
    return (
        <div className={b.faq}>
            {items.map((item) => (
                <div key={item.question} className={b.faqItem}>
                    <h3 className={b.faqQ}>{item.question}</h3>
                    <div className={`${s.prose} ${b.faqA}`}>
                        {item.answer.map((p) => <p key={p}>{p}</p>)}
                        {item.link && <p><Link href={item.link.href} className={s.link}>{item.link.label}</Link></p>}
                    </div>
                </div>
            ))}
        </div>
    );
}

/** The closing call to action: the page's one next step, repeated, with an optional line under it. */
export function Closing({ closing, note }: { closing: ClosingCta; note?: string }) {
    return (
        <section className={`${s.section} ${s.tinted} ${s.closing}`} aria-labelledby="closing-h">
            <div className={s.container}>
                <h2 id="closing-h" className={s.h2}>{closing.heading}</h2>
                <div className={s.prose}><p>{closing.body}</p></div>
                <div className={s.actions}>
                    <Link href={closing.cta.href} className={s.primary}>{closing.cta.label}</Link>
                </div>
                {note && <p className={`${s.small} ${b.note}`}>{note}</p>}
            </div>
        </section>
    );
}

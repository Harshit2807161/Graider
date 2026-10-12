import Link from "next/link";
import type { Cta, Para } from "@/content/types";
import s from "./page.module.css";

/** Paragraphs from a content module, each with its optional bold lead-in. */
export function Paras({ paras }: { paras: Para[] }) {
    return paras.map((p, i) => <p key={i}>{p.lead && <><strong>{p.lead}</strong>{" "}</>}{p.body}</p>);
}

/** A section's closing text link, on its own line. */
export function MoreLink({ link }: { link?: Cta }) {
    if (!link) return null;
    return <p className={s.linkRow}><Link href={link.href} className={s.link}>{link.label}</Link></p>;
}

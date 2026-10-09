import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import styles from "./review.module.css";

export interface Crumb {
    label: string;
    href?: string;
}

/** Where this page sits: links up the hierarchy, the current page last (not a link). */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
    return (
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
            <ol>
                {items.map((item, i) => (
                    <li key={`${i}-${item.label}`}>
                        {i > 0 && <ChevronRight size={14} aria-hidden="true" className={styles.crumbSep} />}
                        {item.href
                            ? <Link href={item.href} title={item.label}>{item.label}</Link>
                            : <span aria-current="page" title={item.label}>{item.label}</span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

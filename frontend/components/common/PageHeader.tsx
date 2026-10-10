import React, { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./PageHeader.module.css";

export interface Crumb {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    breadcrumbs?: Crumb[];
    /** Right-hand actions: at most one primary Button, the rest secondary/ghost */
    actions?: ReactNode;
}

/** Keeps short hyphenated words ("check-in") whole when a title wraps; long tokens can still break */
function keepHyphenatedWords(title: ReactNode): ReactNode {
    if (typeof title !== "string" || !title.includes("-")) return title;
    return title.split(/(\s+)/).map((part, i) =>
        /\S-\S/.test(part) && part.length <= 16 ? <span key={i} className={styles.nowrap}>{part}</span> : part);
}

/**
 * The header every portal page starts with: breadcrumb, title + subtitle, actions on the right.
 * On phones the breadcrumb shortens to a back link to the parent page ("‹ Review queue"), so a deep
 * trail doesn't wrap over three lines; the sidebar still reaches every top-level page.
 */
export default function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
    return (
        <header className={styles.header}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="Breadcrumb">
                    <ol className={styles.crumbs}>
                        {breadcrumbs.map((crumb, i) => {
                            const last = i === breadcrumbs.length - 1;
                            // The page one level up: the back link on phones
                            const parent = i === breadcrumbs.length - 2 && !!crumb.href;
                            return (
                                <li key={`${crumb.label}-${i}`} className={cn(styles.crumb, parent && styles.parent)}>
                                    {crumb.href && !last ? (
                                        <Link href={crumb.href} className={styles.crumbLink}>
                                            {parent && <ChevronLeft size={16} aria-hidden="true" className={styles.back} />}
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span aria-current={last ? "page" : undefined}>{crumb.label}</span>
                                    )}
                                    {!last && <ChevronRight size={16} aria-hidden="true" className={styles.chevron} />}
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            )}
            <div className={styles.row}>
                <div className={styles.titleBlock}>
                    <h1 className={styles.title}>{keepHyphenatedWords(title)}</h1>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                {actions && <div className={styles.actions}>{actions}</div>}
            </div>
        </header>
    );
}

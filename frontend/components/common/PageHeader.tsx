import React, { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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

/** The header every portal page starts with: breadcrumb, title + subtitle, actions on the right. */
export default function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
    return (
        <header className={styles.header}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="Breadcrumb">
                    <ol className={styles.crumbs}>
                        {breadcrumbs.map((crumb, i) => {
                            const last = i === breadcrumbs.length - 1;
                            return (
                                <li key={`${crumb.label}-${i}`} className={styles.crumb}>
                                    {crumb.href && !last ? (
                                        <Link href={crumb.href} className={styles.crumbLink}>{crumb.label}</Link>
                                    ) : (
                                        <span aria-current={last ? "page" : undefined}>{crumb.label}</span>
                                    )}
                                    {!last && <ChevronRight size={14} aria-hidden="true" className={styles.chevron} />}
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            )}
            <div className={styles.row}>
                <div className={styles.titleBlock}>
                    <h1 className={styles.title}>{title}</h1>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                {actions && <div className={styles.actions}>{actions}</div>}
            </div>
        </header>
    );
}

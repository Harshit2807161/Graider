import React, { ReactNode, useId } from "react";
import { cn } from "@/lib/utils";
import styles from "./SectionCard.module.css";

/** A section of the exam workspace: a card with an icon tile, a title, a one-line description
 *  and actions on the right, then the body. `step` adds a "Step n" eyebrow for workflow sections. */
export default function SectionCard({ icon, title, description, step, actions, footer, className, children }: {
    icon: ReactNode;
    title: string;
    description?: ReactNode;
    step?: number;
    actions?: ReactNode;
    footer?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    const titleId = useId();
    return (
        <section className={cn(styles.card, className)} aria-labelledby={titleId}>
            <header className={styles.header}>
                <span className={styles.iconTile} aria-hidden="true">{icon}</span>
                <div className={styles.titleBlock}>
                    {step != null && <p className={styles.eyebrow}>Step {step}</p>}
                    <h2 id={titleId} className={styles.title}>{title}</h2>
                    {description && <p className={styles.description}>{description}</p>}
                </div>
                {actions && <div className={styles.actions}>{actions}</div>}
            </header>
            <div className={styles.body}>{children}</div>
            {footer && <footer className={styles.footer}>{footer}</footer>}
        </section>
    );
}

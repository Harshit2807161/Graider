"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Org } from "@/types/org.types";
import { useOrgs } from "@/hooks/useOrgs";
import { ArrowLeftRight, ArrowRight, Building2, Trash2 } from "lucide-react";
import styles from "./OrgCard.module.css";

interface OrgCardProps {
    org: Org;
    /** The organization you're working in (shown in the sidebar); the others offer a Switch */
    isCurrent?: boolean;
    onDelete?: () => void;
    /** After Switch made this the current organization */
    onSwitched?: () => void;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function OrgCard({ org, isCurrent = false, onDelete, onSwitched }: OrgCardProps) {
    const { setActiveOrg } = useOrgs();
    const titleId = `org-${org.id}`;
    const classesRef = useRef<HTMLAnchorElement>(null);
    // Opening an organization's classes or exams makes it the one you're working in
    const select = () => setActiveOrg(org);
    const switchTo = () => {
        select();
        onSwitched?.();
        // Switch disappears once this is the current organization: keep focus in the card, on its next step
        requestAnimationFrame(() => classesRef.current?.focus());
    };

    return (
        <article className={styles.card} aria-labelledby={titleId}>
            <div className={styles.header}>
                <span className={styles.icon} aria-hidden="true">
                    <Building2 size={24} />
                </span>
                <div className={styles.info}>
                    <h2 id={titleId} className={styles.name}>{org.name}</h2>
                    <p className={styles.slug}>@{org.slug}</p>
                </div>
                {onDelete && (
                    <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={onDelete}
                        aria-label={`Delete ${org.name}`}
                        title="Delete organization"
                    >
                        <Trash2 size={18} aria-hidden="true" />
                    </button>
                )}
            </div>

            {org.description && <p className={styles.description}>{org.description}</p>}

            <p className={styles.meta}>
                {isCurrent && <span className={styles.current}>Current</span>}
                <span>Created {formatDate(org.created_at)}</span>
            </p>

            <div className={styles.links}>
                <Link ref={classesRef} href="/dashboard/classes" className={styles.link} onClick={select}>
                    Classes <ArrowRight size={16} aria-hidden="true" />
                    <span className="sr-only"> in {org.name}</span>
                </Link>
                <Link href="/dashboard/exams" className={styles.link} onClick={select}>
                    Exams <ArrowRight size={16} aria-hidden="true" />
                    <span className="sr-only"> in {org.name}</span>
                </Link>
                {!isCurrent && (
                    <button type="button" className={styles.switchBtn} onClick={switchTo}>
                        <ArrowLeftRight size={16} aria-hidden="true" />
                        Switch<span className="sr-only"> to {org.name}</span>
                    </button>
                )}
            </div>
        </article>
    );
}

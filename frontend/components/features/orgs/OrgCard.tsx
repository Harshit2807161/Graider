"use client";

import React from "react";
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
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function OrgCard({ org, isCurrent = false, onDelete }: OrgCardProps) {
    const { setActiveOrg } = useOrgs();
    const titleId = `org-${org.id}`;
    // Opening an organization's classes or exams makes it the one you're working in
    const select = () => setActiveOrg(org);

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
                <Link href="/dashboard/classes" className={styles.link} onClick={select}>
                    Classes <ArrowRight size={14} aria-hidden="true" />
                    <span className="sr-only"> in {org.name}</span>
                </Link>
                <Link href="/dashboard/exams" className={styles.link} onClick={select}>
                    Exams <ArrowRight size={14} aria-hidden="true" />
                    <span className="sr-only"> in {org.name}</span>
                </Link>
                {!isCurrent && (
                    <button type="button" className={styles.switchBtn} onClick={select}>
                        <ArrowLeftRight size={14} aria-hidden="true" />
                        Switch<span className="sr-only"> to {org.name}</span>
                    </button>
                )}
            </div>
        </article>
    );
}

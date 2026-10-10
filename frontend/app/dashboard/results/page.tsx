"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Award, CalendarCheck, ChevronRight, Hourglass } from "lucide-react";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageHeader from "@/components/common/PageHeader";
import styles from "@/components/features/results/results.module.css";
import { useOrgContext } from "@/context/OrgContext";
import { getErrorMessage } from "@/lib/api";
import { resultsService } from "@/services/results.service";
import { MyResults } from "@/types/results.types";

function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

function date(value: string | null): string | null {
    return value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;
}

function sheets(n: number): string {
    return `${n} answer ${n === 1 ? "sheet" : "sheets"}`;
}

/** A student's published results, newest first. */
export default function MyResultsPage() {
    const { activeOrg } = useOrgContext();
    const [data, setData] = useState<MyResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const orgId = activeOrg?.id;

    useEffect(() => {
        let cancelled = false;
        resultsService.mine(orgId)
            .then((d) => { if (!cancelled) { setData(d); setError(null); } })
            .catch((err) => !cancelled && setError(getErrorMessage(err)));
        return () => {
            cancelled = true;
        };
    }, [orgId, attempt]);
    const load = () => setAttempt((n) => n + 1);

    return (
        <div className={styles.page}>
            <PageHeader title="My results"
                        subtitle={activeOrg ? <>Your marked answer sheets from <strong>{activeOrg.name}</strong>.</> : "Your marked answer sheets."} />

            {error && <ErrorBanner title="Your results couldn't be loaded" detail={error} onRetry={load} />}

            {!data && !error && (
                <div className={styles.grid} aria-busy="true">
                    {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
                    <span className="sr-only" role="status">Loading your results…</span>
                </div>
            )}

            {data && data.results.length === 0 && (
                <section className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><Award size={32} /></span>
                    <h2>No results yet</h2>
                    <p>
                        {data.awaiting > 0
                            ? `${sheets(data.awaiting)} of yours ${data.awaiting === 1 ? "is" : "are"} being marked. Results appear here once your teacher publishes them.`
                            : "When your teacher publishes your marked answer sheets, they appear here."}
                    </p>
                </section>
            )}

            {data && data.results.length > 0 && (
                <>
                    {data.awaiting > 0 && (
                        <p className={styles.awaiting} role="status">
                            <Hourglass size={16} aria-hidden="true" />
                            {sheets(data.awaiting)} still being marked: {data.awaiting === 1 ? "it appears" : "they appear"} here once published.
                        </p>
                    )}
                    <ul className={styles.grid}>
                        {data.results.map((r) => {
                            const percent = r.percentage ?? 0;
                            return (
                                <li key={r.submission_id}>
                                    <Link href={`/dashboard/results/${r.submission_id}`} className={styles.resultCard}>
                                        <span className={styles.resultTop}>
                                            <span className={styles.tile} aria-hidden="true"><Award size={20} /></span>
                                            <span className={styles.resultName}>{r.exam_name}</span>
                                            <ChevronRight size={18} aria-hidden="true" className={styles.chevron} />
                                        </span>
                                        <span className={styles.score}>
                                            <strong>{fmt(r.total_score)}</strong> / {fmt(r.max_score)}
                                            <span className={styles.percent}>{Math.round(percent)}%</span>
                                        </span>
                                        <span className={styles.bar} aria-hidden="true">
                                            <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
                                        </span>
                                        {date(r.published_at) && (
                                            <span className={styles.meta}>
                                                <CalendarCheck size={16} aria-hidden="true" /> Published {date(r.published_at)}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
}

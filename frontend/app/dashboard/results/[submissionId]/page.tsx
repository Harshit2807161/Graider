"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import ButtonLink from "@/components/common/ButtonLink";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageHeader from "@/components/common/PageHeader";
import { useTabTitle } from "@/components/common/useTabTitle";
import PageViewer from "@/components/features/review/PageViewer";
import styles from "@/components/features/results/results.module.css";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { resultsService } from "@/services/results.service";
import { PageInfo } from "@/types/review.types";
import { StudentResult } from "@/types/results.types";

function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

function marks(n: number): string {
    return `${fmt(n)} ${n === 1 ? "mark" : "marks"}`;
}

/** One published result: the total, each question's marks and feedback, and the student's own pages. */
export default function ResultPage() {
    const submissionId = useParams().submissionId as string;
    const [result, setResult] = useState<StudentResult | null>(null);
    const [error, setError] = useState<{ notFound: boolean; detail: string } | null>(null);
    const [page, setPage] = useState(1);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        resultsService.get(submissionId)
            .then((r) => { if (!cancelled) { setResult(r); setError(null); } })
            .catch((err) => {
                if (cancelled) return;
                const status = (err as { response?: { status?: number } }).response?.status;
                setError({ notFound: status === 404, detail: getErrorMessage(err) });
            });
        return () => {
            cancelled = true;
        };
    }, [submissionId, attempt]);
    const load = () => setAttempt((n) => n + 1);

    useTabTitle(result?.exam_name ? `${result.exam_name} · Gr8r` : null, "My results · Gr8r");

    const crumbs = [{ label: "My results", href: "/dashboard/results" }];
    if (error?.notFound) {
        return (
            <div className={styles.page}>
                <PageHeader title="Result not available" breadcrumbs={crumbs} />
                <section className={styles.empty}>
                    <h2>This result isn&apos;t available</h2>
                    <p>It may not be published yet, or it belongs to someone else.</p>
                    <ButtonLink href="/dashboard/results" variant="primary">Back to my results</ButtonLink>
                </section>
            </div>
        );
    }
    if (error) {
        return (
            <div className={styles.page}>
                <PageHeader title="My result" breadcrumbs={crumbs} />
                <ErrorBanner title="This result couldn't be loaded" detail={error.detail} onRetry={load} />
            </div>
        );
    }
    if (!result) {
        return (
            <div className={styles.page} aria-busy="true">
                <div className={styles.skeletonTitle} />
                <div className={styles.skeleton} />
                <span className="sr-only" role="status">Loading your result…</span>
            </div>
        );
    }

    const percent = result.percentage ?? 0;
    const published = result.published_at
        ? new Date(result.published_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
        : null;
    const pages: PageInfo[] = Array.from({ length: result.pages }, (_, i) => ({
        number: i + 1, document_id: "", page_index: i, kind: "image", width: null, height: null, has_image: true,
    }));

    return (
        <div className={styles.page}>
            <PageHeader title={result.exam_name ?? "My result"} breadcrumbs={[...crumbs, { label: result.exam_name ?? "Result" }]}
                        subtitle={published ? `Published ${published}` : undefined} />

            <section className={styles.summary} aria-label="Your total">
                <div>
                    <p className={styles.summaryLabel}>Your total</p>
                    <p className={styles.summaryScore}><strong>{fmt(result.total_score)}</strong> / {fmt(result.max_score)}</p>
                </div>
                <div className={styles.summaryBarWrap}>
                    <span className={styles.summaryPercent}>{Math.round(percent)}%</span>
                    <span className={styles.bar} aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></span>
                    <span className={styles.meta}>{result.answers.length} {result.answers.length === 1 ? "question" : "questions"}</span>
                </div>
            </section>

            <div className={cn(styles.layout, pages.length === 0 && styles.layoutSingle)}>
                <ol className={styles.answers} aria-label="Your answers">
                    {result.answers.map((a) => {
                        const full = a.score != null && a.score >= a.max_score - 1e-6;
                        const none = a.score == null || a.score <= 1e-6;
                        return (
                            <li key={a.question_id} className={cn(styles.answer, !a.counted && styles.answerMuted)}>
                                <div className={styles.answerHead}>
                                    <span className={styles.label}>{a.label}</span>
                                    <p className={styles.question}>{a.question_text}</p>
                                    <span className={cn(styles.pill, full ? styles.pillFull : none ? styles.pillNone : styles.pillPart)}
                                          aria-label={`${fmt(a.score)} out of ${marks(a.max_score)}`}>
                                        {fmt(a.score)} / {fmt(a.max_score)}
                                    </span>
                                </div>
                                {!a.counted && <p className={styles.note}>Doesn&apos;t count towards your total: you answered more alternatives than needed.</p>}
                                {a.feedback && (
                                    <div className={styles.feedback}>
                                        <MessageSquareText size={16} aria-hidden="true" />
                                        <p><span className="sr-only">Feedback: </span>{a.feedback}</p>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ol>
                {pages.length > 0 && (
                    <section className={styles.sheet} aria-label="Your answer sheet">
                        <h2 className={styles.sheetTitle}>Your answer sheet</h2>
                        <PageViewer submissionId={result.id} pages={pages} page={page} onPageChange={setPage} />
                    </section>
                )}
            </div>
        </div>
    );
}

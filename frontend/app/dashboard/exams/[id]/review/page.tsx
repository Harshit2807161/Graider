"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Inbox } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ButtonLink from "@/components/common/ButtonLink";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageHeader from "@/components/common/PageHeader";
import { focusMainContent } from "@/components/common/focus";
import { fmt, percent, plural } from "@/components/features/review/format";
import queue from "@/components/features/review/ReviewQueue.module.css";
import { useTabTitle } from "@/components/common/useTabTitle";
import styles from "@/components/features/review/review.module.css";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { reviewService } from "@/services/review.service";
import { ReviewQueueItem, escalationText } from "@/types/review.types";

const QUEUE_ERROR = "The review queue couldn't be loaded";

function initials(name: string | null): string {
    if (!name) return "?";
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

/** Answers to check across the exam: escalated ones first, then the grades the two examiners
 *  agreed on least. */
export default function ReviewQueuePage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;
    const [examName, setExamName] = useState<string>("");
    const [escalatedOnly, setEscalatedOnly] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ filter: boolean; attempt: number; items: ReviewQueueItem[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        examService.getExam(examId).then((exam) => setExamName(exam.name)).catch(() => undefined);
    }, [examId]);

    // The browser tab names the exam once it's known (layout.tsx gives "Review queue · Gr8r" until then)
    useTabTitle(examName ? `Review queue · ${examName} · Gr8r` : null, "Review queue · Gr8r");

    useEffect(() => {
        let cancelled = false;
        reviewService.getQueue(examId, escalatedOnly)
            .then((items) => !cancelled && setResult({ filter: escalatedOnly, attempt, items }))
            .catch((err) => !cancelled && setError(getErrorMessage(err, QUEUE_ERROR)));
        return () => {
            cancelled = true;
        };
    }, [examId, escalatedOnly, attempt]);

    const items = result?.items ?? [];
    const loading = !error && (result === null || result.filter !== escalatedOnly || result.attempt !== attempt);
    const toReview = items.filter((i) => i.status === "escalated");
    const toCheck = items.filter((i) => i.status !== "escalated");
    const waiting = toReview.length;
    const sheets = new Set(toReview.map((i) => i.submission_id)).size;
    const groups = [
        { key: "review", title: "Needs review", items: toReview },
        { key: "check", title: "Graded, lowest agreement first", items: toCheck },
    ].filter((g) => g.items.length > 0);
    // Announced when the list changes (the filter, a retry)
    const status = loading ? "Loading the review queue…"
        : error ? ""
        : items.length === 0 ? (escalatedOnly ? "Nothing needs review." : "Nothing to check yet.")
        : waiting === 0 ? `Nothing needs review; ${plural(items.length, "graded answer", "graded answers")} to check.`
        : `${plural(waiting, "answer needs", "answers need")} review across ${plural(sheets, "answer sheet", "answer sheets")}`
            + (toCheck.length > 0 ? `; ${plural(toCheck.length, "graded answer", "graded answers")} to check.` : ".");
    // The filter only helps when there is something to filter
    const showFilter = escalatedOnly || loading || items.length > 0;
    const hrefOf = (item: ReviewQueueItem) => `/dashboard/exams/${examId}/submissions/${item.submission_id}#q-${item.question_id}`;
    const retry = () => {
        setError(null);
        setAttempt((n) => n + 1);
        // The banner (and its button) goes away: keep keyboard focus on the page, not lost to <body>
        focusMainContent();
    };

    return (
        <div className={styles.page}>
            <PageHeader
                breadcrumbs={[
                    { label: "Exams", href: "/dashboard/exams" },
                    { label: examName || "Exam", href: `/dashboard/exams/${examId}` },
                    { label: "Review queue" },
                ]}
                title="Review queue"
                subtitle="Flagged answers first, then the grades the AI was least sure of."
                actions={showFilter && (
                    <div className={queue.segmented} role="group" aria-label="Show">
                        <button type="button" aria-pressed={!escalatedOnly} onClick={() => setEscalatedOnly(false)}
                                className={queue.segment}>All to check</button>
                        <button type="button" aria-pressed={escalatedOnly} onClick={() => setEscalatedOnly(true)}
                                className={queue.segment}>Needs review only</button>
                    </div>
                )}
            />
            <p className="sr-only" role="status">{status}</p>

            <div className={styles.sections}>
                {error && (
                    <ErrorBanner title={QUEUE_ERROR} detail={error} onRetry={retry} />
                )}

                {loading && items.length === 0 && (
                    <div className={queue.tableCard} aria-busy="true">
                        <table className={queue.table} aria-hidden="true">
                            <thead>
                                <tr><th>Student</th><th>Question</th><th>Status</th><th>Score</th><th>Agreement</th><th /></tr>
                            </thead>
                            <tbody>
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <tr key={i} className={queue.row}>
                                        <td><span className={queue.skeleton} style={{ width: "10rem", height: "1rem" }} /></td>
                                        <td><span className={queue.skeleton} style={{ width: "2.5rem", height: "1rem" }} /></td>
                                        <td><span className={queue.skeleton} style={{ width: "8rem", height: "1.25rem", borderRadius: "1rem" }} /></td>
                                        <td><span className={queue.skeleton} style={{ width: "3rem", height: "1rem" }} /></td>
                                        <td><span className={queue.skeleton} style={{ width: "5rem", height: "1rem" }} /></td>
                                        <td />
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    escalatedOnly ? (
                        <div className={styles.empty}>
                            <span className={cn(styles.emptyIcon, styles.emptyIconDone)} aria-hidden="true"><CheckCircle2 size={32} /></span>
                            <h2 className={styles.emptyTitle}>Nothing needs review</h2>
                            <p className={styles.emptyText}>Every answer the examiners flagged has been reviewed.</p>
                            <Button variant="secondary" onClick={() => setEscalatedOnly(false)}>Show all to check</Button>
                        </div>
                    ) : (
                        <div className={styles.empty}>
                            <span className={styles.emptyIcon} aria-hidden="true"><Inbox size={32} /></span>
                            <h2 className={styles.emptyTitle}>Nothing to check yet</h2>
                            <p className={styles.emptyText}>
                                Graded answers appear here, the ones that need you first. Upload answer sheets on the exam page to start grading.
                            </p>
                            <ButtonLink href={`/dashboard/exams/${examId}`} variant="secondary">Go to the exam</ButtonLink>
                        </div>
                    )
                )}

                {items.length > 0 && (
                    <>
                        <div className={cn(queue.tableCard, loading && queue.stale)} aria-busy={loading}>
                            <table className={queue.table}>
                                <caption className="sr-only">Answers to review, most urgent first</caption>
                                <thead>
                                    <tr>
                                        <th scope="col">Student</th>
                                        <th scope="col">Question</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Score</th>
                                        <th scope="col">Agreement</th>
                                        <th scope="col"><span className="sr-only">Open</span></th>
                                    </tr>
                                </thead>
                                {groups.map((group) => (
                                    <tbody key={group.key}>
                                        <tr className={queue.groupRow}>
                                            <th scope="colgroup" colSpan={6}>
                                                {group.title}
                                                <span className={cn(queue.groupCount, group.key === "review" && queue.groupCountReview)}>
                                                    {group.items.length}
                                                </span>
                                            </th>
                                        </tr>
                                        {group.items.map((item) => (
                                            <tr key={item.grade_id} className={queue.row}
                                                onClick={(e) => {
                                                    if (!(e.target as HTMLElement).closest("a")) router.push(hrefOf(item));
                                                }}>
                                                <td>
                                                    <span className={queue.person}>
                                                        <span className={queue.avatar} aria-hidden="true">{initials(item.student_name)}</span>
                                                        {item.student_name ?? <span className={queue.noStudent}>No student</span>}
                                                    </span>
                                                </td>
                                                <td><span className={queue.qLabel}>{item.question_label}</span></td>
                                                <td>
                                                    <StatusBadge status={item.status}
                                                                 label={item.status === "escalated" ? escalationText(item.escalation_reason) : undefined} />
                                                </td>
                                                <td className={cn(queue.num, queue.score)}><strong>{fmt(item.score)}</strong> / {fmt(item.max_score)}</td>
                                                <td className={queue.num}>
                                                    <span className={queue.agreement}>
                                                        {item.agreement != null && (
                                                            <span className={queue.meter} aria-hidden="true">
                                                                <span style={{ width: `${Math.max(0, Math.min(1, item.agreement)) * 100}%` }} />
                                                            </span>
                                                        )}
                                                        {percent(item.agreement)}
                                                    </span>
                                                </td>
                                                <td className={queue.open}>
                                                    <Link className={queue.openLink} href={hrefOf(item)}
                                                          aria-label={`Review ${item.question_label} of ${item.student_name ?? "this answer sheet"}`}>
                                                        <span className={queue.openText}>Review</span> <ChevronRight size={16} aria-hidden="true" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                ))}
                            </table>
                        </div>

                        <div className={cn(queue.cards, loading && queue.stale)} aria-busy={loading}>
                            {groups.map((group) => (
                                <section key={group.key} className={queue.cardGroup} aria-labelledby={`group-${group.key}`}>
                                    <h2 id={`group-${group.key}`} className={queue.cardGroupTitle}>
                                        {group.title}
                                        <span className={cn(queue.groupCount, group.key === "review" && queue.groupCountReview)}>{group.items.length}</span>
                                    </h2>
                                    <ul className={queue.cardList}>
                                        {group.items.map((item) => (
                                            <li key={item.grade_id}>
                                                <Link href={hrefOf(item)} className={queue.card}>
                                                    <span className={queue.person}>
                                                        <span className={queue.avatar} aria-hidden="true">{initials(item.student_name)}</span>
                                                        <span className={queue.cardWho}>
                                                            <span>{item.student_name ?? "No student"} · {item.question_label}</span>
                                                            {item.agreement != null && (
                                                                <span className={queue.cardSub}>Agreement {percent(item.agreement)}</span>
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span className={cn(queue.num, queue.score)}><strong>{fmt(item.score)}</strong> / {fmt(item.max_score)}</span>
                                                    <span className={queue.cardMeta}>
                                                        <StatusBadge status={item.status}
                                                                     label={item.status === "escalated" ? escalationText(item.escalation_reason) : undefined} />
                                                        <span className={queue.cardOpen}>Review <ChevronRight size={16} aria-hidden="true" /></span>
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

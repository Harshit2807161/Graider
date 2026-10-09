"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import styles from "@/components/features/review/review.module.css";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { reviewService } from "@/services/review.service";
import { ReviewQueueItem, escalationText } from "@/types/review.types";

function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

/** Answers to check across the exam: escalated ones first, then the grades the two examiners
 *  agreed on least. */
export default function ReviewQueuePage() {
    const params = useParams();
    const examId = params.id as string;
    const [examName, setExamName] = useState<string>("");
    const [escalatedOnly, setEscalatedOnly] = useState(false);
    const [result, setResult] = useState<{ filter: boolean; items: ReviewQueueItem[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        examService.getExam(examId).then((exam) => setExamName(exam.name)).catch(() => undefined);
    }, [examId]);

    useEffect(() => {
        let cancelled = false;
        reviewService.getQueue(examId, escalatedOnly)
            .then((items) => !cancelled && setResult({ filter: escalatedOnly, items }))
            .catch((err) => !cancelled && setError(getErrorMessage(err, "The review queue couldn't be loaded")));
        return () => {
            cancelled = true;
        };
    }, [examId, escalatedOnly]);

    const items = result?.items ?? [];
    const loading = !error && (result === null || result.filter !== escalatedOnly);
    const waiting = items.filter((i) => i.status === "escalated").length;
    const sheets = new Set(items.filter((i) => i.status === "escalated").map((i) => i.submission_id)).size;

    return (
        <div className={styles.reviewPage}>
            <nav className={styles.crumbs} aria-label="Breadcrumb">
                <Link href={`/dashboard/exams/${examId}`}><ChevronLeft size={16} aria-hidden="true" /> {examName || "Exam"}</Link>
            </nav>
            <header className={styles.queueHead}>
                <div>
                    <h1 className={styles.reviewTitle}>Review queue</h1>
                    <p className={styles.sectionNote}>
                        {loading ? "Loading…" : result?.filter
                            ? `${items.length} ${items.length === 1 ? "answer needs" : "answers need"} review`
                            : `${waiting} ${waiting === 1 ? "answer needs" : "answers need"} review across ${sheets} answer ${sheets === 1 ? "sheet" : "sheets"}; then the grades the examiners agreed on least.`}
                    </p>
                </div>
                <div className={styles.pageTabs} role="group" aria-label="Show">
                    <button type="button" aria-pressed={!escalatedOnly} onClick={() => setEscalatedOnly(false)}
                            className={cn(styles.pageTab, !escalatedOnly && styles.pageTabActive)}>All to check</button>
                    <button type="button" aria-pressed={escalatedOnly} onClick={() => setEscalatedOnly(true)}
                            className={cn(styles.pageTab, escalatedOnly && styles.pageTabActive)}>Needs review only</button>
                </div>
            </header>

            {error && <p role="alert" className={styles.formError}>{error}</p>}
            {!loading && !error && items.length === 0 && (
                <div className={styles.emptyState}>
                    {escalatedOnly ? "Nothing needs review." : "No graded answers to check yet."}
                </div>
            )}
            {items.length > 0 && (
                <table className={styles.queueTable} aria-busy={loading}>
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
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.grade_id}>
                                <td>{item.student_name ?? <span className={styles.muted}>No student</span>}</td>
                                <td><strong>{item.question_label}</strong></td>
                                <td>
                                    <StatusBadge status={item.status}
                                                 label={item.status === "escalated" ? escalationText(item.escalation_reason) : undefined} />
                                </td>
                                <td className={styles.num}>{fmt(item.score)} / {fmt(item.max_score)}</td>
                                <td className={styles.num}>{fmt(item.agreement)}</td>
                                <td>
                                    <Link className={styles.queueLink}
                                          href={`/dashboard/exams/${examId}/submissions/${item.submission_id}#q-${item.question_id}`}
                                          aria-label={`Review ${item.question_label} of ${item.student_name ?? "this answer sheet"}`}>
                                        Review
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowDown, ChevronLeft, History, RefreshCw, ShieldCheck, Undo2 } from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import OverrideDialog from "@/components/features/review/OverrideDialog";
import PageViewer from "@/components/features/review/PageViewer";
import QuestionCard from "@/components/features/review/QuestionCard";
import TimelineDialog from "@/components/features/review/TimelineDialog";
import TranscriptDialog from "@/components/features/review/TranscriptDialog";
import styles from "@/components/features/review/review.module.css";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CriterionScoreIn, reviewService } from "@/services/review.service";
import { QuestionReview, SubmissionReview } from "@/types/review.types";

const POLL_INTERVAL_MS = 3000;

function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

function firstPage(q: QuestionReview | undefined): number | null {
    const pages = (q?.transcription?.segments ?? []).map((s) => s.page).filter((p): p is number => p != null);
    return pages.length ? Math.min(...pages) : null;
}

export default function SubmissionReviewPage() {
    const params = useParams();
    const examId = params.id as string;
    const submissionId = params.submissionId as string;

    const [review, setReview] = useState<SubmissionReview | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [overrideQ, setOverrideQ] = useState<QuestionReview | null>(null);
    const [transcriptQ, setTranscriptQ] = useState<QuestionReview | null>(null);
    const [confirmRegrade, setConfirmRegrade] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const nextIndex = useRef(0);
    const firstLoad = useRef(true);

    const load = useCallback(async () => {
        try {
            const data = await reviewService.getReview(submissionId);
            setReview(data);
            setLoadError(null);
            if (firstLoad.current) {
                firstLoad.current = false;
                // Opened from the review queue: show that answer and its page
                const target = data.questions.find((q) => `#q-${q.question_id}` === window.location.hash);
                const targetPage = firstPage(target);
                if (targetPage) setPage(targetPage);
                if (target) {
                    requestAnimationFrame(() => {
                        const el = document.getElementById(`q-${target.question_id}`);
                        el?.scrollIntoView({ block: "start" });
                        el?.focus({ preventScroll: true });
                    });
                }
            }
        } catch (err) {
            setLoadError(getErrorMessage(err, "This submission couldn't be loaded"));
        }
    }, [submissionId]);

    useEffect(() => {
        load();
    }, [load]);

    const status = review?.submission.status;
    const grading = status === "PENDING" || status === "PROCESSING";
    useEffect(() => {
        if (!grading) return;
        const timer = setInterval(load, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [grading, load]);

    /** Run an action, then reload; the message is announced to screen readers. */
    const act = async (action: () => Promise<unknown>, done: string) => {
        setBusy(true);
        setNotice(null);
        try {
            await action();
            setNotice({ kind: "ok", text: done });
            await load();
        } catch (err) {
            setNotice({ kind: "error", text: getErrorMessage(err) });
        } finally {
            setBusy(false);
        }
    };

    if (loadError) return <div className={styles.pageMessage} role="alert">{loadError}</div>;
    if (!review) return <div className={styles.pageMessage} aria-live="polite">Loading submission…</div>;

    const { submission, questions } = review;
    const escalated = questions.filter((q) => q.grade?.status === "escalated");
    const canScore = status === "GRADED" || status === "NEEDS_REVIEW";
    const canEditTranscript = canScore || status === "APPROVED";

    const showQuestion = (q: QuestionReview) => {
        const el = document.getElementById(`q-${q.question_id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        el?.focus({ preventScroll: true });
        const p = firstPage(q);
        if (p) setPage(p);
    };
    const nextToReview = () => {
        if (escalated.length === 0) return;
        showQuestion(escalated[nextIndex.current % escalated.length]);
        nextIndex.current += 1;
    };

    const saveOverride = async (q: QuestionReview, criteria: CriterionScoreIn[], feedback: string, reason: string) => {
        const result = await reviewService.override(submissionId, q.question_id, {
            expected_grade_id: q.grade!.id, criteria, reason, feedback,
        });
        setOverrideQ(null);
        setNotice({ kind: "ok", text: `${q.label} is now ${fmt(result.grade.score)} / ${fmt(q.max_score)}.` });
        await load();
    };
    const saveTranscript = async (q: QuestionReview, text: string, reason: string) => {
        await reviewService.editTranscript(submissionId, q.question_id, text, reason);
        setTranscriptQ(null);
        setNotice({ kind: "ok", text: `${q.label} is being graded again from your transcript.` });
        await load();
    };

    return (
        <div className={styles.reviewPage}>
            <nav className={styles.crumbs} aria-label="Breadcrumb">
                <Link href={`/dashboard/exams/${examId}`}><ChevronLeft size={16} aria-hidden="true" /> Exam</Link>
                <span aria-hidden="true">/</span>
                <Link href={`/dashboard/exams/${examId}/review`}>Review queue</Link>
            </nav>

            <header className={styles.reviewHeader}>
                <div>
                    <h1 className={styles.reviewTitle}>{review.student_name ?? "Answer sheet"}</h1>
                    <p className={styles.sectionNote}>
                        Submitted {new Date(submission.created_at).toLocaleString()} · {questions.length} questions
                        {review.pages.length > 0 && ` · ${review.pages.length} ${review.pages.length === 1 ? "page" : "pages"}`}
                    </p>
                </div>
                <div className={styles.headerSide}>
                    <StatusBadge status={submission.status} />
                    <div className={styles.total} aria-label={`Total ${fmt(submission.total_score)} out of ${fmt(submission.max_score)}`}>
                        <strong>{fmt(submission.total_score)}</strong> / {fmt(submission.max_score)}
                    </div>
                </div>
            </header>

            <div className={styles.actionBar}>
                <div className={styles.actionGroup}>
                    {status === "NEEDS_REVIEW" && (
                        <>
                            <span className={styles.reviewCount}>
                                <AlertTriangle size={16} aria-hidden="true" />
                                {escalated.length} of {questions.length} {escalated.length === 1 ? "answer needs" : "answers need"} review
                            </span>
                            <Button size="sm" variant="secondary" onClick={nextToReview} icon={<ArrowDown size={14} aria-hidden="true" />}>
                                Next to review
                            </Button>
                        </>
                    )}
                    {grading && (
                        <span className={styles.gradingNote} aria-live="polite">
                            <RefreshCw size={14} aria-hidden="true" className={styles.spin} /> {submission.current_step ?? "Grading…"}
                        </span>
                    )}
                    {status === "FAILED" && <span className={styles.formError}>{submission.current_step}</span>}
                </div>
                <div className={styles.actionGroup}>
                    <Button size="sm" variant="ghost" onClick={() => setShowHistory(true)} icon={<History size={14} aria-hidden="true" />}>
                        History
                    </Button>
                    {!grading && status !== "PUBLISHED" && (
                        <Button size="sm" variant="ghost" onClick={() => setConfirmRegrade(true)} disabled={busy}
                                icon={<RefreshCw size={14} aria-hidden="true" />}>
                            Regrade
                        </Button>
                    )}
                    {status === "APPROVED" && (
                        <Button size="sm" variant="secondary" disabled={busy} icon={<Undo2 size={14} aria-hidden="true" />}
                                onClick={() => act(() => reviewService.unapprove(submissionId), "Approval withdrawn.")}>
                            Withdraw approval
                        </Button>
                    )}
                    {(status === "GRADED" || status === "NEEDS_REVIEW") && (
                        <Button size="sm" disabled={busy || status === "NEEDS_REVIEW"} icon={<ShieldCheck size={14} aria-hidden="true" />}
                                aria-describedby={status === "NEEDS_REVIEW" ? "approve-blocked" : undefined}
                                onClick={() => act(() => reviewService.approve(submissionId), "Approved. Publish the exam's results when every sheet is approved.")}>
                            Approve
                        </Button>
                    )}
                </div>
            </div>
            {status === "NEEDS_REVIEW" && (
                <p id="approve-blocked" className={styles.sectionNote}>Approve becomes available once every answer is reviewed.</p>
            )}
            {status === "PUBLISHED" && <p className={styles.sectionNote}>Published: students can see these results. They can no longer be changed.</p>}

            <div aria-live="polite" role="status" className={styles.noticeSlot}>
                {notice && (
                    <p className={cn(styles.notice, notice.kind === "error" && styles.noticeError)}>{notice.text}</p>
                )}
            </div>

            <div className={styles.layout}>
                <div className={styles.viewerColumn}>
                    <PageViewer submissionId={submissionId} pages={review.pages} page={page} onPageChange={setPage} />
                </div>
                <div className={styles.questionsColumn}>
                    {review.unassigned_segments.length > 0 && (
                        <section className={styles.unassigned} aria-label="Writing the model couldn't place">
                            <h2 className={styles.sectionTitle}>Writing the model couldn&apos;t place</h2>
                            <p className={styles.sectionNote}>If it belongs to an answer, add it there with “Correct transcript”.</p>
                            <ul>
                                {review.unassigned_segments.map((s, i) => (
                                    <li key={i}>
                                        {s.page != null && (
                                            <button type="button" className={styles.linkButton} onClick={() => setPage(s.page as number)}>
                                                Page {s.page}
                                            </button>
                                        )}
                                        <pre className={styles.transcript}>{s.text}</pre>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {questions.map((q) => (
                        <QuestionCard key={q.question_id} q={q} busy={busy || grading}
                                      canScore={canScore && q.rubric_spec?.status === "ready"}
                                      canEditTranscript={canEditTranscript}
                                      onResolve={(question) => act(() => reviewService.resolve(submissionId, question.question_id, question.grade!),
                                          `${question.label}: proposed score accepted.`)}
                                      onOverride={setOverrideQ} onEditTranscript={setTranscriptQ} onShowPage={setPage} />
                    ))}
                </div>
            </div>

            {overrideQ && (
                <OverrideDialog key={overrideQ.grade?.id} q={overrideQ} onClose={() => setOverrideQ(null)}
                                onSubmit={(criteria, feedback, reason) => saveOverride(overrideQ, criteria, feedback, reason)} />
            )}
            {transcriptQ && (
                <TranscriptDialog key={transcriptQ.question_id} q={transcriptQ} approved={status === "APPROVED"}
                                  onClose={() => setTranscriptQ(null)}
                                  onSubmit={(text, reason) => saveTranscript(transcriptQ, text, reason)} />
            )}
            {confirmRegrade && (
                <ConfirmDialog title="Regrade this answer sheet?" confirmLabel="Regrade" withReason
                               message={<>Every answer is read and graded again. Score changes made here are replaced by the new
                                   grades (they stay in the history); corrected transcripts are kept.</>}
                               onClose={() => setConfirmRegrade(false)}
                               onConfirm={async (reason) => {
                                   await reviewService.regrade(submissionId, reason);
                                   setConfirmRegrade(false);
                                   setNotice({ kind: "ok", text: "Grading again…" });
                                   await load();
                               }} />
            )}
            {showHistory && <TimelineDialog submissionId={submissionId} onClose={() => setShowHistory(false)} />}
        </div>
    );
}

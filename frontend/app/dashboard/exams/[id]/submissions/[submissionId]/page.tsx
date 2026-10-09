"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    AlertCircle, AlertTriangle, ArrowDown, Check, CheckCircle2, Clock, FileQuestion, FileText, History, Loader2,
    Minus, RefreshCw, Send, ShieldCheck, Undo2, X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import Breadcrumbs from "@/components/features/review/Breadcrumbs";
import OverrideDialog from "@/components/features/review/OverrideDialog";
import PageViewer from "@/components/features/review/PageViewer";
import QuestionCard from "@/components/features/review/QuestionCard";
import TimelineDialog from "@/components/features/review/TimelineDialog";
import TranscriptDialog from "@/components/features/review/TranscriptDialog";
import styles from "@/components/features/review/review.module.css";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { CriterionScoreIn, reviewService } from "@/services/review.service";
import { SubmissionStatus } from "@/types/exam.types";
import { QuestionReview, SubmissionReview } from "@/types/review.types";

const POLL_INTERVAL_MS = 3000;
const TOAST_MS = 6000;
const LOAD_ERROR = "This answer sheet couldn't be loaded";

function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

function firstPage(q: QuestionReview | undefined): number | null {
    const pages = (q?.transcription?.segments ?? []).map((s) => s.page).filter((p): p is number => p != null);
    return pages.length ? Math.min(...pages) : null;
}

function scrollBehavior(): ScrollBehavior {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** What the sheet's status means for the teacher, and what to do next. */
function summaryFor(status: SubmissionStatus, toReview: number, step: string | null | undefined) {
    switch (status) {
        case "PENDING":
            return { tone: "processing", icon: <Loader2 size={22} className={styles.spin} />, title: "Waiting to be graded",
                     text: step || "Queued: grading starts shortly." };
        case "PROCESSING":
            return { tone: "processing", icon: <Loader2 size={22} className={styles.spin} />, title: "Grading in progress",
                     text: step || "Reading the pages and grading each answer…" };
        case "NEEDS_REVIEW":
            return { tone: "review", icon: <AlertTriangle size={22} />,
                     title: `${toReview} ${toReview === 1 ? "answer needs" : "answers need"} your review`,
                     text: "Accept or change each flagged answer. Approve becomes available once every answer is reviewed." };
        case "GRADED":
            return { tone: "graded", icon: <CheckCircle2 size={22} />, title: "Ready to approve",
                     text: "Every answer is graded. Check the grades, then approve this answer sheet." };
        case "APPROVED":
            return { tone: "approved", icon: <ShieldCheck size={22} />, title: "Approved",
                     text: "Publish the exam's results from the exam page once every answer sheet is approved." };
        case "PUBLISHED":
            return { tone: "published", icon: <Send size={22} />, title: "Published",
                     text: "Students can see these results. They can no longer be changed." };
        default:
            return { tone: "failed", icon: <AlertCircle size={22} />, title: "Grading failed",
                     text: step || "This answer sheet couldn't be graded. Regrade it to try again." };
    }
}

function answerState(q: QuestionReview): { kind: "graded" | "review" | "muted"; icon: React.ReactNode; words: string } {
    const status = q.grade?.status;
    if (status === "escalated") return { kind: "review", icon: <AlertTriangle size={14} />, words: "needs review" };
    if (status === "graded") return { kind: "graded", icon: <Check size={14} />, words: "graded" };
    if (status === "not_attempted") return { kind: "muted", icon: <Minus size={14} />, words: "not attempted" };
    return { kind: "muted", icon: <Clock size={14} />, words: "not graded yet" };
}

export default function SubmissionReviewPage() {
    const params = useParams();
    const examId = params.id as string;
    const submissionId = params.submissionId as string;

    const [review, setReview] = useState<SubmissionReview | null>(null);
    const [examName, setExamName] = useState("");
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
    const viewerRef = useRef<HTMLDivElement>(null);

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
            setLoadError(getErrorMessage(err, LOAD_ERROR));
        }
    }, [submissionId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        examService.getExam(examId).then((exam) => setExamName(exam.name)).catch(() => undefined);
    }, [examId]);

    const status = review?.submission.status;
    const grading = status === "PENDING" || status === "PROCESSING";
    useEffect(() => {
        if (!grading) return;
        const timer = setInterval(load, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [grading, load]);

    // Confirmations fade after a while; errors stay until dismissed
    useEffect(() => {
        if (notice?.kind !== "ok") return;
        const timer = setTimeout(() => setNotice(null), TOAST_MS);
        return () => clearTimeout(timer);
    }, [notice]);

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

    const crumbs = [
        { label: "Exams", href: "/dashboard/exams" },
        { label: examName || "Exam", href: `/dashboard/exams/${examId}` },
        { label: "Review queue", href: `/dashboard/exams/${examId}/review` },
    ];

    if (!review && loadError) {
        return (
            <div className={styles.page}>
                <Breadcrumbs items={[...crumbs, { label: "Answer sheet" }]} />
                <h1 className={styles.title}>Answer sheet</h1>
                <div className={styles.errorBanner} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <div className={styles.errorBody}>
                        <div>
                            <p className={styles.errorTitle}>{LOAD_ERROR}</p>
                            <p>{loadError === LOAD_ERROR ? "Check your connection and try again." : loadError}</p>
                        </div>
                        <div className={styles.errorActions}>
                            <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw size={14} aria-hidden="true" />}>Try again</Button>
                            <Link className={styles.linkButtonSm} href={`/dashboard/exams/${examId}/review`}>Back to the review queue</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!review) {
        return (
            <div className={styles.page} aria-busy="true">
                <p className="sr-only" role="status">Loading submission…</p>
                <span className={styles.skeleton} style={{ width: "22rem", maxWidth: "100%", height: "1rem" }} />
                <div>
                    <span className={styles.skeleton} style={{ width: "16rem", maxWidth: "100%", height: "2.25rem" }} />
                    <span className={styles.skeleton} style={{ width: "20rem", maxWidth: "100%", height: "1rem", marginTop: "0.5rem" }} />
                </div>
                <div className={cn(styles.card, styles.skeletonCard)}>
                    <span className={styles.skeleton} style={{ width: "40%", height: "1.25rem" }} />
                    <span className={styles.skeleton} style={{ width: "65%", height: "0.875rem" }} />
                </div>
                <div className={styles.desk}>
                    <span className={styles.skeleton} style={{ height: "28rem", borderRadius: "1rem" }} />
                    <div className={styles.answers}>
                        {[0, 1].map((i) => (
                            <div key={i} className={cn(styles.card, styles.skeletonCard)}>
                                <span className={styles.skeleton} style={{ width: "70%", height: "1.25rem" }} />
                                <span className={styles.skeleton} style={{ height: "5rem" }} />
                                <span className={styles.skeleton} style={{ height: "3.5rem" }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const { submission, questions } = review;
    const escalated = questions.filter((q) => q.grade?.status === "escalated");
    const canScore = status === "GRADED" || status === "NEEDS_REVIEW";
    const canEditTranscript = canScore || status === "APPROVED";
    const summary = summaryFor(submission.status, escalated.length, submission.current_step);
    const studentName = review.student_name ?? "Answer sheet";

    // What is on each page, for the viewer's caption
    const onPage = new Map<number, string[]>();
    const note = (p: number | undefined, what: string) => {
        if (p == null) return;
        const list = onPage.get(p) ?? [];
        if (!list.includes(what)) onPage.set(p, [...list, what]);
    };
    questions.forEach((q) => (q.transcription?.segments ?? []).forEach((s) => note(s.page, q.label)));
    review.unassigned_segments.forEach((s) => note(s.page, "writing not placed"));
    const captions = Object.fromEntries([...onPage].map(([p, list]) => [p, list.join(", ")]));
    const unplacedPages = review.unassigned_segments.map((s) => s.page).filter((p): p is number => p != null);

    /** Show a page; on narrow screens the viewer is above the answers, so bring it into view. */
    const showPage = (p: number) => {
        setPage(p);
        const el = viewerRef.current;
        if (!el) return;
        const box = el.getBoundingClientRect();
        if (box.bottom < 120 || box.top > window.innerHeight - 120) el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    };
    const showQuestion = (q: QuestionReview) => {
        const el = document.getElementById(`q-${q.question_id}`);
        el?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
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

    const submitted = new Date(submission.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

    return (
        <>
            <div className={styles.page}>
                <Breadcrumbs items={[...crumbs, { label: studentName }]} />

                <header className={styles.header}>
                    <div>
                        <div className={styles.titleRow}>
                            <h1 className={styles.title}>{studentName}</h1>
                            <StatusBadge status={submission.status} />
                        </div>
                        <p className={styles.subtitle}>
                            Submitted {submitted} · {questions.length} {questions.length === 1 ? "question" : "questions"}
                            {review.pages.length > 0 && ` · ${review.pages.length} ${review.pages.length === 1 ? "page" : "pages"}`}
                        </p>
                    </div>
                    <div className={styles.actions}>
                        <Button variant="outline" onClick={() => setShowHistory(true)} icon={<History size={16} aria-hidden="true" />}>
                            History
                        </Button>
                        {!grading && status !== "PUBLISHED" && (
                            <Button variant={status === "FAILED" ? "primary" : "outline"} onClick={() => setConfirmRegrade(true)} disabled={busy}
                                    icon={<RefreshCw size={16} aria-hidden="true" />}>
                                Regrade
                            </Button>
                        )}
                        {status === "APPROVED" && (
                            <Button variant="outline" disabled={busy} icon={<Undo2 size={16} aria-hidden="true" />}
                                    onClick={() => act(() => reviewService.unapprove(submissionId), "Approval withdrawn.")}>
                                Withdraw approval
                            </Button>
                        )}
                        {(status === "GRADED" || status === "NEEDS_REVIEW") && (
                            <Button disabled={busy || status === "NEEDS_REVIEW"} icon={<ShieldCheck size={16} aria-hidden="true" />}
                                    aria-describedby={status === "NEEDS_REVIEW" ? "approve-blocked" : undefined}
                                    onClick={() => act(() => reviewService.approve(submissionId), "Approved. Publish the exam's results when every sheet is approved.")}>
                                Approve
                            </Button>
                        )}
                    </div>
                </header>

                {loadError && (
                    <div className={styles.errorBanner} role="alert">
                        <AlertCircle size={20} aria-hidden="true" />
                        <div className={styles.errorBody}>
                            <div>
                                <p className={styles.errorTitle}>{loadError}</p>
                                <p>What you see may be out of date.</p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw size={14} aria-hidden="true" />}>Try again</Button>
                        </div>
                    </div>
                )}

                <section className={cn(styles.card, styles.summary, styles[`tone_${summary.tone}`])} aria-labelledby="summary-title">
                    <div className={styles.summaryMain}>
                        <span className={cn(styles.tile, styles.tileLg)} aria-hidden="true">{summary.icon}</span>
                        <div>
                            <h2 id="summary-title" className={styles.sectionTitle}>{summary.title}</h2>
                            <p id={status === "NEEDS_REVIEW" ? "approve-blocked" : undefined} className={styles.sectionText}
                               aria-live={grading ? "polite" : undefined}>
                                {summary.text}
                            </p>
                        </div>
                        <p className={styles.summaryTotal}>
                            <span className={styles.totalLabel}>Total</span>
                            <span className={styles.totalValue}>
                                <strong>{fmt(submission.total_score)}</strong> / {fmt(submission.max_score)}
                            </span>
                        </p>
                    </div>
                    {questions.length > 0 && (
                        <div className={styles.summaryNav}>
                            <nav className={styles.answerNav} aria-label="Answers">
                                <span className={styles.navLabel} aria-hidden="true">Answers</span>
                                <ul>
                                    {questions.map((q) => {
                                        const state = answerState(q);
                                        return (
                                            <li key={q.question_id}>
                                                <button type="button" className={cn(styles.qChip, styles[`qChip_${state.kind}`])}
                                                        onClick={() => showQuestion(q)}>
                                                    <span className="sr-only">
                                                        {q.label}, {fmt(q.grade?.score)} out of {fmt(q.max_score)}, {state.words}
                                                    </span>
                                                    <span className={styles.qChipIcon} aria-hidden="true">{state.icon}</span>
                                                    <span className={styles.qChipLabel} aria-hidden="true">{q.label}</span>
                                                    <span aria-hidden="true">{fmt(q.grade?.score)} / {fmt(q.max_score)}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </nav>
                            {status === "NEEDS_REVIEW" && escalated.length > 0 && (
                                <Button size="sm" variant="secondary" onClick={nextToReview} icon={<ArrowDown size={14} aria-hidden="true" />}>
                                    Next to review
                                </Button>
                            )}
                        </div>
                    )}
                </section>

                <div className={styles.desk}>
                    <div ref={viewerRef} className={styles.viewerColumn}>
                        <PageViewer submissionId={submissionId} pages={review.pages} page={page} onPageChange={setPage}
                                    captions={captions} flagged={unplacedPages} />
                    </div>
                    <div className={styles.answers}>
                        {review.unassigned_segments.length > 0 && (
                            <section className={cn(styles.card, styles.unplaced)} aria-labelledby="unplaced-title">
                                <div className={styles.sectionHeader}>
                                    <span className={styles.tile} aria-hidden="true"><FileQuestion size={18} /></span>
                                    <div>
                                        <h2 id="unplaced-title" className={styles.sectionTitle}>Writing the model couldn&apos;t place</h2>
                                        <p className={styles.sectionText}>If it belongs to an answer, add it there with “Correct transcript”.</p>
                                    </div>
                                </div>
                                <ul className={styles.unplacedList}>
                                    {review.unassigned_segments.map((s, i) => (
                                        <li key={i} className={styles.unplacedItem}>
                                            {s.page != null && (
                                                <button type="button" className={cn(styles.pageLink, s.page === page && styles.pageLinkShown)}
                                                        aria-current={s.page === page ? "true" : undefined}
                                                        onClick={() => showPage(s.page as number)}>
                                                    <FileText size={13} aria-hidden="true" /> Page {s.page}
                                                    {s.page === page && <span className="sr-only"> (shown)</span>}
                                                </button>
                                            )}
                                            <pre className={styles.snippet}>{s.text}</pre>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        <h2 className="sr-only">Answers</h2>
                        {questions.length === 0 && (
                            <div className={styles.empty}>
                                <span className={styles.emptyIcon} aria-hidden="true"><FileQuestion size={28} /></span>
                                <p className={styles.emptyTitle}>No questions on this exam</p>
                                <p className={styles.emptyText}>Add questions on the exam page, then regrade this answer sheet.</p>
                                <Link className={cn(styles.linkButton, styles.emptyAction)} href={`/dashboard/exams/${examId}`}>Go to the exam</Link>
                            </div>
                        )}
                        {questions.map((q) => (
                            <QuestionCard key={q.question_id} q={q} busy={busy || grading} currentPage={page}
                                          hasUnplaced={review.unassigned_segments.length > 0}
                                          canScore={canScore && q.rubric_spec?.status === "ready"}
                                          canEditTranscript={canEditTranscript}
                                          onResolve={(question) => act(() => reviewService.resolve(submissionId, question.question_id, question.grade!),
                                              `${question.label}: proposed score accepted.`)}
                                          onOverride={setOverrideQ} onEditTranscript={setTranscriptQ} onShowPage={showPage} />
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.toastRegion} role="status" aria-live="polite">
                {notice && (
                    <div className={cn(styles.toast, notice.kind === "error" && styles.toastError)}>
                        {notice.kind === "error"
                            ? <AlertCircle size={18} aria-hidden="true" className={styles.toastIcon} />
                            : <CheckCircle2 size={18} aria-hidden="true" className={styles.toastIcon} />}
                        <p>{notice.text}</p>
                        <button type="button" className={styles.toastClose} onClick={() => setNotice(null)} aria-label="Dismiss message">
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            {overrideQ && (
                <OverrideDialog key={overrideQ.grade?.id} q={overrideQ} onClose={() => setOverrideQ(null)}
                                onSubmit={(criteria, feedback, reason) => saveOverride(overrideQ, criteria, feedback, reason)} />
            )}
            {transcriptQ && (
                <TranscriptDialog key={transcriptQ.question_id} q={transcriptQ} approved={status === "APPROVED"}
                                  unplaced={review.unassigned_segments}
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
        </>
    );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
    AlertCircle, AlertTriangle, ArrowDown, Calendar, Check, CheckCircle2, ChevronRight, Clock, FileQuestion, FileText, History, ListChecks,
    Loader2, Minus, RefreshCw, Send, ShieldCheck, Undo2, X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import ButtonLink from "@/components/common/ButtonLink";
import PageHeader from "@/components/common/PageHeader";
import OverrideDialog from "@/components/features/review/OverrideDialog";
import PageViewer from "@/components/features/review/PageViewer";
import QuestionCard from "@/components/features/review/QuestionCard";
import TimelineDialog from "@/components/features/review/TimelineDialog";
import TranscriptDialog from "@/components/features/review/TranscriptDialog";
import { explainFailure, plainError } from "@/components/features/review/failure";
import { fmt, plural } from "@/components/features/review/format";
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

function firstPage(q: QuestionReview | undefined): number | null {
    const pages = (q?.transcription?.segments ?? []).map((s) => s.page).filter((p): p is number => p != null);
    return pages.length ? Math.min(...pages) : null;
}

function scrollBehavior(): ScrollBehavior {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function escalatedIn(questions: QuestionReview[]): QuestionReview[] {
    return questions.filter((q) => q.grade?.status === "escalated");
}

/** The worker's progress note ("Reading 3 page(s) for 3 questions...") as a tidy sentence. */
function progress(step: string | null | undefined, fallback: string): string {
    if (!step || /^error/i.test(step)) return fallback;
    return step.replace(/(\d+) page\(s\)/, (_, n: string) => plural(Number(n), "page", "pages")).replace(/\.\.\.$/, "…");
}

/** What the sheet's status means for the teacher, and what to do next. */
function summaryFor(status: SubmissionStatus, toReview: number, step: string | null | undefined) {
    switch (status) {
        case "PENDING":
            return { tone: "processing", icon: <Loader2 size={22} className={styles.spin} />, title: "Waiting to be graded",
                     text: progress(step, "Queued: grading starts shortly.") };
        case "PROCESSING":
            return { tone: "processing", icon: <Loader2 size={22} className={styles.spin} />, title: "Grading in progress",
                     text: progress(step, "Reading the pages and grading each answer…") };
        case "NEEDS_REVIEW":
            return { tone: "review", icon: <AlertTriangle size={22} />,
                     title: `${plural(toReview, "answer needs", "answers need")} your review`,
                     text: "Accept or change each flagged answer. You can approve the sheet once every answer is reviewed." };
        case "GRADED":
            return { tone: "graded", icon: <CheckCircle2 size={22} />, title: "Ready to approve",
                     text: "Every answer is graded. Check the grades, then approve this answer sheet." };
        case "APPROVED":
            return { tone: "approved", icon: <ShieldCheck size={22} />, title: "Approved, ready to publish",
                     text: "\"Publish approved\" on the exam page shares every approved sheet with its student. "
                         + "To change a score first, withdraw the approval." };
        case "PUBLISHED":
            return { tone: "published", icon: <Send size={22} />, title: "Published",
                     text: "The student can see these results. Published results can't be changed." };
        default:
            return { tone: "failed", icon: <AlertCircle size={22} />, title: "This answer sheet couldn't be graded",
                     text: explainFailure(step).cause };
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
    // The answer in view (marked in the answer list) and the one last opened from it
    const [activeQ, setActiveQ] = useState<string | null>(null);
    const lastShown = useRef<string | null>(null);
    const firstLoad = useRef(true);
    const viewerRef = useRef<HTMLDivElement>(null);
    const summaryRef = useRef<HTMLElement>(null);

    /** Fetch the sheet; returns it (or null when it couldn't be loaded) so actions can report on it. */
    const load = useCallback(async (): Promise<SubmissionReview | null> => {
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
                    lastShown.current = target.question_id;
                    requestAnimationFrame(() => {
                        const el = document.getElementById(`q-${target.question_id}`);
                        el?.scrollIntoView({ block: "start" });
                        el?.focus({ preventScroll: true });
                    });
                }
            }
            return data;
        } catch (err) {
            setLoadError(getErrorMessage(err, LOAD_ERROR));
            return null;
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

    // Which answer is in view: the last one whose top has passed a line a third of the way down
    const questionIds = (review?.questions ?? []).map((q) => q.question_id).join(",");
    useEffect(() => {
        const ids = questionIds ? questionIds.split(",") : [];
        if (ids.length === 0) return;
        let frame = 0;
        const update = () => {
            frame = 0;
            const line = window.innerHeight / 3;
            let current = ids[0];
            for (const id of ids) {
                const top = document.getElementById(`q-${id}`)?.getBoundingClientRect().top;
                if (top != null && top <= line) current = id;
            }
            const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
            const lastTop = document.getElementById(`q-${ids[ids.length - 1]}`)?.getBoundingClientRect().top;
            if (atEnd && lastTop != null && lastTop < window.innerHeight) current = ids[ids.length - 1];
            setActiveQ(current);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, [questionIds]);

    /** After an action removes the control that had focus, keep keyboard users in place. */
    const focusLater = (id: string | null) => requestAnimationFrame(() => {
        const el = id ? document.getElementById(id) : summaryRef.current;
        el?.focus({ preventScroll: true });
    });

    /** What is left to review after an action, for the confirmation. */
    const reviewLeft = (fresh: SubmissionReview | null): string => {
        if (!fresh) return "";
        const left = escalatedIn(fresh.questions).length;
        if (left > 0) return ` ${plural(left, "answer", "answers")} left to review.`;
        return fresh.submission.status === "GRADED" ? " Every answer is reviewed: you can approve this sheet." : "";
    };

    /** Run an action, reload, then confirm (announced to screen readers) and put focus back. */
    const act = async (action: () => Promise<unknown>, done: (fresh: SubmissionReview | null) => string, focusId: string | null) => {
        setBusy(true);
        setNotice(null);
        try {
            await action();
            const fresh = await load();
            setNotice({ kind: "ok", text: done(fresh) });
            focusLater(focusId);
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
                <PageHeader breadcrumbs={[...crumbs, { label: "Answer sheet" }]} title="Answer sheet" />
                <div className={styles.errorBanner} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <div className={styles.errorBody}>
                        <div>
                            <p className={styles.errorTitle}>{LOAD_ERROR}</p>
                            <p>{loadError === LOAD_ERROR ? "Check your connection and try again."
                                : plainError(loadError) ?? "Something went wrong on our side. Try again in a moment."}</p>
                        </div>
                        <div className={styles.errorActions}>
                            <Button variant="outline" size="sm" onClick={load} icon={<RefreshCw size={14} aria-hidden="true" />}>Try again</Button>
                            <ButtonLink href={`/dashboard/exams/${examId}/review`} variant="ghost" size="sm">Back to the review queue</ButtonLink>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!review) {
        return (
            <div className={styles.page} aria-busy="true">
                <p className="sr-only" role="status">Loading the answer sheet…</p>
                <div className={styles.skeletonHeader}>
                    <span className={styles.skeleton} style={{ width: "24rem", maxWidth: "100%", height: "0.875rem" }} />
                    <span className={styles.skeleton} style={{ width: "14rem", maxWidth: "100%", height: "2.25rem" }} />
                    <span className={styles.skeleton} style={{ width: "22rem", maxWidth: "100%", height: "1rem" }} />
                </div>
                <div className={styles.sections}>
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
            </div>
        );
    }

    const { submission, questions } = review;
    const escalated = escalatedIn(questions);
    const canScore = status === "GRADED" || status === "NEEDS_REVIEW";
    const canEditTranscript = canScore || status === "APPROVED";
    const summary = summaryFor(submission.status, escalated.length, submission.current_step);
    const failure = status === "FAILED" ? explainFailure(submission.current_step) : null;
    const studentName = review.student_name ?? "Answer sheet";
    const anyGraded = questions.some((q) => q.grade);
    const showTotal = submission.total_score != null || submission.max_score != null;
    const examHref = `/dashboard/exams/${examId}`;

    // What is on each page, for the viewer's caption
    const onPage = new Map<number, string[]>();
    const note = (p: number | undefined, what: string) => {
        if (p == null) return;
        const list = onPage.get(p) ?? [];
        if (!list.includes(what)) onPage.set(p, [...list, what]);
    };
    questions.forEach((q) => (q.transcription?.segments ?? []).forEach((s) => note(s.page, q.label)));
    review.unassigned_segments.forEach((s) => note(s.page, "writing not matched to a question"));
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
        lastShown.current = q.question_id;
        const el = document.getElementById(`q-${q.question_id}`);
        el?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        el?.focus({ preventScroll: true });
        // No answer found: the unmatched writing is the likeliest place to look
        const p = firstPage(q) ?? (q.grade?.escalation_reason === "no_answer_found" ? unplacedPages[0] : null);
        if (p) setPage(p);
    };
    /** The next answer needing review after the one last opened, wrapping round to the first. */
    const nextToReview = () => {
        if (escalated.length === 0) return;
        const from = questions.findIndex((q) => q.question_id === lastShown.current);
        showQuestion(escalated.find((q) => questions.indexOf(q) > from) ?? escalated[0]);
    };

    const wasReviewing = status === "NEEDS_REVIEW";
    const saveOverride = async (q: QuestionReview, criteria: CriterionScoreIn[], feedback: string, reason: string) => {
        const result = await reviewService.override(submissionId, q.question_id, {
            expected_grade_id: q.grade!.id, criteria, reason, feedback,
        });
        setOverrideQ(null);
        const fresh = await load();
        setNotice({ kind: "ok", text: `${q.label} is now ${fmt(result.grade.score)} / ${fmt(q.max_score)}.${wasReviewing ? reviewLeft(fresh) : ""}` });
    };
    const saveTranscript = async (q: QuestionReview, text: string, reason: string) => {
        await reviewService.editTranscript(submissionId, q.question_id, text, reason);
        setTranscriptQ(null);
        setNotice({ kind: "ok", text: `${q.label} is being graded again from your transcript.` });
        await load();
        // Its buttons are disabled while it is graded again: keep focus on the answer
        focusLater(`q-${q.question_id}`);
    };

    const uploaded = new Date(submission.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

    return (
        <>
            <div className={styles.page}>
                <PageHeader
                    breadcrumbs={[...crumbs, { label: studentName }]}
                    title={studentName}
                    subtitle={
                        <span className={styles.meta}>
                            <StatusBadge status={submission.status} />
                            <span><Calendar size={15} aria-hidden="true" />Uploaded {uploaded}</span>
                            <span><ListChecks size={15} aria-hidden="true" />{plural(questions.length, "question", "questions")}</span>
                            {review.pages.length > 0 && (
                                <span><FileText size={15} aria-hidden="true" />{plural(review.pages.length, "page", "pages")}</span>
                            )}
                        </span>
                    }
                    actions={
                        <>
                            <Button variant="outline" onClick={() => setShowHistory(true)} icon={<History size={16} aria-hidden="true" />}
                                    className={styles.headerAction}>
                                History
                            </Button>
                            {!grading && status !== "PUBLISHED" && (
                                <Button variant={status === "FAILED" ? "primary" : "outline"} onClick={() => setConfirmRegrade(true)} disabled={busy}
                                        icon={<RefreshCw size={16} aria-hidden="true" />} className={styles.headerAction}>
                                    Regrade
                                </Button>
                            )}
                            {status === "APPROVED" && (
                                <Button variant="outline" disabled={busy} icon={<Undo2 size={16} aria-hidden="true" />} className={styles.headerAction}
                                        onClick={() => act(() => reviewService.unapprove(submissionId),
                                            () => "Approval withdrawn. You can change scores again.", null)}>
                                    Withdraw approval
                                </Button>
                            )}
                            {(status === "GRADED" || status === "NEEDS_REVIEW") && (
                                <Button disabled={busy || status === "NEEDS_REVIEW"} icon={<ShieldCheck size={16} aria-hidden="true" />} className={styles.headerAction}
                                        aria-describedby={status === "NEEDS_REVIEW" ? "approve-blocked" : undefined}
                                        onClick={() => act(() => reviewService.approve(submissionId),
                                            () => "Approved. Publish it from the exam page with \"Publish approved\".", null)}>
                                    Approve
                                </Button>
                            )}
                        </>
                    }
                />

                <div className={styles.sections}>
                    {loadError && (
                        <div className={styles.errorBanner} role="alert">
                            <AlertCircle size={20} aria-hidden="true" />
                            <div className={styles.errorBody}>
                                <div>
                                    <p className={styles.errorTitle}>{plainError(loadError) ?? "This answer sheet couldn't be refreshed"}</p>
                                    <p>What you see may be out of date.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={load} icon={<RefreshCw size={14} aria-hidden="true" />}>Try again</Button>
                            </div>
                        </div>
                    )}

                    <section ref={summaryRef} tabIndex={-1} aria-labelledby="summary-title"
                             className={cn(styles.card, styles.summary, styles[`tone_${summary.tone}`], showTotal && styles.summaryWithTotal)}>
                        <span className={cn(styles.tile, styles.tileLg)} aria-hidden="true">{summary.icon}</span>
                        <div className={styles.summaryBody}>
                            <h2 id="summary-title" className={styles.sectionTitle}>{summary.title}</h2>
                            <p id={status === "NEEDS_REVIEW" ? "approve-blocked" : undefined} className={styles.sectionText}
                               aria-live={grading ? "polite" : undefined}>
                                {summary.text}
                            </p>
                            {failure && (
                                <>
                                    <ol className={styles.steps} aria-label="What to try">
                                        {failure.steps.map((s) => <li key={s}>{s}</li>)}
                                    </ol>
                                    <div className={styles.summaryActions}>
                                        <ButtonLink href={examHref} variant="outline" size="sm">Open the exam</ButtonLink>
                                    </div>
                                    {failure.technical && (
                                        <details className={styles.technical}>
                                            <summary>
                                                <ChevronRight size={14} aria-hidden="true" className={styles.technicalChevron} />
                                                Technical details for your administrator
                                            </summary>
                                            <p><code>{failure.technical}</code></p>
                                        </details>
                                    )}
                                </>
                            )}
                            {status === "APPROVED" && (
                                <div className={styles.summaryActions}>
                                    <ButtonLink href={examHref} variant="outline" size="sm" icon={<Send size={14} />}>
                                        Publish on the exam page
                                    </ButtonLink>
                                </div>
                            )}
                        </div>
                        {showTotal && (
                            <p className={styles.summaryTotal}>
                                <span className={styles.totalLabel}>Total</span>
                                <span className={styles.totalValue}>
                                    <strong>{fmt(submission.total_score)}</strong> / {fmt(submission.max_score)}
                                </span>
                            </p>
                        )}
                    </section>

                    <div className={styles.desk}>
                        <div className={styles.viewerColumn}>
                            {anyGraded && (
                                <nav className={cn(styles.card, styles.navigator)} aria-label="Answers">
                                    <div className={styles.navHead}>
                                        <span className={styles.navLabel} aria-hidden="true">Answers</span>
                                        {escalated.length > 0 && (
                                            <span className={styles.navCount}>{escalated.length} of {questions.length} to review</span>
                                        )}
                                        {status === "NEEDS_REVIEW" && escalated.length > 0 && (
                                            <Button size="sm" variant="secondary" onClick={nextToReview} className={styles.nextButton}
                                                    icon={<ArrowDown size={14} aria-hidden="true" />}>
                                                Next to review
                                            </Button>
                                        )}
                                    </div>
                                    <ul className={styles.chips}>
                                        {questions.map((q) => {
                                            const state = answerState(q);
                                            const active = activeQ === q.question_id;
                                            return (
                                                <li key={q.question_id}>
                                                    <button type="button" onClick={() => showQuestion(q)}
                                                            aria-current={active ? "location" : undefined}
                                                            className={cn(styles.qChip, styles[`qChip_${state.kind}`], active && styles.qChipActive)}>
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
                            )}
                            <div ref={viewerRef} className={styles.viewerSlot}>
                                <PageViewer submissionId={submissionId} pages={review.pages} page={page} onPageChange={setPage}
                                            captions={captions} flagged={unplacedPages} />
                            </div>
                        </div>
                        <div className={styles.answers}>
                            {review.unassigned_segments.length > 0 && (
                                <section className={cn(styles.card, styles.unplaced)} aria-labelledby="unplaced-title">
                                    <div className={styles.sectionHeader}>
                                        <span className={styles.tile} aria-hidden="true"><FileQuestion size={18} /></span>
                                        <div>
                                            <h2 id="unplaced-title" className={styles.sectionTitle}>Writing not matched to a question</h2>
                                            <p className={styles.sectionText}>
                                                If it belongs to an answer, add it there with &quot;Correct transcript&quot;.
                                            </p>
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
                                    <span className={styles.emptyIcon} aria-hidden="true"><FileQuestion size={32} /></span>
                                    <h3 className={styles.emptyTitle}>No questions on this exam</h3>
                                    <p className={styles.emptyText}>Add questions on the exam page, then regrade this answer sheet.</p>
                                    <ButtonLink href={examHref} variant="secondary">Go to the exam</ButtonLink>
                                </div>
                            )}
                            {questions.map((q) => (
                                <QuestionCard key={q.question_id} q={q} busy={busy || grading} currentPage={page}
                                              hasUnplaced={review.unassigned_segments.length > 0}
                                              ungradedText={status === "FAILED" ? "Grading stopped before this answer was read."
                                                  : grading ? "Being graded…" : undefined}
                                              canScore={canScore && q.rubric_spec?.status === "ready"}
                                              canEditTranscript={canEditTranscript}
                                              onResolve={(question) => act(
                                                  () => reviewService.resolve(submissionId, question.question_id, question.grade!),
                                                  (fresh) => `${question.label}: proposed score accepted.${reviewLeft(fresh)}`,
                                                  `q-${question.question_id}`)}
                                              onOverride={setOverrideQ} onEditTranscript={setTranscriptQ} onShowPage={showPage} />
                            ))}
                        </div>
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
                               icon={<RefreshCw size={18} aria-hidden="true" />}
                               message={<>Every answer is read and graded again. Score changes made here are replaced by the new
                                   grades (they stay in the history); corrected transcripts are kept.</>}
                               onClose={() => setConfirmRegrade(false)}
                               onConfirm={async (reason) => {
                                   await reviewService.regrade(submissionId, reason);
                                   setConfirmRegrade(false);
                                   setNotice({ kind: "ok", text: "Grading again…" });
                                   await load();
                                   // The Regrade button is gone while grading: focus the sheet's status
                                   focusLater(null);
                               }} />
            )}
            {showHistory && <TimelineDialog submissionId={submissionId} onClose={() => setShowHistory(false)} />}
        </>
    );
}

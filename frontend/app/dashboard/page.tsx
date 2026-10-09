"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    Clock,
    FileText,
    GraduationCap,
    Inbox,
    ListChecks,
    ListPlus,
    LucideIcon,
    Plus,
    Send,
    ShieldCheck,
    Upload,
    Users,
    XCircle,
} from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import { batchService } from "@/services/batch.service";
import { examService } from "@/services/exam.service";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Batch } from "@/types/batch.types";
import { Exam, Submission, SubmissionStatus } from "@/types/exam.types";
import PageHeader from "@/components/common/PageHeader";
import ButtonLink from "@/components/common/ButtonLink";
import ErrorBanner from "@/components/common/ErrorBanner";
import Button from "@/components/ui/Button";
import CreateExamModal from "@/components/features/exams/CreateExamModal";
import styles from "./page.module.css";

/** Exams whose answer sheets are counted (newest first); bounds the number of requests */
const SCAN_LIMIT = 12;
const RECENT_LIMIT = 5;
/** Next steps shown before "Show all" */
const TASK_LIMIT = 5;

interface Counts {
    total: number;
    review: number;
    graded: number;
    approved: number;
    published: number;
    grading: number;
    failed: number;
}

interface ExamSummary {
    exam: Exam;
    /** null when this exam's answer sheets couldn't be loaded */
    submissions: Submission[] | null;
    counts: Counts | null;
}

interface OverviewData {
    orgId: string;
    batches: Batch[];
    totalExams: number;
    exams: ExamSummary[];
}

/** What a next step asks of the teacher, in the order they're listed */
type Stage = "review" | "failed" | "approve" | "publish" | "setup" | "upload" | "class" | "exam" | "grading";
const STAGE_ORDER: Stage[] = ["review", "failed", "approve", "publish", "setup", "upload", "class", "exam", "grading"];

const STAGES: Record<Stage, { icon: LucideIcon; action: string; tone: string }> = {
    review: { icon: AlertTriangle, action: "Review", tone: styles.toneReview },
    failed: { icon: XCircle, action: "Regrade", tone: styles.toneFailed },
    approve: { icon: ShieldCheck, action: "Approve", tone: styles.toneApprove },
    publish: { icon: Send, action: "Publish", tone: styles.tonePublish },
    setup: { icon: ListPlus, action: "Add questions", tone: styles.toneSetup },
    upload: { icon: Upload, action: "Upload", tone: styles.toneSetup },
    class: { icon: Users, action: "Add a class", tone: styles.toneSetup },
    exam: { icon: Plus, action: "Create", tone: styles.toneSetup },
    grading: { icon: Clock, action: "View", tone: styles.toneGrading },
};

interface Task {
    key: string;
    stage: Stage;
    title: string;
    detail: string;
    /** Where it's done; without one the row opens the new-exam dialog */
    href?: string;
}

const countStatuses = (submissions: Submission[]): Counts => {
    const has = (...statuses: SubmissionStatus[]) => submissions.filter((s) => statuses.includes(s.status)).length;
    return {
        total: submissions.length,
        review: has("NEEDS_REVIEW"),
        graded: has("GRADED"),
        approved: has("APPROVED"),
        published: has("PUBLISHED"),
        grading: has("PENDING", "PROCESSING"),
        failed: has("FAILED"),
    };
};

async function loadOverview(orgId: string): Promise<OverviewData> {
    const [batches, exams] = await Promise.all([batchService.getAllByOrg(orgId), examService.getExams(orgId)]);
    const newest = [...exams]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, SCAN_LIMIT);
    const results = await Promise.allSettled(newest.map((exam) => examService.listSubmissions(exam.id)));
    return {
        orgId,
        batches,
        totalExams: exams.length,
        exams: newest.map((exam, i) => {
            const result = results[i];
            const submissions = result.status === "fulfilled" ? result.value : null;
            return { exam, submissions, counts: submissions ? countStatuses(submissions) : null };
        }),
    };
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const studentOf = (s: Submission) => s.student_name?.trim() || "Unnamed student";

/** "Kabir Singh", "Kabir Singh and Meera Iyer", "Kabir Singh, Meera Iyer and 2 more" */
function names(submissions: Submission[]): string {
    const all = [...new Set(submissions.map(studentOf))];
    if (all.length <= 2) return all.join(" and ");
    return `${all[0]}, ${all[1]} and ${all.length - 2} more`;
}

const sheetOf = (s: Submission) => (s.student_name?.trim() ? `${s.student_name.trim()}'s answer sheet` : "an unnamed answer sheet");

/** A teacher-friendly reason for a failed grading run; the raw error stays on the answer sheet's page */
function failureReason(step?: string | null): string {
    const text = (step ?? "").toLowerCase();
    if (text.includes("couldn't be read") || text.includes("could not be read")) return "Its pages couldn't be read";
    if (text.includes("no questions")) return "The exam had no questions when it was graded";
    if (text.includes("budget") || text.includes("cost") || text.includes("cap")) return "Grading stopped at its cost limit";
    return "Grading stopped before it finished";
}

/** Everything waiting for the teacher, most urgent first, each pointing at the page where it's done */
function buildTasks(exams: ExamSummary[], batches: Batch[], className: (id?: string) => string | undefined): Task[] {
    const tasks: Task[] = [];
    // A new organization: the first steps are setting it up
    if (batches.length === 0) {
        tasks.push({ key: "first-class", stage: "class", title: "Add your first class",
            detail: "Upload its roster so each answer sheet is matched to a student", href: "/dashboard/classes" });
    }
    if (exams.length === 0) {
        tasks.push({ key: "first-exam", stage: "exam", title: "Create your first exam",
            detail: "Add its questions and rubric, then upload answer sheets" });
    }
    for (const { exam, submissions } of exams) {
        const examUrl = `/dashboard/exams/${exam.id}`;
        const sheetUrl = (s: Submission) => `${examUrl}/submissions/${s.id}`;
        const add = (stage: Stage, title: string, detail: (string | undefined)[], href: string) =>
            tasks.push({ key: `${exam.id}-${stage}`, stage, title, detail: detail.filter(Boolean).join(" · "), href });

        if ((exam.question_count ?? 0) === 0) {
            add("setup", `Add questions to ${exam.name}`, ["No questions yet", className(exam.batch_id)], examUrl);
        }
        if (!submissions) continue;
        const having = (...statuses: SubmissionStatus[]) => submissions.filter((s) => statuses.includes(s.status));

        const review = having("NEEDS_REVIEW");
        if (review.length === 1) add("review", `Review ${sheetOf(review[0])}`, [exam.name], sheetUrl(review[0]));
        else if (review.length > 1) add("review", `Review ${review.length} answer sheets`, [exam.name, names(review)], `${examUrl}/review`);

        const failed = having("FAILED");
        if (failed.length === 1) {
            add("failed", `Regrade ${sheetOf(failed[0])}`, [failureReason(failed[0].current_step), exam.name], sheetUrl(failed[0]));
        } else if (failed.length > 1) {
            add("failed", `Regrade ${failed.length} answer sheets that couldn't be graded`, [exam.name, names(failed)], examUrl);
        }

        const graded = having("GRADED");
        if (graded.length === 1) {
            const who = graded[0].student_name?.trim();
            add("approve", who ? `Approve ${who}'s grades` : "Approve a graded answer sheet",
                ["Graded with nothing flagged", exam.name], sheetUrl(graded[0]));
        } else if (graded.length > 1) {
            add("approve", `Approve ${graded.length} graded answer sheets`, [exam.name, names(graded)], examUrl);
        }

        const approved = having("APPROVED").length;
        if (approved > 0) {
            add("publish", `Publish ${plural(approved, "approved result")}`,
                [exam.name, "Students see results once you publish"], examUrl);
        }

        if ((exam.question_count ?? 0) > 0 && submissions.length === 0) {
            add("upload", `Upload answer sheets for ${exam.name}`,
                [`${plural(exam.question_count ?? 0, "question")} ready`, className(exam.batch_id)], examUrl);
        }

        const grading = having("PENDING", "PROCESSING");
        if (grading.length > 0) {
            add("grading", `${plural(grading.length, "answer sheet is", "answer sheets are")} being graded`,
                [exam.name, "Results show up here when grading finishes"], examUrl);
        }
    }
    // Stable sort: by stage, then newest exam first (the order exams arrive in)
    return tasks.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
}

export default function DashboardPage() {
    const { orgs, activeOrg, isLoading: orgsLoading, error: orgsError, refetch: refetchOrgs } = useOrgContext();
    const orgId = activeOrg?.id ?? orgs[0]?.id ?? "";
    const orgName = activeOrg?.name ?? orgs[0]?.name;
    const tasksId = useId();

    const [data, setData] = useState<OverviewData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [creatingExam, setCreatingExam] = useState(false);
    const [showAllTasks, setShowAllTasks] = useState(false);

    useEffect(() => {
        if (!orgId) return;
        let cancelled = false;
        loadOverview(orgId)
            .then((loaded) => {
                if (cancelled) return;
                setData(loaded);
                setError(null);
            })
            .catch((err) => !cancelled && setError(getErrorMessage(err, "The overview couldn't be loaded")));
        return () => {
            cancelled = true;
        };
    }, [orgId, attempt]);

    const ready = data && data.orgId === orgId ? data : null;
    // Without an organization nothing can load, so its error is this page's error too
    const failure = error ?? (!orgId ? orgsError : null);
    const loading = !ready && !failure;

    const retry = () => {
        if (!error) {
            refetchOrgs();
            return;
        }
        setError(null);
        setData(null);
        setAttempt((n) => n + 1);
    };

    // No organization yet: nothing else on this page can work
    if (!orgsLoading && !orgsError && orgs.length === 0) {
        return (
            <>
                <PageHeader title="Overview" subtitle="Your classes, exams and the answers waiting for you." />
                <div className={styles.emptyPanel}>
                    <span className={styles.emptyIcon} aria-hidden="true"><Building2 size={32} /></span>
                    <h2>Set up your organization</h2>
                    <p>Classes, exams and answer sheets all live inside an organization, such as your school or department.</p>
                    <ButtonLink href="/dashboard/orgs" variant="primary" icon={<ArrowRight size={16} />}>
                        Go to organizations
                    </ButtonLink>
                </div>
            </>
        );
    }

    const exams = ready?.exams ?? [];
    const batches = ready?.batches ?? [];
    const className = (id?: string) => batches.find((b) => b.id === id)?.name;
    const students = batches.reduce((sum, b) => sum + b.student_count, 0);
    const sum = (key: keyof Counts) => exams.reduce((n, e) => n + (e.counts?.[key] ?? 0), 0);
    const sheets = sum("total");
    const toReview = sum("review");
    const tasks = buildTasks(exams, batches, className);
    const waiting = tasks.filter((t) => t.stage !== "grading").length;
    const shownTasks = showAllTasks ? tasks : tasks.slice(0, TASK_LIMIT);
    const unreadable = exams.filter((e) => e.counts === null).length;
    // No answer sheets could be counted at all: show a dash, never a misleading zero
    const uncounted = exams.length > 0 && unreadable === exams.length;
    const scannedAll = ready ? ready.totalExams <= SCAN_LIMIT : true;

    const stats = [
        {
            label: "Need review", value: toReview, icon: AlertTriangle, tone: styles.toneReview, attention: toReview > 0,
            hint: toReview > 0 ? "Answer sheets with flagged answers" : "Nothing flagged",
        },
        {
            label: "Ready to approve", value: sum("graded"), icon: ShieldCheck, tone: styles.toneApprove,
            hint: "Graded, waiting for your check",
        },
        {
            label: "Ready to publish", value: sum("approved"), icon: Send, tone: styles.tonePublish,
            hint: "Approved, not yet visible to students",
        },
        {
            label: "Published", value: sum("published"), icon: CheckCircle2, tone: styles.tonePublished,
            hint: sheets > 0 ? `Of ${plural(sheets, "answer sheet")}` : "No answer sheets yet",
        },
    ];

    const org = orgName ? <strong className={styles.orgName}>{orgName}</strong> : "your organization";
    const subtitle = !ready
        ? <>What needs you in {org}, and where your exams stand.</>
        : waiting > 0
            ? <>{plural(waiting, "thing is", "things are")} waiting for you in {org}.</>
            : <>You&apos;re all caught up in {org}.</>;

    return (
        <>
            <PageHeader
                title="Overview"
                subtitle={subtitle}
                actions={
                    <Button variant="primary" onClick={() => setCreatingExam(true)} icon={<Plus size={18} aria-hidden="true" />}>
                        New exam
                    </Button>
                }
            />

            {failure && (
                <ErrorBanner
                    className={styles.errorBanner}
                    title={error ? "The overview couldn't be loaded" : "Your organizations couldn't be loaded"}
                    detail={failure === "Failed to load organizations" ? null : failure}
                    onRetry={retry}
                />
            )}
            {loading && <p className="sr-only" role="status">Loading the overview</p>}

            {/* Counts and lists only once they're real: an error never shows as zeros */}
            {(!failure || ready) && (
                <div className={styles.layout}>
                    {/* What the teacher has to act on; first on phones */}
                    <section className={cn(styles.card, styles.areaTasks)} aria-labelledby="tasks-title">
                        <div className={styles.cardHeader}>
                            <span className={cn(styles.tile, waiting > 0 && styles.tileAttention)} aria-hidden="true">
                                <ClipboardCheck size={18} />
                            </span>
                            <div className={styles.cardTitleBlock}>
                                <h2 id="tasks-title" className={styles.cardTitle}>
                                    Next steps
                                    {!loading && waiting > 0 && (
                                        <span className={styles.countPill}>
                                            <span className="sr-only">: </span>{waiting}<span className="sr-only"> waiting</span>
                                        </span>
                                    )}
                                </h2>
                                <p className={styles.cardDescription}>Most urgent first. Each one opens the page where you do it.</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className={styles.rows} aria-hidden="true">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className={styles.taskSkeleton}>
                                        <span className={cn(styles.skeleton, styles.skeletonTile)} />
                                        <span className={styles.skeletonLines}>
                                            <span className={cn(styles.skeleton, styles.skeletonTitle)} />
                                            <span className={cn(styles.skeleton, styles.skeletonMeta)} />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : tasks.length > 0 ? (
                            <>
                                <ul id={tasksId} className={styles.rows}>
                                    {shownTasks.map((task) => {
                                        const { icon: Icon, action, tone } = STAGES[task.stage];
                                        const content = (
                                            <>
                                                <span className={cn(styles.taskIcon, tone)} aria-hidden="true">
                                                    <Icon size={18} />
                                                </span>
                                                <span className={styles.rowMain}>
                                                    <span className={styles.rowTitle}>{task.title}</span>
                                                    <span className={styles.rowMeta}>{task.detail}</span>
                                                </span>
                                                <span className={styles.taskAction} aria-hidden="true">
                                                    <span className={styles.taskActionLabel}>{action}</span>
                                                    <ChevronRight size={16} />
                                                </span>
                                            </>
                                        );
                                        return (
                                            <li key={task.key}>
                                                {task.href ? (
                                                    <Link href={task.href} className={styles.task}>{content}</Link>
                                                ) : (
                                                    <button type="button" className={styles.task} onClick={() => setCreatingExam(true)}>
                                                        {content}
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                                {tasks.length > TASK_LIMIT && (
                                    <button
                                        type="button"
                                        className={styles.moreButton}
                                        aria-expanded={showAllTasks}
                                        aria-controls={tasksId}
                                        onClick={() => setShowAllTasks((v) => !v)}
                                    >
                                        {showAllTasks ? "Show fewer" : `Show all ${tasks.length}`}
                                        <ChevronDown size={16} aria-hidden="true" className={cn(styles.moreIcon, showAllTasks && styles.moreIconOpen)} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className={styles.inlineEmpty}>
                                {sheets > 0
                                    ? <CheckCircle2 size={20} aria-hidden="true" className={styles.okIcon} />
                                    : <Inbox size={20} aria-hidden="true" className={styles.mutedIcon} />}
                                <div className={styles.inlineEmptyBody}>
                                    <p>
                                        {sheets > 0
                                            ? "You're all caught up. Nothing is waiting for review, approval or publishing."
                                            : "No answer sheets yet. Upload them from an exam's page and Gr8r grades them in the background."}
                                    </p>
                                </div>
                            </div>
                        )}
                        {!loading && (unreadable > 0 || !scannedAll) && (
                            <p className={styles.footnote}>
                                {!scannedAll && `Counted from your ${SCAN_LIMIT} most recent exams. `}
                                {unreadable > 0 && (
                                    <>
                                        Answer sheets for {plural(unreadable, "exam")} couldn&apos;t be loaded.{" "}
                                        <button type="button" className={styles.inlineButton} onClick={retry}>Try again</button>
                                    </>
                                )}
                            </p>
                        )}
                    </section>

                    {/* Where the answer sheets stand, across the recent exams */}
                    <section aria-label="Answer sheets at a glance" className={cn(styles.stats, styles.areaStats)}>
                        {stats.map(({ label, value, hint, icon: Icon, tone, attention }) => (
                            <div key={label} className={cn(styles.stat, attention && !uncounted && styles.statAttention)}>
                                <div className={styles.statHead}>
                                    <span className={styles.statLabel}>{label}</span>
                                    <span className={cn(styles.statIcon, value > 0 && !uncounted ? tone : styles.toneNone)} aria-hidden="true">
                                        <Icon size={18} />
                                    </span>
                                </div>
                                {loading ? (
                                    <>
                                        <span className={cn(styles.skeleton, styles.skeletonValue)} aria-hidden="true" />
                                        <span className={cn(styles.skeleton, styles.skeletonHint)} aria-hidden="true" />
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.statValue}>{uncounted ? "–" : value}</span>
                                        <span className={styles.statHint}>{uncounted ? "Couldn't be counted" : hint}</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </section>

                    {/* Recent exams, with how far each one's results have got */}
                    <section className={cn(styles.card, styles.areaExams)} aria-labelledby="exams-title">
                        <div className={styles.cardHeader}>
                            <span className={styles.tile} aria-hidden="true"><FileText size={18} /></span>
                            <div className={styles.cardTitleBlock}>
                                <h2 id="exams-title" className={styles.cardTitle}>Recent exams</h2>
                            </div>
                            <Link href="/dashboard/exams" className={styles.cardLink}>
                                All exams <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                        </div>

                        {loading ? (
                            <div className={styles.rows} aria-hidden="true">
                                {[0, 1].map((i) => <div key={i} className={styles.rowSkeleton}><span className={styles.skeleton} /></div>)}
                            </div>
                        ) : exams.length === 0 ? (
                            <div className={styles.inlineEmpty}>
                                <FileText size={20} aria-hidden="true" className={styles.mutedIcon} />
                                <div className={styles.inlineEmptyBody}>
                                    <p>No exams yet. Create one, add its questions and rubric, then upload answer sheets.</p>
                                </div>
                            </div>
                        ) : (
                            <ul className={styles.rows}>
                                {exams.slice(0, RECENT_LIMIT).map(({ exam, counts }) => {
                                    const questions = exam.question_count ?? 0;
                                    const share = counts && counts.total > 0 ? Math.round((counts.published / counts.total) * 100) : 0;
                                    return (
                                        <li key={exam.id}>
                                            <Link href={`/dashboard/exams/${exam.id}`} className={styles.examRow}>
                                                <span className={styles.rowMain}>
                                                    <span className={styles.rowTitle}>{exam.name}</span>
                                                    <span className={styles.rowMeta}>
                                                        {className(exam.batch_id) ?? "No class"}
                                                        {" · "}{plural(questions, "question")}
                                                        {" · "}{formatDate(exam.created_at)}
                                                    </span>
                                                </span>
                                                <span className={styles.examProgress}>
                                                    {counts === null ? (
                                                        <span className={cn(styles.progressText, styles.progressWrap)}>Answer sheets couldn&apos;t be loaded</span>
                                                    ) : counts.total === 0 ? (
                                                        <span className={styles.progressText}>
                                                            {questions === 0 ? "Not set up yet" : "No answer sheets yet"}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className={styles.progressText}>
                                                                <strong>{counts.published}</strong> of {plural(counts.total, "sheet")} published
                                                            </span>
                                                            <span className={styles.progressTrack} aria-hidden="true">
                                                                <span className={styles.progressFill} style={{ width: `${share}%` }} />
                                                            </span>
                                                        </>
                                                    )}
                                                </span>
                                                <ChevronRight size={18} aria-hidden="true" className={styles.chevron} />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    <div className={cn(styles.sideColumn, styles.areaSide)}>
                        {/* Classes */}
                        <section className={styles.card} aria-labelledby="classes-title">
                            <div className={styles.cardHeader}>
                                <span className={styles.tile} aria-hidden="true"><GraduationCap size={18} /></span>
                                <div className={styles.cardTitleBlock}>
                                    <h2 id="classes-title" className={styles.cardTitle}>Classes</h2>
                                    {!loading && batches.length > 0 && (
                                        <p className={styles.cardDescription}>
                                            {plural(students, "student")} in {plural(batches.length, "class", "classes")}
                                        </p>
                                    )}
                                </div>
                                <Link href="/dashboard/classes" className={styles.cardLink}>
                                    Manage <ArrowRight size={14} aria-hidden="true" />
                                </Link>
                            </div>
                            {loading ? (
                                <div className={styles.rows} aria-hidden="true">
                                    {[0, 1].map((i) => <div key={i} className={styles.rowSkeleton}><span className={styles.skeleton} /></div>)}
                                </div>
                            ) : batches.length === 0 ? (
                                <div className={styles.inlineEmpty}>
                                    <Users size={20} aria-hidden="true" className={styles.mutedIcon} />
                                    <div className={styles.inlineEmptyBody}>
                                        <p>No classes yet. Add one and upload its roster so answer sheets can be matched to students.</p>
                                        <ButtonLink href="/dashboard/classes" size="sm" variant="outline">Create a class</ButtonLink>
                                    </div>
                                </div>
                            ) : (
                                <ul className={styles.rows}>
                                    {batches.slice(0, RECENT_LIMIT).map((batch) => (
                                        <li key={batch.id} className={styles.simpleRow}>
                                            <span className={styles.rowTitle}>{batch.name}</span>
                                            <span className={styles.rowFigure}>{plural(batch.student_count, "student")}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* How it works, for teachers new to it */}
                        <section className={styles.card} aria-labelledby="how-title">
                            <div className={styles.cardHeader}>
                                <span className={styles.tile} aria-hidden="true"><ListChecks size={18} /></span>
                                <div className={styles.cardTitleBlock}>
                                    <h2 id="how-title" className={styles.cardTitle}>How grading works</h2>
                                </div>
                            </div>
                            <ol className={styles.steps}>
                                <li>Add an exam&apos;s questions and the rubric you mark with.</li>
                                <li>Upload each student&apos;s answer sheet: a PDF or photos of the pages.</li>
                                <li>Gr8r reads the handwriting and grades every answer against your rubric; a second AI examiner checks each grade.</li>
                                <li>Anything uncertain comes to you. Review it, approve the answer sheet, then publish the results.</li>
                            </ol>
                        </section>
                    </div>
                </div>
            )}

            <CreateExamModal
                isOpen={creatingExam}
                selectedOrgId={orgId}
                onClose={() => {
                    setCreatingExam(false);
                    // Pick up a newly created exam without blanking the page
                    setAttempt((n) => n + 1);
                }}
            />
        </>
    );
}

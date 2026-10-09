"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    ArrowRight,
    Building2,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    FileText,
    GraduationCap,
    Inbox,
    ListChecks,
    Plus,
    RotateCw,
    Users,
} from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import { batchService } from "@/services/batch.service";
import { examService } from "@/services/exam.service";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Batch } from "@/types/batch.types";
import { Exam, Submission } from "@/types/exam.types";
import PageHeader from "@/components/common/PageHeader";
import ButtonLink from "@/components/common/ButtonLink";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import CreateExamModal from "@/components/features/exams/CreateExamModal";
import styles from "./page.module.css";

/** Exams whose answer sheets are counted (newest first); bounds the number of requests */
const SCAN_LIMIT = 12;
const RECENT_LIMIT = 5;

interface Counts {
    total: number;
    review: number;
    ready: number;
    grading: number;
    failed: number;
    done: number;
}

interface ExamSummary {
    exam: Exam;
    /** null when this exam's answer sheets couldn't be loaded */
    counts: Counts | null;
}

interface OverviewData {
    orgId: string;
    batches: Batch[];
    totalExams: number;
    exams: ExamSummary[];
}

function countStatuses(submissions: Submission[]): Counts {
    const counts: Counts = { total: submissions.length, review: 0, ready: 0, grading: 0, failed: 0, done: 0 };
    for (const s of submissions) {
        if (s.status === "NEEDS_REVIEW") counts.review += 1;
        else if (s.status === "GRADED") counts.ready += 1;
        else if (s.status === "PENDING" || s.status === "PROCESSING") counts.grading += 1;
        else if (s.status === "FAILED") counts.failed += 1;
        else counts.done += 1;
    }
    return counts;
}

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
            return { exam, counts: result.status === "fulfilled" ? countStatuses(result.value) : null };
        }),
    };
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function DashboardPage() {
    const { orgs, activeOrg, isLoading: orgsLoading, error: orgsError, refetch: refetchOrgs } = useOrgContext();
    const orgId = activeOrg?.id ?? orgs[0]?.id ?? "";
    const orgName = activeOrg?.name ?? orgs[0]?.name;

    const [data, setData] = useState<OverviewData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [creatingExam, setCreatingExam] = useState(false);

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
    const batchName = (id?: string) => batches.find((b) => b.id === id)?.name;
    const students = batches.reduce((sum, b) => sum + b.student_count, 0);
    const sum = (key: keyof Counts) => exams.reduce((n, e) => n + (e.counts?.[key] ?? 0), 0);
    const toReview = sum("review");
    const sheets = sum("total");
    const attention = exams
        .filter(({ counts }) => counts && (counts.review > 0 || counts.ready > 0 || counts.failed > 0))
        .sort((a, b) => (b.counts?.review ?? 0) - (a.counts?.review ?? 0));
    const scannedAll = ready ? ready.totalExams <= SCAN_LIMIT : true;

    const stats = [
        { label: "Classes", value: batches.length, hint: "Rosters in this organization", icon: GraduationCap },
        { label: "Students", value: students, hint: "Enrolled across your classes", icon: Users },
        { label: "Exams", value: ready?.totalExams ?? 0, hint: plural(sheets, "answer sheet") + " uploaded", icon: FileText },
        {
            label: "Need review",
            value: toReview,
            hint: toReview > 0 ? "Answer sheets waiting for you" : "Nothing waiting for you",
            icon: Inbox,
            tone: toReview > 0 ? "attention" : undefined,
        },
    ];

    return (
        <>
            <PageHeader
                title="Overview"
                subtitle={orgName
                    ? <>What needs you in <strong className={styles.orgName}>{orgName}</strong>, and where your classes and exams stand.</>
                    : "What needs you, and where your classes and exams stand."}
                actions={
                    <Button variant="primary" onClick={() => setCreatingExam(true)} icon={<Plus size={18} aria-hidden="true" />}>
                        New exam
                    </Button>
                }
            />

            {failure && (
                <div className={styles.errorBanner} role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    <span className={styles.errorText}>{failure}</span>
                    <Button variant="outline" size="sm" onClick={retry} icon={<RotateCw size={14} aria-hidden="true" />}>
                        Try again
                    </Button>
                </div>
            )}

            {/* Counts and lists only once they're real: an error never shows as zeros */}
            {(!failure || ready) && (
                <>
                    <section aria-label="At a glance" className={styles.stats}>
                        {stats.map(({ label, value, hint, icon: Icon, tone }) => (
                            <div key={label} className={cn(styles.stat, tone === "attention" && styles.statAttention)}>
                                <div className={styles.statHead}>
                                    <span className={styles.statLabel}>{label}</span>
                                    <span className={styles.statIcon} aria-hidden="true"><Icon size={18} /></span>
                                </div>
                                {loading ? (
                                    <>
                                        <span className={cn(styles.skeleton, styles.skeletonValue)} aria-hidden="true" />
                                        <span className={cn(styles.skeleton, styles.skeletonHint)} aria-hidden="true" />
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.statValue}>{value}</span>
                                        <span className={styles.statHint}>{hint}</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </section>
                    {loading && <p className="sr-only" role="status">Loading the overview</p>}

                    <div className={styles.columns}>
                        <div className={styles.mainColumn}>
                            {/* What the teacher has to act on */}
                            <section className={styles.card} aria-labelledby="attention-title">
                                <div className={styles.cardHeader}>
                                    <span className={cn(styles.tile, toReview > 0 && styles.tileAttention)} aria-hidden="true">
                                        <ClipboardCheck size={18} />
                                    </span>
                                    <div className={styles.cardTitleBlock}>
                                        <h2 id="attention-title" className={styles.cardTitle}>Needs your attention</h2>
                                        <p className={styles.cardDescription}>
                                            Answers the AI couldn&apos;t settle, and graded sheets waiting for your approval.
                                        </p>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className={styles.rows} aria-hidden="true">
                                        {[0, 1].map((i) => <div key={i} className={styles.rowSkeleton}><span className={styles.skeleton} /></div>)}
                                    </div>
                                ) : attention.length > 0 ? (
                                    <ul className={styles.rows}>
                                        {attention.map(({ exam, counts }) => (
                                            <li key={exam.id}>
                                                <Link href={`/dashboard/exams/${exam.id}/review`} className={styles.row}>
                                                    <span className={styles.rowMain}>
                                                        <span className={styles.rowTitle}>{exam.name}</span>
                                                        <span className={styles.rowMeta}>
                                                            {batchName(exam.batch_id) ?? "No class"} · {plural(counts!.total, "answer sheet")}
                                                        </span>
                                                    </span>
                                                    <span className={styles.rowBadges}>
                                                        {counts!.review > 0 && <StatusBadge status="NEEDS_REVIEW" label={`${counts!.review} ${counts!.review === 1 ? "needs" : "need"} review`} />}
                                                        {counts!.ready > 0 && <StatusBadge status="GRADED" label={`${counts!.ready} ready to approve`} />}
                                                        {counts!.failed > 0 && <StatusBadge status="FAILED" label={`${counts!.failed} failed`} />}
                                                    </span>
                                                    <span className={styles.rowAction}>
                                                        Review <ChevronRight size={16} aria-hidden="true" />
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className={styles.inlineEmpty}>
                                        {sheets > 0
                                            ? <CheckCircle2 size={20} aria-hidden="true" className={styles.okIcon} />
                                            : <Inbox size={20} aria-hidden="true" className={styles.mutedIcon} />}
                                        <div className={styles.inlineEmptyBody}>
                                            <p>
                                                {sheets > 0
                                                    ? "You're all caught up. Nothing is waiting for review or approval."
                                                    : "No answer sheets yet. Upload them from an exam's page and Gr8r grades them in the background."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {!loading && !scannedAll && (
                                    <p className={styles.footnote}>Counted from your {SCAN_LIMIT} most recent exams.</p>
                                )}
                            </section>

                            {/* Recent exams */}
                            <section className={styles.card} aria-labelledby="exams-title">
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
                                        {[0, 1, 2].map((i) => <div key={i} className={styles.rowSkeleton}><span className={styles.skeleton} /></div>)}
                                    </div>
                                ) : exams.length === 0 ? (
                                    <div className={styles.inlineEmpty}>
                                        <FileText size={20} aria-hidden="true" className={styles.mutedIcon} />
                                        <div className={styles.inlineEmptyBody}>
                                            <p>No exams yet. Create one, add its questions and rubric, then upload answer sheets.</p>
                                            <Button size="sm" variant="outline" onClick={() => setCreatingExam(true)}>Create an exam</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <ul className={styles.rows}>
                                        {exams.slice(0, RECENT_LIMIT).map(({ exam, counts }) => (
                                            <li key={exam.id}>
                                                <Link href={`/dashboard/exams/${exam.id}`} className={styles.row}>
                                                    <span className={styles.rowMain}>
                                                        <span className={styles.rowTitle}>{exam.name}</span>
                                                        <span className={styles.rowMeta}>
                                                            {batchName(exam.batch_id) ?? "No class"}
                                                            {" · "}{plural(exam.question_count ?? 0, "question")}
                                                            {" · "}{formatDate(exam.created_at)}
                                                        </span>
                                                    </span>
                                                    <span className={styles.rowFigure}>
                                                        {counts ? plural(counts.total, "sheet") : "–"}
                                                    </span>
                                                    <ChevronRight size={18} aria-hidden="true" className={styles.chevron} />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>

                        <div className={styles.sideColumn}>
                            {/* Classes */}
                            <section className={styles.card} aria-labelledby="classes-title">
                                <div className={styles.cardHeader}>
                                    <span className={styles.tile} aria-hidden="true"><GraduationCap size={18} /></span>
                                    <div className={styles.cardTitleBlock}>
                                        <h2 id="classes-title" className={styles.cardTitle}>Classes</h2>
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
                                    <li>Anything uncertain comes to you. Review it, then approve and publish the results.</li>
                                </ol>
                            </section>
                        </div>
                    </div>
                </>
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

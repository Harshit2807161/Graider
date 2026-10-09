"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Calendar, ClipboardCheck, ListChecks, Send, SlidersHorizontal, Trophy } from "lucide-react";
import type { AxiosError } from "axios";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { reviewService } from "@/services/review.service";
import { rubricService } from "@/services/rubric.service";
import { Exam, QuestionSync, Submission, SubmissionStatus } from "@/types/exam.types";
import { QuestionRubricStatus } from "@/types/review.types";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ButtonLink from "@/components/common/ButtonLink";
import PageHeader from "@/components/common/PageHeader";
import AnswerSheetsSection from "@/components/features/exams/AnswerSheetsSection";
import ExamProgress from "@/components/features/exams/ExamProgress";
import InlineMessage from "@/components/features/exams/InlineMessage";
import QuestionsSection, { RubricTarget } from "@/components/features/exams/QuestionsSection";
import SectionCard from "@/components/features/exams/SectionCard";
import GradingSettingsPanel from "@/components/features/review/GradingSettingsPanel";
import RubricDialog from "@/components/features/rubrics/RubricDialog";
import styles from "./page.module.css";

const IN_PROGRESS: SubmissionStatus[] = ["PENDING", "PROCESSING"];
const POLL_INTERVAL_MS = 3000;

/** One exam's workspace: questions & rubrics → grade answer sheets → review → publish. */
export default function ExamDetailsPage() {
    const params = useParams();
    const examId = params.id as string;
    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<QuestionSync[]>([]);
    const [dirty, setDirty] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const [submissions, setSubmissions] = useState<Submission[]>([]);

    // Parsed rubrics, the one being viewed, and publishing
    const [rubricStatus, setRubricStatus] = useState<QuestionRubricStatus[]>([]);
    const [rubricQuestion, setRubricQuestion] = useState<RubricTarget | null>(null);
    const [confirmPublish, setConfirmPublish] = useState(false);
    const [publishMessage, setPublishMessage] = useState<string | null>(null);

    const loadExam = useCallback(async () => {
        if (!examId) return;
        try {
            const data = await examService.getExam(examId);
            setExam(data);
            setQuestions(data.questions || []);
            setDirty(false);
            setErrorDetails(null);
        } catch (err) {
            setNotFound((err as AxiosError)?.response?.status === 404);
            setErrorDetails(getErrorMessage(err, "Failed to load exam"));
        } finally {
            setLoading(false);
        }
    }, [examId]);

    useEffect(() => {
        loadExam();
    }, [loadExam]);

    const refreshSubmissions = useCallback(async () => {
        try {
            setSubmissions(await examService.listSubmissions(examId));
        } catch (err) {
            console.error("Failed to load submissions", err);
        }
    }, [examId]);

    useEffect(() => {
        refreshSubmissions();
    }, [refreshSubmissions]);

    // Poll while any submission is still being graded
    const anyInProgress = submissions.some((s) => IN_PROGRESS.includes(s.status));
    useEffect(() => {
        if (!anyInProgress) return;
        const timer = setInterval(refreshSubmissions, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [anyInProgress, refreshSubmissions]);

    const refreshRubrics = useCallback(async () => {
        try {
            setRubricStatus(await rubricService.getStatus(examId));
        } catch (err) {
            console.error("Failed to load rubric status", err);
        }
    }, [examId]);

    useEffect(() => {
        refreshRubrics();
    }, [refreshRubrics]);

    // Rubrics are parsed in the background after questions change
    const anyParsing = rubricStatus.some((r) => r.rubric_status === "pending");
    useEffect(() => {
        if (!anyParsing) return;
        const timer = setInterval(refreshRubrics, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [anyParsing, refreshRubrics]);

    if (loading) {
        return (
            <div className={styles.page} aria-busy="true">
                <span className="sr-only" role="status">Loading exam…</span>
                <div className={styles.skeletonHeader}>
                    <span className={cn(styles.skeleton, styles.skCrumb)} />
                    <span className={cn(styles.skeleton, styles.skTitle)} />
                    <span className={cn(styles.skeleton, styles.skLine)} />
                </div>
                <span className={cn(styles.skeleton, styles.skProgress)} />
                <span className={cn(styles.skeleton, styles.skSection)} />
                <span className={cn(styles.skeleton, styles.skSection)} />
            </div>
        );
    }

    if (errorDetails || !exam) {
        return (
            <div className={styles.page}>
                <PageHeader title="Exam" breadcrumbs={[{ label: "Exams", href: "/dashboard/exams" }, { label: "Exam" }]} />
                <div className={styles.errorBanner} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <div className={styles.errorText}>
                        <p className={styles.errorTitle}>{notFound || !errorDetails ? "Exam not found" : "This exam couldn't be loaded"}</p>
                        <p>{notFound || !errorDetails ? "It may have been deleted, or the link is wrong." : errorDetails}</p>
                    </div>
                    {notFound || !errorDetails
                        ? <ButtonLink href="/dashboard/exams" variant="outline" size="sm">Back to exams</ButtonLink>
                        : <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadExam(); }}>Try again</Button>}
                </div>
            </div>
        );
    }

    const approvedCount = submissions.filter((s) => s.status === "APPROVED").length;
    const reviewCount = submissions.filter((s) => s.status === "NEEDS_REVIEW").length;
    const totalMarks = questions.reduce((t, q) => t + (Number(q.max_score) || 0), 0);
    const created = new Date(exam.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

    return (
        <div className={styles.page}>
            <PageHeader
                breadcrumbs={[{ label: "Exams", href: "/dashboard/exams" }, { label: exam.name }]}
                title={exam.name}
                subtitle={
                    <>
                        {exam.description}
                        <span className={styles.meta}>
                            <span><ListChecks size={15} aria-hidden="true" />{questions.length} {questions.length === 1 ? "question" : "questions"}</span>
                            <span><Trophy size={15} aria-hidden="true" />{totalMarks} marks</span>
                            <span><Calendar size={15} aria-hidden="true" />Created {created}</span>
                        </span>
                    </>
                }
                actions={
                    <>
                        <ButtonLink href={`/dashboard/exams/${examId}/review`} variant="outline" icon={<ClipboardCheck size={16} />} className={styles.headerAction}>
                            Review queue
                            {reviewCount > 0 && <span className={styles.countReview}><span className="sr-only">(</span>{reviewCount}<span className="sr-only">)</span></span>}
                        </ButtonLink>
                        <Button onClick={() => setConfirmPublish(true)} disabled={approvedCount === 0} className={styles.headerAction}
                                icon={<Send size={16} aria-hidden="true" />}
                                title={approvedCount === 0 ? "Approve answer sheets first" : undefined}>
                            Publish approved{" "}
                            <span className={styles.countPrimary}><span className="sr-only">(</span>{approvedCount}<span className="sr-only">)</span></span>
                        </Button>
                    </>
                }
            />
            <div className={styles.sections}>
            {publishMessage && (
                <InlineMessage kind="success" onDismiss={() => setPublishMessage(null)}>{publishMessage}</InlineMessage>
            )}

            <ExamProgress questions={questions} dirty={dirty} rubrics={rubricStatus} submissions={submissions} />

            <QuestionsSection
                examId={examId}
                questions={questions}
                dirty={dirty}
                rubrics={rubricStatus}
                onEdit={(next) => { setQuestions(next); setDirty(true); }}
                onSaved={(next) => { setQuestions(next); setDirty(false); }}
                onRubricsChanged={refreshRubrics}
                onOpenRubric={setRubricQuestion}
            />

            <AnswerSheetsSection examId={examId} submissions={submissions} canUpload={questions.length > 0}
                                 onChanged={refreshSubmissions} />

            <SectionCard icon={<SlidersHorizontal size={18} />} title="Grading settings"
                         description="New grading runs use these settings; answer sheets already graded keep their grades.">
                <GradingSettingsPanel examId={examId} />
            </SectionCard>
            </div>

            {rubricQuestion && (
                <RubricDialog examId={examId} question={rubricQuestion} status={rubricStatus.find((r) => r.question_id === rubricQuestion.id)}
                              onClose={() => setRubricQuestion(null)} onChanged={refreshRubrics} />
            )}
            {confirmPublish && (
                <ConfirmDialog title={`Publish ${approvedCount} approved ${approvedCount === 1 ? "result" : "results"}?`}
                               confirmLabel="Publish"
                               message={<>Students will see their scores and feedback. Published results can&apos;t be changed;
                                   answer sheets that aren&apos;t approved yet stay unpublished.</>}
                               onClose={() => setConfirmPublish(false)}
                               onConfirm={async () => {
                                   const result = await reviewService.publishExam(examId);
                                   setConfirmPublish(false);
                                   setPublishMessage(`Published ${result.published}. ${result.not_approved} not approved yet.`);
                                   await refreshSubmissions();
                               }} />
            )}
        </div>
    );
}

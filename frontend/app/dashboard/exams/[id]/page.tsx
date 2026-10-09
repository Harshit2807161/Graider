"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, ClipboardCheck, ListChecks, Send, SlidersHorizontal, Trophy } from "lucide-react";
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
import ErrorBanner from "@/components/common/ErrorBanner";
import PageHeader from "@/components/common/PageHeader";
import AnswerSheetsSection from "@/components/features/exams/AnswerSheetsSection";
import ExamProgress from "@/components/features/exams/ExamProgress";
import InlineMessage from "@/components/ui/InlineMessage";
import QuestionsSection, { RubricTarget } from "@/components/features/exams/QuestionsSection";
import SectionCard from "@/components/features/exams/SectionCard";
import GradingSettingsPanel from "@/components/features/review/GradingSettingsPanel";
import RubricDialog from "@/components/features/rubrics/RubricDialog";
import styles from "./page.module.css";

const IN_PROGRESS: SubmissionStatus[] = ["PENDING", "PROCESSING"];
const POLL_INTERVAL_MS = 3000;
// In-page anchors: the progress steps link to their section
const QUESTIONS_ID = "questions";
const SHEETS_ID = "answer-sheets";

/** One exam's workspace: questions & rubrics → grade answer sheets → review → publish. */
export default function ExamDetailsPage() {
    const params = useParams();
    const examId = params.id as string;
    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<QuestionSync[]>([]);
    // The list as the server has it (local edits stay in `questions` until saved)
    const [savedQuestions, setSavedQuestions] = useState<QuestionSync[]>([]);
    const [dirty, setDirty] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const [submissions, setSubmissions] = useState<Submission[]>([]);
    // Until the first list arrives, nothing is said about answer sheets (no "none yet" flash)
    const [sheetsState, setSheetsState] = useState<"loading" | "ready" | "error">("loading");

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
            setSavedQuestions(data.questions || []);
            setDirty(false);
            setErrorDetails(null);
        } catch (err) {
            const status = (err as AxiosError)?.response?.status;
            setNotFound(status === 404);
            // Server faults get a plain sentence; other errors say what the API said
            setErrorDetails(!status || status >= 500
                ? "The server didn't respond as expected. Check your connection, then try again."
                : getErrorMessage(err, "Failed to load exam"));
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
            setSheetsState("ready");
        } catch (err) {
            console.error("Failed to load submissions", err);
            // A failed poll keeps the list already shown
            setSheetsState((state) => (state === "ready" ? state : "error"));
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
                {notFound || !errorDetails ? (
                    <ErrorBanner title="Exam not found" detail="It may have been deleted, or the link is wrong." />
                ) : (
                    <ErrorBanner title="This exam couldn't be loaded" detail={errorDetails}
                                 onRetry={() => { setLoading(true); loadExam(); }} />
                )}
                {(notFound || !errorDetails) && (
                    <ButtonLink href="/dashboard/exams" variant="outline" className={styles.backLink}>Back to exams</ButtonLink>
                )}
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
                            <span><Trophy size={15} aria-hidden="true" />{totalMarks} {totalMarks === 1 ? "mark" : "marks"}</span>
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
                        {/* Nothing to publish before any answer sheet is graded */}
                        {sheetsState === "ready" && submissions.length > 0 && (
                            <Button onClick={() => setConfirmPublish(true)} disabled={approvedCount === 0} className={styles.headerAction}
                                    icon={<Send size={16} aria-hidden="true" />}
                                    title={approvedCount === 0 ? "Approve answer sheets first" : undefined}>
                                Publish approved{" "}
                                <span className={styles.countPrimary}><span className="sr-only">(</span>{approvedCount}<span className="sr-only">)</span></span>
                            </Button>
                        )}
                    </>
                }
            />
            <div className={styles.sections}>
            {publishMessage && (
                <InlineMessage kind="success" onDismiss={() => setPublishMessage(null)}>{publishMessage}</InlineMessage>
            )}

            <ExamProgress examId={examId} questions={questions} dirty={dirty} rubrics={rubricStatus} submissions={submissions}
                          sheetsLoading={sheetsState !== "ready"}
                          questionsAnchor={QUESTIONS_ID} sheetsAnchor={SHEETS_ID} onPublish={() => setConfirmPublish(true)} />

            <QuestionsSection
                id={QUESTIONS_ID}
                examId={examId}
                questions={questions}
                saved={savedQuestions}
                dirty={dirty}
                rubrics={rubricStatus}
                onEdit={(next) => { setQuestions(next); setDirty(true); }}
                onSaved={(next) => { setQuestions(next); setSavedQuestions(next); setDirty(false); }}
                onRubricsChanged={refreshRubrics}
                onOpenRubric={setRubricQuestion}
            />

            <AnswerSheetsSection id={SHEETS_ID} examId={examId} submissions={submissions} canUpload={savedQuestions.length > 0}
                                 listState={sheetsState} onChanged={refreshSubmissions} />

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
                               confirmLabel="Publish" icon={<Send size={18} />}
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

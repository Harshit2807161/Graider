"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getErrorMessage } from "@/lib/api";
import { examService } from "@/services/exam.service";
import { reviewService } from "@/services/review.service";
import { rubricService } from "@/services/rubric.service";
import { Exam, QuestionSync, Submission, SubmissionStatus } from "@/types/exam.types";
import { QuestionRubricStatus } from "@/types/review.types";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import GradingSettingsPanel from "@/components/features/review/GradingSettingsPanel";
import RubricDialog from "@/components/features/rubrics/RubricDialog";

const IN_PROGRESS: SubmissionStatus[] = ["PENDING", "PROCESSING"];
const POLL_INTERVAL_MS = 3000;

/** A question's rubric state, in the same badge language as submissions. */
const RUBRIC_BADGES: Record<QuestionRubricStatus["rubric_status"], { status: SubmissionStatus; label: string }> = {
    ready: { status: "GRADED", label: "Rubric ready" },
    pending: { status: "PROCESSING", label: "Parsing rubric" },
    invalid: { status: "NEEDS_REVIEW", label: "Rubric needs fixing" },
    error: { status: "FAILED", label: "Rubric parsing failed" },
    missing: { status: "PENDING", label: "Rubric not parsed yet" },
};

const panelStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    padding: "2rem",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

export default function ExamDetailsPage() {
    const params = useParams();
    const examId = params.id as string;
    const router = useRouter();
    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<QuestionSync[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    const [newText, setNewText] = useState("");
    const [newMaxScore, setNewMaxScore] = useState(10);
    const [newRubric, setNewRubric] = useState("");
    const [savingQuestions, setSavingQuestions] = useState(false);

    // Answer sheet upload
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    // Excel question import
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [uploadingExcel, setUploadingExcel] = useState(false);

    const [submissions, setSubmissions] = useState<Submission[]>([]);

    // Parsed rubrics, the one being viewed, and publishing
    const [rubricStatus, setRubricStatus] = useState<QuestionRubricStatus[]>([]);
    const [rubricQuestion, setRubricQuestion] = useState<{ id: string; label: string; text: string; maxScore: number } | null>(null);
    const [confirmPublish, setConfirmPublish] = useState(false);
    const [publishMessage, setPublishMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchExamAndQuestions = async () => {
            if (!examId) return;
            try {
                const data = await examService.getExam(examId);
                setExam(data);
                setQuestions(data.questions || []);
            } catch (err) {
                setErrorDetails(getErrorMessage(err, "Failed to load exam"));
            } finally {
                setLoading(false);
            }
        };
        fetchExamAndQuestions();
    }, [examId]);

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

    const handleAddQuestionLocal = () => {
        if (!newText.trim()) return;
        const q: QuestionSync = {
            question_text: newText.trim(),
            max_score: newMaxScore,
            rubric_criteria: newRubric.trim() || undefined,
            order_index: questions.length + 1,
            question_type: "descriptive",
        };
        setQuestions([...questions, q]);
        setNewText("");
        setNewRubric("");
    };

    const handleRemoveQuestionLocal = (index: number) => {
        setQuestions(
            questions
                .filter((_, i) => i !== index)
                .map((q, i) => ({ ...q, order_index: i + 1 }))
        );
    };

    const handleSaveQuestions = async () => {
        setSavingQuestions(true);
        try {
            const payload: QuestionSync[] = questions.map((q) => ({
                id: q.id,
                question_text: q.question_text,
                order_index: q.order_index,
                max_score: q.max_score,
                rubric_criteria: q.rubric_criteria,
                question_type: q.question_type,
            }));
            // Keep the returned ids so saving again updates instead of duplicating
            setQuestions(await examService.syncQuestions(examId, payload));
            await refreshRubrics();
            alert("Questions saved.");
        } catch (err) {
            alert(`Failed to save questions: ${getErrorMessage(err)}`);
        } finally {
            setSavingQuestions(false);
        }
    };

    const handleUploadExcel = async () => {
        if (!excelFile) return;
        setUploadingExcel(true);
        try {
            const created = await examService.importQuestions(examId, excelFile);
            alert(`Imported ${created.length} questions from Excel.`);
            const examData = await examService.getExam(examId);
            setQuestions(examData.questions || []);
            await refreshRubrics();
        } catch (err) {
            alert(`Failed to import questions:\n${getErrorMessage(err)}`);
        } finally {
            setUploadingExcel(false);
            setExcelFile(null);
            const fileInput = document.getElementById("excel-upload-input") as HTMLInputElement | null;
            if (fileInput) fileInput.value = "";
        }
    };

    const handleUploadSubmission = async () => {
        if (selectedFiles.length === 0) return;
        setUploading(true);
        try {
            await examService.uploadSubmission(examId, selectedFiles);
            setSelectedFiles([]);
            const fileInput = document.getElementById("submission-upload-input") as HTMLInputElement | null;
            if (fileInput) fileInput.value = "";
            await refreshSubmissions();
        } catch (err) {
            alert(`Failed to upload answer sheet: ${getErrorMessage(err)}`);
        } finally {
            setUploading(false);
        }
    };

    const handleRegrade = async (submission: Submission) => {
        try {
            await examService.regradeSubmission(submission.id);
            await refreshSubmissions();
        } catch (err) {
            alert(`Failed to regrade: ${getErrorMessage(err)}`);
        }
    };

    if (loading) return <div style={{ padding: "3rem", color: "#64748b" }}>Loading exam...</div>;
    if (errorDetails) return <div style={{ padding: "3rem", color: "#ef4444" }}><strong>Error:</strong> {errorDetails}</div>;
    if (!exam) return <div style={{ padding: "3rem", color: "#ef4444" }}>Exam not found.</div>;

    const rubricById = new Map(rubricStatus.map((r) => [r.question_id, r]));
    const approvedCount = submissions.filter((s) => s.status === "APPROVED").length;
    const reviewCount = submissions.filter((s) => s.status === "NEEDS_REVIEW").length;

    return (
        <div style={{ padding: "3rem", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f172a" }}>{exam.name}</h1>
                    <p style={{ color: "#64748b", marginTop: "0.25rem" }}>{exam.description}</p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Button variant="secondary" onClick={() => router.push("/dashboard/exams")}>Back to Exams</Button>
                    <Button variant="secondary" onClick={() => router.push(`/dashboard/exams/${examId}/review`)}>
                        Review queue{reviewCount > 0 ? ` (${reviewCount})` : ""}
                    </Button>
                    <Button onClick={() => setConfirmPublish(true)} disabled={approvedCount === 0}
                            title={approvedCount === 0 ? "Approve answer sheets first" : undefined}>
                        Publish approved ({approvedCount})
                    </Button>
                </div>
            </div>
            {publishMessage && <p role="status" style={{ color: "#166534" }}>{publishMessage}</p>}

            <div style={panelStyle}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "#1e293b" }}>1. Questions</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem", backgroundColor: "#f8fafc", padding: "1.5rem", borderRadius: "8px" }}>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <input
                            placeholder="Question text"
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                        />
                        <input
                            type="number"
                            min={0}
                            placeholder="Max Score"
                            title="Max Score"
                            value={newMaxScore}
                            onChange={e => setNewMaxScore(Number(e.target.value))}
                            style={{ width: "120px", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                        />
                    </div>
                    <textarea
                        placeholder="Rubric: one expected point per line"
                        value={newRubric}
                        onChange={e => setNewRubric(e.target.value)}
                        style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", minHeight: "100px", fontFamily: "inherit" }}
                    />
                    <Button onClick={handleAddQuestionLocal} style={{ alignSelf: "flex-start" }}>Add to List</Button>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontWeight: "600", marginBottom: "1rem", color: "#334155" }}>Questions ({questions.length}):</h3>
                    {questions.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No questions added yet.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {questions.map((q, idx) => {
                                const rubric = q.id ? rubricById.get(q.id) : undefined;
                                const label = rubric?.label ?? `Q${idx + 1}`;
                                return (
                                <div key={q.id ?? `new-${idx}`} style={{ padding: "1rem", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                                        <strong style={{ color: "#0f172a" }}>{label}. {q.question_text}</strong>
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                                            <span style={{ backgroundColor: "#e0e7ff", color: "#4f46e5", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem", fontWeight: "500" }}>{q.max_score} points</span>
                                            {rubric && <StatusBadge {...RUBRIC_BADGES[rubric.rubric_status]} />}
                                            {q.id && (
                                                <Button size="sm" variant="secondary"
                                                        onClick={() => setRubricQuestion({ id: q.id as string, label, text: q.question_text, maxScore: q.max_score })}>
                                                    Rubric
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => handleRemoveQuestionLocal(idx)}>Remove</Button>
                                        </div>
                                    </div>
                                    {q.rubric_criteria && (
                                        <p style={{ fontSize: "0.875rem", color: "#64748b", whiteSpace: "pre-line" }}>Rubric: {q.rubric_criteria}</p>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <Button onClick={handleSaveQuestions} disabled={savingQuestions} style={{ backgroundColor: "#10b981", color: "white" }}>
                    {savingQuestions ? "Saving..." : "Save Questions"}
                </Button>
            </div>

            <div style={panelStyle}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "#1e293b" }}>Import Questions from Excel (.xlsx)</h2>
                <p style={{ marginBottom: "1.5rem", color: "#64748b" }}>
                    Required columns: <strong>question_text</strong> and <strong>max_score</strong>. Optional: <em>rubric_criteria</em> and <em>question_type</em>. Imported questions are added after the existing ones; if any row is invalid, nothing is imported.
                </p>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <input
                        id="excel-upload-input"
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={e => setExcelFile(e.target.files?.[0] || null)}
                        style={{ padding: "0.5rem", border: "1px dashed #cbd5e1", borderRadius: "8px", flex: 1 }}
                    />
                    <Button onClick={handleUploadExcel} disabled={uploadingExcel || !excelFile} style={{ backgroundColor: "#3b82f6", color: "white" }}>
                        {uploadingExcel ? "Importing..." : "Import"}
                    </Button>
                </div>
            </div>

            <div style={panelStyle}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "#1e293b" }}>2. Grade Answer Sheets</h2>
                <p style={{ marginBottom: "1.5rem", color: "#64748b" }}>
                    Upload one student&apos;s answers: a PDF, Word document, photos (JPEG, PNG, HEIC…) or text. Several files (e.g. one photo per page) are graded together, in the order selected.
                </p>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
                    <input
                        id="submission-upload-input"
                        type="file"
                        multiple
                        accept=".pdf,.docx,.doc,.odt,.rtf,.pptx,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.gif,.bmp"
                        onChange={e => setSelectedFiles(Array.from(e.target.files ?? []))}
                        style={{ padding: "0.5rem", border: "1px dashed #cbd5e1", borderRadius: "8px", flex: 1 }}
                    />
                    <Button onClick={handleUploadSubmission} disabled={uploading || selectedFiles.length === 0 || questions.length === 0}>
                        {uploading ? "Uploading..." : "Upload & Grade"}
                    </Button>
                </div>

                {submissions.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No answer sheets uploaded yet.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {submissions.map((s) => (
                            <div key={s.id} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                            <StatusBadge status={s.status} />
                                            <span style={{ color: "#64748b", fontSize: "0.875rem" }}>{new Date(s.created_at).toLocaleString()}</span>
                                        </div>
                                        {s.current_step && (
                                            <span style={{ color: s.status === "FAILED" ? "#b91c1c" : "#64748b", fontSize: "0.875rem" }}>{s.current_step}</span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                                        {s.total_score != null && s.max_score != null && (
                                            <strong style={{ color: "#0f172a" }}>{s.total_score} / {s.max_score}</strong>
                                        )}
                                        {s.status === "FAILED" && (
                                            <Button size="sm" variant="ghost" onClick={() => handleRegrade(s)}>Regrade</Button>
                                        )}
                                        {!IN_PROGRESS.includes(s.status) && (
                                            <Link href={`/dashboard/exams/${examId}/submissions/${s.id}`}
                                                  style={{ fontWeight: 600, color: "#4338ca", fontSize: "0.875rem" }}>
                                                {s.status === "NEEDS_REVIEW" ? "Review" : "Open"}
                                            </Link>
                                        )}
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={panelStyle}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "#1e293b" }}>Grading settings</h2>
                <GradingSettingsPanel examId={examId} />
            </div>

            {rubricQuestion && (
                <RubricDialog examId={examId} question={rubricQuestion} status={rubricById.get(rubricQuestion.id)}
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

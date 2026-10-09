"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getErrorMessage } from "@/lib/api";
import { examService } from "@/services/exam.service";
import { Exam, QuestionSync, Submission, SubmissionStatus } from "@/types/exam.types";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";

const IN_PROGRESS: SubmissionStatus[] = ["PENDING", "PROCESSING"];
const POLL_INTERVAL_MS = 3000;

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

    // Submissions and the one currently expanded
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [expanded, setExpanded] = useState<Submission | null>(null);

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

    const handleToggleSubmission = async (submission: Submission) => {
        if (expanded?.id === submission.id) {
            setExpanded(null);
            return;
        }
        try {
            setExpanded(await examService.getSubmission(submission.id));
        } catch (err) {
            alert(`Failed to load results: ${getErrorMessage(err)}`);
        }
    };

    const handleRegrade = async (submission: Submission) => {
        try {
            await examService.regradeSubmission(submission.id);
            if (expanded?.id === submission.id) setExpanded(null);
            await refreshSubmissions();
        } catch (err) {
            alert(`Failed to regrade: ${getErrorMessage(err)}`);
        }
    };

    if (loading) return <div style={{ padding: "3rem", color: "#64748b" }}>Loading exam...</div>;
    if (errorDetails) return <div style={{ padding: "3rem", color: "#ef4444" }}><strong>Error:</strong> {errorDetails}</div>;
    if (!exam) return <div style={{ padding: "3rem", color: "#ef4444" }}>Exam not found.</div>;

    const questionTextById = new Map(questions.filter((q) => q.id).map((q) => [q.id as string, q.question_text]));

    return (
        <div style={{ padding: "3rem", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f172a" }}>{exam.name}</h1>
                    <p style={{ color: "#64748b", marginTop: "0.25rem" }}>{exam.description}</p>
                </div>
                <Button variant="secondary" onClick={() => router.push("/dashboard/exams")}>Back to Exams</Button>
            </div>

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
                            {questions.map((q, idx) => (
                                <div key={q.id ?? `new-${idx}`} style={{ padding: "1rem", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                                        <strong style={{ color: "#0f172a" }}>Q{idx + 1}. {q.question_text}</strong>
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                                            <span style={{ backgroundColor: "#e0e7ff", color: "#4f46e5", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem", fontWeight: "500" }}>{q.max_score} points</span>
                                            <Button size="sm" variant="ghost" onClick={() => handleRemoveQuestionLocal(idx)}>Remove</Button>
                                        </div>
                                    </div>
                                    {q.rubric_criteria && (
                                        <p style={{ fontSize: "0.875rem", color: "#64748b", whiteSpace: "pre-line" }}>Rubric: {q.rubric_criteria}</p>
                                    )}
                                </div>
                            ))}
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
                                        {!IN_PROGRESS.includes(s.status) && (
                                            <Button size="sm" variant="ghost" onClick={() => handleRegrade(s)}>Regrade</Button>
                                        )}
                                        {s.status === "GRADED" && (
                                            <Button size="sm" variant="secondary" onClick={() => handleToggleSubmission(s)}>
                                                {expanded?.id === s.id ? "Hide" : "View"}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {expanded?.id === s.id && (
                                    <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                        {(expanded.answers ?? []).map((a) => (
                                            <div key={a.id} style={{ backgroundColor: "#f8fafc", borderRadius: "8px", padding: "1rem", fontSize: "0.9rem" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                                                    <strong style={{ color: "#0f172a" }}>{questionTextById.get(a.question_id) ?? "Question"}</strong>
                                                    <strong>{a.score}</strong>
                                                </div>
                                                {a.student_answer_text && (
                                                    <p style={{ color: "#334155", whiteSpace: "pre-line", marginBottom: "0.5rem" }}><em>Answer:</em> {a.student_answer_text}</p>
                                                )}
                                                {a.feedback && <p style={{ color: "#334155", marginBottom: "0.5rem" }}><em>Feedback:</em> {a.feedback}</p>}
                                                {a.reasoning && <p style={{ color: "#64748b" }}><em>Grader reasoning:</em> {a.reasoning}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

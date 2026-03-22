"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";

export default function ExamDetailsPage() {
    const params = useParams();
    const examId = params.id as string;
    const router = useRouter();
    const [exam, setExam] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    const [newText, setNewText] = useState("");
    const [newMaxScore, setNewMaxScore] = useState(10);
    const [newRubric, setNewRubric] = useState("");

    // File upload state for submission test
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // File upload state for Excel questions seeding
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [uploadingExcel, setUploadingExcel] = useState(false);

    useEffect(() => {
        // Must unwrap the `params` deeply if using React 19 app router technically, but basic destruct works here
        const fetchExamAndQuestions = async () => {
            if (!examId) return;
            try {
                const res = await api.get(`/exams/${examId}`);
                const data = res.data;
                setExam(data);
                setQuestions(data.questions || []);
            } catch (err: any) {
                const status = err.response?.status;
                const detail = err.response?.data?.detail || err.message;
                setErrorDetails(`HTTP ${status || "Network"}: ${detail}`);
                console.error("Error fetching exam:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchExamAndQuestions();
    }, [examId]);

    const handleAddQuestionLocal = () => {
        if (!newText.trim()) return;
        const q = {
            question_text: newText,
            max_score: newMaxScore,
            rubric_criteria: newRubric,
            order_index: questions.length + 1,
            question_type: "descriptive"
        };
        setQuestions([...questions, q]);
        setNewText("");
        setNewRubric("");
    };

    const handleSaveQuestions = async () => {
        try {
            const res = await api.post(`/exams/${examId}/questions`, questions);
            if (res.status === 200 || res.status === 201) {
                alert("Questions saved securely to PostgreSQL!");
            }
        } catch (err) {
            console.error("Failed to save questions", err);
            alert("Failed to save questions.");
        }
    };

    const handleUploadExcel = async () => {
        if (!excelFile) return;
        setUploadingExcel(true);
        try {
            const formData = new FormData();
            formData.append("file", excelFile);

            const res = await api.post(`/exams/${examId}/questions/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (res.status === 200 || res.status === 201) {
                const data = res.data;
                alert(`Successfully seeded ${data.length} questions from Excel!`);

                // Rapidly re-hydrate questions from backend
                const fetchRes = await api.get(`/exams/${examId}`);
                if (fetchRes.status === 200) {
                    const examData = fetchRes.data;
                    setQuestions(examData.questions || []);
                }
            }
        } catch (err: any) {
            console.error("Excel upload failed", err);
            const detail = err.response?.data?.detail || err.message;
            alert(`Failed to upload Excel: ${detail}`);
        } finally {
            setUploadingExcel(false);
            setExcelFile(null);
            // clear the dom input
            const fileInput = document.getElementById("excel-upload-input") as HTMLInputElement;
            if (fileInput) fileInput.value = "";
        }
    };

    const handleUploadSubmission = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const res = await api.post(`/exams/${examId}/submissions`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (res.status === 200 || res.status === 201) {
                const data = res.data;
                alert(`Submission created asynchronously! DB Task ID Tracking: ${data.id}`);
            }
        } catch (err: any) {
            console.error(err);
            const detail = err.response?.data?.detail || err.message;
            alert(`Failed to create submission: ${detail}`);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div style={{ padding: "3rem", color: "#64748b" }}>Fetching Exam Data...</div>;
    if (errorDetails) return <div style={{ padding: "3rem", color: "#ef4444" }}><strong>API Error:</strong> {errorDetails}</div>;
    if (!exam) return <div style={{ padding: "3rem", color: "#ef4444" }}>Exam returned null.</div>;

    return (
        <div style={{ padding: "3rem", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f172a" }}>{exam.name}</h1>
                    <p style={{ color: "#64748b", marginTop: "0.25rem" }}>{exam.description}</p>
                </div>
                <Button variant="secondary" onClick={() => router.push("/dashboard/exams")}>Back to Exams Dashboard</Button>
            </div>

            <div style={{ backgroundColor: "#ffffff", padding: "2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "#1e293b" }}>1. Manual Question Construction</h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem", backgroundColor: "#f8fafc", padding: "1.5rem", borderRadius: "8px" }}>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <input
                            placeholder="Question Text (e.g. Derive the Newtonian limits of Relativity)"
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                        />
                        <input
                            type="number"
                            placeholder="Max Score"
                            title="Max Score"
                            value={newMaxScore}
                            onChange={e => setNewMaxScore(Number(e.target.value))}
                            style={{ width: "120px", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                        />
                    </div>
                    <textarea
                        placeholder="Expected Reasoning / Rubric Criteria to instruct the LLM"
                        value={newRubric}
                        onChange={e => setNewRubric(e.target.value)}
                        style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", minHeight: "100px", fontFamily: "inherit" }}
                    />
                    <Button onClick={handleAddQuestionLocal} style={{ alignSelf: "flex-start" }}>Add to List</Button>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontWeight: "600", marginBottom: "1rem", color: "#334155" }}>Staged Questions ({questions.length}):</h3>
                    {questions.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No questions added yet.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {questions.map((q, idx) => (
                                <div key={idx} style={{ padding: "1rem", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                        <strong style={{ color: "#0f172a" }}>Q{q.order_index || idx + 1}. {q.question_text}</strong>
                                        <span style={{ backgroundColor: "#e0e7ff", color: "#4f46e5", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem", fontWeight: "500" }}>{q.max_score} points</span>
                                    </div>
                                    {q.rubric_criteria && (
                                        <p style={{ fontSize: "0.875rem", color: "#64748b" }}>Rubric: {q.rubric_criteria}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Button onClick={handleSaveQuestions} disabled={questions.length === 0} style={{ backgroundColor: "#10b981", color: "white" }}>
                    Sync Database Questions
                </Button>
            </div>

            <div style={{ backgroundColor: "#ffffff", padding: "2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "#1e293b" }}>1.5. Seed Questions from Excel (.xlsx)</h2>
                <p style={{ marginBottom: "1.5rem", color: "#64748b" }}>
                    Upload an Excel file containing exactly the columns <strong>question_text</strong> and <strong>max_score</strong>. Optional columns include <em>rubric_criteria</em> and <em>question_type</em>.
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
                        {uploadingExcel ? "Importing Data..." : "Upload Excel Sheet"}
                    </Button>
                </div>
            </div>

            <div style={{ backgroundColor: "#ffffff", padding: "2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "#1e293b" }}>2. Test AI Submission Pipeline</h2>
                <p style={{ marginBottom: "1.5rem", color: "#64748b" }}>
                    Dispatch a PDF via standard multipart boundaries. The backend runs this transparently utilizing Celery and Redis to prevent FastAPI lockup issues.
                    <br /><br />
                    <strong>Note:</strong> Since we manually provided DB questions above, the backend will entirely skip the expensive "Question Extraction OCR" phase and route Triplet creation immediately!
                </p>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        style={{ padding: "0.5rem", border: "1px dashed #cbd5e1", borderRadius: "8px", flex: 1 }}
                    />
                    <Button onClick={handleUploadSubmission} disabled={uploading || !selectedFile}>
                        {uploading ? "Dispatching..." : "Trigger AI Grading"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

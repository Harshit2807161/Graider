"use client";

import React, { useId, useRef, useState } from "react";
import { FileSpreadsheet, ListChecks, Plus, ScrollText, Trash2, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { QuestionSync, SubmissionStatus } from "@/types/exam.types";
import { QuestionRubricStatus } from "@/types/review.types";
import InlineMessage, { Message } from "./InlineMessage";
import SectionCard from "./SectionCard";
import styles from "./QuestionsSection.module.css";

/** A question's rubric state, in the same badge language as submissions. */
const RUBRIC_BADGES: Record<QuestionRubricStatus["rubric_status"], { status: SubmissionStatus; label: string }> = {
    ready: { status: "GRADED", label: "Rubric ready" },
    pending: { status: "PROCESSING", label: "Parsing rubric" },
    invalid: { status: "NEEDS_REVIEW", label: "Rubric needs fixing" },
    error: { status: "FAILED", label: "Rubric parsing failed" },
    missing: { status: "PENDING", label: "Rubric not parsed yet" },
};

export interface RubricTarget {
    id: string;
    label: string;
    text: string;
    maxScore: number;
}

/** Step 1: the exam's questions and their rubrics. Edits stay local until "Save questions",
 *  which sends the full list (existing questions keep their id; missing ones are removed). */
export default function QuestionsSection({ examId, questions, dirty, rubrics, onEdit, onSaved, onRubricsChanged, onOpenRubric }: {
    examId: string;
    questions: QuestionSync[];
    dirty: boolean;
    rubrics: QuestionRubricStatus[];
    /** A local edit (add/remove) that isn't saved yet */
    onEdit: (questions: QuestionSync[]) => void;
    /** The list as the server now has it */
    onSaved: (questions: QuestionSync[]) => void;
    onRubricsChanged: () => Promise<void>;
    onOpenRubric: (question: RubricTarget) => void;
}) {
    const formId = useId();
    const importId = useId();
    const excelInputRef = useRef<HTMLInputElement>(null);

    const [newText, setNewText] = useState("");
    const [newMaxScore, setNewMaxScore] = useState(10);
    const [newRubric, setNewRubric] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);

    const [importOpen, setImportOpen] = useState(false);
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const rubricById = new Map(rubrics.map((r) => [r.question_id, r]));
    // The add form is open from the start only when there's nothing to list yet
    const [addOpen, setAddOpen] = useState(questions.length === 0);
    const textRef = useRef<HTMLInputElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const openAddForm = () => {
        setAddOpen(true);
        requestAnimationFrame(() => textRef.current?.focus());
    };
    const closeAddForm = () => {
        setAddOpen(false);
        requestAnimationFrame(() => toggleRef.current?.focus());
    };

    const addQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newText.trim()) return;
        const q: QuestionSync = {
            question_text: newText.trim(),
            max_score: newMaxScore,
            rubric_criteria: newRubric.trim() || undefined,
            order_index: questions.length + 1,
            question_type: "descriptive",
        };
        onEdit([...questions, q]);
        setNewText("");
        setNewRubric("");
        setMessage(null);
    };

    const removeQuestion = (index: number) => {
        onEdit(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order_index: i + 1 })));
        setMessage(null);
    };

    const save = async () => {
        setSaving(true);
        setMessage(null);
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
            onSaved(await examService.syncQuestions(examId, payload));
            await onRubricsChanged();
            setMessage({ kind: "success", text: "Questions saved. Changed rubrics are parsed in the background." });
        } catch (err) {
            setMessage({ kind: "error", text: `Questions couldn't be saved: ${getErrorMessage(err)}` });
        } finally {
            setSaving(false);
        }
    };

    const importExcel = async () => {
        if (!excelFile) return;
        setImporting(true);
        setImportError(null);
        setMessage(null);
        try {
            const created = await examService.importQuestions(examId, excelFile);
            const exam = await examService.getExam(examId);
            onSaved(exam.questions || []);
            await onRubricsChanged();
            setImportOpen(false);
            setMessage({ kind: "success", text: `Imported ${created.length} ${created.length === 1 ? "question" : "questions"} from Excel.` });
        } catch (err) {
            setImportError(`Nothing was imported:\n${getErrorMessage(err)}`);
        } finally {
            setImporting(false);
            setExcelFile(null);
            if (excelInputRef.current) excelInputRef.current.value = "";
        }
    };

    return (
        <SectionCard
            step={1}
            icon={<ListChecks size={18} />}
            title="Questions & rubrics"
            description={questions.length > 0
                ? "Each question's rubric is parsed into criteria that both examiners grade against."
                : "Add the exam's questions with their marks and rubric, or import them from Excel."}
            actions={
                <Button variant="outline" size="sm" icon={<FileSpreadsheet size={16} aria-hidden="true" />}
                        aria-expanded={importOpen} aria-controls={importId} onClick={() => setImportOpen(!importOpen)}>
                    Import from Excel
                </Button>
            }
            footer={
                <>
                    <p className={cn(styles.saveState, dirty && styles.unsaved)}>
                        {dirty ? <><span className={styles.dot} aria-hidden="true" />Unsaved changes</> : "Saving replaces the exam's question list."}
                    </p>
                    <div className={styles.saveActions}>
                        {message && <InlineMessage kind={message.kind} onDismiss={() => setMessage(null)}>{message.text}</InlineMessage>}
                        <Button onClick={save} isLoading={saving} variant={dirty ? "primary" : "secondary"}>
                            Save questions
                        </Button>
                    </div>
                </>
            }
        >
            {importOpen && (
                <div id={importId} className={styles.importPanel}>
                    <div className={styles.importText}>
                        <h3 className={styles.subTitle}>Import questions from Excel (.xlsx)</h3>
                        <p className={styles.note}>
                            Required columns: <code>question_text</code> and <code>max_score</code>. Optional: <code>rubric_criteria</code> and{" "}
                            <code>question_type</code>. Imported questions are added after the existing ones; if any row is invalid, nothing is imported.
                        </p>
                    </div>
                    <div className={styles.importRow}>
                        <div className={styles.filePicker}>
                            <input ref={excelInputRef} id="excel-upload-input" type="file" accept=".xlsx, .xls" className={styles.fileInput}
                                   onChange={(e) => { setExcelFile(e.target.files?.[0] || null); setImportError(null); }} />
                            <label htmlFor="excel-upload-input" className={styles.fileButton}>
                                <Upload size={16} aria-hidden="true" /> Choose file
                            </label>
                            <span className={cn(styles.fileName, !excelFile && styles.fileNameEmpty)}>
                                {excelFile ? excelFile.name : "No file chosen"}
                            </span>
                        </div>
                        <Button onClick={importExcel} isLoading={importing} disabled={!excelFile}>Import</Button>
                    </div>
                    {importError && <InlineMessage kind="error">{importError}</InlineMessage>}
                </div>
            )}

            {questions.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><ListChecks size={24} /></span>
                    <p className={styles.emptyTitle}>No questions yet</p>
                    <p className={styles.note}>Add the first one below, or import a spreadsheet.</p>
                </div>
            ) : (
                <div className={styles.list}>
                    <div className={styles.listHead} aria-hidden="true">
                        <span>#</span>
                        <span>Question</span>
                        <span className={styles.right}>Marks</span>
                        <span>Rubric</span>
                        <span />
                    </div>
                    <ol className={styles.rows} aria-label="Questions">
                        {questions.map((q, idx) => {
                            const rubric = q.id ? rubricById.get(q.id) : undefined;
                            const label = rubric?.label ?? `Q${idx + 1}`;
                            return (
                                <li key={q.id ?? `new-${idx}`} className={styles.row}>
                                    <span className={styles.label}>{label}</span>
                                    <div className={styles.question}>
                                        <p className={styles.questionText}>{q.question_text}</p>
                                        {q.rubric_criteria && (
                                            <p className={styles.rubricText}>
                                                <ScrollText size={13} aria-hidden="true" />
                                                <span><span className="sr-only">Rubric: </span>{q.rubric_criteria}</span>
                                            </p>
                                        )}
                                    </div>
                                    <p className={styles.marks}>
                                        <span className={styles.marksNum}>{q.max_score}</span> {q.max_score === 1 ? "mark" : "marks"}
                                    </p>
                                    <div className={styles.status}>
                                        {rubric ? <StatusBadge {...RUBRIC_BADGES[rubric.rubric_status]} />
                                            : !q.id ? <StatusBadge status="PENDING" label="Not saved yet" /> : null}
                                    </div>
                                    <div className={styles.rowActions}>
                                        {q.id && (
                                            <Button size="sm" variant="secondary" className={styles.rowButton}
                                                    icon={<ScrollText size={14} aria-hidden="true" />}
                                                    onClick={() => onOpenRubric({ id: q.id as string, label, text: q.question_text, maxScore: q.max_score })}>
                                                Rubric
                                            </Button>
                                        )}
                                        <button type="button" className={styles.iconButton} onClick={() => removeQuestion(idx)}
                                                aria-label={`Remove ${label}`} title="Remove from the list">
                                            <Trash2 size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            {!addOpen ? (
                <button ref={toggleRef} type="button" className={styles.addToggle} onClick={openAddForm} aria-expanded={false}>
                    <Plus size={16} aria-hidden="true" /> Add a question
                </button>
            ) : (
            <form id={formId} className={styles.addForm} onSubmit={addQuestion} aria-labelledby={`${formId}-title`}>
                <h3 id={`${formId}-title`} className={styles.subTitle}>Add a question</h3>
                <div className={styles.addGrid}>
                    <label className={cn(styles.field, styles.fieldText)}>
                        <span>Question text</span>
                        <input ref={textRef} value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="e.g. Solve 2x + 3 = 11" required />
                    </label>
                    <label className={cn(styles.field, styles.fieldMarks)}>
                        <span>Marks</span>
                        <input type="number" min={0} value={newMaxScore} onChange={(e) => setNewMaxScore(Number(e.target.value))} />
                    </label>
                    <label className={cn(styles.field, styles.fieldRubric)}>
                        <span>Rubric <span className={styles.optional}>(optional)</span></span>
                        <textarea rows={3} value={newRubric} onChange={(e) => setNewRubric(e.target.value)}
                                  placeholder={"Subtracts 3 from both sides (1)\nx = 4 (1)"}
                                  aria-describedby={`${formId}-rubric-help`} />
                        <small id={`${formId}-rubric-help`} className={styles.help}>One expected point per line, with its marks. Without a rubric, one is derived from the question.</small>
                    </label>
                </div>
                <div className={styles.addActions}>
                    <Button type="submit" variant="outline" icon={<Plus size={16} aria-hidden="true" />} disabled={!newText.trim()}>
                        Add to list
                    </Button>
                    {questions.length > 0 && (
                        <Button type="button" variant="ghost" onClick={closeAddForm}>
                            Done
                        </Button>
                    )}
                </div>
            </form>
            )}
        </SectionCard>
    );
}

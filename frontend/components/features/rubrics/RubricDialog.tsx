"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Plus, RotateCcw, ScrollText, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import InlineMessage from "@/components/features/exams/InlineMessage";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { rubricService } from "@/services/rubric.service";
import { Criterion, QuestionRubricStatus, RubricKind, RubricSpecRecord, Subject } from "@/types/review.types";
import styles from "./RubricDialog.module.css";

const SUBJECTS: Subject[] = ["math", "science", "english", "history", "general"];
const SUBJECT_LABELS: Record<Subject, string> = {
    math: "Mathematics", science: "Science", english: "English", history: "History", general: "General",
};

interface QuestionInfo {
    id: string;
    label: string;
    text: string;
    maxScore: number;
}

/** The parsed rubric of one question: what grading checks each answer against. The teacher can
 *  edit it (same checks as a parsed one) or have the model parse the rubric text again. */
export default function RubricDialog({ examId, question, status, onClose, onChanged }: {
    examId: string;
    question: QuestionInfo;
    status?: QuestionRubricStatus;
    onClose: () => void;
    onChanged: () => void;
}) {
    const [record, setRecord] = useState<RubricSpecRecord | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [reparsing, setReparsing] = useState(false);

    useEffect(() => {
        rubricService.getSpec(examId, question.id)
            .then(setRecord)
            .catch((err) => setError(getErrorMessage(err, "The rubric couldn't be loaded")));
    }, [examId, question.id]);

    const reparse = async () => {
        setReparsing(true);
        setError(null);
        try {
            await rubricService.reparse(examId, question.id);
            onChanged();
            onClose();
        } catch (err) {
            setError(getErrorMessage(err, "The rubric couldn't be parsed again"));
            setReparsing(false);
        }
    };

    return (
        <Modal open title={`Rubric · ${question.label}`} onClose={onClose} size="lg" icon={<ScrollText size={18} />}
               description={<span className={styles.questionText}>{question.text} <span className={styles.marks}>({question.maxScore} marks)</span></span>}>
            {error && <InlineMessage kind="error" className={styles.topMessage}>{error}</InlineMessage>}
            {record === undefined && !error && (
                <div className={styles.loading} aria-busy="true">
                    <span className="sr-only" role="status">Loading…</span>
                    <span className={styles.skeleton} />
                    <span className={styles.skeleton} />
                    <span className={styles.skeleton} />
                </div>
            )}
            {record === null && (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><ScrollText size={22} /></span>
                    <p>
                        {status?.rubric_status === "pending" ? "The rubric is being parsed. Check back in a moment."
                            : status?.rubric_status === "error" ? `Parsing failed: ${status.rubric_error ?? "unknown error"}`
                            : "This rubric hasn't been parsed yet. It will be parsed when grading starts, or now:"}
                    </p>
                    <Button size="sm" variant="secondary" onClick={reparse} isLoading={reparsing} icon={<RotateCcw size={14} aria-hidden="true" />}>
                        Parse now
                    </Button>
                </div>
            )}
            {record && (
                <RubricEditor key={record.id} examId={examId} question={question} record={record} onReparse={reparse} reparsing={reparsing}
                              onSaved={(saved) => {
                                  setRecord(saved);
                                  onChanged();
                              }} />
            )}
        </Modal>
    );
}

function RubricEditor({ examId, question, record, onSaved, onReparse, reparsing }: {
    examId: string;
    question: QuestionInfo;
    record: RubricSpecRecord;
    onSaved: (record: RubricSpecRecord) => void;
    onReparse: () => Promise<void>;
    reparsing: boolean;
}) {
    const [kind, setKind] = useState<RubricKind>(record.spec.kind);
    const [subject, setSubject] = useState<Subject>(record.spec.subject);
    const [criteria, setCriteria] = useState<Criterion[]>(record.spec.criteria);
    const [notes, setNotes] = useState(record.spec.grading_notes ?? "");
    const [errors, setErrors] = useState<string[]>(record.status === "invalid" ? record.validation_errors : []);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const sum = criteria.reduce((total, c) => total + (Number(c.points) || 0), 0);
    const sumOk = Math.abs(sum - question.maxScore) < 1e-6;
    const update = (i: number, changes: Partial<Criterion>) => {
        setSaved(false);
        setCriteria(criteria.map((c, j) => (j === i ? { ...c, ...changes } : c)));
    };
    const add = () => {
        const used = new Set(criteria.map((c) => c.id));
        let n = criteria.length + 1;
        while (used.has(`c${n}`)) n += 1;
        setCriteria([...criteria, { id: `c${n}`, description: "", points: 0, expected_answer: null, notes: null }]);
    };

    const save = async () => {
        setSaving(true);
        setErrors([]);
        try {
            const result = await rubricService.saveSpec(examId, question.id, {
                kind, subject, grading_notes: notes.trim() || null,
                criteria: criteria.map((c) => ({ ...c, points: Number(c.points), expected_answer: c.expected_answer || null, notes: c.notes || null })),
            });
            setSaved(true);
            onSaved(result);
        } catch (err) {
            setErrors(getErrorMessage(err, "The rubric couldn't be saved").split("\n"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.form}>
            <p className={styles.version}>
                <span className={cn(styles.source, record.source === "teacher" && styles.sourceTeacher)}>
                    {record.source === "teacher" ? "Teacher edit" : "AI parsed"}
                </span>
                Version {record.version}{record.source !== "teacher" && record.model ? ` · ${record.model}` : ""}
                {record.spec.derived && " · derived from the question (no rubric text)"}
            </p>
            {record.spec.parser_warnings.length > 0 && (
                <div className={styles.warnings}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    <ul>
                        {record.spec.parser_warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}
            <div className={styles.row}>
                <label className={styles.field}>
                    <span>Kind</span>
                    <span className={styles.selectWrap}>
                        <select value={kind} onChange={(e) => setKind(e.target.value as RubricKind)} className={styles.select}>
                            <option value="criteria">Criteria (partial credit)</option>
                            <option value="pass_fail">Pass / fail (all or nothing)</option>
                        </select>
                        <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
                    </span>
                </label>
                <label className={styles.field}>
                    <span>Subject</span>
                    <span className={styles.selectWrap}>
                        <select value={subject} onChange={(e) => setSubject(e.target.value as Subject)} className={styles.select}>
                            {SUBJECTS.map((s) => <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>)}
                        </select>
                        <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
                    </span>
                </label>
                <p className={cn(styles.sum, sumOk ? styles.sumOk : styles.sumBad)} aria-live="polite">
                    {sumOk ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
                    <span>
                        Points <strong>{Number(sum.toFixed(2))} of {question.maxScore}</strong>
                        {!sumOk && <span className={styles.sumNote}> · must add up to the question&apos;s marks</span>}
                    </span>
                </p>
            </div>

            <ol className={styles.criteria} aria-label="Criteria">
                {criteria.map((c, i) => (
                    <li key={c.id} className={styles.criterion}>
                        <div className={styles.criterionHead}>
                            <span className={styles.criterionId}>{c.id}</span>
                            <button type="button" className={styles.iconButton} onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}
                                    aria-label={`Remove criterion ${c.id}`} title={criteria.length === 1 ? "A rubric needs at least one criterion" : "Remove criterion"}
                                    disabled={criteria.length === 1}>
                                <Trash2 size={15} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.criterionGrid}>
                            <label className={cn(styles.field, styles.wide)}>
                                <span>What earns the points</span>
                                <textarea rows={2} value={c.description} onChange={(e) => update(i, { description: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Expected answer</span>
                                <input type="text" value={c.expected_answer ?? ""} onChange={(e) => update(i, { expected_answer: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Points</span>
                                <input type="number" min={0} step={0.5} value={c.points} className={styles.points}
                                       onChange={(e) => update(i, { points: e.target.value === "" ? 0 : Number(e.target.value) })} />
                            </label>
                            <label className={cn(styles.field, styles.wide)}>
                                <span>Notes <span className={styles.optional}>(partial credit, accepted variants)</span></span>
                                <input type="text" value={c.notes ?? ""} onChange={(e) => update(i, { notes: e.target.value })} />
                            </label>
                        </div>
                    </li>
                ))}
            </ol>
            {kind === "criteria" && (
                <button type="button" className={styles.addButton} onClick={add}>
                    <Plus size={16} aria-hidden="true" /> Add a criterion
                </button>
            )}
            <label className={styles.field}>
                <span>Notes for the whole answer</span>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            {errors.length > 0 && (
                <div role="alert" className={styles.errors}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    <div>
                        <strong>This rubric can&apos;t be used yet:</strong>
                        <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                </div>
            )}

            <div className={styles.actions}>
                <Button variant="ghost" onClick={onReparse} isLoading={reparsing} icon={<RotateCcw size={14} aria-hidden="true" />}
                        title="Replaces the current version, including teacher edits">
                    Parse again with the model
                </Button>
                <div className={styles.saveGroup}>
                    {saved && <p className={styles.saved} role="status"><CheckCircle2 size={16} aria-hidden="true" /> Saved. New grading runs use this rubric.</p>}
                    <Button onClick={save} isLoading={saving} disabled={criteria.length === 0}>Save rubric</Button>
                </div>
            </div>
        </div>
    );
}

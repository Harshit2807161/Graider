"use client";

import React, { useEffect, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import styles from "@/components/features/review/review.module.css";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { rubricService } from "@/services/rubric.service";
import { Criterion, QuestionRubricStatus, RubricKind, RubricSpecRecord, Subject } from "@/types/review.types";
import local from "./RubricDialog.module.css";

const SUBJECTS: Subject[] = ["math", "science", "english", "history", "general"];

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

    useEffect(() => {
        rubricService.getSpec(examId, question.id)
            .then(setRecord)
            .catch((err) => setError(getErrorMessage(err, "The rubric couldn't be loaded")));
    }, [examId, question.id]);

    const reparse = async () => {
        await rubricService.reparse(examId, question.id);
        onChanged();
        onClose();
    };

    return (
        <Modal open title={`Rubric · ${question.label}`} onClose={onClose} size="lg"
               description={<span className={local.questionText}>{question.text} ({question.maxScore} marks)</span>}>
            {error && <p role="alert" className={styles.formError}>{error}</p>}
            {record === undefined && !error && <p className={styles.muted} aria-live="polite">Loading…</p>}
            {record === null && (
                <div className={local.empty}>
                    <p>
                        {status?.rubric_status === "pending" ? "The rubric is being parsed. Check back in a moment."
                            : status?.rubric_status === "error" ? `Parsing failed: ${status.rubric_error ?? "unknown error"}`
                            : "This rubric hasn't been parsed yet. It will be parsed when grading starts, or now:"}
                    </p>
                    <Button size="sm" variant="secondary" onClick={reparse} icon={<RotateCcw size={14} aria-hidden="true" />}>
                        Parse now
                    </Button>
                </div>
            )}
            {record && (
                <RubricEditor key={record.id} examId={examId} question={question} record={record} onReparse={reparse}
                              onSaved={(saved) => {
                                  setRecord(saved);
                                  onChanged();
                              }} />
            )}
        </Modal>
    );
}

function RubricEditor({ examId, question, record, onSaved, onReparse }: {
    examId: string;
    question: QuestionInfo;
    record: RubricSpecRecord;
    onSaved: (record: RubricSpecRecord) => void;
    onReparse: () => Promise<void>;
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
            <p className={styles.sectionNote}>
                Version {record.version} · {record.source === "teacher" ? "edited by a teacher" : `parsed by ${record.model ?? "the model"}`}
                {record.spec.derived && " · derived from the question (no rubric text)"}
            </p>
            {record.spec.parser_warnings.length > 0 && (
                <ul className={local.warnings}>
                    {record.spec.parser_warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
            )}
            <div className={local.row}>
                <label className={styles.field}>
                    <span>Kind</span>
                    <select value={kind} onChange={(e) => setKind(e.target.value as RubricKind)} className={local.select}>
                        <option value="criteria">Criteria (partial credit)</option>
                        <option value="pass_fail">Pass / fail (all or nothing)</option>
                    </select>
                </label>
                <label className={styles.field}>
                    <span>Subject</span>
                    <select value={subject} onChange={(e) => setSubject(e.target.value as Subject)} className={local.select}>
                        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </label>
                <p className={cn(local.sum, sumOk ? local.sumOk : local.sumBad)} aria-live="polite">
                    Points {Number(sum.toFixed(2))} of {question.maxScore}
                    {!sumOk && <span> · must add up to the question&apos;s marks</span>}
                </p>
            </div>

            <ol className={local.criteria}>
                {criteria.map((c, i) => (
                    <li key={c.id} className={local.criterion}>
                        <div className={local.criterionHead}>
                            <span className={styles.criterionId}>{c.id}</span>
                            <button type="button" className={styles.iconButton} onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}
                                    aria-label={`Remove criterion ${c.id}`} disabled={criteria.length === 1}>
                                <Trash2 size={15} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={local.criterionGrid}>
                            <label className={cn(styles.field, local.wide)}>
                                <span>What earns the points</span>
                                <textarea rows={2} value={c.description} onChange={(e) => update(i, { description: e.target.value })} />
                            </label>
                            <label className={styles.scoreField}>
                                <span>Points</span>
                                <input type="number" min={0} step={0.5} value={c.points}
                                       onChange={(e) => update(i, { points: e.target.value === "" ? 0 : Number(e.target.value) })} />
                            </label>
                            <label className={styles.noteField}>
                                <span>Expected answer</span>
                                <input type="text" value={c.expected_answer ?? ""} onChange={(e) => update(i, { expected_answer: e.target.value })} />
                            </label>
                            <label className={cn(styles.noteField, local.wide)}>
                                <span>Notes (partial credit, accepted variants)</span>
                                <input type="text" value={c.notes ?? ""} onChange={(e) => update(i, { notes: e.target.value })} />
                            </label>
                        </div>
                    </li>
                ))}
            </ol>
            {kind === "criteria" && (
                <button type="button" className={styles.linkButton} onClick={add}>
                    <Plus size={14} aria-hidden="true" /> Add a criterion
                </button>
            )}
            <label className={styles.field}>
                <span>Notes for the whole answer</span>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            {errors.length > 0 && (
                <div role="alert" className={local.errors}>
                    <strong>This rubric can&apos;t be used yet:</strong>
                    <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
            )}
            {saved && <p className={local.saved} role="status">Saved. New grading runs use this rubric.</p>}

            <div className={local.actions}>
                <Button variant="ghost" onClick={onReparse} icon={<RotateCcw size={14} aria-hidden="true" />}
                        title="Replaces the current version, including teacher edits">
                    Parse again with the model
                </Button>
                <Button onClick={save} isLoading={saving} disabled={criteria.length === 0}>Save rubric</Button>
            </div>
        </div>
    );
}

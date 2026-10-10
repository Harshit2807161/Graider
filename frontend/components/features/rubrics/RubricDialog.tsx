"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Plus, RotateCcw, ScrollText, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import InlineMessage from "@/components/ui/InlineMessage";
import { getErrorMessage } from "@/lib/api";
import { actionError } from "@/components/features/exams/actionError";
import { plainError } from "@/components/features/review/failure";
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
 *  edit it (same checks as a parsed one) or have the rubric text parsed again. */
export default function RubricDialog({ examId, question, status, onClose, onChanged, onDirtyChange }: {
    examId: string;
    question: QuestionInfo;
    status?: QuestionRubricStatus;
    onClose: () => void;
    onChanged: () => void;
    /** Told when the editor starts or stops having unsaved edits (the page warns before the tab closes) */
    onDirtyChange?: (dirty: boolean) => void;
}) {
    const [record, setRecord] = useState<RubricSpecRecord | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [reparsing, setReparsing] = useState(false);
    // A save makes a new version (a fresh editor): it still says "Saved"
    const [savedId, setSavedId] = useState<string | null>(null);
    // Closing with unsaved edits (X, Escape, a click outside) asks first, in the editor's action bar
    const [edited, setEdited] = useState(false);
    const [closeRequested, setCloseRequested] = useState(false);
    const requestClose = () => (edited ? setCloseRequested(true) : onClose());

    useEffect(() => {
        onDirtyChange?.(edited);
    }, [edited, onDirtyChange]);

    useEffect(() => {
        rubricService.getSpec(examId, question.id)
            .then(setRecord)
            .catch((err) => setError(actionError(err, "The rubric couldn't be loaded")));
    }, [examId, question.id]);

    const reparse = async () => {
        setReparsing(true);
        setError(null);
        try {
            await rubricService.reparse(examId, question.id);
            onChanged();
            onClose();
        } catch (err) {
            setError(actionError(err, "The rubric couldn't be parsed again"));
            setReparsing(false);
        }
    };

    return (
        <Modal open title={`Rubric · ${question.label}`} onClose={requestClose} size="lg" icon={<ScrollText size={18} />}
               description={<span className={styles.questionText}>{question.text}{" "}
                   <span className={styles.marks}>({question.maxScore} {question.maxScore === 1 ? "mark" : "marks"})</span></span>}>
            {error && <InlineMessage kind="error" className={styles.topMessage}>{error}</InlineMessage>}
            {record === undefined && !error && (
                <div className={styles.loading} aria-busy="true">
                    <span className="sr-only" role="status">Loading the rubric…</span>
                    <span className={styles.skeleton} />
                    <span className={styles.skeleton} />
                    <span className={styles.skeleton} />
                </div>
            )}
            {record === null && (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><ScrollText size={20} /></span>
                    <p>
                        {status?.rubric_status === "pending" ? "The rubric is being parsed. Check back in a moment."
                            : status?.rubric_status === "error" ? "The rubric couldn't be turned into criteria. Parse it again; if that fails too, check the rubric text."
                            : "This rubric hasn't been parsed yet. It will be parsed when grading starts, or now:"}
                    </p>
                    {/* What went wrong, for whoever looks into it: secondary to the sentence above */}
                    {status?.rubric_status === "error" && status.rubric_error && (
                        <p className={styles.errorDetail}>{status.rubric_error}</p>
                    )}
                    <Button size="sm" variant="secondary" onClick={reparse} isLoading={reparsing} icon={<RotateCcw size={16} aria-hidden="true" />}>
                        Parse now
                    </Button>
                </div>
            )}
            {record && (
                <RubricEditor key={record.id} examId={examId} question={question} record={record} onReparse={reparse} reparsing={reparsing}
                              justSaved={savedId === record.id} onEditedChange={setEdited}
                              closeRequested={closeRequested} onKeepEditing={() => setCloseRequested(false)} onDiscard={onClose}
                              onSaved={(saved) => {
                                  setSavedId(saved.id);
                                  setRecord(saved);
                                  onChanged();
                              }} />
            )}
        </Modal>
    );
}

function RubricEditor({ examId, question, record, onSaved, onReparse, reparsing, justSaved, onEditedChange, closeRequested, onKeepEditing, onDiscard }: {
    examId: string;
    question: QuestionInfo;
    record: RubricSpecRecord;
    onSaved: (record: RubricSpecRecord) => void;
    onReparse: () => Promise<void>;
    reparsing: boolean;
    /** This version was just saved from this dialog */
    justSaved: boolean;
    onEditedChange: (edited: boolean) => void;
    /** The dialog is being closed with unsaved edits: ask in the action bar */
    closeRequested: boolean;
    onKeepEditing: () => void;
    onDiscard: () => void;
}) {
    const [kind, setKind] = useState<RubricKind>(record.spec.kind);
    const [subject, setSubject] = useState<Subject>(record.spec.subject);
    const [criteria, setCriteria] = useState<Criterion[]>(record.spec.criteria);
    const [notes, setNotes] = useState(record.spec.grading_notes ?? "");
    const [errors, setErrors] = useState<string[]>(record.status === "invalid" ? record.validation_errors : []);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(justSaved);
    const [saveError, setSaveError] = useState<string | null>(null);
    // Parsing again replaces this version: asked first when that would lose a teacher's work
    const [confirmReparse, setConfirmReparse] = useState(false);
    const versionRowRef = useRef<HTMLDivElement>(null);
    const confirmBoxRef = useRef<HTMLDivElement>(null);
    const edited = kind !== record.spec.kind || subject !== record.spec.subject || notes !== (record.spec.grading_notes ?? "")
        || JSON.stringify(criteria) !== JSON.stringify(record.spec.criteria);
    const teacherVersion = record.source === "teacher";
    const actionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onEditedChange(edited);
    }, [edited, onEditedChange]);

    // The safe choice takes focus when the dialog asks before closing
    useEffect(() => {
        if (closeRequested) actionsRef.current?.querySelector<HTMLElement>("[data-keep]")?.focus();
    }, [closeRequested]);
    const keepEditing = () => {
        onKeepEditing();
        requestAnimationFrame(() => actionsRef.current?.querySelector<HTMLElement>("[data-save]")?.focus());
    };
    const askReparse = () => {
        if (!teacherVersion && !edited) {
            onReparse();
            return;
        }
        setConfirmReparse(true);
        requestAnimationFrame(() => confirmBoxRef.current?.querySelector<HTMLElement>("[data-confirm]")?.focus());
    };
    const keepVersion = () => {
        setConfirmReparse(false);
        requestAnimationFrame(() => versionRowRef.current?.querySelector<HTMLElement>("[data-reparse]")?.focus());
    };

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
        setSaveError(null);
        try {
            const result = await rubricService.saveSpec(examId, question.id, {
                kind, subject, grading_notes: notes.trim() || null,
                criteria: criteria.map((c) => ({ ...c, points: Number(c.points), expected_answer: c.expected_answer || null, notes: c.notes || null })),
            });
            setSaved(true);
            onSaved(result);
        } catch (err) {
            // The checks' findings are listed; anything else (e.g. no connection) is one plain sentence
            const detail = plainError(getErrorMessage(err, ""));
            if (detail) setErrors(detail.split("\n"));
            else setSaveError(actionError(err, "The rubric couldn't be saved"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.form}>
            <div ref={versionRowRef} className={styles.versionRow}>
                <p className={styles.version}>
                    <span className={cn(styles.source, record.source === "teacher" && styles.sourceTeacher)}>
                        {record.source === "teacher" ? "Teacher edit" : "AI parsed"}
                    </span>
                    Version {record.version}
                    {record.spec.derived && " · made from the question (it has no rubric text)"}
                </p>
                {/* A new version from the rubric text: it belongs with the version, away from Save */}
                <Button data-reparse variant="ghost" size="sm" onClick={askReparse} isLoading={reparsing && !confirmReparse}
                        icon={<RotateCcw size={16} aria-hidden="true" />} aria-expanded={confirmReparse}
                        title="Reads the rubric text again and replaces this version" className={styles.reparse}>
                    Parse again
                </Button>
            </div>
            {confirmReparse && (
                <div ref={confirmBoxRef} className={styles.confirm} role="group" aria-label="Parse the rubric again?">
                    <AlertTriangle size={16} aria-hidden="true" className={styles.confirmIcon} />
                    <p className={styles.confirmText}>
                        Parsing again replaces this version
                        {teacherVersion && edited ? ", including the edits saved in it and the changes you haven't saved."
                            : teacherVersion ? ", including the edits saved in it."
                            : " and drops the changes you haven't saved."}
                    </p>
                    <div className={styles.confirmActions}>
                        <Button size="sm" variant="secondary" onClick={keepVersion} disabled={reparsing}>Keep this version</Button>
                        <Button data-confirm size="sm" variant="outline" className={styles.destructive} onClick={onReparse}
                                isLoading={reparsing}>Replace this version</Button>
                    </div>
                </div>
            )}
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
            </div>

            <ol className={styles.criteria} aria-label="Criteria">
                {criteria.map((c, i) => (
                    <li key={c.id} className={styles.criterion}>
                        <button type="button" className={styles.iconButton} onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}
                                aria-label={`Remove criterion ${c.id}`} title={criteria.length === 1 ? "A rubric needs at least one criterion" : "Remove criterion"}
                                disabled={criteria.length === 1}>
                            <Trash2 size={16} aria-hidden="true" />
                        </button>
                        <div className={styles.criterionGrid}>
                            <label className={cn(styles.field, styles.wide)}>
                                {/* The criterion's id leads its first label (and names its fields apart) */}
                                <span className={styles.criterionLabel}><span className={styles.criterionId}>{c.id}</span> What earns the points</span>
                                <textarea rows={2} value={c.description} onChange={(e) => update(i, { description: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Expected answer<span className="sr-only"> for {c.id}</span></span>
                                <input type="text" value={c.expected_answer ?? ""} onChange={(e) => update(i, { expected_answer: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Points<span className="sr-only"> for {c.id}</span></span>
                                <input type="number" min={0} step={0.5} value={c.points} className={styles.points}
                                       onChange={(e) => update(i, { points: e.target.value === "" ? 0 : Number(e.target.value) })} />
                            </label>
                            <label className={cn(styles.field, styles.wide)}>
                                <span>Notes <span className={styles.optional}>(partial credit, accepted variants)</span><span className="sr-only"> for {c.id}</span></span>
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
            {saveError && <InlineMessage kind="error" onDismiss={() => setSaveError(null)}>{saveError}</InlineMessage>}

            {/* Sticky: the points total stays in view while editing any criterion */}
            <div ref={actionsRef} className={styles.actions}>
                {closeRequested ? (
                    <div className={styles.closeConfirm} role="group" aria-labelledby="rubric-close-question">
                        <p id="rubric-close-question" className={styles.closeText}>
                            <AlertTriangle size={16} aria-hidden="true" />
                            Close without saving? Your changes to this rubric will be lost.
                        </p>
                        <div className={styles.confirmActions}>
                            <Button data-keep variant="secondary" onClick={keepEditing}>Keep editing</Button>
                            <Button variant="outline" className={styles.destructive} onClick={onDiscard}>Discard changes</Button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.saveGroup}>
                        {saved && !edited && <p className={styles.saved} role="status"><CheckCircle2 size={16} aria-hidden="true" /> Saved. Answer sheets graded from now on use this rubric.</p>}
                        <p className={cn(styles.sum, sumOk ? styles.sumOk : styles.sumBad)} aria-live="polite">
                            {sumOk ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
                            <span>
                                Points <strong>{Number(sum.toFixed(2))} of {question.maxScore}</strong>
                                {!sumOk && <span className={styles.sumNote}> · must add up to the question&apos;s marks</span>}
                            </span>
                        </p>
                        <Button data-save onClick={save} isLoading={saving} disabled={criteria.length === 0}>Save rubric</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

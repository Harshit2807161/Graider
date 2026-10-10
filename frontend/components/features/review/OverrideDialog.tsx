"use client";

import React, { useState } from "react";
import { AlertCircle, Eraser, SlidersHorizontal } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getErrorMessage } from "@/lib/api";
import { CriterionScoreIn } from "@/services/review.service";
import { QuestionReview } from "@/types/review.types";
import { fmt, plural } from "./format";
import styles from "./dialogs.module.css";

/** "1 mark", "2 marks", as on the exam page. */
function marks(n: number): string {
    return plural(n, "mark", "marks");
}

/** Set every criterion's score for one answer, with a reason (kept in the audit trail). Open it
 *  with a `key` per answer so its fields start from that answer's current grade. */
export default function OverrideDialog({ q, onClose, onSubmit }: {
    q: QuestionReview;
    onClose: () => void;
    onSubmit: (criteria: CriterionScoreIn[], feedback: string, reason: string) => Promise<void>;
}) {
    const spec = q.rubric_spec?.spec;
    const criteria = spec?.criteria ?? [];
    const current = new Map((q.grade?.criteria ?? []).map((c) => [c.id, c]));
    const [scores, setScores] = useState<Record<string, string>>(() =>
        Object.fromEntries(criteria.map((c) => [c.id, current.has(c.id) ? String(current.get(c.id)?.score) : ""])));
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState(q.grade?.feedback ?? "");
    const [reason, setReason] = useState("");
    // A field shows its problem once the teacher has edited it and moved on (validate on blur)
    const [edited, setEdited] = useState<Set<string>>(new Set());
    const [touched, setTouched] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const problemOf = (id: string, max: number): string | null => {
        const raw = scores[id];
        const value = Number(raw);
        if (raw === "" || Number.isNaN(value)) return `Score ${id}.`;
        if (value < 0 || value > max) return `${id}: between 0 and ${max}.`;
        if (spec?.kind === "pass_fail" && value !== 0 && value !== max) return `${id}: 0 or ${max}.`;
        return null;
    };
    const problems = criteria.flatMap((c) => problemOf(c.id, c.points) ?? []);
    const total = criteria.reduce((sum, c) => sum + (Number(scores[c.id]) || 0), 0);
    const ready = problems.length === 0 && reason.trim().length > 0 && !saving;
    const missing = [...problems, ...(reason.trim() ? [] : ["Give a reason."])];
    const touch = (id: string) => setTouched((prev) => new Set(prev).add(id));
    const edit = (id: string) => setEdited((prev) => new Set(prev).add(id));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ready) return;
        setSaving(true);
        setError(null);
        try {
            await onSubmit(
                criteria.map((c) => ({ id: c.id, score: Number(scores[c.id]), justification: notes[c.id]?.trim() || undefined })),
                feedback, reason.trim(),
            );
        } catch (err) {
            setError(getErrorMessage(err, "The scores couldn't be saved"));
            setSaving(false);
        }
    };

    return (
        <Modal open title={`Change scores · ${q.label}`} onClose={onClose} size="lg"
               icon={<SlidersHorizontal size={18} aria-hidden="true" />}
               description="Your scores replace the current grade. The earlier version stays in the history."
               footer={
                   <>
                       <span className={styles.footerTotal} aria-live="polite">
                           Total <strong>{fmt(total)}</strong> / {fmt(q.max_score)}
                       </span>
                       <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
                       <Button type="submit" form="override-form" disabled={!ready} isLoading={saving}
                               aria-describedby={ready ? undefined : "override-missing"}>
                           Save scores
                       </Button>
                   </>
               }>
            <form id="override-form" onSubmit={submit} className={styles.form}>
                {criteria.length > 1 && (
                    <div className={styles.formTop}>
                        <span>{criteria.length} criteria · {marks(q.max_score)} in all</span>
                        <button type="button" className={styles.textButton}
                                onClick={() => {
                                    setScores(Object.fromEntries(criteria.map((c) => [c.id, "0"])));
                                    setTouched(new Set(criteria.map((c) => c.id)));
                                }}>
                            <Eraser size={16} aria-hidden="true" /> Set every criterion to 0
                        </button>
                    </div>
                )}
                <div className={styles.criteria}>
                    {criteria.map((c) => {
                        const id = `score-${c.id}`;
                        const problem = touched.has(c.id) ? problemOf(c.id, c.points) : null;
                        const now = current.get(c.id);
                        return (
                            <fieldset key={c.id} className={styles.criterion}>
                                <legend>
                                    <span><span className={styles.criterionId}>{c.id}</span>{c.description}</span>
                                    <span className={styles.points}>{marks(c.points)}</span>
                                </legend>
                                {c.expected_answer && <p className={styles.expected}><strong>Expected:</strong> {c.expected_answer}</p>}
                                <div className={styles.criterionInputs}>
                                    {spec?.kind === "pass_fail" ? (
                                        <div role="radiogroup" aria-label={`Score for ${c.id}`} className={styles.choices}>
                                            {[0, c.points].map((value) => (
                                                <label key={value} className={styles.choice}>
                                                    <input type="radio" name={id} checked={scores[c.id] === String(value)}
                                                           onChange={() => {
                                                               setScores({ ...scores, [c.id]: String(value) });
                                                               touch(c.id);
                                                           }} />
                                                    {value === 0 ? "Not met (0)" : `Met (${value})`}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.field}>
                                            <label htmlFor={id} className={styles.label}>Score</label>
                                            <div className={styles.scoreInput}>
                                                <input id={id} type="number" inputMode="decimal" min={0} max={c.points} step={0.5}
                                                       className={styles.input} value={scores[c.id]} required
                                                       aria-invalid={problem ? true : undefined}
                                                       aria-describedby={problem ? `${id}-error` : undefined}
                                                       onBlur={() => edited.has(c.id) && touch(c.id)}
                                                       onChange={(e) => {
                                                           setScores({ ...scores, [c.id]: e.target.value });
                                                           edit(c.id);
                                                       }} />
                                                <span className={styles.outOf} aria-hidden="true">/ {c.points}</span>
                                            </div>
                                            {problem && <p id={`${id}-error`} className={styles.fieldError}>{problem}</p>}
                                        </div>
                                    )}
                                    <div className={styles.field}>
                                        <label htmlFor={`${id}-note`} className={styles.label}>Note (optional)</label>
                                        <input id={`${id}-note`} type="text" className={styles.input} value={notes[c.id] ?? ""}
                                               placeholder={now?.justification ?? ""}
                                               onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} />
                                    </div>
                                </div>
                                {spec?.kind === "pass_fail" && problem && <p className={styles.fieldError}>{problem}</p>}
                            </fieldset>
                        );
                    })}
                </div>
                <div className={styles.field}>
                    <label htmlFor="override-feedback" className={styles.label}>Feedback to the student</label>
                    <textarea id="override-feedback" rows={3} className={styles.textarea} value={feedback}
                              onChange={(e) => setFeedback(e.target.value)} />
                </div>
                <div className={styles.field}>
                    <label htmlFor="override-reason" className={styles.label}>
                        Reason for the change <span className={styles.required} aria-hidden="true">*</span>
                    </label>
                    <textarea id="override-reason" rows={2} className={styles.textarea} value={reason} required
                              aria-describedby="override-reason-help" onChange={(e) => setReason(e.target.value)}
                              placeholder="e.g. Method correct; final answer misread." />
                    <p id="override-reason-help" className={styles.help}>Required. Kept in the audit trail.</p>
                </div>
                <p id="override-missing" className={styles.missing} aria-live="polite">
                    {missing.length > 0 && `To save: ${missing.join(" ")}`}
                </p>
                {error && (
                    <p role="alert" className={styles.formError}>
                        <AlertCircle size={16} aria-hidden="true" />
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}

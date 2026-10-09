"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { getErrorMessage } from "@/lib/api";
import { CriterionScoreIn } from "@/services/review.service";
import { QuestionReview } from "@/types/review.types";
import styles from "./review.module.css";

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
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const problems = criteria.flatMap((c) => {
        const raw = scores[c.id];
        const value = Number(raw);
        if (raw === "" || Number.isNaN(value)) return [`Score ${c.id}.`];
        if (value < 0 || value > c.points) return [`${c.id}: between 0 and ${c.points}.`];
        if (spec?.kind === "pass_fail" && value !== 0 && value !== c.points) return [`${c.id}: 0 or ${c.points}.`];
        return [];
    });
    const total = criteria.reduce((sum, c) => sum + (Number(scores[c.id]) || 0), 0);
    const ready = problems.length === 0 && reason.trim().length > 0 && !saving;

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
               description="Your scores replace the current grade. The earlier version stays in the history."
               footer={
                   <>
                       <span className={styles.footerTotal}>Total {Number(total.toFixed(2))} / {q.max_score}</span>
                       <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
                       <Button type="submit" form="override-form" disabled={!ready} isLoading={saving}>Save scores</Button>
                   </>
               }>
            <form id="override-form" onSubmit={submit} className={styles.form}>
                {criteria.length > 1 && (
                    <button type="button" className={styles.linkButton}
                            onClick={() => setScores(Object.fromEntries(criteria.map((c) => [c.id, "0"])))}>
                        Set every criterion to 0
                    </button>
                )}
                {criteria.map((c) => {
                    const id = `score-${c.id}`;
                    return (
                        <fieldset key={c.id} className={styles.criterionField}>
                            <legend>
                                <span className={styles.criterionId}>{c.id}</span> {c.description}{" "}
                                <span className={styles.muted}>({c.points} {c.points === 1 ? "point" : "points"})</span>
                            </legend>
                            {c.expected_answer && <p className={styles.sectionNote}>Expected: {c.expected_answer}</p>}
                            <div className={styles.criterionInputs}>
                                {spec?.kind === "pass_fail" ? (
                                    <div role="radiogroup" aria-label={`Score for ${c.id}`} className={styles.radios}>
                                        {[0, c.points].map((value) => (
                                            <label key={value}>
                                                <input type="radio" name={id} checked={scores[c.id] === String(value)}
                                                       onChange={() => setScores({ ...scores, [c.id]: String(value) })} />
                                                {value === 0 ? "Not met (0)" : `Met (${value})`}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <label className={styles.scoreField}>
                                        <span>Score</span>
                                        <input id={id} type="number" inputMode="decimal" min={0} max={c.points} step={0.5}
                                               value={scores[c.id]} required
                                               onChange={(e) => setScores({ ...scores, [c.id]: e.target.value })} />
                                    </label>
                                )}
                                <label className={styles.noteField}>
                                    <span>Note (optional)</span>
                                    <input type="text" value={notes[c.id] ?? ""} placeholder={current.get(c.id)?.justification ?? ""}
                                           onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} />
                                </label>
                            </div>
                        </fieldset>
                    );
                })}
                <label className={styles.field}>
                    <span>Feedback to the student</span>
                    <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                </label>
                <label className={styles.field}>
                    <span>Reason for the change <span aria-hidden="true">*</span></span>
                    <textarea rows={2} value={reason} required onChange={(e) => setReason(e.target.value)}
                              placeholder="Kept in the audit trail, e.g. “Method correct; final answer misread”." />
                </label>
                {problems.length > 0 && <p className={styles.formHint}>{problems.join(" ")}</p>}
                {error && <p role="alert" className={styles.formError}>{error}</p>}
            </form>
        </Modal>
    );
}

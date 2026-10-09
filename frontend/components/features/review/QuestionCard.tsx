"use client";

import React, { useState } from "react";
import { AlertTriangle, Bot, Check, FileText, Pencil, SlidersHorizontal, UserCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { AnswerGrade, QuestionReview, escalationText } from "@/types/review.types";
import ExaminerRounds from "./ExaminerRounds";
import HighlightedText from "./HighlightedText";
import styles from "./review.module.css";

/** What the teacher can do about each kind of escalation. */
const HINTS: Record<string, string> = {
    no_answer_found: "Check the pages. If the answer is there, correct the transcript; if it was left blank, set the scores.",
    rubric_invalid: "Fix this question's rubric on the exam page, then set the scores or regrade.",
    low_ocr_confidence: "Compare the transcript with the page: correct it if it was misread, otherwise accept the proposed score.",
    multiple_attempts: "The student answered more than once. Check which attempt should count.",
    check_failed: "The model's grade didn't pass the checks. Set the scores yourself.",
    all_models_failed: "No model could grade this answer. Set the scores yourself.",
    evaluator_disagreement: "The examiners still disagree after revising. Their positions are below.",
    spot_check: "A random check of a confident grade: accept it or change it.",
};

function hint(reason: string | null): string {
    if (!reason) return "";
    return HINTS[reason] ?? "Check the page and the transcript, then accept or change the score.";
}

function fmt(value: number | null | undefined): string {
    return value == null ? "–" : Number(value.toFixed(2)).toString();
}

function versionLine(grade: AnswerGrade): string {
    const who = grade.source === "teacher" ? "teacher" : "model";
    const what = grade.status === "escalated" ? `needs review (${escalationText(grade.escalation_reason).toLowerCase()})`
        : grade.status === "not_attempted" ? "not attempted" : "graded";
    return `v${grade.version} · ${who} · ${what} · ${fmt(grade.score)} / ${fmt(grade.max_score)}`;
}

interface QuestionCardProps {
    q: QuestionReview;
    canScore: boolean;
    canEditTranscript: boolean;
    busy: boolean;
    onResolve: (q: QuestionReview) => void;
    onOverride: (q: QuestionReview) => void;
    onEditTranscript: (q: QuestionReview) => void;
    onShowPage: (page: number) => void;
}

export default function QuestionCard({ q, canScore, canEditTranscript, busy, onResolve, onOverride, onEditTranscript, onShowPage }: QuestionCardProps) {
    const [activeCriterion, setActiveCriterion] = useState<string | null>(null);
    const grade = q.grade;
    const transcript = q.transcription;
    const escalated = grade?.status === "escalated";
    const notAttempted = grade?.status === "not_attempted";
    const specCriteria = q.rubric_spec?.spec.criteria ?? [];
    const describe = new Map(specCriteria.map((c) => [c.id, c]));
    const rows = grade?.criteria.length ? grade.criteria : [];
    const pages = [...new Set((transcript?.segments ?? []).map((s) => s.page).filter((p): p is number => p != null))];
    const quotes = rows.filter((c) => c.score > 0 && c.evidence).map((c) => ({ text: c.evidence as string, criterionId: c.id }));
    const titleId = `q-title-${q.question_id}`;

    return (
        <article id={`q-${q.question_id}`} tabIndex={-1} aria-labelledby={titleId}
                 className={cn(styles.card, escalated && styles.cardEscalated, notAttempted && styles.cardMuted)}>
            <header className={styles.cardHead}>
                <h3 id={titleId} className={styles.cardTitle}>
                    <span className={styles.qLabel}>{q.label}</span>
                    <span>{q.text}</span>
                </h3>
                <div className={styles.scoreBox} aria-label={`Score ${fmt(grade?.score)} out of ${fmt(q.max_score)}`}>
                    <strong>{fmt(grade?.score)}</strong>
                    <span>/ {fmt(q.max_score)}</span>
                </div>
            </header>

            <div className={styles.cardMeta}>
                {grade ? <StatusBadge status={grade.status} /> : <span className={styles.chip}>Not graded yet</span>}
                {grade?.source === "teacher" && (
                    <span className={styles.chip}><UserCheck size={14} aria-hidden="true" /> Teacher&apos;s decision</span>
                )}
                {grade && !grade.counted && !notAttempted && (
                    <span className={styles.chip}>Doesn&apos;t count: extra alternative</span>
                )}
                {grade?.fallback_used && <span className={styles.chip}><Bot size={14} aria-hidden="true" /> Graded by a fallback model</span>}
                {q.choice_group && <span className={styles.chip}>Choice group {q.choice_group}</span>}
            </div>

            {escalated && (
                <div className={styles.escalation} role="note">
                    <AlertTriangle size={16} aria-hidden="true" />
                    <div>
                        <strong>{escalationText(grade?.escalation_reason)}</strong>
                        <p>{hint(grade?.escalation_reason ?? null)}</p>
                    </div>
                </div>
            )}

            {notAttempted ? (
                <p className={styles.muted}>Not attempted: the student answered another alternative of this choice question.</p>
            ) : (
                <>
                    <section className={styles.section} aria-label={`Transcript of ${q.label}`}>
                        <div className={styles.sectionHead}>
                            <h4>Transcript</h4>
                            <span className={styles.sectionNote}>
                                {transcript?.source === "teacher" ? "Corrected by a teacher"
                                    : transcript?.confidence != null ? `Read by the model · confidence ${fmt(transcript.confidence)}` : ""}
                            </span>
                            {pages.map((p) => (
                                <button key={p} type="button" className={styles.linkButton} onClick={() => onShowPage(p)}>
                                    <FileText size={13} aria-hidden="true" /> Page {p}
                                </button>
                            ))}
                        </div>
                        {transcript?.text ? (
                            <pre className={styles.transcript}>
                                <HighlightedText text={transcript.text} quotes={quotes} activeCriterion={activeCriterion} />
                            </pre>
                        ) : (
                            <p className={styles.muted}>No answer was found for this question.</p>
                        )}
                    </section>

                    {rows.length > 0 ? (
                        <section className={styles.section} aria-label={`Criteria for ${q.label}`}>
                            <h4 className={styles.sectionTitle}>Criteria</h4>
                            <table className={styles.criteriaTable}>
                                <thead>
                                    <tr>
                                        <th scope="col">Criterion</th>
                                        <th scope="col" className={styles.num}>Score</th>
                                        <th scope="col">Evidence and reasoning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((c) => (
                                        <tr key={c.id} onMouseEnter={() => setActiveCriterion(c.id)} onMouseLeave={() => setActiveCriterion(null)}
                                            className={cn(activeCriterion === c.id && styles.rowActive)}>
                                            <th scope="row">
                                                <span className={styles.criterionId}>{c.id}</span>{" "}
                                                {describe.get(c.id)?.description ?? ""}
                                            </th>
                                            <td className={styles.num}>{fmt(c.score)} / {fmt(describe.get(c.id)?.points)}</td>
                                            <td>
                                                {c.evidence && <q className={styles.quote}>{c.evidence}</q>}
                                                {c.justification && <p className={styles.justification}>{c.justification}</p>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    ) : grade && !q.rubric_spec ? (
                        <p className={styles.muted}>This question has no rubric spec yet: fix the rubric on the exam page.</p>
                    ) : null}

                    {grade && grade.rounds.length > 0 && (
                        <details className={styles.details} open={grade.escalation_reason === "evaluator_disagreement"}>
                            <summary>Examiner discussion ({grade.rounds.length} {grade.rounds.length === 1 ? "round" : "rounds"})</summary>
                            <ExaminerRounds rounds={grade.rounds} criteria={specCriteria} />
                        </details>
                    )}

                    {grade?.feedback && (
                        <section className={styles.section}>
                            <h4 className={styles.sectionTitle}>Feedback to the student</h4>
                            <p className={styles.feedback}>{grade.feedback}</p>
                        </section>
                    )}
                    {grade?.override_reason && (
                        <p className={styles.sectionNote}>Teacher&apos;s reason: {grade.override_reason}</p>
                    )}
                </>
            )}

            {q.previous_grades.length > 0 && (
                <details className={styles.details}>
                    <summary>Earlier versions ({q.previous_grades.length})</summary>
                    <ul className={styles.history}>
                        {q.previous_grades.map((g) => (
                            <li key={g.id}>
                                <span>{versionLine(g)}</span>
                                <time dateTime={g.created_at}>{new Date(g.created_at).toLocaleString()}</time>
                                {g.override_reason && <span className={styles.sectionNote}>Reason: {g.override_reason}</span>}
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {(canScore || canEditTranscript) && grade && !notAttempted && (
                <div className={styles.cardActions}>
                    {canScore && escalated && grade.score != null && (
                        <Button size="sm" onClick={() => onResolve(q)} disabled={busy} icon={<Check size={14} aria-hidden="true" />}>
                            Accept {fmt(grade.score)} / {fmt(q.max_score)}
                        </Button>
                    )}
                    {canScore && (
                        <Button size="sm" variant="secondary" onClick={() => onOverride(q)} disabled={busy}
                                icon={<SlidersHorizontal size={14} aria-hidden="true" />}>
                            Change scores
                        </Button>
                    )}
                    {canEditTranscript && (
                        <Button size="sm" variant="ghost" onClick={() => onEditTranscript(q)} disabled={busy}
                                icon={<Pencil size={14} aria-hidden="true" />}>
                            Correct transcript
                        </Button>
                    )}
                </div>
            )}
        </article>
    );
}

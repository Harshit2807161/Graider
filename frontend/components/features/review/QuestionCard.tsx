"use client";

import React, { useRef, useState } from "react";
import { AlertTriangle, Bot, Check, ChevronRight, FileText, History, MessagesSquare, Pencil, SlidersHorizontal, UserCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { AnswerGrade, QuestionReview, escalationText } from "@/types/review.types";
import ExaminerRounds from "./ExaminerRounds";
import HighlightedText from "./HighlightedText";
import { fmt, percent, plural } from "./format";
import styles from "./QuestionCard.module.css";

/** What the teacher can do about each kind of escalation. */
const HINTS: Record<string, string> = {
    no_answer_found: "Check the pages. If the answer is there, correct the transcript; if it was left blank, set the scores.",
    rubric_invalid: "Fix this question's rubric on the exam page, then set the scores or regrade.",
    low_ocr_confidence: "Compare the transcript with the page: correct it if it was misread, otherwise accept the proposed score.",
    multiple_attempts: "The student answered more than once. Check which attempt should count.",
    check_failed: "The AI's grade didn't pass the checks. Set the scores yourself.",
    evidence_not_found: "The AI's quotes weren't found in the transcript. Check its evidence against the page, then accept or change the score.",
    all_models_failed: "The AI couldn't grade this answer. Set the scores yourself.",
    evaluator_disagreement: "The examiners still disagree after revising. Their positions are below.",
    spot_check: "A random check of a confident grade: accept it or change it.",
};

function hint(reason: string | null): string {
    if (!reason) return "";
    return HINTS[reason] ?? "Check the page and the transcript, then accept or change the score.";
}

function when(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function versionStatus(grade: AnswerGrade): string {
    return grade.status === "escalated" ? `Needs review: ${escalationText(grade.escalation_reason).toLowerCase()}`
        : grade.status === "not_attempted" ? "Not attempted" : "Graded";
}

interface QuestionCardProps {
    q: QuestionReview;
    canScore: boolean;
    canEditTranscript: boolean;
    busy: boolean;
    /** The page the viewer shows, to mark this answer's page buttons */
    currentPage?: number;
    /** Writing not matched to a question exists: a missing answer may be in it */
    hasUnplaced?: boolean;
    /** Shown instead of the transcript while the answer has no grade and nothing was read */
    ungradedText?: string;
    onResolve: (q: QuestionReview) => void;
    onOverride: (q: QuestionReview) => void;
    onEditTranscript: (q: QuestionReview) => void;
    onShowPage: (page: number) => void;
}

export default function QuestionCard({
    q, canScore, canEditTranscript, busy, currentPage, hasUnplaced = false, ungradedText = "Not graded yet.",
    onResolve, onOverride, onEditTranscript, onShowPage,
}: QuestionCardProps) {
    // Pointing at a criterion (mouse) or tabbing to its quote previews the quote in the transcript;
    // selecting the quote (click, tap, Enter) keeps it highlighted until it is selected again
    const [hovered, setHovered] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    const activeCriterion = hovered ?? pinned;
    const transcriptRef = useRef<HTMLPreElement>(null);
    const togglePin = (id: string) => {
        setHovered(null);
        if (pinned === id) return setPinned(null);
        setPinned(id);
        // On a phone the transcript is often above the screen: bring the quote into view
        requestAnimationFrame(() => {
            const mark = transcriptRef.current?.querySelector<HTMLElement>(`mark[data-criteria~="${CSS.escape(id)}"]`);
            const box = mark?.getBoundingClientRect();
            if (!mark || !box || (box.top >= 72 && box.bottom <= window.innerHeight)) return;
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            mark.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
        });
    };
    const grade = q.grade;
    const transcript = q.transcription;
    const escalated = grade?.status === "escalated";
    const notAttempted = grade?.status === "not_attempted";
    const specCriteria = q.rubric_spec?.spec.criteria ?? [];
    const describe = new Map(specCriteria.map((c) => [c.id, c]));
    const rows = grade?.criteria.length ? grade.criteria : [];
    const pages = [...new Set((transcript?.segments ?? []).map((s) => s.page).filter((p): p is number => p != null))];
    const quotes = rows.filter((c) => c.score > 0 && c.evidence).map((c) => ({ text: c.evidence as string, criterionId: c.id }));
    const quoted = new Set(quotes.map((x) => x.criterionId));
    const titleId = `q-title-${q.question_id}`;
    const lastRound = grade?.rounds[grade.rounds.length - 1];
    const unread = !grade && !transcript;

    // One clear next step for an answer that needs review
    const canAccept = canScore && escalated && grade?.score != null;
    const transcriptFirst = escalated && grade?.escalation_reason === "no_answer_found" && hasUnplaced;
    const primary: "accept" | "scores" | "transcript" | null = !escalated ? null
        : canAccept ? "accept"
        : transcriptFirst && canEditTranscript ? "transcript"
        : canScore ? "scores" : null;

    return (
        <article id={`q-${q.question_id}`} tabIndex={-1} aria-labelledby={titleId}
                 className={cn(styles.card, escalated && styles.escalated, notAttempted && styles.muted)}>
            <header className={styles.head}>
                <span className={styles.labelTile} aria-hidden="true">{q.label}</span>
                <div className={styles.headMain}>
                    <h3 id={titleId} className={styles.title}><span className="sr-only">{q.label}: </span>{q.text}</h3>
                    <div className={styles.meta}>
                        {grade ? <StatusBadge status={grade.status} /> : <StatusBadge status="PENDING" label="Not graded yet" />}
                        {grade?.source === "teacher" && (
                            <span className={cn(styles.chip, styles.chipTeacher)}><UserCheck size={14} aria-hidden="true" /> Teacher&apos;s decision</span>
                        )}
                        {grade && !grade.counted && !notAttempted && (
                            <span className={styles.chip}>Doesn&apos;t count: extra alternative</span>
                        )}
                        {grade?.fallback_used && <span className={styles.chip}><Bot size={14} aria-hidden="true" /> Graded by the backup AI</span>}
                        {q.choice_group && <span className={styles.chip}>Choice group {q.choice_group}</span>}
                    </div>
                </div>
                <p className={styles.score}>
                    <span className={styles.scoreLabel}>Score</span>
                    <span className={styles.scoreValue}>
                        <strong>{fmt(grade?.score)}</strong> / {fmt(q.max_score)}
                    </span>
                </p>
            </header>

            <div className={styles.body}>
                {escalated && (
                    <div className={styles.callout} role="note">
                        <AlertTriangle size={18} aria-hidden="true" />
                        <div>
                            <p className={styles.calloutTitle}>{escalationText(grade?.escalation_reason)}</p>
                            <p className={styles.calloutText}>
                                {hint(grade?.escalation_reason ?? null)}
                                {transcriptFirst && " Some writing on the pages wasn't matched to a question: it may be this answer."}
                            </p>
                        </div>
                    </div>
                )}

                {notAttempted ? (
                    <p className={styles.empty}>Not attempted: the student answered another alternative of this choice question.</p>
                ) : unread ? (
                    <p className={styles.empty}>{ungradedText}</p>
                ) : (
                    <>
                        <section className={styles.section} aria-labelledby={`${titleId}-transcript`}>
                            <div className={styles.sectionHead}>
                                <h4 id={`${titleId}-transcript`} className={styles.sectionTitle}>Transcript</h4>
                                <span className={styles.sectionMeta}>
                                    {transcript?.source === "teacher" ? "Corrected by a teacher"
                                        : transcript?.confidence != null ? `Read by AI · confidence ${percent(transcript.confidence)}` : ""}
                                </span>
                                {pages.length > 0 && (
                                    <span className={styles.pageButtons}>
                                        {pages.map((p) => (
                                            <button key={p} type="button" onClick={() => onShowPage(p)}
                                                    className={cn(styles.pageButton, p === currentPage && styles.pageButtonShown)}
                                                    aria-current={p === currentPage ? "true" : undefined}>
                                                <FileText size={14} aria-hidden="true" /> Page {p}
                                                {p === currentPage && <span className="sr-only"> (shown)</span>}
                                            </button>
                                        ))}
                                    </span>
                                )}
                            </div>
                            {transcript?.text ? (
                                <pre ref={transcriptRef} className={cn(styles.transcript, activeCriterion && quoted.has(activeCriterion) && styles.focusing)}>
                                    <HighlightedText text={transcript.text} quotes={quotes} activeCriterion={activeCriterion} />
                                </pre>
                            ) : (
                                <p className={styles.emptyBox}>No answer was found for this question.</p>
                            )}
                        </section>

                        {rows.length > 0 ? (
                            <section className={styles.section} aria-labelledby={`${titleId}-criteria`}>
                                <div className={styles.sectionHead}>
                                    <h4 id={`${titleId}-criteria`} className={styles.sectionTitle}>Criteria</h4>
                                    {quotes.length > 0 && <span className={styles.sectionMeta}>Select a quote to find it in the transcript</span>}
                                </div>
                                <ul className={styles.criteria}>
                                    {rows.map((c) => {
                                        const points = describe.get(c.id)?.points;
                                        const share = points ? Math.max(0, Math.min(1, c.score / points)) : 0;
                                        return (
                                            <li key={c.id} className={cn(styles.criterion, activeCriterion === c.id && styles.criterionActive)}
                                                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(c.id)}
                                                onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(null)}>
                                                <p className={styles.criterionName}>
                                                    <span className={styles.criterionId}>{c.id}</span>
                                                    {describe.get(c.id)?.description ?? ""}
                                                </p>
                                                <p className={cn(styles.criterionScore,
                                                    share >= 1 ? styles.scoreFull : share > 0 ? styles.scorePartial : styles.scoreZero)}>
                                                    <span className="sr-only">Score </span>
                                                    {fmt(c.score)} / {fmt(points)}
                                                </p>
                                                {(c.evidence || c.justification) && (
                                                    <div className={styles.criterionDetail}>
                                                        {c.evidence && (quoted.has(c.id) ? (
                                                            <button type="button" className={styles.quote} aria-pressed={pinned === c.id}
                                                                    title="Highlight in the transcript"
                                                                    onClick={() => togglePin(c.id)}
                                                                    onFocus={(e) => e.currentTarget.matches(":focus-visible") && setHovered(c.id)}
                                                                    onBlur={() => setHovered(null)}>
                                                                <span className="sr-only">Highlight in the transcript: {c.evidence}</span>
                                                                <span aria-hidden="true">&quot;{c.evidence}&quot;</span>
                                                            </button>
                                                        ) : (
                                                            <q className={cn(styles.quote, styles.quoteStatic)}>{c.evidence}</q>
                                                        ))}
                                                        {c.justification && <p className={styles.justification}>{c.justification}</p>}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ) : grade && !q.rubric_spec ? (
                            <p className={styles.emptyBox}>This question&apos;s rubric isn&apos;t ready yet: fix it on the exam page.</p>
                        ) : null}

                        {grade && grade.rounds.length > 0 && (
                            <details className={styles.disclosure} open={grade.escalation_reason === "evaluator_disagreement"}>
                                <summary>
                                    <MessagesSquare size={16} aria-hidden="true" className={styles.summaryIcon} />
                                    <span className={styles.summaryText}>
                                        Examiner discussion{" "}
                                        <span className={styles.summaryMeta}>
                                            · {plural(grade.rounds.length, "round", "rounds")}
                                            {lastRound && ` · agreement ${percent(lastRound.effective_agreement)}`}
                                        </span>
                                    </span>
                                    <ChevronRight size={16} aria-hidden="true" className={styles.chevron} />
                                </summary>
                                <div className={styles.disclosureBody}>
                                    <ExaminerRounds rounds={grade.rounds} criteria={specCriteria} />
                                </div>
                            </details>
                        )}

                        {(grade?.feedback || grade?.override_reason) && (
                            <section className={styles.section} aria-labelledby={`${titleId}-feedback`}>
                                <div className={styles.sectionHead}>
                                    <h4 id={`${titleId}-feedback`} className={styles.sectionTitle}>Feedback to the student</h4>
                                </div>
                                {grade?.feedback ? <p className={styles.feedback}>{grade.feedback}</p> : <p className={styles.empty}>No feedback.</p>}
                                {grade?.override_reason && (
                                    <p className={styles.reason}>
                                        <UserCheck size={16} aria-hidden="true" />
                                        <span><strong>Teacher&apos;s reason:</strong> {grade.override_reason}</span>
                                    </p>
                                )}
                            </section>
                        )}
                    </>
                )}

                {q.previous_grades.length > 0 && (
                    <details className={styles.disclosure}>
                        <summary>
                            <History size={16} aria-hidden="true" className={styles.summaryIcon} />
                            <span className={styles.summaryText}>
                                Earlier versions <span className={styles.count}>{q.previous_grades.length}</span>
                            </span>
                            <ChevronRight size={16} aria-hidden="true" className={styles.chevron} />
                        </summary>
                        <div className={styles.disclosureBody}>
                            <ul className={styles.versions}>
                                {q.previous_grades.map((g) => (
                                    <li key={g.id} className={styles.version}>
                                        <p className={styles.versionHead}>
                                            <span className={styles.versionTag}>v{g.version}</span>
                                            <span>{g.source === "teacher" ? "Teacher" : "AI"} · {versionStatus(g)}</span>
                                            <span className={styles.versionScore}>{fmt(g.score)} / {fmt(g.max_score)}</span>
                                        </p>
                                        <time className={styles.versionTime} dateTime={g.created_at}>{when(g.created_at)}</time>
                                        {g.override_reason && (
                                            <p className={styles.reason}>
                                                <UserCheck size={16} aria-hidden="true" />
                                                <span><strong>Reason:</strong> {g.override_reason}</span>
                                            </p>
                                        )}
                                        {g.rounds.length > 0 && (
                                            <details className={styles.nested}>
                                                <summary>
                                                    <MessagesSquare size={16} aria-hidden="true" className={styles.summaryIcon} />
                                                    <span className={styles.summaryText}>
                                                        Examiner discussion{" "}
                                                        <span className={styles.summaryMeta}>
                                                            · {plural(g.rounds.length, "round", "rounds")}
                                                            {` · agreement ${percent(g.rounds[g.rounds.length - 1].effective_agreement)}`}
                                                        </span>
                                                    </span>
                                                    <ChevronRight size={16} aria-hidden="true" className={styles.chevron} />
                                                </summary>
                                                <div><ExaminerRounds rounds={g.rounds} criteria={specCriteria} /></div>
                                            </details>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </details>
                )}
            </div>

            {(canScore || canEditTranscript) && grade && !notAttempted && (
                <div className={styles.footer}>
                    {canAccept && (
                        <Button size="sm" onClick={() => onResolve(q)} disabled={busy} icon={<Check size={16} aria-hidden="true" />}>
                            Accept {fmt(grade.score)} / {fmt(q.max_score)}
                        </Button>
                    )}
                    {primary === "transcript" && (
                        <Button size="sm" onClick={() => onEditTranscript(q)} disabled={busy} icon={<Pencil size={16} aria-hidden="true" />}>
                            Correct transcript
                        </Button>
                    )}
                    {canScore && (
                        <Button size="sm" variant={primary === "scores" ? "primary" : "secondary"} onClick={() => onOverride(q)} disabled={busy}
                                icon={<SlidersHorizontal size={16} aria-hidden="true" />}>
                            Change scores
                        </Button>
                    )}
                    {canEditTranscript && primary !== "transcript" && (
                        <Button size="sm" variant="ghost" onClick={() => onEditTranscript(q)} disabled={busy}
                                icon={<Pencil size={16} aria-hidden="true" />}>
                            Correct transcript
                        </Button>
                    )}
                </div>
            )}
        </article>
    );
}

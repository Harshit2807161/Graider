import React, { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowRight, Check, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionSync, Submission, SubmissionStatus } from "@/types/exam.types";
import { QuestionRubricStatus } from "@/types/review.types";
import styles from "./ExamProgress.module.css";

/** done: nothing left in this step · active: something here for the teacher, or grading running ·
 *  upcoming: nothing to do yet */
type StepState = "done" | "active" | "upcoming";
type HintTone = "ok" | "warn" | "busy" | "plain";

interface Step {
    title: string;
    /** The step's number ("4 of 5 graded"), or null before there is anything to count */
    value: { number: number; unit: string } | null;
    /** What the step is about, shown instead of a number while it's empty */
    about: string;
    hint: ReactNode;
    tone: HintTone;
    state: StepState;
    /** Where to act on this step, when it needs the teacher: a link, or a button (onClick) */
    action?: { label: string; href?: string; onClick?: () => void };
}

const IN_PROGRESS: SubmissionStatus[] = ["PENDING", "PROCESSING"];

function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

function fmt(n: number): string {
    return Number(n.toFixed(1)).toString();
}

/** The exam's workflow at a glance: questions & rubrics → grade answer sheets → review → publish.
 *  Answer sheets move through the steps one by one, so several steps can need the teacher at once;
 *  each step counts sheets the same way ("x of N") and links to where to act. Before there is
 *  anything to count, each step says what it's for, so a new exam reads as a short guide. */
export default function ExamProgress({ examId, questions, dirty, rubrics, submissions, sheetsLoading, questionsAnchor, sheetsAnchor, onPublish }: {
    examId: string;
    questions: QuestionSync[];
    dirty: boolean;
    rubrics: QuestionRubricStatus[];
    submissions: Submission[];
    /** The answer sheets haven't arrived yet: steps 2-4 wait instead of guessing */
    sheetsLoading: boolean;
    questionsAnchor: string;
    sheetsAnchor: string;
    /** Opens the publish confirmation (the same as the header's "Publish approved") */
    onPublish: () => void;
}) {
    const n = submissions.length;
    const count = (s: SubmissionStatus) => submissions.filter((x) => x.status === s).length;
    const inProgress = submissions.filter((s) => IN_PROGRESS.includes(s.status)).length;
    const failed = count("FAILED");
    const review = count("NEEDS_REVIEW");
    const graded = count("GRADED");
    const approved = count("APPROVED");
    const published = count("PUBLISHED");
    const scored = submissions.filter((s) => !IN_PROGRESS.includes(s.status) && s.status !== "FAILED"
        && s.total_score != null && s.max_score);
    const avg = scored.length > 0 ? scored.reduce((t, s) => t + (s.total_score as number), 0) / scored.length : null;
    const avgMax = scored.length > 0 ? scored[0].max_score as number : null;

    const rubricCount = (status: QuestionRubricStatus["rubric_status"]) => rubrics.filter((r) => r.rubric_status === status).length;
    const broken = rubricCount("invalid") + rubricCount("error");
    const parsing = rubricCount("pending");
    const notParsed = rubricCount("missing");
    const questionsReady = questions.length > 0 && !dirty && broken === 0 && parsing === 0;

    const questionsHint: [ReactNode, HintTone] =
        questions.length === 0 ? ["Start here: add them, or import from Excel", "plain"]
        : dirty ? ["Unsaved changes", "warn"]
        : broken > 0 ? [`${plural(broken, "rubric needs", "rubrics need")} fixing`, "warn"]
        : parsing > 0 ? [`Parsing ${plural(parsing, "rubric", "rubrics")}…`, "busy"]
        : notParsed > 0 ? [`${plural(notParsed, "rubric", "rubrics")} parsed when grading starts`, "plain"]
        : ["All rubrics ready", "ok"];

    const gradingHint: [ReactNode, HintTone] =
        inProgress > 0 ? [`Grading ${plural(inProgress, "answer sheet", "answer sheets")}…`, "busy"]
        : failed > 0 ? [`${failed} couldn't be graded`, "warn"]
        : avg != null && avgMax ? [<>Average <strong>{fmt(avg)} / {fmt(avgMax)}</strong> ({Math.round((avg / avgMax) * 100)}%)</>, "plain"]
        : ["Nothing graded yet", "plain"];

    const reviewParts = [review > 0 && `${review} to review`, graded > 0 && `${graded} to approve`].filter(Boolean);
    const reviewDone = n > 0 && review === 0 && graded === 0 && inProgress === 0 && failed === 0;
    const publishDone = n > 0 && published === n;

    const steps: Step[] = [
        {
            title: "Questions",
            value: questions.length > 0 ? { number: questions.length, unit: questions.length === 1 ? "question" : "questions" } : null,
            about: "Add the questions and how you mark them",
            hint: questionsHint[0], tone: questionsHint[1],
            state: questionsReady ? "done" : "active",
            action: !questionsReady && parsing === 0 ? { label: questions.length === 0 ? "Add questions" : dirty ? "Save the list" : "Fix rubrics", href: `#${questionsAnchor}` } : undefined,
        },
        {
            title: "Grading",
            value: n > 0 ? { number: n - inProgress - failed, unit: `of ${n} graded` } : null,
            about: "Upload each student's answer sheet; the AI reads and grades it",
            hint: gradingHint[0], tone: gradingHint[1],
            state: n > 0 && inProgress === 0 && failed === 0 ? "done"
                : inProgress > 0 || failed > 0 || (n === 0 && questionsReady) ? "active" : "upcoming",
            action: failed > 0 && inProgress === 0 ? { label: "See failed sheet", href: `#${sheetsAnchor}` }
                : n === 0 && questionsReady ? { label: "Upload a sheet", href: `#${sheetsAnchor}` } : undefined,
        },
        {
            title: "Review",
            value: n > 0 ? { number: approved + published, unit: `of ${n} approved` } : null,
            about: "Check what the AI couldn't settle, then approve each sheet",
            hint: reviewParts.length > 0 ? reviewParts.join(" · ") : reviewDone ? "Nothing waiting" : "Graded sheets wait here for you",
            tone: reviewParts.length > 0 ? "warn" : reviewDone ? "ok" : "plain",
            state: reviewDone ? "done" : reviewParts.length > 0 ? "active" : "upcoming",
            action: reviewParts.length > 0 ? { label: "Review sheets", href: `/dashboard/exams/${examId}/review` } : undefined,
        },
        {
            title: "Publish",
            value: n > 0 ? { number: published, unit: `of ${n} published` } : null,
            about: "Publish approved results to students",
            hint: approved > 0 ? `${approved} approved, ready to publish` : publishDone ? "All results published" : "Approved sheets can be published",
            tone: publishDone ? "ok" : "plain",
            state: publishDone ? "done" : approved > 0 ? "active" : "upcoming",
            action: approved > 0 ? { label: "Publish", onClick: onPublish } : undefined,
        },
    ];
    if (sheetsLoading) {
        for (const step of steps.slice(1)) Object.assign(step, { state: "upcoming", action: undefined });
    }
    const currentIndex = steps.findIndex((s) => s.state === "active");
    const stateLabel: Record<StepState, string> = { done: "done", active: "needs you", upcoming: "not started" };

    return (
        <section className={styles.card} aria-label="Progress" aria-busy={sheetsLoading || undefined}>
            <ol className={styles.steps}>
                {steps.map((step, i) => {
                    const busy = step.tone === "busy" && step.state === "active";
                    return (
                        <li key={step.title} className={cn(styles.step, styles[step.state])}
                            aria-current={i === currentIndex ? "step" : undefined}>
                            <div className={styles.track} aria-hidden="true">
                                <span className={styles.marker}>
                                    {step.state === "done" ? <Check size={14} strokeWidth={3} /> : i + 1}
                                </span>
                                <span className={styles.line} />
                            </div>
                            <p className={styles.title}>
                                {step.title}
                                <span className="sr-only"> ({busy ? "in progress" : stateLabel[step.state]})</span>
                            </p>
                            {sheetsLoading && i > 0 ? (
                                <span className={styles.skeleton} aria-hidden="true" />
                            ) : step.value ? (
                                <p className={styles.value}>
                                    <span className={styles.number}>{step.value.number}</span> <span className={styles.unit}>{step.value.unit}</span>
                                </p>
                            ) : (
                                <p className={styles.about}>{step.about}</p>
                            )}
                            {step.value && !(sheetsLoading && i > 0) && (
                                <p className={cn(styles.hint, styles[`hint_${step.tone}`])}>
                                    {step.tone === "ok" && <CheckCircle2 size={16} aria-hidden="true" />}
                                    {step.tone === "warn" && <AlertTriangle size={16} aria-hidden="true" />}
                                    {step.tone === "busy" && <Loader2 size={16} className={styles.spin} aria-hidden="true" />}
                                    <span>{step.hint}</span>
                                </p>
                            )}
                            {step.action && <StepAction {...step.action} />}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

/** A step's call to action: an in-page anchor (arrow down: it jumps to the section below), a page
 *  link or a button (arrow right). Text links, so the page header keeps the only primary button. */
function StepAction({ label, href, onClick }: { label: string; href?: string; onClick?: () => void }) {
    const inPage = href?.startsWith("#");
    const content = <>{label}{inPage ? <ArrowDown size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}</>;
    if (onClick) return <button type="button" className={styles.action} onClick={onClick}>{content}</button>;
    if (inPage) return <a href={href} className={cn(styles.action, styles.actionDown)}>{content}</a>;
    return <Link href={href ?? "#"} className={styles.action}>{content}</Link>;
}

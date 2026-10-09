import React, { ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionSync, Submission, SubmissionStatus } from "@/types/exam.types";
import { QuestionRubricStatus } from "@/types/review.types";
import styles from "./ExamProgress.module.css";

type StepState = "done" | "current" | "todo";
type HintTone = "ok" | "warn" | "busy" | "plain";

interface Step {
    title: string;
    value: number | string;
    unit: string;
    hint: ReactNode;
    tone: HintTone;
    complete: boolean;
}

const IN_PROGRESS: SubmissionStatus[] = ["PENDING", "PROCESSING"];

function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

function fmt(n: number): string {
    return Number(n.toFixed(1)).toString();
}

/** The exam's workflow at a glance: questions & rubrics → grade answer sheets → review → publish,
 *  each step with its key number. The first unfinished step is the current one. */
export default function ExamProgress({ questions, dirty, rubrics, submissions }: {
    questions: QuestionSync[];
    dirty: boolean;
    rubrics: QuestionRubricStatus[];
    submissions: Submission[];
}) {
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

    const questionsHint: [ReactNode, HintTone] =
        questions.length === 0 ? ["Add questions or import them from Excel", "plain"]
        : dirty ? ["Unsaved changes", "warn"]
        : broken > 0 ? [`${plural(broken, "rubric needs", "rubrics need")} fixing`, "warn"]
        : parsing > 0 ? [`Parsing ${plural(parsing, "rubric", "rubrics")}…`, "busy"]
        : notParsed > 0 ? [`${plural(notParsed, "rubric", "rubrics")} parsed when grading starts`, "plain"]
        : ["All rubrics ready", "ok"];

    const gradingHint: [ReactNode, HintTone] =
        inProgress > 0 ? [`Grading ${plural(inProgress, "answer sheet", "answer sheets")}…`, "busy"]
        : failed > 0 ? [`${failed} failed to grade`, "warn"]
        : avg != null && avgMax ? [<>Average <strong>{fmt(avg)} / {fmt(avgMax)}</strong> ({Math.round((avg / avgMax) * 100)}%)</>, "plain"]
        : ["Upload one student's answers at a time", "plain"];

    const steps: Step[] = [
        {
            title: "Questions", value: questions.length, unit: questions.length === 1 ? "question" : "questions",
            hint: questionsHint[0], tone: questionsHint[1],
            complete: questions.length > 0 && !dirty && broken === 0 && parsing === 0,
        },
        {
            title: "Grading", value: submissions.length - inProgress - failed,
            unit: `of ${submissions.length} graded`,
            hint: gradingHint[0], tone: gradingHint[1],
            complete: submissions.length > 0 && inProgress === 0 && failed === 0,
        },
        {
            title: "Review", value: review, unit: review === 1 ? "needs review" : "need review",
            hint: graded > 0 ? `${graded} graded, ready to approve` : review > 0 ? "Open the review queue" : submissions.length > 0 ? "Nothing waiting" : "Escalated answers land here",
            tone: review === 0 && graded === 0 && submissions.length > 0 ? "ok" : "plain",
            complete: submissions.length > 0 && review === 0 && graded === 0 && inProgress === 0,
        },
        {
            title: "Publish", value: published, unit: "published",
            hint: approved > 0 ? `${approved} approved, ready to publish` : "Approve answer sheets to publish them",
            tone: "plain",
            complete: submissions.length > 0 && published === submissions.length,
        },
    ];
    const currentIndex = steps.findIndex((s) => !s.complete);
    const state = (i: number): StepState => steps[i].complete ? "done" : i === currentIndex ? "current" : "todo";

    return (
        <section className={styles.card} aria-label="Progress">
            <ol className={styles.steps}>
                {steps.map((step, i) => {
                    const st = state(i);
                    return (
                        <li key={step.title} className={cn(styles.step, styles[st])} aria-current={st === "current" ? "step" : undefined}>
                            <div className={styles.track} aria-hidden="true">
                                <span className={styles.marker}>{st === "done" ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                                <span className={styles.line} />
                            </div>
                            <p className={styles.title}>
                                {step.title}
                                <span className="sr-only">{st === "done" ? " (done)" : st === "current" ? " (current step)" : ""}</span>
                            </p>
                            <p className={styles.value}>
                                <span className={styles.number}>{step.value}</span> <span className={styles.unit}>{step.unit}</span>
                            </p>
                            <p className={cn(styles.hint, styles[`hint_${step.tone}`])}>
                                {step.tone === "ok" && <CheckCircle2 size={14} aria-hidden="true" />}
                                {step.tone === "warn" && <AlertTriangle size={14} aria-hidden="true" />}
                                {step.tone === "busy" && <Loader2 size={14} className={styles.spin} aria-hidden="true" />}
                                <span>{step.hint}</span>
                            </p>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

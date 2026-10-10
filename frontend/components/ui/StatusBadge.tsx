import { cn } from "@/lib/utils";
import { SubmissionStatus } from "@/types/exam.types";
import { AnswerStatus } from "@/types/review.types";
import styles from "./StatusBadge.module.css";

type Tone = "pending" | "processing" | "graded" | "review" | "approved" | "published" | "failed";

const STATUSES: Record<SubmissionStatus | AnswerStatus, { tone: Tone; label: string }> = {
    PENDING: { tone: "pending", label: "Queued" },
    PROCESSING: { tone: "processing", label: "Grading" },
    GRADED: { tone: "graded", label: "Graded" },
    NEEDS_REVIEW: { tone: "review", label: "Needs review" },
    APPROVED: { tone: "approved", label: "Approved" },
    PUBLISHED: { tone: "published", label: "Published" },
    FAILED: { tone: "failed", label: "Failed" },
    graded: { tone: "graded", label: "Graded" },
    escalated: { tone: "review", label: "Needs review" },
    not_attempted: { tone: "pending", label: "Not attempted" },
};

/** A submission's or an answer's status: colour plus words, never colour alone. */
export default function StatusBadge({ status, label, className }: {
    status: SubmissionStatus | AnswerStatus;
    label?: string;
    className?: string;
}) {
    const { tone, label: text } = STATUSES[status] ?? STATUSES.PENDING;
    return (
        <span className={cn(styles.badge, styles[tone], className)}>
            <span className={styles.dot} aria-hidden="true" />
            {label ?? text}
        </span>
    );
}

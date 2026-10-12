"use client";

import QuestionCard from "@product/components/features/review/QuestionCard";
import type { QuestionReview } from "@product/types/review.types";
import styles from "./ReviewDesk.module.css";

const noop = () => {};

/** One product QuestionCard on its own, read-only (an answer with no page to show). */
export default function AnswerCard({ question }: { question: QuestionReview }) {
    return (
        <div className={styles.answers}>
            <QuestionCard q={question} canScore={false} canEditTranscript={false} busy={false}
                          onResolve={noop} onOverride={noop} onEditTranscript={noop} onShowPage={noop} />
        </div>
    );
}

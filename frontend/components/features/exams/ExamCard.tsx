import React from "react";
import Link from "next/link";
import { ArrowRight, Calendar, FileText, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Exam, ExamStatus } from "@/types/exam.types";
import styles from "./ExamCard.module.css";

const STATUS: Record<ExamStatus, { label: string; className: string }> = {
    draft: { label: "Draft", className: styles.statusDraft },
    published: { label: "Published", className: styles.statusPublished },
    archived: { label: "Archived", className: styles.statusArchived },
};

interface ExamCardProps {
    exam: Exam;
}

/** One exam in the list. The whole card opens the exam (the title link covers it). */
export default function ExamCard({ exam }: ExamCardProps) {
    const status = STATUS[exam.status] ?? STATUS.draft;
    const questions = exam.question_count || 0;

    return (
        <article className={styles.card}>
            {/* Icon tile beside the title, as on the organization and class cards */}
            <div className={styles.header}>
                <span className={styles.iconWrapper} aria-hidden="true">
                    <FileText size={24} />
                </span>
                <div className={styles.info}>
                    <h2 className={styles.title}>
                        <Link href={`/dashboard/exams/${exam.id}`} className={styles.link}>{exam.name}</Link>
                    </h2>
                    <span className={cn(styles.status, status.className)}>
                        <span className={styles.dot} aria-hidden="true" />
                        {status.label}
                    </span>
                </div>
            </div>

            {/* Two lines at most; the full text is in the tooltip and on the exam's page */}
            <p className={cn(styles.description, !exam.description && styles.descriptionEmpty)} title={exam.description || undefined}>
                {exam.description || "No description"}
            </p>

            <div className={styles.footer}>
                <ul className={styles.stats}>
                    <li className={cn(styles.stat, questions === 0 && styles.statTodo)}>
                        <ListChecks size={16} aria-hidden="true" />
                        {questions === 0 ? "No questions yet" : `${questions} ${questions === 1 ? "question" : "questions"}`}
                    </li>
                    <li className={styles.stat}>
                        <Calendar size={16} aria-hidden="true" />
                        <time dateTime={exam.created_at}>
                            {new Date(exam.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </time>
                    </li>
                </ul>
                {/* The title link is the card's target; this only says where it leads */}
                <span className={styles.open} aria-hidden="true">
                    Open <ArrowRight size={16} />
                </span>
            </div>
        </article>
    );
}

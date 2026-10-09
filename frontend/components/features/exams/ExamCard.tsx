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
            <div className={styles.header}>
                <span className={styles.iconWrapper} aria-hidden="true">
                    <FileText size={22} />
                </span>
                <span className={cn(styles.status, status.className)}>
                    <span className={styles.dot} aria-hidden="true" />
                    {status.label}
                </span>
            </div>

            <div className={styles.body}>
                <h2 className={styles.title}>
                    <Link href={`/dashboard/exams/${exam.id}`} className={styles.link}>{exam.name}</Link>
                </h2>
                <p className={cn(styles.description, !exam.description && styles.descriptionEmpty)}>
                    {exam.description || "No description"}
                </p>
            </div>

            <div className={styles.footer}>
                <ul className={styles.stats}>
                    <li className={styles.stat}>
                        <ListChecks size={15} aria-hidden="true" />
                        {questions} {questions === 1 ? "question" : "questions"}
                    </li>
                    <li className={styles.stat}>
                        <Calendar size={15} aria-hidden="true" />
                        <time dateTime={exam.created_at}>
                            {new Date(exam.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </time>
                    </li>
                </ul>
                <span className={styles.open} aria-hidden="true">
                    Open <ArrowRight size={16} />
                </span>
            </div>
        </article>
    );
}

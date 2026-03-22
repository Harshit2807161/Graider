"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FileText, MoreVertical, Calendar, ListChecks, ArrowRight } from "lucide-react";
import { Exam } from "@/types/exam.types";
import styles from "./ExamCard.module.css";
import Button from "@/components/ui/Button";

interface ExamCardProps {
    exam: Exam;
}

export default function ExamCard({ exam }: ExamCardProps) {
    const router = useRouter();

    const statusColors = {
        draft: styles.statusDraft,
        published: styles.statusPublished,
        archived: styles.statusArchived,
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    <FileText size={24} />
                </div>
                <div className={styles.titleInfo}>
                    <h3>{exam.name}</h3>
                    <span className={`${styles.status} ${statusColors[exam.status]}`}>
                        {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                    </span>
                </div>
                <button className={styles.moreBtn}>
                    <MoreVertical size={18} />
                </button>
            </div>

            <p className={styles.description}>
                {exam.description || "No description provided."}
            </p>

            <div className={styles.stats}>
                <div className={styles.stat}>
                    <ListChecks size={16} />
                    <span>{exam.question_count || 0} Questions</span>
                </div>
                <div className={styles.stat}>
                    <Calendar size={16} />
                    <span>{new Date(exam.created_at).toLocaleDateString()}</span>
                </div>
            </div>

            <div className={styles.footer}>
                <Button
                    variant="secondary"
                    fullWidth
                    icon={<ArrowRight size={16} />}
                    onClick={() => router.push(`/dashboard/exams/${exam.id}`)}
                >
                    Open Exam
                </Button>
            </div>
        </div>
    );
}

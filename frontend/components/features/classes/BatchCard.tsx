"use client";

import React, { useState } from "react";
import { Batch } from "@/types/batch.types";
import Button from "@/components/ui/Button";
import { Users, Trash2, Upload as UploadIcon, List } from "lucide-react";
import UploadStudentsModal from "./UploadStudentsModal";
import StudentListModal from "./StudentListModal";
import styles from "./BatchCard.module.css";

interface BatchCardProps {
    batch: Batch;
    onDelete?: () => void;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function BatchCard({ batch, onDelete }: BatchCardProps) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isRosterOpen, setIsRosterOpen] = useState(false);
    const titleId = `class-${batch.id}`;

    return (
        <>
            <article className={styles.card} aria-labelledby={titleId}>
                <div className={styles.header}>
                    <span className={styles.icon} aria-hidden="true">
                        <Users size={24} />
                    </span>
                    <div className={styles.info}>
                        <h3 id={titleId} className={styles.name}>{batch.name}</h3>
                        <p className={styles.studentCount}>
                            <span className={styles.figure}>{batch.student_count}</span>
                            {" "}{batch.student_count === 1 ? "student" : "students"}
                        </p>
                        <p className={styles.created}>Created {formatDate(batch.created_at)}</p>
                    </div>
                    {onDelete && (
                        <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={onDelete}
                            aria-label={`Delete ${batch.name}`}
                            title="Delete class"
                        >
                            <Trash2 size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>

                <div className={styles.actions}>
                    <Button
                        variant="outline"
                        size="sm"
                        className={styles.actionBtn}
                        onClick={() => setIsRosterOpen(true)}
                        icon={<List size={16} aria-hidden="true" />}
                    >
                        View students
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={styles.actionBtn}
                        onClick={() => setIsUploadModalOpen(true)}
                        icon={<UploadIcon size={16} aria-hidden="true" />}
                    >
                        Upload roster
                    </Button>
                </div>
            </article>

            <UploadStudentsModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                batchId={batch.id}
                batchName={batch.name}
                orgId={batch.org_id}
            />

            <StudentListModal
                isOpen={isRosterOpen}
                onClose={() => setIsRosterOpen(false)}
                batchId={batch.id}
                batchName={batch.name}
                onUpload={() => {
                    setIsRosterOpen(false);
                    setIsUploadModalOpen(true);
                }}
            />
        </>
    );
}

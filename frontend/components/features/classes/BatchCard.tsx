"use client";

import React, { MouseEvent } from "react";
import { Batch } from "@/types/batch.types";
import Card from "@/components/ui/Card";
import styles from "./BatchCard.module.css";
import { Users, Calendar, Trash2, Upload as UploadIcon, List } from "lucide-react";
import UploadStudentsModal from "./UploadStudentsModal";
import StudentListModal from "./StudentListModal";

interface BatchCardProps {
    batch: Batch;
    onDelete?: (id: string) => void;
}

export default function BatchCard({ batch, onDelete }: BatchCardProps) {
    const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
    const [isRosterOpen, setIsRosterOpen] = React.useState(false);

    const handleDelete = (e: MouseEvent) => {
        e.stopPropagation();
        if (onDelete && confirm(`Delete class "${batch.name}"?`)) {
            onDelete(batch.id);
        }
    };

    return (
        <>
            <Card className={styles.batchCard}>
                <div className={styles.header}>
                    <div className={styles.icon}>
                        <Users size={24} />
                    </div>
                    <div className={styles.info}>
                        <h3 className={styles.name}>{batch.name}</h3>
                        <p className={styles.studentCount}>
                            {batch.student_count} {batch.student_count === 1 ? 'Student' : 'Students'}
                        </p>
                    </div>
                    {onDelete && (
                        <button className={styles.deleteBtn} onClick={handleDelete} aria-label="Delete class">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>

                <div className={styles.footer}>
                    <div className={styles.meta}>
                        <Calendar size={14} />
                        <span>Created {new Date(batch.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.cardActions}>
                        <button
                            className={styles.viewBtn}
                            onClick={() => setIsRosterOpen(true)}
                            title="View Roster"
                        >
                            <List size={14} />
                            <span>Roster</span>
                        </button>
                        <button
                            className={styles.uploadBtn}
                            onClick={() => setIsUploadModalOpen(true)}
                            title="Upload Roster"
                        >
                            <UploadIcon size={14} />
                            <span>Upload</span>
                        </button>
                    </div>
                </div>
            </Card>

            <UploadStudentsModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                batchId={batch.id}
                batchName={batch.name}
            />

            <StudentListModal
                isOpen={isRosterOpen}
                onClose={() => setIsRosterOpen(false)}
                batchId={batch.id}
                batchName={batch.name}
            />
        </>
    );
}

"use client";

import React, { useState } from "react";
import { useBatchContext } from "@/context/BatchContext";
import { Batch } from "@/types/batch.types";
import BatchCard from "./BatchCard";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Plus, AlertCircle, GraduationCap, RotateCw } from "lucide-react";
import styles from "./BatchList.module.css";

interface BatchListProps {
    onCreateClick: () => void;
    onRetry?: () => void;
    orgName?: string;
}

export default function BatchList({ onCreateClick, onRetry, orgName }: BatchListProps) {
    const { batches, isLoading, error, deleteBatch } = useBatchContext();
    const [toDelete, setToDelete] = useState<Batch | null>(null);

    if (isLoading) {
        return (
            <div className={styles.grid} role="status">
                <span className="sr-only">Loading classes</span>
                {[0, 1, 2].map((i) => (
                    <div key={i} className={styles.skeletonCard} aria-hidden="true">
                        <span className={styles.skeletonTile} />
                        <span className={styles.skeletonLines}>
                            <span className={styles.skeletonLine} />
                            <span className={styles.skeletonLineShort} />
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorBanner} role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span className={styles.errorText}>{error}</span>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry} icon={<RotateCw size={14} aria-hidden="true" />}>
                        Try again
                    </Button>
                )}
            </div>
        );
    }

    if (batches.length === 0) {
        return (
            <div className={styles.empty}>
                <span className={styles.emptyIcon} aria-hidden="true">
                    <GraduationCap size={32} />
                </span>
                <h2>No classes yet</h2>
                <p>
                    Create a class{orgName ? ` in ${orgName}` : ""} and upload its roster, so each answer sheet can be
                    matched to a student.
                </p>
                <Button onClick={onCreateClick} variant="secondary" icon={<Plus size={18} aria-hidden="true" />}>
                    Create your first class
                </Button>
            </div>
        );
    }

    return (
        <>
            <ul className={styles.grid} aria-label="Classes">
                {batches.map((batch) => (
                    <li key={batch.id}>
                        <BatchCard batch={batch} onDelete={() => setToDelete(batch)} />
                    </li>
                ))}
            </ul>

            {toDelete && (
                <ConfirmDialog
                    title="Delete class"
                    danger
                    confirmLabel="Delete class"
                    message={
                        <>
                            <strong>{toDelete.name}</strong> and its roster will be removed
                            {orgName ? ` from ${orgName}` : ""}.
                        </>
                    }
                    onConfirm={async () => {
                        await deleteBatch(toDelete.id);
                        setToDelete(null);
                    }}
                    onClose={() => setToDelete(null)}
                />
            )}
        </>
    );
}

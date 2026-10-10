"use client";

import React, { useState } from "react";
import { useBatchContext } from "@/context/BatchContext";
import { Batch } from "@/types/batch.types";
import BatchCard from "./BatchCard";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorBanner from "@/components/common/ErrorBanner";
import { focusMainContent } from "@/components/common/focus";
import { Plus, GraduationCap } from "lucide-react";
import styles from "./BatchList.module.css";

interface BatchListProps {
    /** Show the loading state even before the classes start loading (e.g. while organizations load) */
    pending?: boolean;
    onCreateClick: () => void;
    onRetry?: () => void;
    orgName?: string;
}

export default function BatchList({ pending = false, onCreateClick, onRetry, orgName }: BatchListProps) {
    const { batches, isLoading, error, deleteBatch } = useBatchContext();
    const [toDelete, setToDelete] = useState<Batch | null>(null);
    // Said to screen readers after a delete
    const [announcement, setAnnouncement] = useState("");

    let body: React.ReactNode;
    if (isLoading || pending) {
        body = (
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
    } else if (error) {
        // The context's own fallback only repeats the title
        const detail = error === "Failed to load classes" ? null : error;
        body = <ErrorBanner title="The classes couldn't be loaded" detail={detail} onRetry={onRetry} />;
    } else if (batches.length === 0) {
        body = (
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
    } else {
        body = (
            <ul className={styles.grid} aria-label="Classes">
                {batches.map((batch) => (
                    <li key={batch.id}>
                        <BatchCard batch={batch} onDelete={() => setToDelete(batch)} />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <>
            {body}
            {/* Outside the branches, so it's announced even when the last class goes */}
            <p className="sr-only" role="status">{announcement}</p>

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
                        setAnnouncement(`${toDelete.name} was deleted`);
                        // Its card, and the button that opened this, are gone
                        focusMainContent();
                    }}
                    onClose={() => setToDelete(null)}
                />
            )}
        </>
    );
}

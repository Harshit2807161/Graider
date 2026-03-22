"use client";

import React from "react";
import { useBatchContext } from "@/context/BatchContext";
import BatchCard from "./BatchCard";
import Button from "@/components/ui/Button";
import { Plus, AlertCircle } from "lucide-react";
import styles from "./BatchList.module.css";

interface BatchListProps {
    onCreateClick: () => void;
}

export default function BatchList({ onCreateClick }: BatchListProps) {
    const { batches, isLoading, error, deleteBatch } = useBatchContext();

    const handleDelete = async (id: string) => {
        try {
            await deleteBatch(id);
        } catch (err) {
            alert("Failed to delete class");
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading classes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <AlertCircle size={24} />
                <p>{error}</p>
            </div>
        );
    }

    if (batches.length === 0) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                    <Plus size={48} />
                </div>
                <h3>No classes yet</h3>
                <p>Create your first class to start managing students and exams</p>
                <Button onClick={onCreateClick} variant="primary">
                    <Plus size={18} />
                    Create Class
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.listHeader}>
                <div>
                    <h2 className={styles.title}>Classes</h2>
                    <p className={styles.subtitle}>{batches.length} class{batches.length !== 1 ? 'es' : ''}</p>
                </div>
                <Button onClick={onCreateClick} variant="primary">
                    <Plus size={18} />
                    Create Class
                </Button>
            </div>

            <div className={styles.grid}>
                {batches.map((batch) => (
                    <BatchCard key={batch.id} batch={batch} onDelete={handleDelete} />
                ))}
            </div>
        </div>
    );
}

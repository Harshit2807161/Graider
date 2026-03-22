"use client";

import React, { useState, FormEvent } from "react";
import { useBatchContext } from "@/context/BatchContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { X } from "lucide-react";
import styles from "./CreateBatchModal.module.css";

interface CreateBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
}

export default function CreateBatchModal({ isOpen, onClose, orgId }: CreateBatchModalProps) {
    const { createBatch } = useBatchContext();
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!orgId) {
            setError("No organization selected");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await createBatch({ name, org_id: orgId });
            setName("");
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create class");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Create New Class</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <p className={styles.description}>
                        Create a new class to manage students, assignments, and exams.
                    </p>

                    <Input
                        label="Class Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Computer Science 101"
                        required
                        autoFocus
                    />

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={isSubmitting}>
                            Create Class
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

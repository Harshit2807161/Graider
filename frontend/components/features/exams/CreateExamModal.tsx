"use client";

import React, { useState } from "react";
import { X, FileText, AlignLeft, Send, CheckCircle } from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import { useExamContext } from "@/context/ExamContext";
import { ExamCreate, ExamStatus } from "@/types/exam.types";
import Button from "@/components/ui/Button";
import styles from "./CreateExamModal.module.css";

interface CreateExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedOrgId: string;
}

export default function CreateExamModal({ isOpen, onClose, selectedOrgId }: CreateExamModalProps) {
    const { createExam } = useExamContext();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<ExamStatus>("draft");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrgId) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const payload: ExamCreate = {
                name,
                description,
                org_id: selectedOrgId,
                status,
            };

            await createExam(payload);
            setName("");
            setDescription("");
            setStatus("draft");
            onClose();
        } catch (err: any) {
            console.error("Failed to create exam:", err);
            setError(err.response?.data?.detail || "Failed to create exam. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <div className={styles.headerTitle}>
                        <div className={styles.iconContainer}>
                            <FileText size={20} />
                        </div>
                        <h3>Create New Exam</h3>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="name">Exam Name</label>
                        <div className={styles.inputWrapper}>
                            <FileText size={18} className={styles.inputIcon} />
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Midterm Mathematics 2024"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="description">Description (Optional)</label>
                        <div className={styles.inputWrapper}>
                            <AlignLeft size={18} className={styles.inputIcon} />
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Details about this exam..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label>Initial Status</label>
                        <div className={styles.statusOptions}>
                            <button
                                type="button"
                                className={`${styles.statusOption} ${status === "draft" ? styles.active : ""}`}
                                onClick={() => setStatus("draft")}
                            >
                                <X size={16} />
                                Draft
                            </button>
                            <button
                                type="button"
                                className={`${styles.statusOption} ${status === "published" ? styles.active : ""}`}
                                onClick={() => setStatus("published")}
                            >
                                <Send size={16} />
                                Published
                            </button>
                        </div>
                        <p className={styles.hint}>
                            {status === "draft"
                                ? "Only you can see this exam while in draft."
                                : "Exams can be assigned to classes once published."}
                        </p>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <Button variant="secondary" onClick={onClose} type="button">
                            Cancel
                        </Button>
                        <Button
                            isLoading={isSubmitting}
                            type="submit"
                            icon={<CheckCircle size={18} />}
                        >
                            Create Exam
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

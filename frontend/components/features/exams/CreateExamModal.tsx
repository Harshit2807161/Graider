"use client";

import React, { useId, useState } from "react";
import { AlignLeft, CheckCircle, FilePlus2, FileText, PencilLine, Send } from "lucide-react";
import { useExamContext } from "@/context/ExamContext";
import { cn } from "@/lib/utils";
import { ExamCreate, ExamStatus } from "@/types/exam.types";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import InlineMessage from "@/components/ui/InlineMessage";
import { actionError } from "./actionError";
import styles from "./CreateExamModal.module.css";

interface CreateExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedOrgId: string;
    /** Called with the new exam's name once it's created (the list then points the way to it) */
    onCreated?: (name: string) => void;
}

const STATUS_OPTIONS: { value: ExamStatus; label: string; hint: string; icon: React.ReactNode }[] = [
    { value: "draft", label: "Draft", hint: "Only you can see this exam while in draft.", icon: <PencilLine size={18} aria-hidden="true" /> },
    { value: "published", label: "Published", hint: "Exams can be assigned to classes once published.", icon: <Send size={18} aria-hidden="true" /> },
];

/** Create an exam in the selected organization; questions are added on the exam's page. */
export default function CreateExamModal({ isOpen, onClose, selectedOrgId, onCreated }: CreateExamModalProps) {
    const { createExam } = useExamContext();
    const formId = useId();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<ExamStatus>("draft");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            onCreated?.(name);
            setName("");
            setDescription("");
            setStatus("draft");
            onClose();
        } catch (err) {
            console.error("Failed to create exam:", err);
            setError(actionError(err, "The exam couldn't be created"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title="Create new exam"
            description="Add its questions and rubrics on the exam's page."
            icon={<FilePlus2 size={18} />}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                    <Button isLoading={isSubmitting} type="submit" form={formId} icon={<CheckCircle size={18} aria-hidden="true" />}
                            disabled={!name.trim()}>
                        Create exam
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                    <label htmlFor={`${formId}-name`}>Exam name <span className={styles.required} aria-hidden="true">*</span></label>
                    <div className={styles.inputWrapper}>
                        <FileText size={18} className={styles.inputIcon} aria-hidden="true" />
                        <input
                            id={`${formId}-name`}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Midterm Mathematics 2026"
                            required
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className={styles.field}>
                    <label htmlFor={`${formId}-description`}>Description <span className={styles.optional}>(optional)</span></label>
                    <div className={styles.inputWrapper}>
                        <AlignLeft size={18} className={cn(styles.inputIcon, styles.inputIconTop)} aria-hidden="true" />
                        <textarea
                            id={`${formId}-description`}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Class, topics, total marks…"
                            rows={3}
                        />
                    </div>
                </div>

                <fieldset className={styles.field}>
                    <legend>Initial status</legend>
                    <div className={styles.statusOptions}>
                        {STATUS_OPTIONS.map((option) => (
                            <label key={option.value} className={cn(styles.statusOption, status === option.value && styles.active)}>
                                <input type="radio" name={`${formId}-status`} value={option.value} checked={status === option.value}
                                       onChange={() => setStatus(option.value)} className={styles.radio} />
                                <span className={styles.statusIcon}>{option.icon}</span>
                                <span className={styles.statusText}>
                                    <span className={styles.statusLabel}>{option.label}</span>
                                    <span className={styles.statusHint}>{option.hint}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                {error && <InlineMessage kind="error">{error}</InlineMessage>}
            </form>
        </Modal>
    );
}

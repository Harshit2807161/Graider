"use client";

import React, { useId, useState, FormEvent } from "react";
import { GraduationCap } from "lucide-react";
import { useBatchContext } from "@/context/BatchContext";
import { getErrorMessage } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import styles from "./CreateBatchModal.module.css";

interface CreateBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
    orgName?: string;
}

export default function CreateBatchModal({ isOpen, onClose, orgId, orgName }: CreateBatchModalProps) {
    const { createBatch } = useBatchContext();
    const formId = useId();
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const close = () => {
        setError(null);
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!orgId) {
            setError("Choose an organization first.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await createBatch({ name, org_id: orgId });
            setName("");
            onClose();
        } catch (err) {
            setError(getErrorMessage(err, "The class couldn't be created"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            title="New class"
            description={orgName ? `In ${orgName}. Upload its roster next.` : "Upload its roster next."}
            icon={<GraduationCap size={18} />}
            onClose={close}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} variant="primary" isLoading={isSubmitting}>
                        Create class
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={handleSubmit} className={styles.form}>
                <Input
                    label="Class name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Grade 7 · Section B"
                    required
                    autoComplete="off"
                />

                {error && <div className={styles.error} role="alert">{error}</div>}
            </form>
        </Modal>
    );
}

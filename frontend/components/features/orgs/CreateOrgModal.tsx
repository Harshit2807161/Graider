"use client";

import React, { useId, useState, FormEvent } from "react";
import { Building2 } from "lucide-react";
import { useOrgs } from "@/hooks/useOrgs";
import { getErrorMessage } from "@/lib/api";
import { CreateOrgPayload } from "@/types/org.types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import styles from "./CreateOrgModal.module.css";

interface CreateOrgModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EMPTY: CreateOrgPayload = { name: "", slug: "", description: "" };

export default function CreateOrgModal({ isOpen, onClose }: CreateOrgModalProps) {
    const { createOrg } = useOrgs();
    const formId = useId();
    const [formData, setFormData] = useState<CreateOrgPayload>(EMPTY);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNameChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            name: value,
            slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        }));
    };

    const close = () => {
        setError(null);
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await createOrg(formData);
            setFormData(EMPTY);
            onClose();
        } catch (err) {
            setError(getErrorMessage(err, "The organization couldn't be created"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            title="New organization"
            description="A school or department. You become its owner."
            icon={<Building2 size={18} />}
            onClose={close}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} variant="primary" isLoading={isSubmitting}>
                        Create organization
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={handleSubmit} className={styles.form}>
                <Input
                    label="Organization name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Greenfield Middle School"
                    required
                    autoComplete="organization"
                />

                <Input
                    label="Short name"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="greenfield"
                    helperText="Lowercase letters, numbers and hyphens. Filled in from the name."
                    required
                    pattern="[a-z0-9\-]+"
                    autoComplete="off"
                />

                <Input
                    label="Description (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Grades 6 to 8, maths and science"
                    autoComplete="off"
                />

                {error && <div className={styles.error} role="alert">{error}</div>}
            </form>
        </Modal>
    );
}

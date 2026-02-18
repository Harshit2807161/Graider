"use client";

import React, { useState, FormEvent } from "react";
import { useOrgs } from "@/hooks/useOrgs";
import { CreateOrgPayload } from "@/types/org.types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { X } from "lucide-react";
import styles from "./CreateOrgModal.module.css";

interface CreateOrgModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateOrgModal({ isOpen, onClose }: CreateOrgModalProps) {
    const { createOrg } = useOrgs();
    const [formData, setFormData] = useState<CreateOrgPayload>({
        name: "",
        slug: "",
        description: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleNameChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            name: value,
            slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await createOrg(formData);
            setFormData({ name: "", slug: "", description: "" });
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create organization");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Create Organization</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <Input
                        label="Organization Name"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g., Acme University"
                        required
                    />

                    <Input
                        label="Slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="acme-university"
                        helperText="URL-friendly identifier"
                        required
                    />

                    <Input
                        label="Description (Optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of your organization"
                    />

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={isSubmitting}>
                            Create Organization
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

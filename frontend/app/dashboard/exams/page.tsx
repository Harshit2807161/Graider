"use client";

import React, { useEffect, useState } from "react";
import { Plus, GraduationCap, Clock, AlertCircle } from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import { useExamContext } from "@/context/ExamContext";
import Button from "@/components/ui/Button";
import ExamCard from "@/components/features/exams/ExamCard";
import CreateExamModal from "@/components/features/exams/CreateExamModal";
import styles from "./page.module.css";

export default function ExamsPage() {
    const { orgs, activeOrg } = useOrgContext();
    const { exams, isLoading, error, fetchExams } = useExamContext();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState<string>("");

    // Initialize selected org
    useEffect(() => {
        if (activeOrg && !selectedOrgId) {
            setSelectedOrgId(activeOrg.id);
        } else if (orgs.length > 0 && !selectedOrgId) {
            setSelectedOrgId(orgs[0].id);
        }
    }, [activeOrg, orgs, selectedOrgId]);

    useEffect(() => {
        if (selectedOrgId) {
            fetchExams(selectedOrgId);
        }
    }, [selectedOrgId, fetchExams]);

    if (!selectedOrgId && orgs.length === 0) {
        return (
            <div className={styles.emptyState}>
                <GraduationCap size={48} />
                <h3>No Organization Selected</h3>
                <p>Please select an organization from the sidebar to manage exams.</p>
            </div>
        );
    }

    const selectedOrg = orgs.find(o => o.id === selectedOrgId);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1>Exams Management</h1>

                    <div className={styles.controls}>
                        <label htmlFor="org-select">Organization:</label>
                        <select
                            id="org-select"
                            className={styles.orgSelect}
                            value={selectedOrgId}
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                        >
                            <option value="" disabled>Select Organization</option>
                            {orgs.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    icon={<Plus size={18} />}
                >
                    New Exam
                </Button>
            </header>

            {error && (
                <div className={styles.errorBanner}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {isLoading ? (
                <div className={styles.loadingState}>
                    <Clock className={styles.spinner} />
                    <p>Loading exams...</p>
                </div>
            ) : exams.length === 0 ? (
                <div className={styles.emptyContent}>
                    <div className={styles.emptyIcon}>
                        <GraduationCap size={64} />
                    </div>
                    <h2>No Exams Yet</h2>
                    <p>Start by creating your first exam for this organization.</p>
                    <Button
                        variant="secondary"
                        onClick={() => setIsCreateModalOpen(true)}
                        icon={<Plus size={18} />}
                    >
                        Create Your First Exam
                    </Button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {exams.map((exam) => (
                        <ExamCard key={exam.id} exam={exam} />
                    ))}
                </div>
            )}

            <CreateExamModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                selectedOrgId={selectedOrgId}
            />
        </div>
    );
}

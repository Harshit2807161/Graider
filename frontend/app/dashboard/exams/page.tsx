"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Building2, ChevronDown, GraduationCap, Plus, Search } from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import { useExamContext } from "@/context/ExamContext";
import Button from "@/components/ui/Button";
import ButtonLink from "@/components/common/ButtonLink";
import PageHeader from "@/components/common/PageHeader";
import ExamCard from "@/components/features/exams/ExamCard";
import CreateExamModal from "@/components/features/exams/CreateExamModal";
import styles from "./page.module.css";

export default function ExamsPage() {
    const { orgs, activeOrg, setActiveOrg, isLoading: orgsLoading } = useOrgContext();
    const { exams, isLoading, error, fetchExams } = useExamContext();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [query, setQuery] = useState("");
    // The org whose exams are on screen (exams from another org may still be in the context)
    const [loadedOrgId, setLoadedOrgId] = useState<string | null>(null);

    // The page follows the active organization (the one the sidebar shows)
    const selectedOrgId = activeOrg?.id ?? orgs[0]?.id ?? "";

    useEffect(() => {
        if (!selectedOrgId) return;
        let current = true;
        fetchExams(selectedOrgId).then(() => current && setLoadedOrgId(selectedOrgId));
        return () => {
            current = false;
        };
    }, [selectedOrgId, fetchExams]);

    const selectOrg = (id: string) => {
        const org = orgs.find((o) => o.id === id);
        if (org) setActiveOrg(org);
    };

    if (!selectedOrgId && !orgsLoading && orgs.length === 0) {
        return (
            <div className={styles.page}>
                <PageHeader title="Exams" subtitle="Set up exams, grade answer sheets, then review and publish results." />
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><Building2 size={32} /></span>
                    <h2>No organization yet</h2>
                    <p>Exams belong to an organization. Create one, or ask an owner to add you to theirs.</p>
                    <ButtonLink href="/dashboard/orgs" variant="secondary">Go to organizations</ButtonLink>
                </div>
            </div>
        );
    }

    const loading = isLoading || orgsLoading || !selectedOrgId || loadedOrgId !== selectedOrgId;
    const q = query.trim().toLowerCase();
    const shown = q ? exams.filter((e) => `${e.name} ${e.description ?? ""}`.toLowerCase().includes(q)) : exams;

    return (
        <div className={styles.page}>
            <PageHeader
                title="Exams"
                subtitle="Set up an exam's questions and rubrics, grade answer sheets, then review and publish results."
                actions={
                    <Button onClick={() => setIsCreateModalOpen(true)} icon={<Plus size={18} aria-hidden="true" />} disabled={!selectedOrgId}>
                        New Exam
                    </Button>
                }
            />

            <div className={styles.toolbar}>
                <div className={styles.orgField}>
                    <label htmlFor="org-select" className={styles.toolbarLabel}>Organization</label>
                    <div className={styles.selectWrap}>
                        <Building2 size={16} className={styles.selectLead} aria-hidden="true" />
                        <select
                            id="org-select"
                            className={styles.select}
                            value={selectedOrgId}
                            onChange={(e) => selectOrg(e.target.value)}
                            disabled={orgs.length === 0}
                        >
                            <option value="" disabled>Select organization</option>
                            {orgs.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className={styles.selectChevron} aria-hidden="true" />
                    </div>
                </div>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.selectLead} aria-hidden="true" />
                    <input type="search" className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)}
                           placeholder="Search exams" aria-label="Search exams" />
                </div>
                <p className={styles.count} aria-live="polite">
                    {loading ? "" : q ? `${shown.length} of ${exams.length} exams` : `${exams.length} ${exams.length === 1 ? "exam" : "exams"}`}
                </p>
            </div>

            {error && (
                <div className={styles.errorBanner} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <span className={styles.errorText}>{error}</span>
                    <Button variant="outline" size="sm" onClick={() => fetchExams(selectedOrgId)}>Try again</Button>
                </div>
            )}

            {loading && !error ? (
                <div className={styles.grid} aria-busy="true">
                    <span className="sr-only" role="status">Loading exams…</span>
                    {[0, 1, 2].map((i) => <div key={i} className={styles.skeletonCard} />)}
                </div>
            ) : error ? null : exams.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><GraduationCap size={32} /></span>
                    <h2>No exams yet</h2>
                    <p>Create the first exam for this organization, then add its questions and rubrics.</p>
                    <Button variant="secondary" onClick={() => setIsCreateModalOpen(true)} icon={<Plus size={18} aria-hidden="true" />}>
                        Create your first exam
                    </Button>
                </div>
            ) : shown.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><Search size={28} /></span>
                    <h2>No exams match &ldquo;{query.trim()}&rdquo;</h2>
                    <p>Try another name, or clear the search.</p>
                    <Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button>
                </div>
            ) : (
                <ul className={styles.grid} aria-label="Exams">
                    {shown.map((exam) => (
                        <li key={exam.id}><ExamCard exam={exam} /></li>
                    ))}
                </ul>
            )}

            <CreateExamModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                selectedOrgId={selectedOrgId}
            />
        </div>
    );
}

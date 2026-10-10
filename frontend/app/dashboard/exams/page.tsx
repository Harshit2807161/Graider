"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Building2, ChevronDown, FileText, Plus, Search } from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import { useExamContext } from "@/context/ExamContext";
import Button from "@/components/ui/Button";
import ButtonLink from "@/components/common/ButtonLink";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageHeader from "@/components/common/PageHeader";
import { useHydrated } from "@/components/common/useHydrated";
import ExamCard from "@/components/features/exams/ExamCard";
import CreateExamModal from "@/components/features/exams/CreateExamModal";
import InlineMessage from "@/components/ui/InlineMessage";
import styles from "./page.module.css";

export default function ExamsPage() {
    const { orgs, activeOrg, setActiveOrg, isLoading: orgsLoading, error: orgsError, refetch: refetchOrgs } = useOrgContext();
    const { exams, isLoading, error, fetchExams } = useExamContext();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [query, setQuery] = useState("");
    // The exam just created: the page points the way to its questions
    const [createdName, setCreatedName] = useState<string | null>(null);
    // The org whose exams are on screen (exams from another org may still be in the context)
    const [loadedOrgId, setLoadedOrgId] = useState<string | null>(null);
    const hydrated = useHydrated();

    // The page follows the active organization (the one the sidebar shows)
    const selectedOrgId = activeOrg?.id ?? orgs[0]?.id ?? "";
    // The organizations only start loading in the browser: until they're in, the exams are loading too
    // (as on Classes), so "No organization yet" never shows in the server's HTML or before the list arrives
    const orgsPending = !hydrated || (orgsLoading && orgs.length === 0);
    const noOrg = !orgsPending && !orgsError && orgs.length === 0;

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

    if (noOrg) {
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

    // Organizations that couldn't be loaded: say so (below) instead of loading forever
    const orgsFailed = !!orgsError && !selectedOrgId;
    const loading = !orgsFailed && (orgsPending || isLoading || !selectedOrgId || loadedOrgId !== selectedOrgId);
    const failed = orgsFailed || !!error;
    const q = query.trim().toLowerCase();
    const shown = q ? exams.filter((e) => `${e.name} ${e.description ?? ""}`.toLowerCase().includes(q)) : exams;
    const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
    // Newly created exams are added to the top of the list
    const created = createdName ? exams.find((e) => e.name === createdName) : undefined;

    return (
        <div className={styles.page}>
            <PageHeader
                title="Exams"
                subtitle={selectedOrg && !loading && !failed
                    ? <>{exams.length} {exams.length === 1 ? "exam" : "exams"} in <strong className={styles.orgName}>{selectedOrg.name}</strong>. Set up
                        each exam&apos;s questions and rubrics, grade answer sheets, then review and publish results.</>
                    : "Set up an exam's questions and rubrics, grade answer sheets, then review and publish results."}
                actions={
                    <Button onClick={() => setIsCreateModalOpen(true)} icon={<Plus size={18} aria-hidden="true" />} disabled={!selectedOrgId}>
                        New exam
                    </Button>
                }
            />

            {created && (
                <InlineMessage kind="success" className={styles.created} onDismiss={() => setCreatedName(null)}
                               action={
                                   <ButtonLink href={`/dashboard/exams/${created.id}`} variant="outline" size="sm"
                                               icon={<ArrowRight size={16} aria-hidden="true" />} className={styles.createdAction}>
                                       Add its questions
                                   </ButtonLink>
                               }>
                    <strong>{created.name}</strong> is created. Next, add its questions and how you mark them.
                </InlineMessage>
            )}

            <div className={styles.toolbar}>
                {/* Only when there's a choice; otherwise the subtitle names the organization */}
                {orgs.length > 1 && (
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
                )}
                {/* Nothing to search before there are exams */}
                {!failed && (loading || exams.length > 0) && (
                    <div className={styles.searchWrap}>
                        <Search size={16} className={styles.selectLead} aria-hidden="true" />
                        <input type="search" className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)}
                               placeholder="Search exams" aria-label="Search exams" />
                    </div>
                )}
                <p className={styles.count} aria-live="polite">
                    {loading || !q ? "" : `${shown.length} of ${exams.length} ${exams.length === 1 ? "exam" : "exams"}`}
                </p>
            </div>

            {orgsFailed ? (
                <ErrorBanner title="Your organizations couldn't be loaded"
                             detail={orgsError === "Failed to load organizations" ? null : orgsError}
                             onRetry={refetchOrgs} className={styles.errorBanner} />
            ) : error && (
                <ErrorBanner title="The exams couldn't be loaded" detail={error} onRetry={() => fetchExams(selectedOrgId)}
                             className={styles.errorBanner} />
            )}

            {loading && !failed ? (
                <div className={styles.grid} aria-busy="true">
                    <span className="sr-only" role="status">Loading exams…</span>
                    {[0, 1, 2].map((i) => <div key={i} className={styles.skeletonCard} />)}
                </div>
            ) : failed ? null : exams.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><FileText size={32} /></span>
                    <h2>No exams yet</h2>
                    <p>Create the first exam for this organization, then add its questions and rubrics.</p>
                    <Button variant="secondary" onClick={() => setIsCreateModalOpen(true)} icon={<Plus size={18} aria-hidden="true" />}>
                        Create your first exam
                    </Button>
                </div>
            ) : shown.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><Search size={32} /></span>
                    <h2>No exams match &quot;{query.trim()}&quot;</h2>
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
                onCreated={(name) => { setQuery(""); setCreatedName(name); }}
            />
        </div>
    );
}

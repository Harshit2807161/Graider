"use client";

import { useLayoutEffect, useState } from "react";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import { useBatchContext } from "@/context/BatchContext";
import PageHeader from "@/components/common/PageHeader";
import ButtonLink from "@/components/common/ButtonLink";
import ErrorBanner from "@/components/common/ErrorBanner";
import { useHydrated } from "@/components/common/useHydrated";
import Button from "@/components/ui/Button";
import BatchList from "@/components/features/classes/BatchList";
import CreateBatchModal from "@/components/features/classes/CreateBatchModal";
import styles from "./page.module.css";

export default function ClassesPage() {
    const { orgs, activeOrg, setActiveOrg, isLoading: orgsLoading, error: orgsError, refetch: refetchOrgs } = useOrgContext();
    const { batches, isLoading, error, fetchBatches } = useBatchContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const hydrated = useHydrated();

    // The organization you're working in (shown in the sidebar); this page can switch it
    const selectedOrg = activeOrg ?? orgs[0] ?? null;
    const selectedOrgId = selectedOrg?.id ?? "";
    // The organizations only start loading in the browser: until they're in, the classes are loading too
    const orgsPending = !hydrated || (orgsLoading && orgs.length === 0);
    const noOrg = !orgsPending && !orgsError && orgs.length === 0;

    // Before paint, so the previous organization's classes (or "No classes yet") never flash up
    useLayoutEffect(() => {
        if (selectedOrgId) {
            fetchBatches(selectedOrgId);
        }
    }, [selectedOrgId, fetchBatches]);

    if (noOrg) {
        return (
            <>
                <PageHeader title="Classes" subtitle="Class rosters, so answer sheets can be matched to students." />
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><Building2 size={32} /></span>
                    <h2>No organization yet</h2>
                    <p>Classes belong to an organization, such as your school or department. Create one, or ask an owner to add you to theirs.</p>
                    <ButtonLink href="/dashboard/orgs" variant="secondary">Go to organizations</ButtonLink>
                </div>
            </>
        );
    }

    const lead = orgsPending || isLoading || error
        ? "Class rosters in"
        : `${batches.length} ${batches.length === 1 ? "class" : "classes"} in`;

    return (
        <>
            <PageHeader
                title="Classes"
                subtitle={selectedOrg
                    ? <>{lead} <strong className={styles.orgName}>{selectedOrg.name}</strong>. Students on a roster can be matched to their answer sheets.</>
                    : "Class rosters, so answer sheets can be matched to students."}
                actions={
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        variant="primary"
                        icon={<Plus size={18} aria-hidden="true" />}
                        disabled={!selectedOrgId}
                    >
                        New class
                    </Button>
                }
            />

            {/* Only when there's a choice; otherwise the subtitle names the organization (as on Exams) */}
            {orgs.length > 1 && (
                <div className={styles.toolbar}>
                    <label htmlFor="org-select" className={styles.toolbarLabel}>Organization</label>
                    <span className={styles.selectWrap}>
                        <Building2 size={16} aria-hidden="true" className={styles.selectLead} />
                        <select
                            id="org-select"
                            value={selectedOrgId}
                            onChange={(e) => setActiveOrg(orgs.find((o) => o.id === e.target.value) ?? null)}
                            className={styles.select}
                        >
                            {orgs.map((org) => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} aria-hidden="true" className={styles.selectIcon} />
                    </span>
                </div>
            )}

            {orgsError && !selectedOrg ? (
                <ErrorBanner
                    title="Your organizations couldn't be loaded"
                    detail={orgsError === "Failed to load organizations" ? null : orgsError}
                    onRetry={refetchOrgs}
                />
            ) : (
                <BatchList
                    pending={orgsPending}
                    onCreateClick={() => setIsModalOpen(true)}
                    onRetry={() => selectedOrgId && fetchBatches(selectedOrgId)}
                    orgName={selectedOrg?.name}
                />
            )}

            <CreateBatchModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                orgId={selectedOrgId}
                orgName={selectedOrg?.name}
            />
        </>
    );
}

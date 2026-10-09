"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import { useBatchContext } from "@/context/BatchContext";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import BatchList from "@/components/features/classes/BatchList";
import CreateBatchModal from "@/components/features/classes/CreateBatchModal";
import styles from "./page.module.css";

export default function ClassesPage() {
    const { orgs, activeOrg, setActiveOrg } = useOrgContext();
    const { batches, isLoading, error, fetchBatches } = useBatchContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // The organization you're working in (shown in the sidebar); this page can switch it
    const selectedOrg = activeOrg ?? orgs[0] ?? null;
    const selectedOrgId = selectedOrg?.id ?? "";

    useEffect(() => {
        if (selectedOrgId) {
            fetchBatches(selectedOrgId);
        }
    }, [selectedOrgId, fetchBatches]);

    const lead = isLoading || error
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
                    <>
                        {orgs.length > 1 && (
                            <div className={styles.selector}>
                                <label htmlFor="org-select" className={styles.selectorLabel}>Organization</label>
                                <span className={styles.selectWrap}>
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
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            variant="primary"
                            icon={<Plus size={18} aria-hidden="true" />}
                            disabled={!selectedOrgId}
                        >
                            New class
                        </Button>
                    </>
                }
            />

            <BatchList
                onCreateClick={() => setIsModalOpen(true)}
                onRetry={() => selectedOrgId && fetchBatches(selectedOrgId)}
                orgName={selectedOrg?.name}
            />

            <CreateBatchModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                orgId={selectedOrgId}
                orgName={selectedOrg?.name}
            />
        </>
    );
}

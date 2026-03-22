"use client";

import { useState, useEffect } from "react";
import { useOrgContext } from "@/context/OrgContext";
import { useBatchContext } from "@/context/BatchContext";
import BatchList from "../../../components/features/classes/BatchList";
import CreateBatchModal from "../../../components/features/classes/CreateBatchModal";
import styles from "./page.module.css";

export default function ClassesPage() {
    const { orgs } = useOrgContext();
    const { fetchBatches } = useBatchContext();
    const [selectedOrgId, setSelectedOrgId] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (orgs.length > 0 && !selectedOrgId) {
            setSelectedOrgId(orgs[0].id);
        }
    }, [orgs, selectedOrgId]);

    useEffect(() => {
        if (selectedOrgId) {
            fetchBatches(selectedOrgId);
        }
    }, [selectedOrgId, fetchBatches]);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.selector}>
                    <label htmlFor="org-select">Organization:</label>
                    <select
                        id="org-select"
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className={styles.select}
                    >
                        {orgs.map((org) => (
                            <option key={org.id} value={org.id}>
                                {org.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <BatchList onCreateClick={() => setIsModalOpen(true)} />

            <CreateBatchModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                orgId={selectedOrgId}
            />
        </div>
    );
}

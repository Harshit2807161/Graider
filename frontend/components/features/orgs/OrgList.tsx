"use client";

import React, { useState } from "react";
import { useOrgs } from "@/hooks/useOrgs";
import { Org } from "@/types/org.types";
import OrgCard from "./OrgCard";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorBanner from "@/components/common/ErrorBanner";
import { focusMainContent } from "@/components/common/focus";
import { useHydrated } from "@/components/common/useHydrated";
import { Plus, Building2 } from "lucide-react";
import styles from "./OrgList.module.css";

interface OrgListProps {
    onCreateClick: () => void;
}

export default function OrgList({ onCreateClick }: OrgListProps) {
    const { orgs, activeOrg, isLoading, error, deleteOrg, refetch } = useOrgs();
    const [toDelete, setToDelete] = useState<Org | null>(null);
    // Said to screen readers after a switch or a delete
    const [announcement, setAnnouncement] = useState("");
    const hydrated = useHydrated();

    let body: React.ReactNode;
    // The list only starts loading in the browser: until then it's loading, not empty
    if (!hydrated || (isLoading && orgs.length === 0)) {
        body = (
            <div className={styles.grid} role="status">
                <span className="sr-only">Loading organizations</span>
                {[0, 1].map((i) => (
                    <div key={i} className={styles.skeletonCard} aria-hidden="true">
                        <span className={styles.skeletonTile} />
                        <span className={styles.skeletonLines}>
                            <span className={styles.skeletonLine} />
                            <span className={styles.skeletonLineShort} />
                        </span>
                    </div>
                ))}
            </div>
        );
    } else if (error) {
        // The context's own fallback only repeats the title
        const detail = error === "Failed to load organizations" ? null : error;
        body = <ErrorBanner title="Your organizations couldn't be loaded" detail={detail} onRetry={refetch} />;
    } else if (orgs.length === 0) {
        body = (
            <div className={styles.empty}>
                <span className={styles.emptyIcon} aria-hidden="true">
                    <Building2 size={32} />
                </span>
                <h2>No organizations yet</h2>
                <p>Create your school or department first. Its classes, exams and answer sheets live inside it.</p>
                <Button onClick={onCreateClick} variant="secondary" icon={<Plus size={18} aria-hidden="true" />}>
                    Create an organization
                </Button>
            </div>
        );
    } else {
        body = (
            <ul className={styles.grid} aria-label="Organizations">
                {orgs.map((org) => (
                    <li key={org.id}>
                        <OrgCard
                            org={org}
                            isCurrent={activeOrg?.id === org.id}
                            onDelete={() => setToDelete(org)}
                            onSwitched={() => setAnnouncement(`You're now working in ${org.name}`)}
                        />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <>
            {body}
            {/* Outside the branches, so it's announced even when the last organization goes */}
            <p className="sr-only" role="status">{announcement}</p>

            {toDelete && (
                <ConfirmDialog
                    title="Delete organization"
                    danger
                    confirmLabel="Delete organization"
                    message={
                        <>
                            Everyone in <strong>{toDelete.name}</strong> loses access to its classes, exams and
                            results. Only the organization&apos;s owner can do this.
                        </>
                    }
                    onConfirm={async () => {
                        await deleteOrg(toDelete.id);
                        setToDelete(null);
                        setAnnouncement(`${toDelete.name} was deleted`);
                        // Its card, and the button that opened this, are gone
                        focusMainContent();
                    }}
                    onClose={() => setToDelete(null)}
                />
            )}
        </>
    );
}

"use client";

import { useOrgs } from "@/hooks/useOrgs";
import OrgCard from "./OrgCard";
import Button from "@/components/ui/Button";
import { Plus, AlertCircle } from "lucide-react";
import styles from "./OrgList.module.css";

interface OrgListProps {
    onCreateClick: () => void;
}

export default function OrgList({ onCreateClick }: OrgListProps) {
    const { orgs, isLoading, error, deleteOrg } = useOrgs();

    const handleDelete = async (id: string) => {
        try {
            await deleteOrg(id);
        } catch (err) {
            alert("Failed to delete organization");
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading organizations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <AlertCircle size={24} />
                <p>{error}</p>
            </div>
        );
    }

    if (orgs.length === 0) {
        return (
            <div className={styles.empty}>
                <h3>No organizations yet</h3>
                <p>Create your first organization to get started</p>
                <Button onClick={onCreateClick} variant="primary">
                    <Plus size={18} />
                    Create Organization
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Organizations</h2>
                    <p className={styles.subtitle}>{orgs.length} organization{orgs.length !== 1 ? 's' : ''}</p>
                </div>
                <Button onClick={onCreateClick} variant="primary">
                    <Plus size={18} />
                    Create Organization
                </Button>
            </div>

            <div className={styles.grid}>
                {orgs.map((org) => (
                    <OrgCard key={org.id} org={org} onDelete={handleDelete} />
                ))}
            </div>
        </div>
    );
}

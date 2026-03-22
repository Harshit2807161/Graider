"use client";

import React, { MouseEvent } from "react";
import { Org } from "@/types/org.types";
import Card from "@/components/ui/Card";
import styles from "./OrgCard.module.css";
import { Building2, Calendar, Trash2 } from "lucide-react";

interface OrgCardProps {
    org: Org;
    onDelete?: (id: string) => void;
}

export default function OrgCard({ org, onDelete }: OrgCardProps) {
    const handleDelete = (e: MouseEvent) => {
        e.stopPropagation();
        if (onDelete && confirm(`Delete "${org.name}"?`)) {
            onDelete(org.id);
        }
    };

    return (
        <Card className={styles.orgCard}>
            <div className={styles.header}>
                <div className={styles.icon}>
                    <Building2 size={24} />
                </div>
                <div className={styles.info}>
                    <h3 className={styles.name}>{org.name}</h3>
                    <p className={styles.slug}>@{org.slug}</p>
                </div>
                {onDelete && (
                    <button className={styles.deleteBtn} onClick={handleDelete} aria-label="Delete organization">
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            {org.description && <p className={styles.description}>{org.description}</p>}

            <div className={styles.footer}>
                <div className={styles.meta}>
                    <Calendar size={14} />
                    <span>Created {new Date(org.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </Card>
    );
}

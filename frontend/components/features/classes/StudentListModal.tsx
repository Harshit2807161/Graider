"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { batchService } from "@/services/batch.service";
import { getErrorMessage } from "@/lib/api";
import { Student } from "@/types/batch.types";
import { Search, Upload, Users } from "lucide-react";
import ErrorBanner from "@/components/common/ErrorBanner";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import styles from "./StudentListModal.module.css";

interface StudentListModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId: string;
    batchName: string;
    /** Offered when the roster is empty */
    onUpload?: () => void;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "?";
    return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
}

export default function StudentListModal({
    isOpen,
    onClose,
    batchId,
    batchName,
    onUpload,
}: StudentListModalProps) {
    const searchId = useId();
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    const loadStudents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            setStudents(await batchService.getStudents(batchId));
        } catch (err) {
            setError(getErrorMessage(err, "The roster couldn't be loaded."));
        } finally {
            setIsLoading(false);
        }
    }, [batchId]);

    useEffect(() => {
        if (!isOpen || !batchId) return;
        let cancelled = false;
        batchService.getStudents(batchId)
            .then((data) => {
                if (cancelled) return;
                setStudents(data);
                setError(null);
            })
            .catch((err) => !cancelled && setError(getErrorMessage(err, "The roster couldn't be loaded.")))
            .finally(() => !cancelled && setIsLoading(false));
        return () => {
            cancelled = true;
        };
    }, [isOpen, batchId]);

    const close = () => {
        setSearchQuery("");
        onClose();
    };

    const query = searchQuery.trim().toLowerCase();
    const filteredStudents = students.filter((s) =>
        s.full_name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
    );
    const showSearch = !isLoading && !error && students.length > 0;

    return (
        <Modal
            open={isOpen}
            title="Class roster"
            description={batchName}
            icon={<Users size={18} />}
            onClose={close}
            footer={
                <>
                    <p className={styles.count} aria-live="polite">
                        {isLoading || error ? "" : query
                            ? `${filteredStudents.length} of ${students.length} students`
                            : `${students.length} ${students.length === 1 ? "student" : "students"}`}
                    </p>
                    <Button variant="secondary" onClick={close}>Done</Button>
                </>
            }
        >
            {showSearch && (
                <div className={styles.searchBar}>
                    <label htmlFor={searchId} className="sr-only">Search students</label>
                    <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                    <input
                        id={searchId}
                        type="search"
                        placeholder="Search by name or email"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                    />
                </div>
            )}

            {isLoading ? (
                <div className={styles.list} role="status">
                    <span className="sr-only">Loading the roster</span>
                    {[0, 1, 2].map((i) => (
                        <div key={i} className={styles.skeletonRow} aria-hidden="true">
                            <span className={styles.skeletonAvatar} />
                            <span className={styles.skeletonLine} />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <ErrorBanner title="The roster couldn't be loaded" detail={error} onRetry={loadStudents} />
            ) : students.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon} aria-hidden="true"><Users size={24} /></span>
                    <p className={styles.emptyTitle}>No students in this class yet</p>
                    <p>Upload a roster (Excel or CSV with Name and Email columns) to add them.</p>
                    {onUpload && (
                        <Button variant="secondary" size="sm" onClick={onUpload} icon={<Upload size={16} aria-hidden="true" />}>
                            Upload roster
                        </Button>
                    )}
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No students match &ldquo;{searchQuery.trim()}&rdquo;.</p>
                </div>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th scope="col">Student</th>
                            <th scope="col" className={styles.dateCol}>Enrolled</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => (
                            <tr key={student.id}>
                                <td>
                                    <div className={styles.studentInfo}>
                                        <span className={styles.avatar} aria-hidden="true">{initials(student.full_name)}</span>
                                        <div className={styles.studentText}>
                                            <p className={styles.studentName}>{student.full_name}</p>
                                            <p className={styles.studentEmail}>{student.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className={styles.dateCol}>{formatDate(student.enrolled_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Modal>
    );
}

"use client";

import React, { useState, useEffect } from "react";
import { batchService } from "@/services/batch.service";
import { Student } from "@/types/batch.types";
import { X, Search, User, Mail, Calendar } from "lucide-react";
import Button from "@/components/ui/Button";
import styles from "./StudentListModal.module.css";

interface StudentListModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId: string;
    batchName: string;
}

export default function StudentListModal({
    isOpen,
    onClose,
    batchId,
    batchName
}: StudentListModalProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && batchId) {
            loadStudents();
        }
    }, [isOpen, batchId]);

    const loadStudents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await batchService.getStudents(batchId);
            setStudents(data);
        } catch (err) {
            console.error("Failed to load students:", err);
            setError("Failed to load roster. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2>Class Roster</h2>
                        <p className={styles.batchSubtitle}>{batchName}</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close roster">
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.searchBar}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading roster...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState}>
                            <p>{error}</p>
                            <Button onClick={loadStudents} variant="secondary">Try Again</Button>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>{searchQuery ? "No matching students found." : "No students enrolled in this class yet."}</p>
                        </div>
                    ) : (
                        <div className={styles.studentList}>
                            <div className={styles.listHeader}>
                                <span>Student</span>
                                <span>Enrolled On</span>
                            </div>
                            {filteredStudents.map((student) => (
                                <div key={student.id} className={styles.studentItem}>
                                    <div className={styles.studentInfo}>
                                        <div className={styles.avatar}>
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className={styles.studentName}>{student.full_name}</p>
                                            <p className={styles.studentEmail}>
                                                <Mail size={12} />
                                                {student.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={styles.enrolledDate}>
                                        <Calendar size={14} />
                                        {new Date(student.enrolled_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <p className={styles.count}>{filteredStudents.length} Students</p>
                    <Button variant="primary" onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    );
}

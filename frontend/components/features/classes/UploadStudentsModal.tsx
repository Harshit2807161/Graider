"use client";

import React, { useState, useCallback } from "react";
import { useBatchContext } from "@/context/BatchContext";
import { batchService } from "@/services/batch.service";
import Button from "@/components/ui/Button";
import { X, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import styles from "./UploadStudentsModal.module.css";

interface UploadStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId: string;
    batchName: string;
}

export default function UploadStudentsModal({
    isOpen,
    onClose,
    batchId,
    batchName
}: UploadStudentsModalProps) {
    const { fetchBatches } = useBatchContext();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setResult(null);

        try {
            const data = await batchService.uploadStudents(batchId, file);
            setResult(data);
            // We might want to wait or trigger a refresh in the parent if needed
        } catch (err: any) {
            console.error("Upload failed:", err);
            setError(err.response?.data?.detail || "Failed to upload roster");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        setError(null);
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Upload Students: {batchName}</h2>
                    <button className={styles.closeBtn} onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {!result ? (
                        <>
                            <div className={styles.dropzone}>
                                <input
                                    type="file"
                                    id="roster-upload"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className={styles.fileInput}
                                />
                                <label htmlFor="roster-upload" className={styles.fileLabel}>
                                    <Upload size={48} className={styles.uploadIcon} />
                                    {file ? (
                                        <div className={styles.fileInfo}>
                                            <FileText size={18} />
                                            <span>{file.name}</span>
                                        </div>
                                    ) : (
                                        <div className={styles.uploadText}>
                                            <p className={styles.primary}>Click to upload student roster</p>
                                            <p className={styles.secondary}>Accepts Excel (.xlsx, .xls) or CSV</p>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <div className={styles.guides}>
                                <p><strong>Roster Requirements:</strong></p>
                                <ul>
                                    <li>Columns: <code>Name</code> and <code>Email</code> are required.</li>
                                    <li>First row must be the header.</li>
                                    <li>Emails must be unique for each student.</li>
                                </ul>
                            </div>

                            {error && (
                                <div className={styles.errorBanner}>
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className={styles.actions}>
                                <Button variant="secondary" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleUpload}
                                    disabled={!file}
                                    isLoading={isUploading}
                                >
                                    Start Upload
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className={styles.result}>
                            <div className={styles.resultIcon}>
                                <CheckCircle2 size={64} color="#10b981" />
                            </div>
                            <h3>Upload Complete</h3>
                            <div className={styles.stats}>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Total Processed</span>
                                    <span className={styles.statValue}>{result.total}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Newly Enrolled</span>
                                    <span className={styles.statValue}>{result.enrolled}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Already Enrolled</span>
                                    <span className={styles.statValue}>{result.existing}</span>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className={styles.errorsList}>
                                    <p className={styles.errorTitle}>Errors ({result.errors.length})</p>
                                    <div className={styles.errorScroll}>
                                        {result.errors.map((err: any, idx: number) => (
                                            <div key={idx} className={styles.errorItem}>
                                                <code>{err.email}</code>: {err.error}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.actions}>
                                <Button variant="primary" onClick={handleClose}>
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

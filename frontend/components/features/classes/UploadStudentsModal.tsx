"use client";

import React, { useId, useState } from "react";
import { useBatchContext } from "@/context/BatchContext";
import { batchService } from "@/services/batch.service";
import { getErrorMessage } from "@/lib/api";
import { RosterImportResult } from "@/types/batch.types";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import styles from "./UploadStudentsModal.module.css";

interface UploadStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId: string;
    batchName: string;
    /** The class's organization, so its student count can be refreshed after an import */
    orgId?: string;
}

export default function UploadStudentsModal({
    isOpen,
    onClose,
    batchId,
    batchName,
    orgId,
}: UploadStudentsModalProps) {
    const { fetchBatches } = useBatchContext();
    const inputId = useId();
    const hintId = useId();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<RosterImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

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
            setResult(await batchService.uploadStudents(batchId, file));
        } catch (err) {
            setError(getErrorMessage(err, "The roster couldn't be uploaded"));
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        // New students change the class's count on its card
        const enrolled = (result?.enrolled ?? 0) > 0;
        setFile(null);
        setResult(null);
        setError(null);
        onClose();
        if (enrolled && orgId) fetchBatches(orgId);
    };

    return (
        <Modal
            open={isOpen}
            title={result ? "Roster uploaded" : "Upload roster"}
            description={batchName}
            icon={<Upload size={18} />}
            onClose={handleClose}
            footer={result ? (
                <Button variant="primary" onClick={handleClose}>Done</Button>
            ) : (
                <>
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleUpload} disabled={!file} isLoading={isUploading}>
                        Upload roster
                    </Button>
                </>
            )}
        >
            {!result ? (
                <div className={styles.content}>
                    <div className={styles.dropzone}>
                        <input
                            type="file"
                            id={inputId}
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className={styles.fileInput}
                            aria-describedby={hintId}
                        />
                        <label htmlFor={inputId} className={styles.fileLabel}>
                            <span className={styles.uploadIcon} aria-hidden="true">
                                {file ? <FileSpreadsheet size={24} /> : <Upload size={24} />}
                            </span>
                            {file ? (
                                <span className={styles.uploadText}>
                                    <span className={styles.primaryText}>{file.name}</span>
                                    <span className={styles.secondaryText}>Choose a different file</span>
                                </span>
                            ) : (
                                <span className={styles.uploadText}>
                                    <span className={styles.primaryText}>Choose a roster file</span>
                                    <span className={styles.secondaryText}>or drop it here · Excel (.xlsx, .xls) or CSV</span>
                                </span>
                            )}
                        </label>
                    </div>

                    <div className={styles.guides} id={hintId}>
                        <p className={styles.guidesTitle}>The file needs</p>
                        <ul>
                            <li><code>Name</code> and <code>Email</code> columns, with the header in the first row</li>
                            <li>A different email for each student</li>
                        </ul>
                        <p className={styles.guidesNote}>Students already in the class are skipped, not duplicated.</p>
                    </div>

                    {error && (
                        <div className={styles.errorBanner} role="alert">
                            <AlertCircle size={18} aria-hidden="true" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.result} role="status">
                    <span className={styles.resultIcon} aria-hidden="true">
                        <CheckCircle2 size={28} />
                    </span>
                    <p className={styles.resultTitle}>
                        {result.enrolled} {result.enrolled === 1 ? "student" : "students"} added to {batchName}
                    </p>
                    <dl className={styles.stats}>
                        <div className={styles.statItem}>
                            <dt>Rows read</dt>
                            <dd>{result.total}</dd>
                        </div>
                        <div className={styles.statItem}>
                            <dt>Added</dt>
                            <dd>{result.enrolled}</dd>
                        </div>
                        <div className={styles.statItem}>
                            <dt>Already enrolled</dt>
                            <dd>{result.existing}</dd>
                        </div>
                    </dl>

                    {result.errors.length > 0 && (
                        <div className={styles.errorsList}>
                            <p className={styles.errorTitle}>
                                <AlertCircle size={16} aria-hidden="true" />
                                {result.errors.length} {result.errors.length === 1 ? "row" : "rows"} couldn&apos;t be added
                            </p>
                            <ul className={styles.errorScroll}>
                                {result.errors.map((err, idx) => (
                                    <li key={idx} className={styles.errorItem}>
                                        <code>{err.email}</code> {err.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}

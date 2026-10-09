"use client";

import React, { useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, FileUp, Inbox, Loader2, RotateCcw, UploadCloud, UserRound, X } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { Submission, SubmissionStatus } from "@/types/exam.types";
import InlineMessage, { Message } from "./InlineMessage";
import SectionCard from "./SectionCard";
import styles from "./AnswerSheetsSection.module.css";

const IN_PROGRESS: SubmissionStatus[] = ["PENDING", "PROCESSING"];
const ACCEPT = ".pdf,.docx,.doc,.odt,.rtf,.pptx,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.gif,.bmp";

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function score(n: number): string {
    return Number(n.toFixed(2)).toString();
}

const dateFormat: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };

/** Step 2: upload one student's answers (one or several files, graded together in order), then
 *  follow each answer sheet's grading. The page polls while any sheet is still being graded. */
export default function AnswerSheetsSection({ examId, submissions, canUpload, onChanged }: {
    examId: string;
    submissions: Submission[];
    /** Answer sheets can only be graded once the exam has questions */
    canUpload: boolean;
    onChanged: () => Promise<void>;
}) {
    const helpId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [listError, setListError] = useState<string | null>(null);
    const [regrading, setRegrading] = useState<string | null>(null);

    const anyInProgress = submissions.some((s) => IN_PROGRESS.includes(s.status));

    const clearFiles = () => {
        setFiles([]);
        if (inputRef.current) inputRef.current.value = "";
    };

    const upload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        setMessage(null);
        try {
            await examService.uploadSubmission(examId, files);
            const n = files.length;
            clearFiles();
            await onChanged();
            setMessage({ kind: "success", text: `Uploaded ${n === 1 ? "1 file" : `${n} files`}. Grading has started; the answer sheet is at the top of the list.` });
        } catch (err) {
            setMessage({ kind: "error", text: `The answer sheet couldn't be uploaded: ${getErrorMessage(err)}` });
        } finally {
            setUploading(false);
        }
    };

    const regrade = async (submission: Submission) => {
        setRegrading(submission.id);
        setListError(null);
        try {
            await examService.regradeSubmission(submission.id);
            await onChanged();
        } catch (err) {
            setListError(`Couldn't regrade: ${getErrorMessage(err)}`);
        } finally {
            setRegrading(null);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (!canUpload || uploading) return;
        const dropped = Array.from(e.dataTransfer.files ?? []);
        if (dropped.length > 0) {
            setFiles(dropped);
            setMessage(null);
        }
    };

    return (
        <SectionCard
            step={2}
            icon={<FileUp size={18} />}
            title="Grade answer sheets"
            description="Upload one student's answers at a time: a PDF, Word document, photos (JPEG, PNG, HEIC…) or text."
        >
            {/* The native input stays focusable (visually hidden); the whole drop zone is its label */}
            <input ref={inputRef} id="submission-upload-input" type="file" multiple accept={ACCEPT}
                   className={styles.fileInput} disabled={!canUpload || uploading}
                   aria-label="Choose answer sheet files" aria-describedby={helpId}
                   onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setMessage(null); }} />
            <label
                htmlFor="submission-upload-input"
                className={cn(styles.dropzone, dragging && styles.dragging, !canUpload && styles.disabled)}
                onDragOver={(e) => { e.preventDefault(); if (canUpload) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
            >
                <span className={styles.dropIcon} aria-hidden="true"><UploadCloud size={22} /></span>
                <span className={styles.dropText}>
                    <span className={styles.dropTitle}>
                        Drop files here, or <span className={styles.chooseLink}>choose files</span>
                    </span>
                    <span id={helpId} className={styles.dropHelp}>
                        {canUpload
                            ? "Several files (e.g. one photo per page) are graded together as one answer sheet, in the order selected."
                            : "Add and save the exam's questions first; answer sheets are graded against them."}
                    </span>
                </span>
            </label>

            {files.length > 0 && (
                <div className={styles.selected}>
                    <p className={styles.selectedTitle}>
                        {files.length === 1 ? "1 file" : `${files.length} files`} · one answer sheet
                    </p>
                    <ol className={styles.fileList}>
                        {files.map((f, i) => (
                            <li key={`${f.name}-${i}`} className={styles.fileItem}>
                                <span className={styles.fileIndex}>{i + 1}</span>
                                <FileText size={16} aria-hidden="true" className={styles.fileIcon} />
                                <span className={styles.fileName}>{f.name}</span>
                                <span className={styles.fileSize}>{fileSize(f.size)}</span>
                            </li>
                        ))}
                    </ol>
                    <div className={styles.selectedActions}>
                        <Button variant="ghost" onClick={clearFiles} disabled={uploading} icon={<X size={16} aria-hidden="true" />}>Clear</Button>
                        <Button onClick={upload} isLoading={uploading} disabled={!canUpload} icon={<FileUp size={16} aria-hidden="true" />}>
                            Upload &amp; grade
                        </Button>
                    </div>
                </div>
            )}
            {message && <InlineMessage kind={message.kind} onDismiss={() => setMessage(null)} className={styles.message}>{message.text}</InlineMessage>}

            <div className={styles.listHeader}>
                <h3 className={styles.listTitle}>
                    Answer sheets <span className={styles.count}>{submissions.length}</span>
                </h3>
                {anyInProgress && (
                    <p className={styles.live}>
                        <Loader2 size={14} className={styles.spin} aria-hidden="true" /> Updating while grading runs
                    </p>
                )}
            </div>
            {listError && <InlineMessage kind="error" onDismiss={() => setListError(null)} className={styles.message}>{listError}</InlineMessage>}

            {submissions.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true"><Inbox size={24} /></span>
                    <p className={styles.emptyTitle}>No answer sheets yet</p>
                    <p className={styles.emptyText}>Uploaded answer sheets appear here with their status and score.</p>
                </div>
            ) : (
                <div className={styles.table} role="table" aria-label="Answer sheets">
                    <div className={styles.head} role="row">
                        <span role="columnheader">Student</span>
                        <span role="columnheader">Status</span>
                        <span role="columnheader">Uploaded</span>
                        <span role="columnheader" className={styles.right}>Score</span>
                        <span role="columnheader"><span className="sr-only">Actions</span></span>
                    </div>
                    {submissions.map((s) => {
                        const busy = IN_PROGRESS.includes(s.status);
                        const name = s.student_name?.trim() || null;
                        const href = `/dashboard/exams/${examId}/submissions/${s.id}`;
                        const showStep = s.current_step && (busy || s.status === "FAILED");
                        return (
                            <div key={s.id} role="row" className={cn(styles.row, !busy && styles.rowLink)}>
                                <div role="cell" className={styles.student}>
                                    <span className={cn(styles.avatar, !name && styles.avatarEmpty)} aria-hidden="true">
                                        {name ? initials(name) : <UserRound size={16} />}
                                    </span>
                                    <span className={cn(styles.name, !name && styles.noName)}>{name ?? "No student assigned"}</span>
                                </div>
                                <div role="cell" className={styles.statusCell}>
                                    <StatusBadge status={s.status} />
                                    {showStep && (
                                        <span className={cn(styles.step, s.status === "FAILED" && styles.stepFailed)}>
                                            {busy && <Loader2 size={12} className={styles.spin} aria-hidden="true" />}
                                            {s.current_step}
                                        </span>
                                    )}
                                </div>
                                <div role="cell" className={styles.date}>
                                    <time dateTime={s.created_at}>{new Date(s.created_at).toLocaleString(undefined, dateFormat)}</time>
                                </div>
                                <div role="cell" className={styles.score}>
                                    {s.total_score != null && s.max_score != null ? (
                                        <>
                                            <span className={styles.scoreNum}>{score(s.total_score)} / {score(s.max_score)}</span>
                                            {s.max_score > 0 && (
                                                <span className={styles.percent}>{Math.round((s.total_score / s.max_score) * 100)}%</span>
                                            )}
                                        </>
                                    ) : <span className={styles.percent} aria-label="No score yet">–</span>}
                                </div>
                                <div role="cell" className={styles.actions}>
                                    {s.status === "FAILED" && (
                                        <Button size="sm" variant="outline" className={styles.regrade} onClick={() => regrade(s)}
                                                isLoading={regrading === s.id} icon={<RotateCcw size={14} aria-hidden="true" />}>
                                            Regrade
                                        </Button>
                                    )}
                                    {!busy && (
                                        <Link href={href} className={cn(styles.open, s.status === "NEEDS_REVIEW" && styles.openReview)}
                                              aria-label={`${s.status === "NEEDS_REVIEW" ? "Review" : "Open"} ${name ?? "answer sheet"}`}>
                                            {s.status === "NEEDS_REVIEW" ? "Review" : "Open"}
                                            <ChevronRight size={16} aria-hidden="true" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </SectionCard>
    );
}

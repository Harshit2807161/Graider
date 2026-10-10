"use client";

import React, { useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, FileUp, Loader2, Lock, RotateCcw, UploadCloud, UserRound, X } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ErrorBanner from "@/components/common/ErrorBanner";
import { explainFailure } from "@/components/features/review/failure";
import { cn } from "@/lib/utils";
import { examService } from "@/services/exam.service";
import { Submission, SubmissionStatus } from "@/types/exam.types";
import InlineMessage, { Message } from "@/components/ui/InlineMessage";
import SectionCard from "./SectionCard";
import { actionError } from "./actionError";
import styles from "./AnswerSheetsSection.module.css";

const IN_PROGRESS: SubmissionStatus[] = ["PENDING", "PROCESSING"];
const ACCEPT = ".pdf,.docx,.doc,.odt,.rtf,.pptx,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.gif,.bmp";

/** The list reads in the order the teacher acts: what needs them, what's still grading, what's done.
 *  Within "needs you", reviews first, then failures to regrade, then grades to approve. */
const GROUPS: { key: string; title: string; statuses: SubmissionStatus[] }[] = [
    { key: "action", title: "Needs your attention", statuses: ["NEEDS_REVIEW", "FAILED", "GRADED"] },
    { key: "grading", title: "Being graded", statuses: ["PROCESSING", "PENDING"] },
    { key: "done", title: "Approved & published", statuses: ["APPROVED", "PUBLISHED"] },
];

/** What a sheet's status means for the teacher, under its badge (none when the badge says it all). */
const NEXT_STEP: Partial<Record<SubmissionStatus, string>> = {
    GRADED: "Check the grades, then approve",
    APPROVED: "Ready to publish",
    PUBLISHED: "Students can see the result",
};

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

/** Grading progress as the worker words it ("Reading 3 page(s) for 3 questions..."), with real plurals
 *  and an ellipsis: "Reading 3 pages for 3 questions…". */
function progressText(step: string): string {
    return step
        .replace(/(\d+) ([A-Za-z]+)\(s\)/g, (_, n: string, word: string) => `${n} ${Number(n) === 1 ? word : `${word}s`}`)
        .replace(/\.{3}$/, "…");
}

/** The first sentence of the teacher-facing cause; the full explanation is on the sheet's page. */
function firstSentence(text: string): string {
    return text.split(/(?<=\.)\s+/)[0] ?? text;
}

/** The review screens' format: "Oct 9, 2026, 2:22 PM" */
const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

/** Step 2: upload one student's answers (one or several files, graded together in order), then
 *  follow each answer sheet's grading. The page polls while any sheet is still being graded. */
export default function AnswerSheetsSection({ examId, submissions, listState, canUpload, onChanged, id }: {
    examId: string;
    submissions: Submission[];
    /** Whether the list has arrived (it can fail before it ever does) */
    listState: "loading" | "ready" | "error";
    /** Answer sheets can only be graded once the exam has saved questions */
    canUpload: boolean;
    onChanged: () => Promise<void>;
    /** Anchor for links into this section (e.g. from the progress steps) */
    id?: string;
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
    const groups = GROUPS
        .map((g) => ({
            ...g,
            rows: submissions
                .filter((s) => g.statuses.includes(s.status))
                // Status priority within the group, then newest first (the list arrives newest first)
                .map((s, i) => ({ s, i }))
                .sort((a, b) => g.statuses.indexOf(a.s.status) - g.statuses.indexOf(b.s.status) || a.i - b.i)
                .map(({ s }) => s),
        }))
        .filter((g) => g.rows.length > 0);

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
            setMessage({ kind: "success", text: `Uploaded ${n === 1 ? "1 file" : `${n} files`}. Grading has started; follow it under "Being graded" below.` });
        } catch (err) {
            setMessage({ kind: "error", text: actionError(err, "The answer sheet couldn't be uploaded") });
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
            setListError(actionError(err, "The answer sheet couldn't be regraded"));
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
            id={id}
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
                <span className={styles.dropIcon} aria-hidden="true">{canUpload ? <UploadCloud size={22} /> : <Lock size={20} />}</span>
                <span className={styles.dropText}>
                    {canUpload ? (
                        <span className={styles.dropTitle}>
                            Drop files here, or <span className={styles.chooseLink}>choose files</span>
                        </span>
                    ) : (
                        <span className={styles.dropTitle}>Save the exam&apos;s questions first</span>
                    )}
                    <span id={helpId} className={styles.dropHelp}>
                        {canUpload
                            ? "Several files (e.g. one photo per page) are graded together as one answer sheet, in the order selected."
                            : "Answer sheets are graded against the saved questions, so uploading opens once step 1 is saved."}
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

            {listState === "loading" ? (
                <div className={styles.loadingList} aria-busy="true">
                    <span className="sr-only" role="status">Loading answer sheets…</span>
                    {[0, 1, 2].map((i) => <span key={i} className={styles.skeletonRow} />)}
                </div>
            ) : listState === "error" ? (
                <ErrorBanner title="The answer sheets couldn't be loaded" onRetry={onChanged} className={styles.listError} />
            ) : submissions.length === 0 ? (
                canUpload && (
                    <p className={styles.emptyNote}>
                        No answer sheets yet. Each one you upload is listed here with its status and score.
                    </p>
                )
            ) : (
                <>
                    <div className={styles.listHeader}>
                        <h3 className={styles.listTitle}>
                            Answer sheets <span className={styles.count}>{submissions.length}</span>
                        </h3>
                        {anyInProgress && (
                            <p className={styles.live}>
                                <Loader2 size={14} className={styles.spin} aria-hidden="true" /> Updating as sheets are graded
                            </p>
                        )}
                    </div>
                    {listError && <InlineMessage kind="error" onDismiss={() => setListError(null)} className={styles.message}>{listError}</InlineMessage>}

                    <div className={styles.table} role="table" aria-label="Answer sheets">
                        <div role="rowgroup">
                            <div className={styles.head} role="row">
                                <span role="columnheader">Student</span>
                                <span role="columnheader">Status</span>
                                <span role="columnheader" className={styles.right}>Score</span>
                                <span role="columnheader"><span className="sr-only">Actions</span></span>
                            </div>
                        </div>
                        {groups.map((group) => (
                            <div key={group.key} role="rowgroup" className={styles.group}>
                                {groups.length > 1 && (
                                    <div role="row" className={styles.groupRow}>
                                        <span role="cell" aria-colspan={4} className={styles.groupLabel}>
                                            {group.title}
                                            <span className={cn(styles.groupCount, group.key === "action" && styles.groupCountAction)}>
                                                <span className="sr-only">(</span>{group.rows.length}<span className="sr-only">)</span>
                                            </span>
                                        </span>
                                    </div>
                                )}
                                {group.rows.map((s) => (
                                    <SheetRow key={s.id} examId={examId} submission={s} regrading={regrading === s.id}
                                              onRegrade={() => regrade(s)} />
                                ))}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </SectionCard>
    );
}

function SheetRow({ examId, submission: s, regrading, onRegrade }: {
    examId: string;
    submission: Submission;
    regrading: boolean;
    onRegrade: () => void;
}) {
    const busy = IN_PROGRESS.includes(s.status);
    const failed = s.status === "FAILED";
    const name = s.student_name?.trim() || null;
    const who = name ?? "answer sheet";
    const href = `/dashboard/exams/${examId}/submissions/${s.id}`;
    const failure = failed ? explainFailure(s.current_step) : null;
    const uploaded = new Date(s.created_at).toLocaleString(undefined, dateFormat);
    const hasScore = s.total_score != null && s.max_score != null;

    return (
        <div role="row" className={cn(styles.row, !busy && styles.rowLink)}>
            <div role="cell" className={styles.student}>
                <span className={cn(styles.avatar, !name && styles.avatarEmpty)} aria-hidden="true">
                    {name ? initials(name) : <UserRound size={16} />}
                </span>
                <span className={styles.who}>
                    {/* The name is the row's link (it covers the row), so focus starts each row at its left
                        whatever the layout; the id names the sheet for the Regrade button */}
                    {busy ? (
                        <span id={`sheet-${s.id}`} className={cn(styles.name, !name && styles.noName)} title={name ?? undefined}>{name ?? "No student assigned"}</span>
                    ) : (
                        <Link href={href} className={cn(styles.name, styles.rowTarget, !name && styles.noName)} title={name ?? undefined}
                              aria-label={`${s.status === "NEEDS_REVIEW" ? "Review" : "Open"} ${who}`}>
                            <span id={`sheet-${s.id}`}>{name ?? "No student assigned"}</span>
                        </Link>
                    )}
                    <span className={styles.uploaded}>Uploaded <time dateTime={s.created_at}>{uploaded}</time></span>
                </span>
            </div>
            <div role="cell" className={styles.statusCell}>
                <StatusBadge status={s.status} />
                {failure ? (
                    <>
                        <span className={styles.reason}>{firstSentence(failure.cause)}</span>
                        {/* The fix sits with the problem; the sheet's page has the full explanation */}
                        <Button size="sm" variant="outline" className={styles.regrade} onClick={onRegrade}
                                isLoading={regrading} icon={<RotateCcw size={14} aria-hidden="true" />}
                                aria-describedby={`sheet-${s.id}`}>
                            Regrade
                        </Button>
                    </>
                ) : busy ? (
                    <span className={styles.step}>
                        <Loader2 size={12} className={styles.spin} aria-hidden="true" />
                        {s.current_step ? progressText(s.current_step) : s.status === "PENDING" ? "Waiting to start" : "Grading…"}
                    </span>
                ) : NEXT_STEP[s.status] ? (
                    <span className={styles.step}>{NEXT_STEP[s.status]}</span>
                ) : null}
            </div>
            <div role="cell" className={styles.score}>
                {hasScore ? (
                    <>
                        <span className={styles.scoreNum}>
                            <strong>{score(s.total_score as number)}</strong> / {score(s.max_score as number)}
                        </span>
                        {(s.max_score as number) > 0 && (
                            <span className={styles.percent}>{Math.round(((s.total_score as number) / (s.max_score as number)) * 100)}%</span>
                        )}
                    </>
                ) : (
                    <span className={styles.noScore}><span aria-hidden="true">–</span><span className="sr-only">No score</span></span>
                )}
            </div>
            <div role="cell" className={styles.actions}>
                {/* Says where the row leads; the name link is the target */}
                {!busy && (
                    <span className={styles.open} aria-hidden="true">
                        <span className={styles.openText}>{s.status === "NEEDS_REVIEW" ? "Review" : "Open"}</span>
                        <ChevronRight size={16} />
                    </span>
                )}
            </div>
        </div>
    );
}

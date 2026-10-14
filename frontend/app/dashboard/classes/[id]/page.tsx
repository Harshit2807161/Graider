"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Users } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useOrgContext } from "@/context/OrgContext";
import { batchService } from "@/services/batch.service";
import { examService } from "@/services/exam.service";
import { Batch, Student } from "@/types/batch.types";
import { Exam } from "@/types/exam.types";
import ButtonLink from "@/components/common/ButtonLink";
import ErrorBanner from "@/components/common/ErrorBanner";
import PageHeader from "@/components/common/PageHeader";
import { useHydrated } from "@/components/common/useHydrated";
import { useTabTitle } from "@/components/common/useTabTitle";
import Card from "@/components/ui/Card";
import styles from "./page.module.css";

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const EXAM_STATUS_LABEL: Record<Exam["status"], string> = {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
};

interface ClassData {
    batch: Batch;
    students: Student[];
    exams: Exam[];
}

/** One class: its roster and the exams set for it. */
export default function ClassDetailsPage() {
    const params = useParams();
    const batchId = params.id as string;
    const { orgs, activeOrg, isLoading: orgsLoading } = useOrgContext();
    const hydrated = useHydrated();
    const [data, setData] = useState<ClassData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNotFound(false);
        try {
            // There's no single-class endpoint: look in the active organization first, then the others
            const ordered = activeOrg ? [activeOrg, ...orgs.filter((o) => o.id !== activeOrg.id)] : orgs;
            let batch: Batch | undefined;
            for (const org of ordered) {
                batch = (await batchService.getAllByOrg(org.id)).find((b) => b.id === batchId);
                if (batch) break;
            }
            if (!batch) {
                setNotFound(true);
                setData(null);
                return;
            }
            const [students, exams] = await Promise.all([
                batchService.getStudents(batch.id),
                examService.getExams(batch.org_id, batch.id),
            ]);
            setData({ batch, students, exams });
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load class"));
        } finally {
            setLoading(false);
        }
    }, [batchId, activeOrg, orgs]);

    const orgsReady = hydrated && !(orgsLoading && orgs.length === 0);
    useEffect(() => {
        if (orgsReady) load();
    }, [orgsReady, load]);

    useTabTitle(data?.batch.name ? `${data.batch.name} · Gr8r` : null, "Classes · Gr8r");

    const crumbs = [{ label: "Classes", href: "/dashboard/classes" }, { label: data?.batch.name ?? "Class" }];

    if (!orgsReady || (loading && !data)) {
        return (
            <div className={styles.page} aria-busy="true">
                <span className="sr-only" role="status">Loading class…</span>
                <span className={cn(styles.skeleton, styles.skTitle)} />
                <span className={cn(styles.skeleton, styles.skSection)} />
                <span className={cn(styles.skeleton, styles.skSection)} />
            </div>
        );
    }

    if (notFound || error || !data) {
        return (
            <div className={styles.page}>
                <PageHeader title="Class" breadcrumbs={crumbs} />
                <ErrorBanner
                    title={notFound ? "This class couldn't be found" : "The class couldn't be loaded"}
                    detail={notFound ? "It may have been deleted, or it belongs to an organization you're not in." : error}
                    onRetry={notFound ? undefined : load}
                />
                <ButtonLink href="/dashboard/classes" variant="ghost" className={styles.backLink}
                            icon={<ArrowLeft size={16} />}>
                    Back to classes
                </ButtonLink>
            </div>
        );
    }

    const { batch, students, exams } = data;

    return (
        <div className={styles.page}>
            <PageHeader
                title={batch.name}
                breadcrumbs={crumbs}
                subtitle={
                    <span className={styles.meta}>
                        <span>{plural(students.length, "student")}</span>
                        <span>{plural(exams.length, "exam")}</span>
                        <span>Created {formatDate(batch.created_at)}</span>
                    </span>
                }
            />

            <div className={styles.sections}>
                <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <span className={styles.tile} aria-hidden="true"><ClipboardList size={18} /></span>
                        Exams
                    </h2>
                    {exams.length === 0 ? (
                        <p className={styles.empty}>No exams for this class yet.</p>
                    ) : (
                        <ul className={styles.rows} aria-label="Exams">
                            {exams.map((exam) => (
                                <li key={exam.id}>
                                    <Link href={`/dashboard/exams/${exam.id}`} className={styles.row}>
                                        <span className={styles.rowTitle}>{exam.name}</span>
                                        <span className={styles.rowMeta}>
                                            {plural(exam.question_count ?? 0, "question")}
                                        </span>
                                        <span className={cn(styles.pill, styles[`pill_${exam.status}`])}>
                                            {EXAM_STATUS_LABEL[exam.status] ?? exam.status}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <span className={styles.tile} aria-hidden="true"><Users size={18} /></span>
                        Students
                    </h2>
                    {students.length === 0 ? (
                        <p className={styles.empty}>No students on the roster yet. Upload one from the classes page.</p>
                    ) : (
                        <ul className={styles.rows} aria-label="Students">
                            {students.map((student) => (
                                <li key={student.membership_id} className={styles.row}>
                                    <span className={styles.rowTitle}>{student.full_name || student.email}</span>
                                    <span className={styles.rowMeta}>{student.email}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}

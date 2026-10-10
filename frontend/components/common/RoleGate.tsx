"use client";

import React, { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Award, Lock } from "lucide-react";
import { useOrgContext } from "@/context/OrgContext";
import ButtonLink from "./ButtonLink";
import styles from "./RoleGate.module.css";

const STUDENT_AREA = "/dashboard/results";

/**
 * Students see only their own results; everything else in the portal is for staff. Until the
 * organizations (and so the user's role) have loaded nothing is rendered, so no page fires requests
 * the user isn't allowed to make. A student opening the overview is taken to their results.
 */
export default function RoleGate({ children }: { children: ReactNode }) {
    const { loaded, isStudent, activeOrg } = useOrgContext();
    const pathname = usePathname();
    const router = useRouter();
    const inStudentArea = pathname === STUDENT_AREA || pathname.startsWith(`${STUDENT_AREA}/`);

    useEffect(() => {
        if (loaded && isStudent && pathname === "/dashboard") router.replace(STUDENT_AREA);
    }, [loaded, isStudent, pathname, router]);

    if (!loaded) {
        return <div className={styles.loading} aria-busy="true" aria-live="polite"><span className="sr-only">Loading…</span></div>;
    }
    if (isStudent && !inStudentArea) {
        if (pathname === "/dashboard") return null;
        return (
            <section className={styles.notice}>
                <span className={styles.icon} aria-hidden="true"><Lock size={28} /></span>
                <h1>This page is for teachers</h1>
                <p>Your results from {activeOrg?.name ?? "your school"} are on your results page.</p>
                <ButtonLink href={STUDENT_AREA} variant="primary" icon={<Award size={16} aria-hidden="true" />}>
                    Go to my results
                </ButtonLink>
            </section>
        );
    }
    if (!isStudent && inStudentArea) {
        return (
            <section className={styles.notice}>
                <span className={styles.icon} aria-hidden="true"><Award size={28} /></span>
                <h1>This page is for students</h1>
                <p>Students see their published results here. Teachers review answer sheets from each exam.</p>
                <ButtonLink href="/dashboard/exams" variant="primary">Go to exams</ButtonLink>
            </section>
        );
    }
    return <>{children}</>;
}

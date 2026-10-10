import type { Metadata } from "next";
import type { ReactNode } from "react";

// The pages are client components, so the browser-tab title ("Exams · Gr8r") is set here; an exam's
// page replaces it with the exam's name once the exam loads
export const metadata: Metadata = { title: "Exams" };

export default function ExamsLayout({ children }: { children: ReactNode }) {
    return children;
}

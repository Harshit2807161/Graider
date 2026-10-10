import type { Metadata } from "next";
import type { ReactNode } from "react";

// The pages are client components, so the browser-tab title ("My results · Gr8r") is set here; a result's
// page replaces it with the exam's name once it loads
export const metadata: Metadata = { title: "My results" };

export default function ResultsLayout({ children }: { children: ReactNode }) {
    return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page is a client component: "Answer sheet · Gr8r" until the sheet loads, then the student's name
// ("<student> · Gr8r"). Also makes the title change back when leaving the page.
// Absolute: the Exams layout's plain title stops the root "%s · Gr8r" template reaching this segment.
export const metadata: Metadata = { title: { absolute: "Answer sheet · Gr8r" } };

export default function AnswerSheetLayout({ children }: { children: ReactNode }) {
    return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page is a client component: "Review queue · Gr8r" until it knows the exam's name, then it names
// the exam ("Review queue · <exam> · Gr8r"). Also makes the title change back when leaving the page.
// Absolute: the Exams layout's plain title stops the root "%s · Gr8r" template reaching this segment.
export const metadata: Metadata = { title: { absolute: "Review queue · Gr8r" } };

export default function ReviewQueueLayout({ children }: { children: ReactNode }) {
    return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page is a client component, so its browser-tab title ("Classes · Gr8r") is set here
export const metadata: Metadata = { title: "Classes" };

export default function ClassesLayout({ children }: { children: ReactNode }) {
    return children;
}

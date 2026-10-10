import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page is a client component, so its browser-tab title ("Organizations · Gr8r") is set here
export const metadata: Metadata = { title: "Organizations" };

export default function OrgsLayout({ children }: { children: ReactNode }) {
    return children;
}

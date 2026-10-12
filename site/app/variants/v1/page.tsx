import type { Metadata } from "next";
import Home from "@/components/variants/v1/Home";

// Design variant v1, "The examined page". Not linked from the nav.
export const metadata: Metadata = { title: "Gr8r: AI marking for handwritten answer sheets", robots: { index: false } };

export default function Page() {
    return <Home />;
}

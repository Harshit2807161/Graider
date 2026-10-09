import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Gr8r · Grading for handwritten exams", template: "%s · Gr8r" },
  description:
    "Gr8r reads handwritten answer sheets, grades them against your rubric with a second AI examiner checking, and sends anything uncertain to the teacher.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import Link from "next/link";

import "@/app/globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Syllabus",
  description:
    "Generate a structured course on any topic and learn it chapter by chapter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${headingFont.variable} font-[family-name:var(--font-body)] antialiased`}
      >
        <div className="relative min-h-screen">
          <header className="sticky top-0 z-40 border-b border-white/5 bg-[rgba(9,11,18,0.72)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link
                href="/"
                className="font-[family-name:var(--font-heading)] text-2xl tracking-tight text-[var(--text)]"
              >
                Syllabus
              </Link>
              <nav className="flex items-center gap-5 text-sm text-[var(--muted)]">
                <Link href="/dashboard" className="transition hover:text-[var(--text)]">
                  Dashboard
                </Link>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                  MVP
                </span>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

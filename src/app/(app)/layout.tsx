import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = {
  title: "SES Academy",
  robots: { index: false, follow: false },
};

/** Eigenes Grundgerüst für Team-Bereich und Ticket-Seiten: gleiche Farben und Schriften, ohne Website-Navigation. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${bricolage.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

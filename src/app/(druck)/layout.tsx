import { Bricolage_Grotesque, Inter, Newsreader } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage" });
const newsreader = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-newsreader", style: ["normal", "italic"] });

export const metadata = { robots: { index: false, follow: false } };

/** Druckvorlagen (One-Pager) – ohne Menü und Footer. */
export default function DruckLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${bricolage.variable} ${newsreader.variable}`}>
      <body className="bg-white">{children}</body>
    </html>
  );
}

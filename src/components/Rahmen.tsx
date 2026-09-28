import { Bricolage_Grotesque, Inter, Newsreader } from "next/font/google";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { pfad, texte, type Sprache } from "@/i18n";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-newsreader", style: ["normal", "italic"], display: "swap" });

/** Gemeinsames HTML-Gerüst für alle Sprachen (jede Sprache hat ein eigenes Root-Layout, damit <html lang> stimmt). */
export function Rahmen({ l, children }: { l: Sprache; children: React.ReactNode }) {
  const t = texte[l];
  return (
    <html lang={l} className={`${inter.variable} ${bricolage.variable} ${newsreader.variable}`}>
      <body className="antialiased">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Skip
        </a>
        <Header lang={l} start={pfad(l)} nav={t.nav} bewerben={{ href: pfad(l, "/bewerbung/"), label: t.bewerbungSeite.nav }} stimmen={{ href: pfad(l, "/stimmen/"), label: t.stimmen.nav }} />
        <main id="inhalt">{children}</main>
        <Footer t={t} presse={pfad(l, "/presse/")} />
      </body>
    </html>
  );
}

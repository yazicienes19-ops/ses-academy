import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { Fehlerseite, nichtGefunden } from "@/components/Fehlerseite";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = { title: "Seite nicht gefunden | SES Academy", robots: { index: false, follow: false } };

/** 404 für Adressen, die zu keiner Seite passen (die App hat mehrere Root-Layouts, deshalb global). */
export default function GlobalNotFound() {
  return (
    <html lang="de" className={`${inter.variable} ${bricolage.variable}`}>
      <body className="min-h-dvh antialiased">
        <main>
          <Fehlerseite code="404" {...nichtGefunden}
            verweise={[{ href: "/", label: "Zur Startseite" }, { href: "/mein-bereich/", label: "Mein Bereich" }, { href: "/team/", label: "Team-Bereich" }]} />
        </main>
      </body>
    </html>
  );
}

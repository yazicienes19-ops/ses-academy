import type { Metadata } from "next";
import { Fehlerseite, nichtGefunden } from "@/components/Fehlerseite";

export const metadata: Metadata = { title: "Seite nicht gefunden | SES Academy", robots: { index: false, follow: false } };

/** 404 für Team-Bereich, Mein Bereich, Ticket- und Feedback-Seiten. */
export default function NichtGefunden() {
  return (
    <main>
      <Fehlerseite code="404" {...nichtGefunden}
        verweise={[{ href: "/", label: "Zur Startseite" }, { href: "/mein-bereich/", label: "Mein Bereich" }, { href: "/team/", label: "Team-Bereich" }]} />
    </main>
  );
}

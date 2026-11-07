"use client";

import { useEffect } from "react";
import { Fehlerseite, schiefgelaufen } from "@/components/Fehlerseite";

/** Unerwarteter Fehler im Team-Bereich, Mein Bereich oder auf Ticket- und Feedback-Seiten. */
export default function Fehler({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main>
      <title>Fehler | SES Academy</title>
      <Fehlerseite code="!" {...schiefgelaufen} kennung={error.digest}
        verweise={[{ href: "/team/", label: "Team-Bereich" }, { href: "/mein-bereich/", label: "Mein Bereich" }]}>
        <button type="button" onClick={() => retry()} className="knopf">Noch einmal versuchen</button>
      </Fehlerseite>
    </main>
  );
}

"use client";

import { useEffect } from "react";
import { Fehlerseite, schiefgelaufen } from "@/components/Fehlerseite";
import "@/app/globals.css";

/** Fehler im Root-Layout selbst: eigene Seite mit html und body, im SES-Design. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <html lang="de">
      <body className="min-h-dvh antialiased">
        <title>Fehler | SES Academy</title>
        <main>
          <Fehlerseite code="!" {...schiefgelaufen} kennung={error.digest} verweise={[{ href: "/", label: "Zur Startseite" }]}>
            <button type="button" onClick={() => retry()} className="knopf">Noch einmal versuchen</button>
          </Fehlerseite>
        </main>
      </body>
    </html>
  );
}

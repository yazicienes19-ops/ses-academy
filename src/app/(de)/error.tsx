"use client";

import { useEffect } from "react";
import { Fehlerseite, schiefgelaufen } from "@/components/Fehlerseite";

/** Unerwarteter Fehler auf der öffentlichen Website. */
export default function Fehler({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <Fehlerseite code="!" {...schiefgelaufen} kennung={error.digest} verweise={[{ href: "/", label: "Zur Startseite" }]}>
      <button type="button" onClick={() => retry()} className="knopf">Noch einmal versuchen</button>
    </Fehlerseite>
  );
}

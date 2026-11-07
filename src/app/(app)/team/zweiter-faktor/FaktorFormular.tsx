"use client";

import { useActionState } from "react";
import { faktorEinrichten, faktorPruefen, type FaktorZustand } from "@/lib/aktionen/team";

/** Einrichten (QR-Code scannen, Code bestätigen) oder Anmelden mit dem Code aus der Authenticator-App. */
export function FaktorFormular({ vorhandenerFaktor }: { vorhandenerFaktor: string | null }) {
  const start: FaktorZustand = vorhandenerFaktor ? { schritt: "pruefen", faktorId: vorhandenerFaktor } : { schritt: "start" };
  const [zustand, pruefen, laeuft] = useActionState(faktorPruefen, start);
  // Erst auf Knopfdruck einrichten: bloßes Ansehen der Seite legt keinen (unbestätigten) Faktor an
  const [einrichtung, einrichten, bereitet] = useActionState(async () => faktorEinrichten(), null as FaktorZustand | null);
  const aktiv = vorhandenerFaktor ? zustand : { ...(einrichtung ?? { schritt: "start" as const }), fehler: zustand.fehler ?? einrichtung?.fehler };

  return (
    <div className="karte mt-6">
      {aktiv.schritt === "einrichten" && (
        <div className="mb-5">
          <p>1. Eine Authenticator-App öffnen (z. B. Google Authenticator, Microsoft Authenticator, 1Password) und diesen QR-Code scannen:</p>
          <img src={aktiv.qr} alt="QR-Code für die Authenticator-App" className="mx-auto my-4 h-48 w-48 rounded-2xl bg-white p-2 ring-1 ring-line" />
          <p className="text-sm text-ink-soft">Ohne Kamera diesen Schlüssel in der App eintragen: <code className="break-all font-mono">{aktiv.geheimnis}</code></p>
          <p className="mt-4">2. Den 6-stelligen Code aus der App eingeben:</p>
        </div>
      )}
      {aktiv.schritt === "start" && (
        <form action={einrichten} className="space-y-3">
          <p>Du brauchst eine Authenticator-App auf dem Handy (z. B. Google Authenticator, Microsoft Authenticator, 1Password). Danach zeigt die Seite einen QR-Code zum Scannen.</p>
          <button type="submit" disabled={bereitet} className="knopf">{bereitet ? "Wird vorbereitet …" : "Einrichtung starten"}</button>
        </form>
      )}
      {(aktiv.schritt === "einrichten" || aktiv.schritt === "pruefen") && (
        <form action={pruefen} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="faktor_id" value={aktiv.faktorId} />
          <div className="min-w-0 flex-1">
            <label htmlFor="code" className="etikett">Code aus der App</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus className="feld text-center font-display text-2xl tracking-[0.4em]" />
          </div>
          <button type="submit" disabled={laeuft} className="knopf !py-3">{laeuft ? "Prüfe …" : "Bestätigen"}</button>
        </form>
      )}
      {aktiv.fehler && <p role="alert" className="mt-3 rounded-2xl bg-rot-hell p-3 text-sm font-semibold text-rot">{aktiv.fehler}</p>}
    </div>
  );
}

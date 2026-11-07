"use client";

import { useActionState, useEffect, useState } from "react";
import { portalWeiter, type PortalLogin } from "@/lib/aktionen/portal";

/** Wartezeit, bevor ein neuer Code angefordert werden kann (Schutz vor Mail-Flut, die Mail braucht oft etwas). */
const WARTEN_SEKUNDEN = 60;

export function LoginFormular() {
  const [z, aktion, laeuft] = useActionState<PortalLogin, FormData>(portalWeiter, { schritt: "mail" });
  const [rest, setRest] = useState(0);

  // Countdown ab dem letzten Versand (gesendetUm kommt vom Server, nur im Browser gerechnet)
  useEffect(() => {
    if (!z.gesendetUm) return;
    const ende = z.gesendetUm + WARTEN_SEKUNDEN * 1000;
    const takt = () => setRest(Math.max(0, Math.ceil((ende - Date.now()) / 1000)));
    takt();
    const id = setInterval(takt, 1000);
    return () => clearInterval(id);
  }, [z.gesendetUm]);

  if (z.schritt === "code")
    return (
      <div className="space-y-5">
        <form action={aktion} className="space-y-5">
          <p className="rounded-2xl bg-gruen-hell p-4 text-sm">
            {z.erneut ? <>Ein neuer Code ist unterwegs. Es gilt nur der Code aus der <strong>neuesten</strong> Mail. </> : <>Falls <strong>{z.email}</strong> bei uns hinterlegt ist, ist gerade eine E-Mail unterwegs. </>}
            Tippe dort auf <strong>„Jetzt anmelden“</strong> – oder gib den 6-stelligen Code hier ein.
          </p>
          <input type="hidden" name="email" value={z.email} />
          <div>
            <label htmlFor="code" className="etikett">Code aus der E-Mail</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={9} required autoFocus className="feld text-center font-display text-2xl tracking-[0.4em]" />
          </div>
          {z.fehler && <p role="alert" className="text-sm font-semibold text-rot">{z.fehler}</p>}
          <button className="knopf w-full py-3" disabled={laeuft}>{laeuft ? "Wird geprüft …" : "Anmelden"}</button>
        </form>
        <div className="rounded-2xl bg-paper-deep/60 p-4 text-sm">
          <p className="font-semibold">Keine Mail bekommen?</p>
          <p className="mt-1 text-ink-soft">
            Die Mail kann ein, zwei Minuten brauchen. Schau bitte auch im Spam- oder Werbung-Ordner nach (Absender: SES Academy, ses@islamrat.de).
            Kommt nichts an, ist die Adresse vielleicht nicht bei uns hinterlegt: Schreib uns dann an ses@islamrat.de.
          </p>
          <form action={aktion} className="mt-3">
            <input type="hidden" name="email" value={z.email} />
            <input type="hidden" name="erneut" value="ja" />
            <button className="knopf-hell" disabled={laeuft || rest > 0}>{rest > 0 ? `Code erneut senden (in ${rest} s)` : "Code erneut senden"}</button>
          </form>
        </div>
        <button type="button" onClick={() => window.location.reload()} className="block w-full text-center text-sm text-ink-soft underline underline-offset-4">Andere E-Mail-Adresse verwenden</button>
      </div>
    );
  return (
    <form action={aktion} className="space-y-5">
      <div>
        <label htmlFor="email" className="etikett">E-Mail-Adresse</label>
        <input id="email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={z.email} className="feld" placeholder="name@beispiel.de" />
        <p className="mt-2 text-sm text-ink-soft">Die Adresse, mit der du bei der SES Academy angemeldet bist.</p>
      </div>
      {z.fehler && <p role="alert" className="text-sm font-semibold text-rot">{z.fehler}</p>}
      <button className="knopf w-full py-3" disabled={laeuft}>{laeuft ? "Wird gesendet …" : "Anmeldelink schicken"}</button>
    </form>
  );
}

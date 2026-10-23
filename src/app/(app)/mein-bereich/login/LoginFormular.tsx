"use client";

import { useActionState } from "react";
import { portalWeiter, type PortalLogin } from "@/lib/aktionen/portal";

export function LoginFormular() {
  const [z, aktion, laeuft] = useActionState<PortalLogin, FormData>(portalWeiter, { schritt: "mail" });
  if (z.schritt === "code")
    return (
      <form action={aktion} className="space-y-5">
        <p className="rounded-2xl bg-gruen-hell p-4 text-sm">
          Falls <strong>{z.email}</strong> bei uns hinterlegt ist, ist gerade eine E-Mail unterwegs. Tippe dort auf <strong>„Jetzt anmelden“</strong> – oder gib den 6-stelligen Code hier ein.
        </p>
        <input type="hidden" name="email" value={z.email} />
        <div>
          <label htmlFor="code" className="etikett">Code aus der E-Mail</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus className="feld text-center font-display text-2xl tracking-[0.4em]" />
        </div>
        {z.fehler && <p role="alert" className="text-sm font-semibold text-rot">{z.fehler}</p>}
        <button className="knopf w-full py-3" disabled={laeuft}>{laeuft ? "Wird geprüft …" : "Anmelden"}</button>
        <button type="button" onClick={() => window.location.reload()} className="block w-full text-center text-sm text-ink-soft underline underline-offset-4">Andere E-Mail-Adresse verwenden</button>
      </form>
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

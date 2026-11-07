"use client";

import { useActionState, useEffect, useState } from "react";
import { portalWeiter, type PortalLogin } from "@/lib/aktionen/portal";
import { bereichTexte, type BereichSprache } from "@/lib/bereich-texte";

/** Wartezeit, bevor ein neuer Code angefordert werden kann (Schutz vor Mail-Flut, die Mail braucht oft etwas). */
const WARTEN_SEKUNDEN = 60;

const fehlerText = { email: "loginFehlerEmail", zuViele: "loginFehlerZuViele", ziffern: "loginFehlerZiffern", code: "loginFehlerCode" } as const;

export function LoginFormular({ l }: { l: BereichSprache }) {
  const t = bereichTexte[l];
  const [z, aktion, laeuft] = useActionState<PortalLogin, FormData>(portalWeiter, { schritt: "mail" });
  const [rest, setRest] = useState(0);
  const fehler = z.fehler ? t[fehlerText[z.fehler]] : null;

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
            {z.erneut ? t.loginNeuUnterwegs : t.loginUnterwegs(z.email ?? "")} {t.loginTippen}
          </p>
          <input type="hidden" name="email" value={z.email} />
          <div>
            <label htmlFor="code" className="etikett">{t.loginCode}</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={9} required autoFocus className="feld text-center font-display text-2xl tracking-[0.4em]" />
          </div>
          {fehler && <p role="alert" className="text-sm font-semibold text-rot">{fehler}</p>}
          <button className="knopf w-full py-3" disabled={laeuft}>{laeuft ? t.loginPrueft : t.loginAnmelden}</button>
        </form>
        <div className="rounded-2xl bg-paper-deep/60 p-4 text-sm">
          <p className="font-semibold">{t.loginKeineMail}</p>
          <p className="mt-1 text-ink-soft">{t.loginSpam}</p>
          <form action={aktion} className="mt-3">
            <input type="hidden" name="email" value={z.email} />
            <input type="hidden" name="sprache" value={l} />
            <input type="hidden" name="erneut" value="ja" />
            <button className="knopf-hell" disabled={laeuft || rest > 0}>{rest > 0 ? t.loginErneutIn(rest) : t.loginErneut}</button>
          </form>
        </div>
        <button type="button" onClick={() => window.location.reload()} className="block w-full text-center text-sm text-ink-soft underline underline-offset-4">{t.loginAndereAdresse}</button>
      </div>
    );
  return (
    <form action={aktion} className="space-y-5">
      <input type="hidden" name="sprache" value={l} />
      <div>
        <label htmlFor="email" className="etikett">{t.loginEmail}</label>
        <input id="email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={z.email} className="feld" placeholder="name@beispiel.de" />
        <p className="mt-2 text-sm text-ink-soft">{t.loginEmailHilfe}</p>
      </div>
      {fehler && <p role="alert" className="text-sm font-semibold text-rot">{fehler}</p>}
      <button className="knopf w-full py-3" disabled={laeuft}>{laeuft ? t.loginSendet : t.loginSenden}</button>
    </form>
  );
}

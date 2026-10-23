"use client";

import { useActionState } from "react";
import { passwortAendern, type PasswortZustand } from "@/lib/aktionen/teamverwaltung";

export function PasswortFormular() {
  const [zustand, aktion, sendet] = useActionState<PasswortZustand, FormData>(passwortAendern, { meldung: null, ok: false });
  const feld = "w-full rounded-2xl bg-white/80 px-4 py-3.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-ink";
  return (
    <form action={aktion} className="mt-6 grid gap-4">
      <div><label htmlFor="neu" className="mb-1.5 block text-sm font-semibold">Neues Passwort</label>
        <input id="neu" name="neu" type="password" required minLength={10} autoComplete="new-password" className={feld} /></div>
      <div><label htmlFor="wiederholung" className="mb-1.5 block text-sm font-semibold">Wiederholen</label>
        <input id="wiederholung" name="wiederholung" type="password" required minLength={10} autoComplete="new-password" className={feld} /></div>
      {zustand.meldung && <p role="status" className={zustand.ok ? "font-semibold text-emerald-900" : "font-semibold text-red-900"}>{zustand.meldung}</p>}
      <button type="submit" disabled={sendet} className="rounded-full bg-ink px-6 py-3.5 font-semibold text-paper disabled:opacity-60">Speichern</button>
    </form>
  );
}

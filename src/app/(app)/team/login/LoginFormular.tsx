"use client";

import { useActionState } from "react";
import { anmelden, type LoginZustand } from "@/lib/aktionen/team";

export function LoginFormular() {
  const [zustand, aktion, sendet] = useActionState<LoginZustand, FormData>(anmelden, { fehler: null });
  const feld = "w-full rounded-2xl bg-white/80 px-4 py-3.5 text-lg ring-1 ring-line outline-none focus:ring-2 focus:ring-ink";
  return (
    <form action={aktion} className="mt-8 grid gap-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">E-Mail</label>
        <input id="email" name="email" type="email" required autoComplete="username" className={feld} />
      </div>
      <div>
        <label htmlFor="passwort" className="mb-1.5 block text-sm font-semibold">Passwort</label>
        <input id="passwort" name="passwort" type="password" required autoComplete="current-password" className={feld} />
      </div>
      {zustand.fehler && <p role="alert" className="text-sm font-semibold text-red-800">{zustand.fehler}</p>}
      <button type="submit" disabled={sendet} className="rounded-full bg-ink px-8 py-4 text-lg font-semibold text-paper transition hover:bg-forest disabled:opacity-60">
        {sendet ? "Anmelden …" : "Anmelden"}
      </button>
    </form>
  );
}

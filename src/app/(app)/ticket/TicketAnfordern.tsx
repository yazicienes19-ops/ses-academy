"use client";

import { useActionState } from "react";
import type { Sprache } from "@/i18n/typ";
import { ticketAnfordern } from "@/lib/aktionen/anmeldung";
import { portalTexte } from "@/lib/portal-texte";

export function TicketAnfordern({ l }: { l: Sprache }) {
  const t = portalTexte[l];
  const [zustand, aktion, sendet] = useActionState(ticketAnfordern, { gesendet: false });
  if (zustand.gesendet) return <p role="status" className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-line">{t.verlorenOk}</p>;
  return (
    <form action={aktion} className="mt-6 flex flex-col gap-3 sm:flex-row">
      <label htmlFor="email" className="sr-only">E-Mail</label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="name@beispiel.de"
        className="min-w-0 flex-1 rounded-2xl bg-white/80 px-4 py-3.5 text-lg ring-1 ring-line outline-none focus:ring-2 focus:ring-ink" />
      <button type="submit" disabled={sendet} className="rounded-full bg-ink px-6 py-3.5 font-semibold text-paper disabled:opacity-60">{t.verlorenSenden}</button>
    </form>
  );
}

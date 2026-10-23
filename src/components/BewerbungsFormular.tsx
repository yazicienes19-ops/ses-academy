"use client";

import { useState, useTransition } from "react";
import type { Sprache, Texte } from "@/i18n/typ";
import { bewerbungAbsenden, type BewerbungZustand } from "@/lib/aktionen/bewerbung";
import { Pfeil } from "./Pfeil";

// Die Bewerbung wird serverseitig gespeichert (Supabase) und per E-Mail bestätigt.
export function BewerbungsFormular({ t, l }: { t: Texte["bewerbungSeite"]; l: Sprache }) {
  const f = t.felder;
  const [zustand, setZustand] = useState<BewerbungZustand>({ status: "leer" });
  const [sendet, starte] = useTransition();

  // Über onSubmit statt form action, damit die Eingaben bei einem Fehler stehen bleiben.
  function absenden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const daten = new FormData(e.currentTarget);
    starte(async () => setZustand(await bewerbungAbsenden(zustand, daten)));
  }
  const jahr = new Date().getFullYear();

  if (zustand.status === "ok") {
    return (
      <p role="status" className="rounded-3xl bg-white/80 p-8 text-lg ring-1 ring-line">
        {t.danke}
      </p>
    );
  }

  const feld = "w-full rounded-2xl bg-white/80 px-4 py-3.5 text-lg ring-1 ring-line outline-none transition focus:ring-2 focus:ring-ink";
  const label = "mb-1.5 block text-sm font-semibold";
  const opt = <span className="font-normal text-ink-soft"> ({f.optional})</span>;

  return (
    <form onSubmit={absenden} className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="sprache" value={l} />
      {/* Spam-Falle, für Menschen unsichtbar */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="webseite">Webseite</label>
        <input id="webseite" name="webseite" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="vorname" className={label}>{f.vorname}</label>
        <input id="vorname" name="vorname" required autoComplete="given-name" className={feld} />
      </div>
      <div>
        <label htmlFor="nachname" className={label}>{f.nachname}</label>
        <input id="nachname" name="nachname" required autoComplete="family-name" className={feld} />
      </div>
      <div>
        <label htmlFor="email" className={label}>{f.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={feld} />
      </div>
      <div>
        <label htmlFor="telefon" className={label}>{f.telefon}{opt}</label>
        <input id="telefon" name="telefon" type="tel" autoComplete="tel" className={feld} />
      </div>
      <div>
        <label htmlFor="geburtsjahr" className={label}>{f.geburtsjahr}</label>
        <input id="geburtsjahr" name="geburtsjahr" type="number" inputMode="numeric" required min={jahr - 31} max={jahr - 17} className={feld} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="land" className={label}>{f.land}</label>
          <input id="land" name="land" required autoComplete="country-name" className={feld} />
        </div>
        <div>
          <label htmlFor="stadt" className={label}>{f.stadt}</label>
          <input id="stadt" name="stadt" required autoComplete="address-level2" className={feld} />
        </div>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className={label}>{f.sprachen}</legend>
        <div className="flex flex-wrap gap-2">
          {[f.spracheEn, f.spracheTr, f.spracheLand].map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-paper">
              <input type="checkbox" name="sprachen" value={s} className="accent-[var(--signal)]" />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2">
        <label htmlFor="motivation" className={label}>{f.motivation}</label>
        <p id="motivation-hilfe" className="mb-2 text-sm text-ink-soft">{f.motivationHilfe}</p>
        <textarea id="motivation" name="motivation" required rows={6} aria-describedby="motivation-hilfe" className={feld} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="quelle" className={label}>{f.quelle}{opt}</label>
        <input id="quelle" name="quelle" className={feld} />
      </div>

      <label className="flex cursor-pointer gap-3 sm:col-span-2">
        <input type="checkbox" name="einwilligung" value="ja" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--ink)]" />
        <span className="text-ink-soft">{t.einwilligung}</span>
      </label>

      <div className="sm:col-span-2">
        <button type="submit" disabled={sendet} className="w-full rounded-full bg-ink px-8 py-4 text-lg font-semibold text-paper transition hover:bg-forest disabled:opacity-60 sm:w-auto">
          {t.senden} <Pfeil className="ml-2" />
        </button>
        <p className="mt-3 text-sm text-ink-soft" role="status">
          {zustand.status === "fehler" ? t.fehler : zustand.status === "doppelt" ? t.doppelt : t.hinweis}
        </p>
      </div>
    </form>
  );
}

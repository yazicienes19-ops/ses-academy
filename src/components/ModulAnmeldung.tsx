"use client";

import { useEffect, useState, useTransition } from "react";
import type { Sprache, Texte } from "@/i18n/typ";
import { gastAnmelden, modulOffen, type AnmeldungZustand, type ModulOffen } from "@/lib/aktionen/anmeldung";
import { portalTexte } from "@/lib/portal-texte";
import { Pfeil } from "./Pfeil";

/**
 * Anmeldeformular für Gäste auf der Seminarseite. Die Seite selbst ist statisch,
 * deshalb fragt das Formular beim Laden nach, ob das Modul gerade offen ist.
 */
export function ModulAnmeldung({ l, slug, felder: f }: { l: Sprache; slug: string; felder: Texte["bewerbungSeite"]["felder"] }) {
  const t = portalTexte[l];
  const [lage, setLage] = useState<ModulOffen | null>(null);
  const [zustand, setZustand] = useState<AnmeldungZustand>({ status: "leer" });
  const [sendet, starte] = useTransition();

  useEffect(() => {
    modulOffen(slug).then(setLage).catch(() => setLage({ offen: false }));
  }, [slug]);

  if (!lage?.offen) return null;

  function absenden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const daten = new FormData(e.currentTarget);
    starte(async () => setZustand(await gastAnmelden(zustand, daten)));
  }

  const fertig = { angemeldet: t.anmeldungOk, warteliste: t.anmeldungWarteliste, schon: t.anmeldungSchon }[zustand.status as "angemeldet"];
  const feld = "w-full rounded-2xl bg-white/80 px-4 py-3.5 text-lg ring-1 ring-line outline-none transition focus:ring-2 focus:ring-ink";
  const label = "mb-1.5 block text-sm font-semibold";

  return (
    <section id="anmeldung" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
      <div className="max-w-3xl rounded-[2rem] bg-forest p-6 text-paper sm:p-10">
        <h2 className="font-display text-3xl font-bold">{t.anmeldungTitel}</h2>
        <p className="mt-2 text-paper/80">{t.anmeldungIntro}</p>
        {lage.frei !== null && (
          <p className="mt-3 w-fit rounded-full bg-signal px-4 py-1.5 text-sm font-semibold text-ink">
            {lage.frei > 0 ? t.anmeldungFrei(lage.frei) : t.anmeldungVoll}
          </p>
        )}
        {fertig ? (
          <p role="status" className="mt-6 rounded-3xl bg-paper p-6 text-lg text-ink">{fertig}</p>
        ) : (
          <form onSubmit={absenden} className="mt-6 grid gap-4 text-ink sm:grid-cols-2">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="sprache" value={l} />
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="anm-webseite">Webseite</label>
              <input id="anm-webseite" name="webseite" tabIndex={-1} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="anm-vorname" className={`${label} text-paper`}>{f.vorname}</label>
              <input id="anm-vorname" name="vorname" required autoComplete="given-name" className={feld} />
            </div>
            <div>
              <label htmlFor="anm-nachname" className={`${label} text-paper`}>{f.nachname}</label>
              <input id="anm-nachname" name="nachname" required autoComplete="family-name" className={feld} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="anm-email" className={`${label} text-paper`}>{f.email}</label>
              <input id="anm-email" name="email" type="email" required autoComplete="email" className={feld} />
            </div>
            <label className="flex cursor-pointer gap-3 text-paper sm:col-span-2">
              <input type="checkbox" name="einwilligung" value="ja" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--signal)]" />
              <span className="text-paper/80">{t.anmeldungEinwilligung}</span>
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={sendet} className="w-full rounded-full bg-signal px-8 py-4 text-lg font-semibold text-ink transition hover:bg-paper disabled:opacity-60 sm:w-auto">
                {t.anmeldungSenden} <Pfeil className="ml-2" />
              </button>
              {zustand.status === "fehler" && <p role="alert" className="mt-3 text-sm text-signal">{t.anmeldungFehler}</p>}
            </div>
          </form>
        )}
        <a href={`/ticket/?sprache=${l}`} className="mt-6 inline-block text-sm text-paper/70 underline">{t.verlorenLink}</a>
      </div>
    </section>
  );
}

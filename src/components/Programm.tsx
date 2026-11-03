"use client";

import Link from "next/link";
import { statusListe, useHeute, type Status } from "./status";
import type { Modul } from "@/i18n/daten";
import type { Texte } from "@/i18n/typ";
import { Pfeil } from "./Pfeil";

/** Vom Server vorbereitete, sprachspezifische Moduldaten. */
export type Eintrag = Modul & { titel: string; datum: string; ortText: string; artText: string; href: string; teaser: string };

function useStatus(eintraege: Eintrag[]): Status[] {
  return statusListe(eintraege, useHeute());
}

export function Naechstes({ eintraege, t }: { eintraege: Eintrag[]; t: Texte }) {
  const status = useStatus(eintraege);
  const i = status.indexOf("naechstes");
  if (i < 0) return null;
  const m = eintraege[i];
  return (
    <section className="muster relative overflow-hidden bg-forest text-paper" aria-labelledby="naechstes-titel">
      <div className="absolute inset-0 bg-forest/94" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:gap-16 lg:px-10">
        <div>
          <p className="mono flex items-center gap-3 text-xs tracking-[0.14em] text-signal uppercase">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="puls absolute inline-flex h-full w-full rounded-full bg-signal" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
            </span>
            {t.naechstes.kicker} • {t.programm.modul} {String(i + 1).padStart(2, "0")} • {m.artText}
          </p>
          <h2 id="naechstes-titel" className="font-display mt-5 text-[clamp(2rem,4.2vw,3.4rem)] leading-[1] font-extrabold">
            {m.titel}
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-paper/80">{m.teaser}</p>
        </div>
        <div className="flex flex-col justify-end gap-6 border-t border-paper/25 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <div>
            <p className="font-display text-3xl leading-tight font-extrabold sm:text-4xl">{m.datum}</p>
            <p className="mono mt-2 text-sm text-paper/70">{m.ortText}</p>
          </div>
          <Link href={m.href} className="inline-flex items-center self-start bg-signal px-6 py-4 font-semibold text-ink transition hover:bg-paper">
            {t.naechstes.mehr} <Pfeil className="ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ProgrammListe({ eintraege, t }: { eintraege: Eintrag[]; t: Texte }) {
  const status = useStatus(eintraege);
  const label: Record<Status, string> = { vorbei: `✓ ${t.programm.vorbei}`, naechstes: `● ${t.programm.naechstes}`, geplant: t.programm.geplant };
  return (
    <ol className="border-t border-ink">
      {eintraege.map((m, i) => {
        const s = status[i];
        return (
          <li key={m.slug} className="border-b border-line">
            <Link
              href={m.href}
              className={`group grid gap-3 px-1 py-6 transition sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:gap-8 sm:px-4 ${
                s === "naechstes" ? "bg-signal" : "hover:bg-paper"
              }`}
            >
              <span className="mono text-sm text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="mono flex flex-wrap gap-x-3 gap-y-1 text-[11px] tracking-[0.12em] uppercase">
                  <span>{m.artText}</span>
                  <span className={s === "naechstes" ? "font-semibold" : "text-ink-soft"}>{label[s]}</span>
                </p>
                <h3 className="font-display mt-2 text-2xl leading-tight font-bold sm:text-3xl">{m.titel}</h3>
                <p className="mono mt-2 text-xs text-ink-soft">
                  {m.datum} · {m.ortText}
                </p>
              </div>
              <span className="text-sm font-semibold whitespace-nowrap underline-offset-4 group-hover:underline">{t.programm.details} <Pfeil className="ml-1" /></span>
            </Link>
          </li>
        );
      })}
      <li className="grid gap-3 px-1 py-6 sm:grid-cols-[4rem_1fr] sm:gap-8 sm:px-4">
        <span className="mono text-sm text-ink-soft">+</span>
        <div>
          <p className="font-display text-2xl font-bold">{t.programm.weitereTitel}</p>
          <p className="mt-2 max-w-2xl text-ink-soft">{t.programm.weitereText}</p>
        </div>
      </li>
    </ol>
  );
}

/** Live-Status im Editorial-Hero: nächstes Modul, Klick springt zum Programm. Wechselt automatisch nach jedem Modul. */
export function NaechstesBadge({
  eintraege,
  kicker,
  modulWort,
  kurzDaten,
  ortOffen,
  className = "",
}: {
  eintraege: Eintrag[];
  kicker: string;
  modulWort: string;
  kurzDaten: string[];
  ortOffen: string;
  className?: string;
}) {
  const status = useStatus(eintraege);
  const i = status.indexOf("naechstes");
  if (i < 0) return null;
  const m = eintraege[i];
  const stadt = m.ort ? m.ort.split(" ").pop() : ortOffen;
  return (
    <a
      href="#programm"
      className={`group block max-w-[19rem] bg-signal px-5 py-4 text-ink shadow-[0_18px_40px_-18px_rgb(17_22_19/0.45)] transition hover:-translate-y-0.5 hover:bg-paper ${className}`}
    >
      <span className="mono flex items-center gap-2.5 text-[11px] font-medium tracking-[0.12em] uppercase">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="puls absolute inline-flex h-full w-full rounded-full bg-forest" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-forest" />
        </span>
        {kicker} • {modulWort} {String(i + 1).padStart(2, "0")}
      </span>
      <span className="font-display mt-2 block text-lg leading-snug font-bold">{m.titel.split(/\s[–:]\s/)[0]}</span>
      <span className="mono mt-1 block text-xs text-ink/70">
        {kurzDaten[i]} {m.von.slice(0, 4)}, {stadt} <span className="pfeil pfeil-runter inline-block" aria-hidden>↓</span>
      </span>
    </a>
  );
}

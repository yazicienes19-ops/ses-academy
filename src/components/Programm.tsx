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

function Pin({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M8 14.5s4.5-4.2 4.5-8A4.5 4.5 0 0 0 3.5 6.5c0 3.8 4.5 8 4.5 8Z" />
      <circle cx="8" cy="6.5" r="1.6" />
    </svg>
  );
}

/** Kompakte Index-Zeile für vergangene und kommende Module (Desktop einzeilig, ~64px). */
function IndexZeile({ m, nr, s, t }: { m: Eintrag; nr: number; s: Status; t: Texte }) {
  const vorbei = s === "vorbei";
  return (
    <li className="border-b border-line">
      <Link
        href={m.href}
        className={`group grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-1 py-4 transition hover:bg-paper md:min-h-16 md:grid-cols-[3rem_auto_1fr_auto_auto] md:gap-x-6 md:py-3 ${
          vorbei ? "" : "text-ink/60"
        }`}
      >
        <span className="mono text-xs text-ink-soft">[{String(nr).padStart(2, "0")}]</span>
        <span className="mono w-fit border border-current/30 px-2 py-0.5 text-[10px] tracking-[0.12em] uppercase md:order-none">
          {m.artText} {vorbei ? "✓" : `· ${t.programm.geplant}`}
        </span>
        <span className="mono justify-self-end text-xs whitespace-nowrap underline-offset-4 group-hover:underline md:order-last">
          {vorbei ? t.berichte.kicker : t.programm.details} <Pfeil className="ml-1" />
        </span>
        <span title={m.titel} className="font-display col-span-2 col-start-2 text-lg leading-snug font-bold md:col-span-1 md:col-start-auto md:truncate">{m.titel}</span>
        <span className="mono col-span-2 col-start-2 text-xs text-ink-soft md:col-span-1 md:col-start-auto md:text-right md:whitespace-nowrap">
          {m.datum} · {m.ort ? m.ort.split(" ").pop() : m.ortText}
        </span>
      </Link>
    </li>
  );
}

export function ProgrammListe({ eintraege, t }: { eintraege: Eintrag[]; t: Texte }) {
  const status = useStatus(eintraege);
  const zeilen = (welche: Status) =>
    eintraege.flatMap((m, i) => (status[i] === welche ? [<IndexZeile key={m.slug} m={m} nr={i + 1} s={welche} t={t} />] : []));
  const n = status.indexOf("naechstes");
  const m = n >= 0 ? eintraege[n] : null;

  return (
    <div>
      <ol className="border-t border-ink">{zeilen("vorbei")}</ol>

      {m && (
        <article className="my-6 grid gap-8 bg-signal p-6 text-ink sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-14">
          <div>
            <p className="mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-[0.14em] uppercase">
              <span className="flex items-center gap-2 font-semibold">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="puls absolute inline-flex h-full w-full rounded-full bg-ink" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-ink" />
                </span>
                {t.naechstes.kicker}
              </span>
              <span>
                {t.programm.modul} {String(n + 1).padStart(2, "0")} · {m.artText}
              </span>
            </p>
            <h3 className="font-display mt-4 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.02] font-extrabold">{m.titel}</h3>
            <p className="mt-4 max-w-2xl text-ink/75">{m.teaser}</p>
            <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-ink/20 pt-4">
              <p className="font-display text-2xl font-extrabold">{m.datum}</p>
              <p className="mono flex items-center gap-1.5 text-xs">
                <Pin className="shrink-0" />
                {m.ortText}
              </p>
            </div>
          </div>
          <Link href={m.href} className="inline-flex items-center self-start bg-ink px-6 py-4 font-semibold whitespace-nowrap text-paper transition hover:bg-forest lg:self-end">
            {t.programm.spotlightCta} <Pfeil className="ml-2" />
          </Link>
        </article>
      )}

      <ol className={m ? "" : "border-t border-ink"}>
        {zeilen("geplant")}
        <li className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-dashed border-ink/25 py-4 text-ink/60 md:grid-cols-[3rem_1fr] md:gap-x-6">
          <span className="mono text-xs">[+]</span>
          <div>
            <p className="font-display text-lg font-bold">{t.programm.weitereTitel}</p>
            <p className="mt-1 max-w-2xl text-sm">{t.programm.weitereText}</p>
          </div>
        </li>
      </ol>
    </div>
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

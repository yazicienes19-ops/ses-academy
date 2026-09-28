"use client";

import Link from "next/link";
import { statusListe, useHeute, type Status } from "./status";
import type { Modul } from "@/i18n/daten";
import type { Texte } from "@/i18n/typ";

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
    <section className="px-4 sm:px-6 lg:px-10" aria-labelledby="naechstes-titel">
      <div className="muster relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-forest text-paper">
        <div className="absolute inset-0 bg-forest/92" aria-hidden />
        <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:p-16">
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-signal uppercase">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
              </span>
              {t.naechstes.kicker} · {m.artText}
            </p>
            <h2 id="naechstes-titel" className="font-display mt-6 text-[clamp(2rem,4.6vw,3.8rem)] leading-[1] font-extrabold">
              {m.titel}
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-paper/80">{m.teaser}</p>
          </div>
          <div className="flex flex-col justify-between gap-8">
            <div className="rounded-3xl bg-paper p-6 text-ink">
              <p className="font-display text-3xl leading-tight font-extrabold sm:text-4xl">{m.datum}</p>
              <p className="mt-2 text-ink-soft">{m.ortText}</p>
            </div>
            <Link href={m.href} className="self-start rounded-full bg-signal px-7 py-4 font-semibold text-ink transition hover:bg-paper">
              {t.naechstes.mehr} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProgrammListe({ eintraege, t }: { eintraege: Eintrag[]; t: Texte }) {
  const status = useStatus(eintraege);
  const label: Record<Status, string> = { vorbei: `✓ ${t.programm.vorbei}`, naechstes: `● ${t.programm.naechstes}`, geplant: t.programm.geplant };
  return (
    <ol className="grid gap-3">
      {eintraege.map((m, i) => {
        const s = status[i];
        return (
          <li key={m.slug}>
            <Link
              href={m.href}
              className={`group grid gap-4 rounded-3xl p-6 transition sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:gap-8 sm:p-8 ${
                s === "naechstes"
                  ? "bg-signal text-ink"
                  : s === "vorbei"
                    ? "bg-white/50 ring-1 ring-line hover:bg-white"
                    : "bg-paper-deep/60 ring-1 ring-line hover:bg-paper-deep"
              }`}
            >
              <span className="font-display text-5xl font-extrabold text-ink/25">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold">{m.artText}</span>
                  <span className={s === "naechstes" ? "font-bold" : "text-ink-soft"}>{label[s]}</span>
                </div>
                <h3 className="font-display mt-2 text-2xl leading-tight font-bold sm:text-3xl">{m.titel}</h3>
                <p className="mt-2 text-ink-soft">
                  {m.datum} · {m.ortText}
                </p>
              </div>
              <span className="text-sm font-semibold whitespace-nowrap underline-offset-4 group-hover:underline">{t.programm.details} →</span>
            </Link>
          </li>
        );
      })}
      <li className="rounded-3xl border-2 border-dashed border-ink/20 p-6 sm:p-8">
        <p className="font-display text-2xl font-bold">{t.programm.weitereTitel}</p>
        <p className="mt-2 max-w-2xl text-ink-soft">{t.programm.weitereText}</p>
      </li>
    </ol>
  );
}

/** Sticker im Hero: nächstes Modul mit Datum – wechselt automatisch nach jedem Modul. */
export function NaechstesSticker({ eintraege, kicker, kurzDaten }: { eintraege: Eintrag[]; kicker: string; kurzDaten: string[] }) {
  const status = useStatus(eintraege);
  const i = status.indexOf("naechstes");
  if (i < 0) return null;
  const m = eintraege[i];
  return (
    <Link
      href={m.href}
      className="absolute -top-5 -left-3 block rotate-[-6deg] rounded-2xl bg-signal px-5 py-3 shadow-lg transition hover:rotate-[-3deg] sm:-left-8"
    >
      <span className="block text-xs font-semibold">
        {kicker} · {m.artText}
      </span>
      <span className="font-display block text-3xl leading-none font-extrabold">{kurzDaten[i]}</span>
      <span className="block text-xs font-semibold">{m.ort ? m.ort.split(",").pop()!.replace(/\d+/g, "").trim() : ""} →</span>
    </Link>
  );
}

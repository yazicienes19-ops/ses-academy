"use client";

import Link from "next/link";
import { useState } from "react";
import type { Beitrag, BeitragTyp, Land } from "@/i18n/stimmen";
import type { ModulSlug, Texte } from "@/i18n/typ";

export type Karte = Beitrag & { href: string; modulTitel?: string; datumText: string; lesezeitMin?: number };

export function StimmenListe({ karten, t }: { karten: Karte[]; t: Texte["stimmen"] }) {
  const [modul, setModul] = useState<ModulSlug | "alle">("alle");
  const [land, setLand] = useState<Land | "alle">("alle");
  const [typ, setTyp] = useState<BeitragTyp | "alle">("alle");

  const modulListe = [...new Map(karten.flatMap((k) => (k.modul && k.modulTitel ? [[k.modul, k.modulTitel] as const] : []))).entries()];
  const laender = [...new Set(karten.map((k) => k.land))];
  const typen = [...new Set(karten.map((k) => k.typ))];
  const sichtbar = karten.filter(
    (k) => (modul === "alle" || k.modul === modul) && (land === "alle" || k.land === land) && (typ === "alle" || k.typ === typ),
  );

  if (karten.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink/20 p-10 text-center">
        <p className="font-display text-3xl font-bold">{t.leer}</p>
      </div>
    );
  }

  const chip = (aktiv: boolean) =>
    ` px-4 py-2 text-sm font-semibold transition ${aktiv ? "bg-ink text-paper" : "bg-white/60 ring-1 ring-line hover:bg-white"}`;

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:gap-x-10">
        {typen.length > 1 && (
          <div role="group" aria-label={t.filterTyp} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-ink-soft">{t.filterTyp}</span>
            <button type="button" className={chip(typ === "alle")} onClick={() => setTyp("alle")} aria-pressed={typ === "alle"}>
              {t.alle}
            </button>
            {typen.map((x) => (
              <button key={x} type="button" className={chip(typ === x)} onClick={() => setTyp(x)} aria-pressed={typ === x}>
                {t.typ[x]}
              </button>
            ))}
          </div>
        )}
        {modulListe.length > 1 && (
          <div role="group" aria-label={t.filterModul} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-ink-soft">{t.filterModul}</span>
            <button type="button" className={chip(modul === "alle")} onClick={() => setModul("alle")} aria-pressed={modul === "alle"}>
              {t.alle}
            </button>
            {modulListe.map(([slug, titel]) => (
              <button key={slug} type="button" className={chip(modul === slug)} onClick={() => setModul(slug)} aria-pressed={modul === slug}>
                {titel.split(/[–:]/)[0].trim()}
              </button>
            ))}
          </div>
        )}
        {laender.length > 1 && (
          <div role="group" aria-label={t.filterLand} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-ink-soft">{t.filterLand}</span>
            <button type="button" className={chip(land === "alle")} onClick={() => setLand("alle")} aria-pressed={land === "alle"}>
              {t.alle}
            </button>
            {laender.map((l) => (
              <button key={l} type="button" className={chip(land === l)} onClick={() => setLand(l)} aria-pressed={land === l}>
                {t.laender[l]}
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {sichtbar.map((k) => (
          <li key={k.slug}>
            <StimmenKarte k={k} t={t} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Magazin-Karte: Mono-Metazeile, große Serif-Überschrift, Lesezeit, Autor/Datum + Lesen-Link. */
export function StimmenKarte({ k, t }: { k: Karte; t: Texte["stimmen"] }) {
  return (
    <Link href={k.href} className="group flex h-full flex-col border-t-2 border-ink pt-4">
      <p className="mono flex flex-wrap items-center gap-x-2 text-[11px] tracking-[0.12em] text-ink-soft uppercase">
        {k.muster && <span className="bg-signal px-1.5 text-ink">{t.muster}</span>}
        <span className="font-semibold text-ink">{t.typ[k.typ]}</span>
        <span aria-hidden>•</span>
        <span>{t.laender[k.land]}</span>
        <span aria-hidden>•</span>
        <span>[{k.sprache}]</span>
      </p>
      <p lang={k.sprache} className="mt-4 font-serif text-[1.7rem] leading-[1.12] font-medium tracking-[-0.01em] text-balance decoration-1 underline-offset-4 group-hover:underline">
        {k.titel}
      </p>
      <p lang={k.sprache} className="mt-3 text-ink-soft">{k.teaser}</p>
      {k.lesezeitMin && <p className="mono mt-4 text-[11px] tracking-[0.12em] text-ink-soft uppercase">◷ {t.lesezeit.replace("{n}", String(k.lesezeitMin))}</p>}
      <div className="min-h-6 flex-1" aria-hidden />
      <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
        <p className="text-sm">
          <span className="font-semibold">{k.autor.name}</span>
          {k.autor.alter ? `, ${k.autor.alter}` : ""}
          {k.autor.stadt ? ` · ${k.autor.stadt}` : ""}
          <span className="mono mt-0.5 block text-xs text-ink-soft">
            {[k.extern?.medium ?? k.anlass ?? k.modulTitel?.split(/[–:]/)[0].trim(), k.datumText].filter(Boolean).join(" · ")}
          </span>
        </p>
        <span className="shrink-0 text-sm font-semibold whitespace-nowrap">
          {k.typ === "artikel" ? t.artikelLesen : t.lesen} <span className="pfeil pfeil-rechts inline-block">→</span>
        </span>
      </div>
    </Link>
  );
}

const teaserSprachen = ["de", "tr", "fr", "en"] as const;

/** Startseiten-Auszug mit Sprachfilter (Alle | DE | TR | FR | EN); Sprachen ohne Beiträge sind deaktiviert. */
export function StimmenTeaserListe({ karten, t, max = 3, kopf }: { karten: Karte[]; t: Texte["stimmen"]; max?: number; kopf: React.ReactNode }) {
  const [sprache, setSprache] = useState<(typeof teaserSprachen)[number] | "alle">("alle");
  const sichtbar = karten.filter((k) => sprache === "alle" || k.sprache === sprache).slice(0, max);
  const knopf = (aktiv: boolean) =>
    `mono px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase transition disabled:cursor-not-allowed disabled:opacity-35 ${
      aktiv ? "bg-ink text-paper" : "ring-1 ring-ink/25 enabled:hover:bg-ink enabled:hover:text-paper"
    }`;
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        {kopf}
        <div role="group" aria-label={t.filterSprache} className="flex flex-wrap gap-2">
          <button type="button" className={knopf(sprache === "alle")} aria-pressed={sprache === "alle"} onClick={() => setSprache("alle")}>
            {t.alle}
          </button>
          {teaserSprachen.map((s) => (
            <button
              key={s}
              type="button"
              className={knopf(sprache === s)}
              aria-pressed={sprache === s}
              disabled={!karten.some((k) => k.sprache === s)}
              onClick={() => setSprache(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-12 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {sichtbar.map((k) => (
          <li key={k.slug}>
            <StimmenKarte k={k} t={t} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** YouTube erst nach Klick laden (keine Verbindung zu YouTube beim Seitenaufruf). */
export function YoutubeKlick({ id, titel, t }: { id: string; titel: string; t: Texte["stimmen"] }) {
  const [an, setAn] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden bg-ink">
      {an ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={titel}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button type="button" onClick={() => setAn(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-paper">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-signal text-3xl text-ink" aria-hidden>▶</span>
          <span className="font-semibold">{t.videoLaden}</span>
          <span className="max-w-sm px-6 text-center text-sm text-paper/70">{t.videoHinweis}</span>
        </button>
      )}
    </div>
  );
}

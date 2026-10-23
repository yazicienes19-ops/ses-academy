"use client";

import Link from "next/link";
import { useState } from "react";
import type { Beitrag, BeitragTyp, Land } from "@/i18n/stimmen";
import type { ModulSlug, Texte } from "@/i18n/typ";

export type Karte = Beitrag & { href: string; modulTitel?: string; datumText: string };

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
      <div className="rounded-[2rem] border-2 border-dashed border-ink/20 p-10 text-center">
        <p className="font-display text-3xl font-bold">{t.leer}</p>
      </div>
    );
  }

  const chip = (aktiv: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${aktiv ? "bg-ink text-paper" : "bg-white/60 ring-1 ring-line hover:bg-white"}`;

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

      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sichtbar.map((k) => (
          <li key={k.slug}>
            <Link href={k.href} className="group flex h-full flex-col rounded-3xl bg-white/60 p-7 ring-1 ring-line transition hover:-translate-y-1 hover:bg-white">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                {k.muster && <span className="rounded-full bg-signal px-2.5 py-1 uppercase">{t.muster}</span>}
                <span className="rounded-full bg-ink px-2.5 py-1 text-paper">{t.typ[k.typ]}</span>
                <span className="text-ink-soft">{t.laender[k.land]}</span>
                <span className="text-ink-soft uppercase">· {k.sprache}</span>
              </div>
              <p lang={k.sprache} className="font-display mt-6 text-2xl leading-tight font-bold">{k.titel}</p>
              <p lang={k.sprache} className="mt-3 text-ink-soft">{k.teaser}</p>
              <p className="mt-auto pt-6 text-sm">
                <span className="font-semibold">{k.autor.name}</span>
                {k.autor.alter ? `, ${k.autor.alter}` : ""}
                {k.autor.stadt ? ` · ${k.autor.stadt}` : ""}
              </p>
              <p className="text-sm text-ink-soft">
                {[k.extern?.medium ?? k.anlass ?? k.modulTitel?.split(/[–:]/)[0].trim(), k.datumText].filter(Boolean).join(" · ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** YouTube erst nach Klick laden (keine Verbindung zu YouTube beim Seitenaufruf). */
export function YoutubeKlick({ id, titel, t }: { id: string; titel: string; t: Texte["stimmen"] }) {
  const [an, setAn] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-ink">
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

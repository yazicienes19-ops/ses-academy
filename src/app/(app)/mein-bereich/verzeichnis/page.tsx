import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, MessageCircle, Phone, Search } from "lucide-react";
import { TeamKopf } from "@/components/team/TeamKopf";
import { getStaff } from "@/lib/auth";
import { bereichSprache, bereichTexte, datumsSprache } from "@/lib/bereich-texte";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mitglieder | SES Academy", robots: { index: false, follow: false } };

const nurZiffern = (nummer: string) => nummer.replace(/[^\d+]/g, "").replace(/^00/, "+");

/** Telefonnummer einheitlich lesbar: +49 176 12345678 statt 0049176… bzw. +4917612345678. */
function telAnzeige(nummer: string) {
  const n = nurZiffern(nummer);
  const m = n.match(/^\+(49|43|33|41|31|32|90)(\d{3})(\d+)$/);
  if (m) return `+${m[1]} ${m[2]} ${m[3]}`;
  const national = n.match(/^(0\d{3})(\d+)$/);
  return national ? `${national[1]} ${national[2]}` : nummer;
}

/** Für WhatsApp braucht es die internationale Form; nationale Nummern (0…) bleiben ohne Knopf. */
function whatsapp(nummer: string) {
  const n = nurZiffern(nummer);
  return n.startsWith("+") ? `https://wa.me/${n.slice(1)}` : null;
}

const anfang = (name: string, locale: string) => (name.trim().split(/\s+/).at(-1)?.[0] ?? "#").toLocaleUpperCase(locale);

function Rund({ href, label, children, extern }: { href: string; label: string; children: React.ReactNode; extern?: boolean }) {
  return (
    <a href={href} aria-label={label} title={label} {...(extern ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink-soft ring-1 ring-line transition hover:bg-forest hover:text-paper hover:ring-forest">
      {children}
    </a>
  );
}

/**
 * Mitgliederverzeichnis für angemeldete Mitglieder (und das Team): Name, Foto, Region, Abzeichen; E-Mail und Telefon
 * nur, wenn die Person sie freigegeben hat. Filter über die Adresse (?suche=, ?region=, ?abzeichen=).
 */
export default async function Verzeichnis({ searchParams }: PageProps<"/mein-bereich/verzeichnis">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/mein-bereich/login/");
  const staff = await getStaff();
  // Teilnehmende sehen das Verzeichnis in ihrer Sprache (Türkisch oder Deutsch), das Team auf Deutsch
  const { data: ich } = staff ? { data: null } : await supabase.from("participants").select("preferred_language").eq("user_id", auth.user.id).maybeSingle();
  const l = bereichSprache(ich?.preferred_language);
  const t = bereichTexte[l];
  const locale = datumsSprache[l];
  const { suche, region, abzeichen } = await searchParams;
  const { data } = await supabase.rpc("get_member_directory");
  const alle = data ?? [];
  const regionen = [...new Set(alle.map((m) => m.region).filter(Boolean))].sort() as string[];
  // Abzeichen, die alle haben (z. B. „SES · 1. Generation“), unterscheiden niemanden und werden nicht gezeigt
  const zaehlung = new Map<string, number>();
  alle.forEach((m) => (m.badges ?? []).forEach((b) => zaehlung.set(b, (zaehlung.get(b) ?? 0) + 1)));
  const abzeichenListe = [...zaehlung.keys()].sort();
  const besonders = (b: string) => (zaehlung.get(b) ?? 0) < alle.length;
  const s = typeof suche === "string" ? suche.trim().toLowerCase() : "";
  const liste = alle.filter((m) =>
    (!s || m.name.toLowerCase().includes(s)) &&
    (typeof region !== "string" || !region || m.region === region) &&
    (typeof abzeichen !== "string" || !abzeichen || (m.badges ?? []).includes(abzeichen)));
  const gruppen = new Map<string, typeof liste>();
  liste.forEach((m) => gruppen.set(anfang(m.name, locale), [...(gruppen.get(anfang(m.name, locale)) ?? []), m]));
  const gefiltert = Boolean(s || region || abzeichen);

  return (
    <>
    {staff && <TeamKopf staff={staff} aktiv="mitglieder" />}
    <main lang={l} className="mx-auto max-w-6xl px-4 py-8">
      {!staff && <Link href="/mein-bereich/" className="text-sm font-semibold text-ink-soft hover:text-ink">{t.zurueck}</Link>}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold">{t.mitglieder}</h1>
        <p className="text-sm text-ink-soft">{gefiltert ? t.vonAllen(liste.length, alle.length) : t.personen(alle.length)} · {t.regionen(regionen.length)}</p>
      </div>
      {!staff && <p className="mt-1 text-sm text-ink-soft">{t.kontaktNurFrei}</p>}

      <form className="sticky top-0 z-20 -mx-4 mt-5 grid gap-2 bg-paper/95 px-4 py-3 backdrop-blur sm:grid-cols-[1fr_12rem_auto_auto] lg:top-0" action="/mein-bereich/verzeichnis/">
        <label className="sr-only" htmlFor="suche">{t.nameSuchen}</label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input id="suche" name="suche" type="search" defaultValue={typeof suche === "string" ? suche : ""} placeholder={t.nameSuchen} className="feld pl-10" />
        </div>
        <label className="sr-only" htmlFor="region">{t.region}</label>
        <select id="region" name="region" defaultValue={typeof region === "string" ? region : ""} className="feld"><option value="">{t.alleRegionen}</option>{regionen.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        {abzeichenListe.length > 1 ? (
          <>
            <label className="sr-only" htmlFor="abzeichen">{t.abzeichen}</label>
            <select id="abzeichen" name="abzeichen" defaultValue={typeof abzeichen === "string" ? abzeichen : ""} className="feld"><option value="">{t.alleAbzeichen}</option>{abzeichenListe.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          </>
        ) : <span className="hidden sm:block" />}
        <div className="flex gap-2">
          <button type="submit" className="knopf">{t.suchen}</button>
          {gefiltert && <Link href="/mein-bereich/verzeichnis/" className="knopf-hell">{t.zuruecksetzen}</Link>}
        </div>
      </form>

      {[...gruppen.entries()].map(([buchstabe, personen]) => (
        <section key={buchstabe} className="mt-6" aria-labelledby={`b-${buchstabe}`}>
          <h2 id={`b-${buchstabe}`} className="font-display mb-2 flex items-center gap-3 text-lg font-bold text-ink-soft">
            {buchstabe}<span className="h-px flex-1 bg-line" /><span className="text-xs font-semibold">{personen.length}</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {personen.map((m) => {
              const wa = m.phone ? whatsapp(m.phone) : null;
              const extra = (m.badges ?? []).filter(besonders);
              return (
                <li key={m.participant_id} className={`karte relative flex min-w-0 flex-col gap-3 !p-4 ${staff ? "transition hover:ring-ink/20 hover:shadow-md" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    {m.has_photo
                      ? <img src={`/portal/foto/${m.participant_id}/`} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-line" />
                      : <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest/90 font-display text-base font-bold text-paper">
                          {m.name.split(/\s+/).filter(Boolean).map((t) => t[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join("").toLocaleUpperCase(locale)}
                        </span>}
                    <div className="min-w-0 flex-1">
                      {staff
                        ? <Link href={`/team/teilnehmende/${m.participant_id}/`} className="block truncate font-semibold after:absolute after:inset-0 after:rounded-3xl hover:underline">{m.name}</Link>
                        : <p className="truncate font-semibold">{m.name}</p>}
                      <p className="truncate text-sm text-ink-soft">{[m.region, m.branch].filter(Boolean).join(" · ") || t.ohneRegion}</p>
                    </div>
                  </div>
                  {extra.length > 0 && <ul className="flex flex-wrap gap-1">{extra.map((b) => <li key={b} className="chip bg-gruen-hell">{b}</li>)}</ul>}
                  {(m.email || m.phone) && (
                    <div className="relative z-10 mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
                      <div className="min-w-0 space-y-0.5 text-sm">
                        {m.email && <a href={`mailto:${m.email}`} className="block truncate hover:underline" title={m.email}>{m.email}</a>}
                        {m.phone && <a href={`tel:${nurZiffern(m.phone)}`} className="block truncate text-ink-soft tabular-nums hover:underline">{telAnzeige(m.phone)}</a>}
                      </div>
                      <div className="flex gap-1.5">
                        {m.email && <Rund href={`mailto:${m.email}`} label={t.emailAn(m.name)}><Mail className="h-4 w-4" /></Rund>}
                        {m.phone && <Rund href={`tel:${nurZiffern(m.phone)}`} label={t.anrufen(m.name)}><Phone className="h-4 w-4" /></Rund>}
                        {wa && <Rund href={wa} label={t.whatsappAn(m.name)} extern><MessageCircle className="h-4 w-4" /></Rund>}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {liste.length === 0 && <p className="mt-6 rounded-3xl border-2 border-dashed border-line p-8 text-center text-ink-soft">{t.niemand}</p>}
    </main>
    </>
  );
}

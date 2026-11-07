import "server-only";

import { istToken } from "@/lib/codes";
import { faltName } from "@/lib/import/namen";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

// Teilnehmendenliste mit allen Filtern. Seite, Excel-Export und Rundmail an die Auswahl rechnen damit dieselbe Menge.

const tagZahl = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: "Europe/Berlin" });
const monat = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" });
/** Spaltenkopf eines Moduls: seine Termine statt eines Kürzels, z. B. „14./15. Nov.“ */
export function termine(tage: { starts_at: string }[]) {
  const d = tage.map((t) => new Date(t.starts_at));
  const monate = [...new Set(d.map((x) => monat.format(x)))];
  return monate.length === 1 ? `${d.map((x) => tagZahl.format(x)).join("./")}. ${monate[0]}` : d.map((x) => `${tagZahl.format(x)}. ${monat.format(x)}`).join(" / ");
}

export type ModulStand = { m: string; s: string; r: string | null; d: number; q?: string };
export type Person = {
  participant_id: string; name: string; email: string | null; phone: string | null; region: string | null; mentor_name: string | null;
  branch: string | null; active: boolean; affiliation_status: string; gender: string | null; modules: ModulStand[];
  registration_status: string | null; rsvp: string | null; stay_answered: boolean; nights: string[] | null; module_contacts: number;
  last_at: string | null; last_channel: string | null; last_outcome: string | null; last_note: string | null; last_by: string | null;
};

/**
 * Punkt je Modul: da (grün), teilweise (orange), zugesagt (gelb), keine Zusage bzw. nicht gekommen (rot), abgesagt (grau).
 * Rot für „keine Zusage“ erst, wenn für das Modul Zusagen eingesammelt werden; sonst nur „angemeldet“ (hell).
 */
export function punkt(reg: ModulStand | undefined, tage: number, vorbei: boolean, zusagenLaufen: boolean) {
  if (!reg) return null;
  if (reg.d >= tage) return { farbe: "bg-mint", text: "alle Tage da" };
  if (reg.d > 0) return { farbe: "bg-orange-400", text: `${reg.d} von ${tage} Tagen da` };
  if (reg.s === "excused" || reg.s === "cancelled" || reg.r === "abgesagt") return { farbe: "bg-zinc-300", text: "abgesagt oder entschuldigt" };
  if (vorbei) return { farbe: "bg-rot", text: "nicht da" };
  if (reg.s === "waitlist") return { farbe: "bg-paper-deep ring-1 ring-line", text: "Warteliste" };
  if (reg.r === "zugesagt") return { farbe: "bg-yellow-300", text: "zugesagt" };
  return zusagenLaufen ? { farbe: "bg-rot", text: "noch keine Zusage" } : { farbe: "bg-paper-deep ring-1 ring-line", text: "angemeldet, Zusagen noch nicht abgefragt" };
}

// Filter für das gewählte Modul (wie früher in der Anrufliste)
export const zusagen = {
  "": { name: "Alle", passt: () => true },
  offen: { name: "Noch keine Zusage", passt: (p: Person) => p.registration_status === "confirmed" && !p.rsvp },
  zugesagt: { name: "Zugesagt", passt: (p: Person) => p.rsvp === "zugesagt" },
  abgesagt: { name: "Abgesagt", passt: (p: Person) => p.rsvp === "abgesagt" || p.registration_status === "excused" || p.registration_status === "cancelled" },
} as const;
export const kontakte = {
  "": { name: "Kontakt: alle", passt: () => true },
  offen: { name: "Noch nicht kontaktiert", passt: (p: Person) => p.module_contacts === 0 },
  nachfassen: { name: "Nicht erreicht / Rückruf", passt: (p: Person) => p.last_outcome === "nicht_erreicht" || p.last_outcome === "rueckruf" },
  erreicht: { name: "Erreicht", passt: (p: Person) => p.last_outcome === "erreicht" },
} as const;
export const uebernachtungen = {
  "": { name: "Übernachtung: alle", passt: () => true },
  offen: { name: "Übernachtung: keine Angabe", passt: (p: Person) => !p.stay_answered },
  ja: { name: "übernachtet", passt: (p: Person) => (p.nights?.length ?? 0) > 0 },
  nein: { name: "übernachtet nicht", passt: (p: Person) => p.stay_answered && !p.nights?.length },
} as const;
const wahl = <T extends object>(liste: T, wert: string) => (wert in liste ? wert : "") as keyof T;

/** Kennzeichen für alle, die nicht zum Jahrgang gehören (Gast, Walk-in, Mitglied, Alumni). */
export function herkunft(p: Person): string | null {
  if (p.modules.some((r) => r.q === "walk_in")) return "Walk-in";
  return p.affiliation_status === "academy_student" ? null : ({ guest: "Gast", member: "Mitglied", alumni: "Alumni" } as Record<string, string>)[p.affiliation_status] ?? "Gast";
}

/** Filter aus der Adresse; dieselben Namen in Seite, Export und Rundmail. */
export const filterNamen = ["modul", "q", "region", "verantwortlich", "gt", "filter", "gruppe", "zusage", "kontakt", "uebernachtung"] as const;
export type Filter = Partial<Record<(typeof filterNamen)[number], string>>;

export function leseFilter(quelle: Record<string, string | string[] | undefined> | URLSearchParams): Filter {
  const f: Filter = {};
  for (const k of filterNamen) {
    const v = quelle instanceof URLSearchParams ? quelle.get(k) : quelle[k];
    if (typeof v === "string" && v) f[k] = v.slice(0, 200);
  }
  return f;
}

/**
 * Lädt die Liste (Rechte wie get_people: ab Orga-Team, E-Mail nur für Admin/Vorstand) und wendet die Filter an.
 * grundmenge = alles außer dem Zusage-Filter (die Zusage-Knöpfe zählen darin), liste = was angezeigt wird.
 */
export async function ladeListe(f: Filter, alles: boolean) {
  const s = (k: keyof Filter) => f[k] ?? "";
  const supabase = await createClient();
  const { data: jahrgang } = await supabase.from("cohorts").select("id,name").eq("is_current", true).maybeSingle();
  let modulAbfrage = supabase.from("modules").select("id,title,cancelled_at,module_days(id,starts_at,ends_at)").neq("status", "draft");
  if (jahrgang) modulAbfrage = modulAbfrage.eq("cohort_id", jahrgang.id);
  const { data: module } = await modulAbfrage;
  const jetzt = new Date(jetztMs()).toISOString();
  const modulListe = (module ?? [])
    .map((m) => ({ ...m, tage: [...m.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .filter((m) => m.tage.length)
    .sort((a, b) => a.tage[0].starts_at.localeCompare(b.tage[0].starts_at));
  // Vorschlag: das nächste Modul, das noch nicht vorbei ist
  const modul = modulListe.find((m) => m.id === s("modul") && istToken(s("modul")))
    ?? modulListe.find((m) => !m.cancelled_at && m.tage[m.tage.length - 1].ends_at > jetzt) ?? modulListe.at(-1);

  const { data: personen } = await supabase.rpc("get_people", { p_module_id: modul?.id });
  const alle = (personen ?? []) as unknown as Person[];
  const zusage = wahl(zusagen, s("zusage"));
  const kontakt = wahl(kontakte, s("kontakt"));
  const ueb = wahl(uebernachtungen, s("uebernachtung"));
  const gruppe = s("gruppe") === "alle" ? "alle" : s("gruppe") === "gaeste" ? "gaeste" : "jahrgang";
  const qf = faltName(s("q"));
  const ziffern = s("q").replace(/\D/g, "");
  const grundmenge = alle.filter((p) => {
    if (gruppe === "jahrgang" && p.affiliation_status !== "academy_student") return false;
    if (gruppe === "gaeste" && !herkunft(p)) return false;
    // Suche: Name/E-Mail, oder bei Ziffern die Telefonnummer (faltName behält keine Ziffern),
    // z. B. „0176 123“ findet „+49 176 123…“
    const telefonTreffer = ziffern.length >= 3 && (p.phone ?? "").replace(/\D/g, "").replace(/^(49|90|43|41)/, "0").includes(ziffern.replace(/^(00)?(49|90|43|41)/, "0"));
    const nameTreffer = Boolean(qf) && faltName(`${p.name} ${p.email ?? ""}`).includes(qf);
    if ((qf || ziffern.length >= 3) && !telefonTreffer && !nameTreffer) return false;
    if (s("region") && (p.region ?? "-") !== s("region")) return false;
    if (s("verantwortlich") && (p.mentor_name ?? "-") !== s("verantwortlich")) return false;
    if (s("gt") && p.branch !== s("gt")) return false;
    if (s("filter") === "ohne-mail" && (!alles || p.email)) return false;
    if (s("filter") === "ohne-telefon" && p.phone) return false;
    if (!kontakte[kontakt].passt(p) || !uebernachtungen[ueb].passt(p)) return false;
    return s("filter") === "inaktiv" ? !p.active : p.active;
  });
  const liste = grundmenge.filter(zusagen[zusage].passt);
  return { jahrgang, modulListe, modul, jetzt, alle, grundmenge, liste, zusage, kontakt, ueb, gruppe };
}

/** Lesbare Beschreibung der gesetzten Filter (für Export-Dateiname und Rundmail-Antrag). */
export function filterBeschreibung(f: Filter, modulTitel: string | null): string {
  const teile: string[] = [];
  if (f.gruppe === "alle") teile.push("mit Gästen und Walk-ins");
  else if (f.gruppe === "gaeste") teile.push("nur Gäste und Walk-ins");
  if (f.q) teile.push(`Suche „${f.q}“`);
  if (f.region) teile.push(f.region === "-" ? "ohne Region" : `Region ${f.region}`);
  if (f.verantwortlich) teile.push(f.verantwortlich === "-" ? "ohne Sorumlu" : `Sorumlu ${f.verantwortlich}`);
  if (f.gt) teile.push(f.gt);
  if (f.filter === "ohne-mail") teile.push("ohne E-Mail");
  if (f.filter === "ohne-telefon") teile.push("ohne Telefon");
  if (f.filter === "inaktiv") teile.push("ausgeschieden");
  const zusage = f.zusage && f.zusage in zusagen ? zusagen[f.zusage as keyof typeof zusagen].name : null;
  const kontakt = f.kontakt && f.kontakt in kontakte ? kontakte[f.kontakt as keyof typeof kontakte].name : null;
  const ueb = f.uebernachtung && f.uebernachtung in uebernachtungen ? uebernachtungen[f.uebernachtung as keyof typeof uebernachtungen].name : null;
  if (modulTitel && (zusage || kontakt || ueb)) teile.push([modulTitel, zusage, kontakt, ueb].filter(Boolean).join(", "));
  return teile.join(" · ");
}

import { darf, requireStaff } from "@/lib/auth";
import { csvAntwort } from "@/lib/csv";
import { herkunft, ladeListe, leseFilter, punkt, termine } from "@/lib/teilnehmende-liste";
import { nachtName } from "@/lib/uebernachtung";

const anmeldung: Record<string, string> = { confirmed: "angemeldet", waitlist: "Warteliste", pending: "wird geprüft", excused: "entschuldigt", cancelled: "abgemeldet", rejected: "abgelehnt" };
const ergebnis: Record<string, string> = { erreicht: "erreicht", nicht_erreicht: "nicht erreicht", rueckruf: "Rückruf" };
const wann = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });

/**
 * Die (gefilterte) Teilnehmendenliste als Excel-Datei (CSV, Semikolon, UTF-8 mit BOM), ab Orga-Team. Gleiche Filter und
 * gleiche Rechte wie die Liste: E-Mail-Adressen nur für Admin/Vorstand (get_people), auf ein Modul begrenzte
 * Team-Zugänge kommen nicht hierher (requireStaff ohne modulBezogen, get_people verlangt has_orga_access()).
 */
export async function GET(request: Request) {
  const staff = await requireStaff("orga");
  const alles = darf.alles(staff.role);
  const { modulListe, modul, jetzt, alle, liste } = await ladeListe(leseFilter(new URL(request.url).searchParams), alles);
  const mitZusagen = new Set(alle.flatMap((p) => p.modules.filter((r) => r.r).map((r) => r.m)));

  const kopf = [
    "Name", "Herkunft", "Telefon", ...(alles ? ["E-Mail"] : []), "Region", "Sorumlu", "GT/KGT",
    ...(modul ? [`${modul.title}: Anmeldung`, `${modul.title}: Zusage`, `${modul.title}: Übernachtung`] : []),
    ...modulListe.map((m) => `${m.title} (${termine(m.tage)})`),
    "Letzter Kontakt", "Ergebnis", "Notiz", "Aktiv",
  ];
  const zeilen = liste.map((p) => [
    p.name, herkunft(p) ?? "Jahrgang", p.phone, ...(alles ? [p.email] : []), p.region, p.mentor_name, p.branch,
    ...(modul ? [
      p.registration_status ? anmeldung[p.registration_status] ?? p.registration_status : "nicht angemeldet",
      p.rsvp ?? "",
      !p.registration_status ? "" : !p.stay_answered ? "keine Angabe" : p.nights?.length ? p.nights.map(nachtName).join(", ") : "nein",
    ] : []),
    ...modulListe.map((m) => punkt(p.modules.find((r) => r.m === m.id), m.tage.length, m.tage[m.tage.length - 1].ends_at < jetzt, mitZusagen.has(m.id))?.text ?? ""),
    p.last_at ? `${wann.format(new Date(p.last_at))}${p.last_by ? ` (${p.last_by})` : ""}` : "",
    p.last_outcome ? ergebnis[p.last_outcome] ?? p.last_outcome : p.last_channel === "notiz" ? "Notiz" : "",
    p.last_note, p.active ? "ja" : "ausgeschieden",
  ]);
  const datei = `Teilnehmende${modul ? ` ${modul.title}` : ""} ${heute.format(new Date())}.csv`;
  return csvAntwort([kopf, ...zeilen], datei);
}

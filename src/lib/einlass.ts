import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];

/** Antwort der Datenbankfunktionen check_in_by_code / check_in_manual (siehe Migration, checkin_core). */
export type EinlassErgebnis = {
  result:
    | "checked_in" | "already_checked_in" | "invalid_code" | "not_found" | "not_registered" | "not_eligible"
    | "module_cancelled" | "module_not_available" | "ticket_not_required" | "outside_checkin_window"
    | "day_not_found" | "invalid_scan_time" | "consent_required" | "fehler"
    // nur im Offline-Modus (Browser, siehe offline-einlass.ts)
    | "offline_vorgemerkt" | "offline_bereits" | "offline_ohne_liste" | "offline_unbekannt"
    // nur beim Walk-in (create_walk_in)
    | "email_other_person" | "possible_duplicate";
  participant_id?: string;
  display_name?: string;
  affiliation_status?: Enums["affiliation_status"];
  module_title?: string;
  registration_status?: Enums["registration_status"];
  checked_in_at?: string;
  window_start?: string;
  window_end?: string;
};

export type Zaehler = { checked_in: number; expected: number; waitlist: number; excused: number };

export type EinlassAntwort = { ergebnis: EinlassErgebnis; zaehler: Zaehler | null };

export const zugehoerigkeit: Record<Enums["affiliation_status"], string> = {
  member: "Mitglied",
  academy_student: "Academy-Teilnehmer:in",
  guest: "Gast",
  alumni: "Alumni",
};

export const anmeldestatus: Record<Enums["registration_status"], string> = {
  confirmed: "Angemeldet",
  pending: "Noch nicht freigeschaltet",
  waitlist: "Warteliste",
  cancelled: "Abgemeldet",
  excused: "Entschuldigt",
  rejected: "Abgelehnt",
};

export function uhrzeit(iso: string, sekunden = true): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit", minute: "2-digit", second: sekunden ? "2-digit" : undefined, timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

export type Ton = "gruen" | "gelb" | "rot";

/** Was die Ergebniskarte zeigt: Farbe, Überschrift, Erklärung. */
export function deute(e: EinlassErgebnis): { ton: Ton; titel: string; text?: string } {
  switch (e.result) {
    case "checked_in":
      return { ton: "gruen", titel: `Erfolgreich eingecheckt um ${uhrzeit(e.checked_in_at!)} Uhr` };
    case "already_checked_in":
      return { ton: "gelb", titel: `Warnung: Bereits eingecheckt um ${uhrzeit(e.checked_in_at!)} Uhr`, text: "Der Code ist gültig, die Person steht schon in der Liste." };
    case "not_eligible":
      return { ton: "rot", titel: e.registration_status ? anmeldestatus[e.registration_status] : "Nicht zugelassen", text: "Diese Anmeldung berechtigt nicht zum Einlass. Bitte mit dem Orga-Team klären." };
    case "not_registered":
      return { ton: "rot", titel: "Nicht für dieses Modul angemeldet", text: "Der Code gehört zu einer Person, die für dieses Modul keine Anmeldung hat." };
    case "invalid_code":
      return { ton: "rot", titel: "Ungültiger Code", text: "QR-Code oder Kurzcode konnte nicht gelesen werden." };
    case "not_found":
      return { ton: "rot", titel: "Code unbekannt", text: "Zu diesem Code gibt es keine Person." };
    case "module_cancelled":
      return { ton: "rot", titel: "Modul abgesagt", text: "Für ein abgesagtes Modul ist kein Einlass möglich." };
    case "module_not_available":
      return { ton: "rot", titel: "Modul nicht veröffentlicht" };
    case "ticket_not_required":
      return { ton: "gelb", titel: "Für dieses Modul gibt es kein Ticket", text: "Bitte die Person in der Anwesenheitsliste abhaken." };
    case "outside_checkin_window":
      return { ton: "rot", titel: "Außerhalb des Einlasszeitraums", text: einlassFenster(e) };
    case "offline_vorgemerkt":
      return { ton: "gruen", titel: `Offline vorgemerkt um ${uhrzeit(e.checked_in_at!)} Uhr`, text: "Kein Internet: Der Check-in wird übertragen, sobald die Verbindung wieder steht." };
    case "offline_bereits":
      return { ton: "gelb", titel: `Warnung: Bereits erfasst um ${uhrzeit(e.checked_in_at!)} Uhr`, text: "Offline geprüft. Die Person ist schon eingecheckt oder vorgemerkt." };
    case "offline_unbekannt":
      return { ton: "rot", titel: "Nicht in der Offline-Liste", text: "Offline geprüft: Auf diesem Gerät stehen nur die Angemeldeten. Bitte mit dem Orga-Team klären oder später online erneut prüfen." };
    case "email_other_person":
      return { ton: "gelb", titel: "Diese E-Mail gehört schon einer anderen Person", text: "Nichts angelegt, niemand eingecheckt. Ist es dieselbe Person, bitte in der Liste abhaken; sonst die E-Mail prüfen oder leer lassen." };
    case "possible_duplicate":
      return { ton: "gelb", titel: "Diese Person ist schon angemeldet", text: "Nichts angelegt. Bitte in der Liste abhaken. Ist es wirklich jemand anderes mit gleichem Namen, „Trotzdem neu anlegen“ ankreuzen." };
    case "offline_ohne_liste":
      return { ton: "rot", titel: "Kein Internet und keine Offline-Liste", text: "Die Einlassliste für diesen Tag wurde auf diesem Gerät noch nicht geladen. Bitte Internet herstellen." };
    case "consent_required":
      return { ton: "rot", titel: "Einwilligung fehlt", text: "Ohne Datenschutz-Einwilligung kann niemand erfasst werden." };
    default:
      return { ton: "rot", titel: "Check-in nicht gespeichert", text: "Bitte erneut versuchen oder den Kurzcode eingeben." };
  }
}

const tagKurz = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric", timeZone: "Europe/Berlin" });
const tagIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" });

/** „ab 06:00 Uhr“ allein ist missverständlich: anderer Tag mit Datum, schon vorbei als „war bis …“. */
function einlassFenster(e: EinlassErgebnis): string | undefined {
  if (!e.window_start) return undefined;
  const jetzt = Date.now();
  const mitTag = (iso: string) => (tagIso.format(new Date(iso)) === tagIso.format(jetzt) ? "" : `${tagKurz.format(new Date(iso))} `);
  if (e.window_end && Date.parse(e.window_end) < jetzt) return `Der Einlass für diesen Tag ist vorbei (bis ${mitTag(e.window_end)}${uhrzeit(e.window_end, false)} Uhr).`;
  return `Einlass ist ab ${mitTag(e.window_start)}${uhrzeit(e.window_start, false)} Uhr möglich (4 Stunden vor Beginn bis 6 Stunden nach Ende).`;
}

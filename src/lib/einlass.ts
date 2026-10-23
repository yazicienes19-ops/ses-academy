import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];

/** Antwort der Datenbankfunktionen check_in_by_code / check_in_manual (siehe Migration, checkin_core). */
export type EinlassErgebnis = {
  result:
    | "checked_in" | "already_checked_in" | "invalid_code" | "not_found" | "not_registered" | "not_eligible"
    | "module_cancelled" | "module_not_available" | "ticket_not_required" | "outside_checkin_window"
    | "day_not_found" | "invalid_scan_time" | "consent_required" | "fehler";
  participant_id?: string;
  display_name?: string;
  affiliation_status?: Enums["affiliation_status"];
  module_title?: string;
  registration_status?: Enums["registration_status"];
  checked_in_at?: string;
  window_start?: string;
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
      return { ton: "rot", titel: "Außerhalb des Einlasszeitraums", text: e.window_start ? `Einlass ist ab ${uhrzeit(e.window_start, false)} Uhr möglich (4 Stunden vor Beginn bis 6 Stunden nach Ende).` : undefined };
    case "consent_required":
      return { ton: "rot", titel: "Einwilligung fehlt", text: "Ohne Datenschutz-Einwilligung kann niemand erfasst werden." };
    default:
      return { ton: "rot", titel: "Check-in nicht gespeichert", text: "Bitte erneut versuchen oder den Kurzcode eingeben." };
  }
}

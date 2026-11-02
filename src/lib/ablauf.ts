import "server-only";
import type { Database } from "@/lib/database.types";

type Punkt = Database["public"]["Tables"]["program_items"]["Row"];
type Einsatz = Database["public"]["Tables"]["duty_assignments"]["Row"];

/** Ende eines Programmpunkts: eingetragenes Ende, sonst Beginn des nächsten stattfindenden Punkts, sonst 30 Minuten. */
export function punktEnde(liste: Punkt[], i: number): number {
  const p = liste[i];
  if (p.ends_at) return Date.parse(p.ends_at);
  const folgend = liste.slice(i + 1).find((x) => x.status !== "entfaellt");
  return folgend ? Date.parse(folgend.starts_at) : Date.parse(p.starts_at) + 30 * 60_000;
}

/** Stand eines Punkts nach der Uhr; von Hand gesetzt wird nur „entfällt“. */
export function punktZustand(liste: Punkt[], i: number, jetzt: number): "entfaellt" | "vorbei" | "jetzt" | "kommt" {
  const p = liste[i];
  if (p.status === "entfaellt") return "entfaellt";
  if (punktEnde(liste, i) <= jetzt) return "vorbei";
  return Date.parse(p.starts_at) <= jetzt ? "jetzt" : "kommt";
}

/**
 * Wer ist während eines Programmpunkts eingeteilt? Einsätze mit Uhrzeit, die sich mit dem Punkt überschneiden.
 * Einsätze ohne Uhrzeit gelten für den ganzen Tag und stehen in der Team-Spalte, nicht bei jedem Punkt.
 */
export function zustaendigWaehrend(liste: Punkt[], i: number, einsaetze: Einsatz[]): Einsatz[] {
  const von = Date.parse(liste[i].starts_at);
  const bis = punktEnde(liste, i);
  return einsaetze.filter((e) => e.starts_at && Date.parse(e.starts_at) < bis && (e.ends_at ? Date.parse(e.ends_at) : Infinity) > von);
}

export { telLink } from "@/lib/telefon";

import "server-only";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { berlinerZeit } from "@/lib/zeit";

type Fn<T extends keyof Database["public"]["Functions"]> = Database["public"]["Functions"][T]["Returns"];
export type ModulZeile = Fn<"get_module_stats">[number];
export type TagZeile = Fn<"get_day_stats">[number];
export type Zugehoerigkeit = Database["public"]["Enums"]["affiliation_status"];

export type PersonZeile = Fn<"get_participant_analytics">[number] & {
  vorname: string; nachname: string; email: string | null; zugehoerigkeit: Zugehoerigkeit; region: string | null;
};

export type Filter = { von: string; bis: string; gruppe: Zugehoerigkeit | "alle" };

/** Filter aus der Adresse lesen; Datumsangaben als JJJJ-MM-TT in Berliner Zeit. */
export function leseFilter(sp: Record<string, string | string[] | undefined>): Filter {
  const datum = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const g = sp.gruppe;
  const gruppen: Filter["gruppe"][] = ["alle", "academy_student", "guest", "member", "alumni"];
  return { von: datum(sp.von), bis: datum(sp.bis), gruppe: gruppen.includes(g as Filter["gruppe"]) ? (g as Filter["gruppe"]) : "academy_student" };
}

function zeitraum(f: Filter) {
  return {
    timeframe_start: f.von ? berlinerZeit(f.von, "00:00") : undefined,
    // „bis“ einschließlich: bis Mitternacht des Folgetags
    timeframe_end: f.bis ? new Date(Date.parse(berlinerZeit(f.bis, "00:00")) + 24 * 3600_000).toISOString() : undefined,
  };
}

/** Alle Kennzahlen für Auswertung und Export (nur admin/vorstand, die Datenbank prüft das). */
export async function ladeAuswertung(f: Filter) {
  const supabase = await createClient();
  const z = zeitraum(f);
  const [{ data: module }, { data: tage }, { data: personen }, { data: stamm }] = await Promise.all([
    supabase.rpc("get_module_stats", z),
    supabase.rpc("get_day_stats", z),
    supabase.rpc("get_participant_analytics", z),
    supabase.from("participants").select("id, first_name, last_name, email, affiliation_status, active, regions(name)"),
  ]);
  const zuPerson = new Map((stamm ?? []).map((p) => [p.id, p]));
  const liste: PersonZeile[] = (personen ?? []).flatMap((a) => {
    const p = zuPerson.get(a.participant_id);
    if (!p || (f.gruppe !== "alle" && p.affiliation_status !== f.gruppe)) return [];
    return [{ ...a, vorname: p.first_name, nachname: p.last_name, email: p.email, zugehoerigkeit: p.affiliation_status,
      region: (p.regions as { name: string } | null)?.name ?? null }];
  });
  return { module: module ?? [], tage: tage ?? [], personen: liste };
}

/** Gefährdet: zuletzt mindestens 2 Serientage in Folge verpasst oder Quote unter 50 % bei mindestens 4 möglichen Tagen. */
export function istGefaehrdet(p: PersonZeile): boolean {
  return p.trailing_misses >= 2 || (p.total_attended + p.total_no_shows >= 4 && (p.attendance_rate ?? 100) < 50);
}

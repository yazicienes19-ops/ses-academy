import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Beginn der Ticket-Versandrunde: 30 Tage vor dem ersten Tag des Moduls. Ältere Tickets gelten als nicht verschickt. */
export async function versandrundeSeit(modulId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("module_days").select("starts_at").eq("module_id", modulId).order("starts_at").limit(1).maybeSingle();
  const beginn = data ? Date.parse(data.starts_at) : Date.now();
  return new Date(beginn - 30 * 86_400_000).toISOString();
}

export const programmStatus = {
  geplant: { name: "geplant", farbe: "bg-white" },
  laeuft: { name: "läuft", farbe: "bg-gruen-hell" },
  erledigt: { name: "erledigt", farbe: "bg-paper-deep" },
  verschoben: { name: "verschoben", farbe: "bg-gelb-hell" },
  entfaellt: { name: "entfällt", farbe: "bg-rot-hell" },
} as const;

const tagFormat = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" });

export function tagBezeichnung(tag: { starts_at: string; label?: string | null }, modul: string): string {
  return `${modul} · ${tagFormat.format(new Date(tag.starts_at))}${tag.label ? ` · ${tag.label}` : ""}`;
}

/** Modultage zur Auswahl: veröffentlichte, nicht abgesagte Module; Vorschlag = heute bzw. der nächste Tag. */
export async function ladeModultage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_days")
    .select("id, day, starts_at, ends_at, label, module_id, regieplan_document_id, module:modules!inner(title, status, cancelled_at)")
    .eq("module.status", "published")
    .order("starts_at");
  const tage = (data ?? []).filter((t) => t.module.cancelled_at === null);
  const jetzt = Date.now();
  const vorschlag = tage.find((t) => Date.parse(t.ends_at) + 6 * 3600_000 > jetzt) ?? tage.at(-1);
  return { tage, vorschlag };
}

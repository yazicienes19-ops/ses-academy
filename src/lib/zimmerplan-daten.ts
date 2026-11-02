import "server-only";

import { createClient } from "@/lib/supabase/server";
import { planen, wunschAufloesen, wuenschtEinzelzimmer, type PlanPerson, type Teil } from "@/lib/zimmerplan";

/**
 * Alles für den Zimmerplan eines Moduls: Angemeldete mit Wünschen (aufgelöst), Hotel mit Zimmern, Verlauf aus anderen
 * Modulen. Seite und „Vorschlag übernehmen“ rechnen damit dasselbe.
 */
export async function ladeZimmerplan(modulId: string) {
  const supabase = await createClient();
  const [{ data: modul }, { data: hotels }, { data: zeilen }, { data: verlauf }, { data: korrekturen }] = await Promise.all([
    supabase.from("modules").select("id, title").eq("id", modulId).maybeSingle(),
    supabase.from("hotels").select("id, name, rooms_visible, rooms(id, label, capacity, section)").eq("module_id", modulId).order("created_at"),
    supabase.rpc("get_room_planning", { p_module_id: modulId }),
    supabase.rpc("get_room_history", { p_module_id: modulId }),
    supabase.from("room_wish_overrides").select("participant_id, token, wished_id").eq("module_id", modulId),
  ]);
  const hotel = hotels?.[0] ?? null;
  const zimmer = [...(hotel?.rooms ?? [])].sort((a, b) => a.label.localeCompare(b.label, "de", { numeric: true }));
  const personen = zeilen ?? [];
  const namen = personen.map((p) => ({ id: p.participant_id, name: p.name }));
  const teile = new Map<string, Teil[]>(personen.map((p) => [p.participant_id, wunschAufloesen({ id: p.participant_id, room_wish: p.room_wish }, namen, korrekturen ?? [])]));
  const paare = new Set((verlauf ?? []).flatMap((v) => [`${v.participant_id}|${v.mate_id}`, `${v.mate_id}|${v.participant_id}`]));
  const planPersonen: PlanPerson[] = personen.map((p) => ({
    id: p.participant_id, name: p.name, gender: p.gender, region: p.region, nights: p.nights,
    zimmerId: p.room_id, quelle: p.source,
    wuensche: (teile.get(p.participant_id) ?? []).flatMap((t) => (t.ziel ? [t.ziel.id] : [])),
    einzelzimmer: wuenschtEinzelzimmer(p.room_wish),
  }));
  return { modul, hotel, zimmer, personen, teile, verlauf: verlauf ?? [], paare, planPersonen };
}

export type Zimmerplan = Awaited<ReturnType<typeof ladeZimmerplan>>;

/** Vorschlag aus den geladenen Daten. */
export function vorschlag(d: Zimmerplan) {
  return planen(d.planPersonen, d.zimmer.map((z) => ({ id: z.id, label: z.label, capacity: z.capacity })), d.paare);
}

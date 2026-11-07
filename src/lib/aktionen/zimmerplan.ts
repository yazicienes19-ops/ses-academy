"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { ladeZimmerplan, probeplan, vorschlag } from "@/lib/zimmerplan-daten";

function zurueck(modulId: string, hinweis: string, anker?: string): never {
  const pfad = `/team/module/${modulId}/zimmerplan/`;
  revalidatePath(pfad);
  revalidatePath(`/team/module/${modulId}/hotel/`);
  redirect(`${pfad}?hinweis=${hinweis}${anker ? `#${anker}` : ""}`);
}

/** Namensteil eines Wunsches richtig zuordnen, ignorieren („-“) oder wieder automatisch erkennen lassen („auto“). */
export async function wunschKorrigieren(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const person = String(formData.get("participant_id"));
  const token = String(formData.get("token") ?? "").slice(0, 100);
  const ziel = String(formData.get("wished_id") ?? "");
  if (!istToken(modulId) || !istToken(person) || !token || !(ziel === "auto" || ziel === "-" || istToken(ziel))) zurueck(modulId, "eingabe");
  const supabase = await createClient();
  const { error } = ziel === "auto"
    ? await supabase.from("room_wish_overrides").delete().eq("module_id", modulId).eq("participant_id", person).eq("token", token)
    : await supabase.from("room_wish_overrides").upsert({ module_id: modulId, participant_id: person, token, wished_id: ziel === "-" ? null : ziel });
  zurueck(modulId, error ? "fehler" : "wunsch", `w-${person}`);
}

/** Vorschlag neu rechnen und speichern. Was von Hand zugeteilt ist, bleibt; frühere Vorschläge werden ersetzt. */
export async function planUebernehmen(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  if (!istToken(modulId)) zurueck(modulId, "eingabe");
  const daten = await ladeZimmerplan(modulId);
  if (!daten.hotel) zurueck(modulId, "kein-hotel");
  const plan = vorschlag(daten).zimmer.flatMap((z) => z.belegung.filter((b) => b.grund !== "fest").map((b) => ({ room_id: z.id, participant_id: b.id })));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_room_plan", { p_hotel_id: daten.hotel.id, p_plan: plan });
  zurueck(modulId, error ? "fehler" : `plan-${data ?? 0}`);
}

/** Alle Zuteilungen aus dem Vorschlag entfernen; Handzuteilungen bleiben. */
export async function vorschlagZuruecksetzen(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const hotel = String(formData.get("hotel_id"));
  if (!istToken(modulId) || !istToken(hotel)) zurueck(modulId, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("room_assignments").delete().eq("hotel_id", hotel).eq("source", "auto");
  zurueck(modulId, error ? "fehler" : "zurueckgesetzt");
}

/** Eine Person fest in ihrem Zimmer lassen (aus dem Vorschlag wird eine Handzuteilung) oder wieder freigeben. */
export async function zuteilungFestlegen(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const hotel = String(formData.get("hotel_id"));
  const person = String(formData.get("participant_id"));
  const fest = formData.get("fest") === "1";
  if (!istToken(modulId) || !istToken(hotel) || !istToken(person)) zurueck(modulId, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("room_assignments").update({ source: fest ? "manual" : "auto" }).eq("hotel_id", hotel).eq("participant_id", person);
  zurueck(modulId, error ? "fehler" : fest ? "festgelegt" : "freigegeben", `z-${person}`);
}

/**
 * Automatische Einteilung übernehmen, solange noch keine Zimmer angelegt sind: Hotel (falls nötig) und so viele 2er- oder
 * 3er-Zimmer anlegen wie gebraucht, alle einteilen. Danach geht alles wie gewohnt (umsetzen, festhalten, Zimmerliste).
 */
export async function probeUebernehmen(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const groesse = Number(formData.get("groesse"));
  if (!istToken(modulId) || (groesse !== 2 && groesse !== 3)) zurueck(modulId, "eingabe");
  const daten = await ladeZimmerplan(modulId);
  if (daten.zimmer.length > 0) zurueck(modulId, "schon-uebernommen");
  const probe = probeplan(daten, groesse);
  // Hotel, Zimmer und Einteilung in einer Transaktion; eine zweite Anfrage (Doppelklick) wartet und ändert nichts
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_probe_rooms", {
    p_module_id: modulId, p_capacity: groesse,
    p_zimmer: probe.zimmer.map((z) => ({ label: z.label, section: z.bereich ?? "", personen: z.belegung.map((b) => b.id) })),
  });
  const antwort = data as { result?: string; assigned?: number } | null;
  if (error || !antwort) zurueck(modulId, "fehler");
  zurueck(modulId, antwort.result === "already_applied" ? "schon-uebernommen" : `plan-${antwort.assigned ?? 0}`);
}

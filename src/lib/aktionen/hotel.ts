"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { berlinerZeit } from "@/lib/zeit";

function zurueck(modulId: string, hinweis: string): never {
  revalidatePath(`/team/module/${modulId}/hotel/`);
  redirect(`/team/module/${modulId}/hotel/?hinweis=${hinweis}`);
}

/** Abfrage in „Mein Bereich“ öffnen oder schließen (Admin/Vorstand, wie die übrigen Moduleinstellungen). */
export async function abfrageUmschalten(formData: FormData) {
  await requireStaff("alles");
  const modulId = String(formData.get("module_id"));
  if (!istToken(modulId)) zurueck(modulId, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("modules").update({ stay_form_open: formData.get("offen") === "1" }).eq("id", modulId);
  zurueck(modulId, error ? "fehler" : "abfrage");
}

const hotelSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(300),
  contact: z.string().trim().max(300),
  quota_rooms: z.string().trim().regex(/^\d*$/),
  price_per_night: z.string().trim().regex(/^(\d+([.,]\d{1,2})?)?$/),
  cancellation_deadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  notes: z.string().trim().max(2000),
});

export async function hotelSpeichern(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const id = String(formData.get("id") ?? "");
  const roh = Object.fromEntries(["name", "address", "contact", "quota_rooms", "price_per_night", "cancellation_deadline", "notes"].map((k) => [k, String(formData.get(k) ?? "")]));
  roh.price_per_night = roh.price_per_night.replace(/\s|€|eur(o)?/gi, "");
  roh.quota_rooms = roh.quota_rooms.replace(/\s|zimmer/gi, "");
  const d = hotelSchema.safeParse(roh);
  if (!istToken(modulId) || !d.success) zurueck(modulId, "eingabe");
  const werte = {
    module_id: modulId,
    name: d.data.name,
    address: d.data.address || null,
    contact: d.data.contact || null,
    quota_rooms: d.data.quota_rooms ? Number(d.data.quota_rooms) : null,
    price_per_night: d.data.price_per_night ? Number(d.data.price_per_night.replace(",", ".")) : null,
    cancellation_deadline: d.data.cancellation_deadline || null,
    notes: d.data.notes,
  };
  const supabase = await createClient();
  const { error } = istToken(id) ? await supabase.from("hotels").update(werte).eq("id", id) : await supabase.from("hotels").insert(werte);
  zurueck(modulId, error ? "fehler" : "hotel");
}

/** Mehrere Zimmer auf einmal: „101-110“ oder „101, 102, 205“, alle mit derselben Bettenzahl. */
export async function zimmerAnlegen(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const hotel = String(formData.get("hotel_id"));
  const betten = Number(formData.get("capacity"));
  const bereich = String(formData.get("section") ?? "").trim().slice(0, 100);
  const eingabe = String(formData.get("labels") ?? "").trim();
  if (!istToken(hotel) || !Number.isInteger(betten) || betten < 1 || betten > 12 || !eingabe) zurueck(modulId, "eingabe");
  const namen = eingabe.split(/[,;\s]+/).flatMap((teil) => {
    const bereichNr = teil.match(/^(\d+)-(\d+)$/);
    if (!bereichNr) return teil ? [teil.slice(0, 40)] : [];
    const [von, bis] = [Number(bereichNr[1]), Number(bereichNr[2])];
    return bis >= von && bis - von < 200 ? Array.from({ length: bis - von + 1 }, (_, i) => String(von + i)) : [];
  });
  if (namen.length === 0) zurueck(modulId, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("rooms").upsert(namen.map((label) => ({ hotel_id: hotel, label, capacity: betten, section: bereich || null })), { onConflict: "hotel_id,label", ignoreDuplicates: true });
  zurueck(modulId, error ? "fehler" : "zimmer");
}

export async function zimmerEntfernen(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const id = String(formData.get("id"));
  if (!istToken(id)) zurueck(modulId, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  zurueck(modulId, error ? "fehler" : "zimmer-entfernt");
}

/** Person einem Zimmer zuteilen (leer = Zuteilung im Hotel aufheben). */
export async function zimmerZuteilen(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const person = String(formData.get("participant_id"));
  const hotel = String(formData.get("hotel_id"));
  const zimmer = String(formData.get("room_id") ?? "");
  if (!istToken(person) || !istToken(hotel)) zurueck(modulId, "eingabe");
  const supabase = await createClient();
  if (istToken(zimmer)) {
    // In einem Schritt umziehen: Ist das neue Zimmer voll, bleibt die bisherige Zuteilung stehen
    const { error } = await supabase.from("room_assignments")
      .upsert({ room_id: zimmer, participant_id: person, hotel_id: hotel, source: "manual" }, { onConflict: "hotel_id,participant_id" });
    if (error) zurueck(modulId, error.message.includes("room_full") ? "zimmer-voll" : "fehler");
  } else {
    await supabase.from("room_assignments").delete().eq("participant_id", person).eq("hotel_id", hotel);
  }
  zurueck(modulId, "zugeteilt");
}

/** Zimmer in „Mein Bereich“ zeigen oder verbergen (z. B. solange der Zimmerplan noch ein ungeprüfter Vorschlag ist). */
export async function zimmerSichtbarUmschalten(formData: FormData) {
  await requireStaff("orga");
  const modulId = String(formData.get("module_id"));
  const hotel = String(formData.get("hotel_id"));
  if (!istToken(modulId) || !istToken(hotel)) zurueck(modulId, "eingabe");
  const sichtbar = formData.get("sichtbar") === "1";
  const supabase = await createClient();
  const { error } = await supabase.from("hotels").update({ rooms_visible: sichtbar }).eq("id", hotel);
  zurueck(modulId, error ? "fehler" : sichtbar ? "zimmer-sichtbar" : "zimmer-verborgen");
}

// ---------------------------------------------------------------------------
// „Mein Bereich“: eigene Angaben zur Übernachtung
// ---------------------------------------------------------------------------
const anreiseSchema = z.object({
  nights: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(31),
  ankunft_tag: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  ankunft_zeit: z.string().regex(/^(\d{2}:\d{2})?$/),
  abreise_tag: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  abreise_zeit: z.string().regex(/^(\d{2}:\d{2})?$/),
  arrival_by: z.enum(["", "bahn", "auto", "flug", "bus", "andere"]),
  room_wish: z.string().max(300),
  notes: z.string().max(1000),
});

export async function uebernachtungSpeichern(formData: FormData) {
  const modulId = String(formData.get("module_id"));
  const d = anreiseSchema.safeParse({
    nights: formData.getAll("nights").map(String),
    ankunft_tag: formData.get("ankunft_tag") ?? "", ankunft_zeit: formData.get("ankunft_zeit") ?? "",
    abreise_tag: formData.get("abreise_tag") ?? "", abreise_zeit: formData.get("abreise_zeit") ?? "",
    arrival_by: formData.get("arrival_by") ?? "", room_wish: formData.get("room_wish") ?? "", notes: formData.get("notes") ?? "",
  });
  if (!istToken(modulId) || !d.success) redirect("/mein-bereich/?uebernachtung=fehler#uebernachtung");
  const zeit = (tag: string, uhr: string) => (tag ? berlinerZeit(tag, uhr || "12:00") : null);
  const an = zeit(d.data.ankunft_tag, d.data.ankunft_zeit);
  const ab = zeit(d.data.abreise_tag, d.data.abreise_zeit);
  if (an && ab && ab < an) redirect("/mein-bereich/?uebernachtung=abreise#uebernachtung");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_my_stay", {
    p_module_id: modulId, p_nights: d.data.nights,
    p_arrival_at: zeit(d.data.ankunft_tag, d.data.ankunft_zeit)!, p_arrival_by: d.data.arrival_by,
    p_departure_at: zeit(d.data.abreise_tag, d.data.abreise_zeit)!, p_room_wish: d.data.room_wish, p_notes: d.data.notes,
  });
  revalidatePath("/mein-bereich/");
  redirect(`/mein-bereich/?uebernachtung=${error ? "fehler" : data === "departure_before_arrival" ? "abreise" : data}#uebernachtung`);
}

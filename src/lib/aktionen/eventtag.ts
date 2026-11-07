"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { berlinerZeit, jetztMs } from "@/lib/zeit";

function zurueck(pfad: string, hinweis: string): never {
  revalidatePath(pfad);
  redirect(`${pfad}${pfad.includes("?") ? "&" : "?"}hinweis=${hinweis}`);
}

/** PDF aus der Dokumentenablage als Regieplan dieses Tages festlegen (leer = wieder die Programmliste zeigen). */
export async function regieplanPdfSetzen(formData: FormData) {
  await requireStaff("orga");
  const tag = String(formData.get("tag") ?? "");
  const dokument = String(formData.get("document_id") ?? "");
  const pfad = `/team/regieplan/?tag=${istToken(tag) ? tag : ""}`;
  if (!istToken(tag) || (dokument && !istToken(dokument))) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_day_document", { p_day_id: tag, p_document_id: dokument || null! });
  zurueck(pfad, error ? "fehler" : dokument ? "pdf" : "pdf-entfernt");
}

/** Modultag laden und prüfen, dass er existiert. Liefert das Datum für die Uhrzeit-Felder. */
async function ladeTag(tagId: string) {
  if (!istToken(tagId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("module_days").select("id, day").eq("id", tagId).maybeSingle();
  return data;
}

const uhr = z.string().regex(/^\d{2}:\d{2}$/);

// ---------------------------------------------------------------------------
// Regieplan
// ---------------------------------------------------------------------------
const punktSchema = z.object({
  von: uhr,
  bis: z.union([uhr, z.literal("")]),
  title: z.string().trim().min(1).max(200),
  room: z.string().trim().max(100),
  responsible: z.string().trim().max(200),
  note: z.string().trim().max(1000),
});

export async function programmpunktAnlegen(formData: FormData) {
  const staff = await requireStaff("orga", { modulBezogen: true });
  const tagId = String(formData.get("tag"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  const tag = await ladeTag(tagId);
  const d = punktSchema.safeParse({
    von: formData.get("von"), bis: formData.get("bis") ?? "", title: formData.get("title"),
    room: formData.get("room") ?? "", responsible: formData.get("responsible") ?? "", note: formData.get("note") ?? "",
  });
  if (!tag || !d.success || (d.data.bis && d.data.bis <= d.data.von)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("program_items").insert({
    module_day_id: tag.id,
    starts_at: berlinerZeit(tag.day, d.data.von),
    ends_at: d.data.bis ? berlinerZeit(tag.day, d.data.bis) : null,
    title: d.data.title,
    room: d.data.room || null,
    responsible: d.data.responsible || null,
    note: d.data.note,
    updated_by: staff.userId,
  });
  zurueck(pfad, error ? "fehler" : "punkt-angelegt");
}

const statusSchema = z.enum(["geplant", "laeuft", "erledigt", "verschoben", "entfaellt"]);

/** Status setzen. „läuft“ beendet dabei automatisch den Punkt, der vorher lief. */
export async function programmpunktStatus(formData: FormData) {
  const staff = await requireStaff("orga", { modulBezogen: true });
  const tagId = String(formData.get("tag"));
  const id = String(formData.get("id"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  const status = statusSchema.safeParse(formData.get("status"));
  if (!status.success || !istToken(id)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  if (status.data === "laeuft") {
    await supabase.from("program_items").update({ status: "erledigt", updated_by: staff.userId })
      .eq("module_day_id", tagId).eq("status", "laeuft").neq("id", id);
  }
  const { error } = await supabase.from("program_items").update({ status: status.data, updated_by: staff.userId }).eq("id", id);
  zurueck(pfad, error ? "fehler" : "status");
}

/** Verzögerung: diesen und alle späteren, noch nicht erledigten Punkte des Tages um n Minuten verschieben. */
export async function programmVerschieben(formData: FormData) {
  const staff = await requireStaff("orga", { modulBezogen: true });
  const tagId = String(formData.get("tag"));
  const id = String(formData.get("id"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  const minuten = Number(formData.get("minuten"));
  if (!istToken(id) || !Number.isInteger(minuten) || minuten === 0 || Math.abs(minuten) > 240) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { data: ab } = await supabase.from("program_items").select("starts_at").eq("id", id).maybeSingle();
  if (!ab) zurueck(pfad, "fehler");
  const { data: betroffen } = await supabase.from("program_items")
    .select("id, starts_at, ends_at, status")
    .eq("module_day_id", tagId).gte("starts_at", ab.starts_at)
    .neq("status", "entfaellt");
  const versatz = minuten * 60_000;
  const plus = (iso: string | null) => (iso ? new Date(Date.parse(iso) + versatz).toISOString() : null);
  // Läuft der gewählte Punkt schon (Redner überzieht), bleibt sein Beginn stehen: nur sein Ende und alles danach rückt
  const laeuftSchon = Date.parse(ab.starts_at) <= jetztMs();
  for (const p of betroffen ?? []) {
    const nurEnde = laeuftSchon && p.id === id;
    const { error } = await supabase.from("program_items").update({
      starts_at: nurEnde ? p.starts_at : plus(p.starts_at)!, ends_at: plus(p.ends_at),
      status: p.status === "geplant" && !nurEnde ? "verschoben" : p.status, updated_by: staff.userId,
    }).eq("id", p.id);
    if (error) zurueck(pfad, "fehler");
  }
  zurueck(pfad, "verschoben");
}

/** Programmpunkt nachträglich ändern (Zeit, Titel, Raum, Verantwortlich, Untertitel); der Status bleibt. */
export async function programmpunktBearbeiten(formData: FormData) {
  const staff = await requireStaff("orga", { modulBezogen: true });
  const tagId = String(formData.get("tag"));
  const id = String(formData.get("id"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  const tag = await ladeTag(tagId);
  const d = punktSchema.safeParse({
    von: formData.get("von"), bis: formData.get("bis") ?? "", title: formData.get("title"),
    room: formData.get("room") ?? "", responsible: formData.get("responsible") ?? "", note: formData.get("note") ?? "",
  });
  if (!tag || !istToken(id) || !d.success || (d.data.bis && d.data.bis <= d.data.von)) zurueck(`${pfad}&bearbeiten=${istToken(id) ? id : ""}`, "eingabe");
  const supabase = await createClient();
  const { data, error } = await supabase.from("program_items").update({
    starts_at: berlinerZeit(tag.day, d.data.von),
    ends_at: d.data.bis ? berlinerZeit(tag.day, d.data.bis) : null,
    title: d.data.title,
    room: d.data.room || null,
    responsible: d.data.responsible || null,
    note: d.data.note,
    updated_by: staff.userId,
  }).eq("id", id).eq("module_day_id", tag.id).select("id");
  zurueck(pfad, error || !data?.length ? "fehler" : "punkt-geaendert");
}

export async function programmpunktEntfernen(formData: FormData) {
  await requireStaff("orga", { modulBezogen: true });
  const tagId = String(formData.get("tag"));
  const id = String(formData.get("id"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  if (!istToken(id)) zurueck(pfad, "eingabe");
  // Folgenschwer: nur nach der Rückfrage (Rueckfrage schickt bestaetigt=ja)
  if (formData.get("bestaetigt") !== "ja") return;
  const supabase = await createClient();
  const { error } = await supabase.from("program_items").delete().eq("id", id);
  zurueck(pfad, error ? "fehler" : "punkt-entfernt");
}

// ---------------------------------------------------------------------------
// Rollenplan
// ---------------------------------------------------------------------------
const einsatzSchema = z.object({
  person_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40),
  task: z.string().trim().min(1).max(300),
  von: z.union([uhr, z.literal("")]),
  bis: z.union([uhr, z.literal("")]),
  is_lead: z.boolean(),
});

export async function einsatzAnlegen(formData: FormData) {
  await requireStaff("orga", { modulBezogen: true });
  const tagId = String(formData.get("tag"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  const tag = await ladeTag(tagId);
  const d = einsatzSchema.safeParse({
    person_name: formData.get("person_name"), phone: formData.get("phone") ?? "", task: formData.get("task"),
    von: formData.get("von") ?? "", bis: formData.get("bis") ?? "", is_lead: formData.get("is_lead") === "on",
  });
  if (!tag || !d.success || (d.data.von && d.data.bis && d.data.bis <= d.data.von)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("duty_assignments").insert({
    module_day_id: tag.id,
    person_name: d.data.person_name,
    phone: d.data.phone || null,
    task: d.data.task,
    starts_at: d.data.von ? berlinerZeit(tag.day, d.data.von) : null,
    ends_at: d.data.bis ? berlinerZeit(tag.day, d.data.bis) : null,
    is_lead: d.data.is_lead,
  });
  zurueck(pfad, error ? "fehler" : "einsatz-angelegt");
}

/** Einsatz nachträglich ändern (Name, Aufgabe, Telefon, Zeit, Leitung). */
export async function einsatzBearbeiten(formData: FormData) {
  await requireStaff("orga", { modulBezogen: true });
  const tagId = String(formData.get("tag"));
  const id = String(formData.get("id"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  const tag = await ladeTag(tagId);
  const d = einsatzSchema.safeParse({
    person_name: formData.get("person_name"), phone: formData.get("phone") ?? "", task: formData.get("task"),
    von: formData.get("von") ?? "", bis: formData.get("bis") ?? "", is_lead: formData.get("is_lead") === "on",
  });
  if (!tag || !istToken(id) || !d.success || (d.data.von && d.data.bis && d.data.bis <= d.data.von)) zurueck(`${pfad}&einsatz=${istToken(id) ? id : ""}`, "eingabe");
  const supabase = await createClient();
  const { data, error } = await supabase.from("duty_assignments").update({
    person_name: d.data.person_name,
    phone: d.data.phone || null,
    task: d.data.task,
    starts_at: d.data.von ? berlinerZeit(tag.day, d.data.von) : null,
    ends_at: d.data.bis ? berlinerZeit(tag.day, d.data.bis) : null,
    is_lead: d.data.is_lead,
  }).eq("id", id).eq("module_day_id", tag.id).select("id");
  zurueck(pfad, error || !data?.length ? "fehler" : "einsatz-geaendert");
}

export async function einsatzEntfernen(formData: FormData) {
  await requireStaff("orga", { modulBezogen: true });
  const tagId = String(formData.get("tag"));
  const id = String(formData.get("id"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  if (!istToken(id)) zurueck(pfad, "eingabe");
  // Folgenschwer: nur nach der Rückfrage (Rueckfrage schickt bestaetigt=ja)
  if (formData.get("bestaetigt") !== "ja") return;
  const supabase = await createClient();
  const { error } = await supabase.from("duty_assignments").delete().eq("id", id);
  zurueck(pfad, error ? "fehler" : "einsatz-entfernt");
}

/** Einsätze eines Tages auf einen anderen Tag desselben Moduls übernehmen (Uhrzeiten bleiben gleich). */
export async function einsaetzeUebernehmen(formData: FormData) {
  await requireStaff("orga", { modulBezogen: true });
  const vonTag = String(formData.get("von_tag"));
  const tagId = String(formData.get("tag"));
  const pfad = `/team/regieplan/?tag=${tagId}`;
  const [quelle, ziel] = await Promise.all([ladeTag(vonTag), ladeTag(tagId)]);
  if (!quelle || !ziel || quelle.id === ziel.id) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { data: alt } = await supabase.from("duty_assignments").select("*").eq("module_day_id", quelle.id);
  const uhrzeitVon = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso)) : null;
  const neu = (alt ?? []).map((e) => ({
    module_day_id: ziel.id, person_name: e.person_name, phone: e.phone, task: e.task, user_id: e.user_id, is_lead: e.is_lead,
    starts_at: e.starts_at ? berlinerZeit(ziel.day, uhrzeitVon(e.starts_at)!) : null,
    ends_at: e.ends_at ? berlinerZeit(ziel.day, uhrzeitVon(e.ends_at)!) : null,
  }));
  // Schon vorhandene Einsätze nicht doppelt anlegen (z. B. zweimal auf „Übernehmen“ getippt)
  const { data: vorhanden } = await supabase.from("duty_assignments").select("person_name, task, starts_at, ends_at").eq("module_day_id", ziel.id);
  const schluessel = (e: { person_name: string; task: string | null; starts_at: string | null; ends_at: string | null }) =>
    [e.person_name, e.task ?? "", e.starts_at ? Date.parse(e.starts_at) : "", e.ends_at ? Date.parse(e.ends_at) : ""].join("|");
  const schonDa = new Set((vorhanden ?? []).map(schluessel));
  const fehlend = neu.filter((e) => !schonDa.has(schluessel(e)));
  if (neu.length === 0) zurueck(pfad, "nichts");
  if (fehlend.length === 0) zurueck(pfad, "schon-uebernommen");
  const { error } = await supabase.from("duty_assignments").insert(fehlend);
  zurueck(pfad, error ? "fehler" : `uebernommen-${fehlend.length}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { berlinerZeit } from "@/lib/zeit";

function zurueck(pfad: string, hinweis: string): never {
  revalidatePath(pfad);
  redirect(`${pfad}?hinweis=${hinweis}`);
}

const text = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const liste = (f: FormData, k: string) => text(f, k, 500).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);

// ---------------------------------------------------------------------------
// Referentenpool und Einladungen
// ---------------------------------------------------------------------------
/** Neue Person in den Pool und, wenn ein Modul angegeben ist, gleich als Idee für dieses Modul. */
export async function referentAnlegen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const pfad = istToken(modulId) ? `/team/module/${modulId}/referenten/` : "/team/referenten/";
  const name = text(formData, "name", 200);
  if (!name) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { data, error } = await supabase.from("speakers").insert({
    name, affiliation: text(formData, "affiliation", 300), bio: text(formData, "bio", 3000),
    email: text(formData, "email", 200) || null, phone: text(formData, "phone", 40) || null,
    website: text(formData, "website", 300) || null, topics: liste(formData, "topics"), languages: liste(formData, "languages"),
    notes: text(formData, "notes"),
  }).select("id").single();
  if (error || !data) zurueck(pfad, "fehler");
  if (istToken(modulId)) {
    await supabase.from("module_speakers").insert({ module_id: modulId, speaker_id: data.id, role: text(formData, "role", 30) || "vortrag", topic: text(formData, "topic", 300) });
  }
  zurueck(pfad, "referent-angelegt");
}

export async function referentEinladen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const sprecher = text(formData, "speaker_id");
  const pfad = `/team/module/${modulId}/referenten/`;
  if (!istToken(modulId) || !istToken(sprecher)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("module_speakers").insert({ module_id: modulId, speaker_id: sprecher, role: text(formData, "role", 30) || "vortrag", topic: text(formData, "topic", 300) });
  zurueck(pfad, error?.code === "23505" ? "schon-eingeladen" : error ? "fehler" : "eingeladen");
}

const statusSchema = z.enum(["idee", "angefragt", "zugesagt", "abgesagt", "bestaetigt"]);
/** Betrag wie man ihn tippt: „1.250,50“, „1250,5“, „250.50“, „250 €“. Ungültig oder negativ → NaN (wird abgelehnt). */
function zahl(v: string): number | null {
  const t = v.replace(/\s|€|eur(o)?/gi, "");
  if (!t) return null;
  const norm = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  const n = Number(norm);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

/** Status und Gästeblatt einer Einladung speichern. */
export async function gaesteblattSpeichern(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const id = text(formData, "id");
  const pfad = `/team/module/${modulId}/referenten/`;
  const status = statusSchema.safeParse(formData.get("status"));
  if (!istToken(id) || !status.success) zurueck(pfad, "eingabe");
  const zeitpunkt = (tag: string, uhr: string) => (tag ? berlinerZeit(tag, uhr || "12:00") : null);
  const fee = zahl(text(formData, "fee", 12));
  const travel = zahl(text(formData, "travel_costs", 12));
  if (Number.isNaN(fee) || Number.isNaN(travel)) zurueck(pfad, "betrag");
  const supabase = await createClient();
  const { error } = await supabase.from("module_speakers").update({
    status: status.data, topic: text(formData, "topic", 300), host_name: text(formData, "host_name", 200) || null,
    arrival_at: zeitpunkt(text(formData, "arrival_tag", 10), text(formData, "arrival_zeit", 5)), arrival_info: text(formData, "arrival_info", 500),
    departure_at: zeitpunkt(text(formData, "departure_tag", 10), text(formData, "departure_zeit", 5)),
    hotel_info: text(formData, "hotel_info", 500), tech_needs: text(formData, "tech_needs", 500),
    slides_received: formData.get("slides_received") === "on", bio_received: formData.get("bio_received") === "on",
    fee, travel_costs: travel, notes: text(formData, "notes"),
  }).eq("id", id);
  zurueck(pfad, error ? "fehler" : "gespeichert");
}

export async function einladungEntfernen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const id = text(formData, "id");
  const pfad = `/team/module/${modulId}/referenten/`;
  if (!istToken(id)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("module_speakers").delete().eq("id", id);
  zurueck(pfad, error ? "fehler" : "entfernt");
}

// ---------------------------------------------------------------------------
// Checkliste und Aufgaben
// ---------------------------------------------------------------------------
export async function checklisteAnlegen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const pfad = `/team/module/${modulId}/checkliste/`;
  if (!istToken(modulId)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_module_checklist", { p_module_id: modulId });
  zurueck(pfad, error ? "fehler" : `angelegt-${data ?? 0}`);
}

/** Erledigt umschalten. pfad = Seite, auf die es zurückgeht (Modul-Checkliste oder Startseite). */
export async function aufgabeUmschalten(formData: FormData) {
  const staff = await requireStaff("orga");
  const id = text(formData, "id");
  const pfad = text(formData, "zurueck", 200).startsWith("/team/") ? text(formData, "zurueck", 200) : "/team/";
  if (!istToken(id)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const erledigt = formData.get("erledigt") === "1";
  const { error } = await supabase.from("tasks").update(erledigt ? { done_at: new Date().toISOString(), done_by: staff.userId } : { done_at: null, done_by: null }).eq("id", id);
  zurueck(pfad, error ? "fehler" : "aufgabe");
}

export async function aufgabeSpeichern(formData: FormData) {
  const staff = await requireStaff("orga");
  const id = text(formData, "id");
  const modulId = text(formData, "module_id");
  const pfad = istToken(modulId) ? `/team/module/${modulId}/checkliste/` : "/team/aufgaben/";
  const titel = text(formData, "title", 300);
  const frist = text(formData, "due_date", 10);
  const zustaendig = text(formData, "assignee_user", 40);
  if (!titel || (frist && !/^\d{4}-\d{2}-\d{2}$/.test(frist))) zurueck(pfad, "eingabe");
  const werte = {
    title: titel, due_date: frist || null, commission: text(formData, "commission", 100) || null,
    assignee_user: istToken(zustaendig) ? zustaendig : null, assignee_name: text(formData, "assignee_name", 200) || null, notes: text(formData, "notes"),
  };
  const supabase = await createClient();
  const { error } = istToken(id)
    ? await supabase.from("tasks").update(werte).eq("id", id)
    : await supabase.from("tasks").insert({ ...werte, module_id: istToken(modulId) ? modulId : null, created_by: staff.userId });
  zurueck(pfad, error ? "fehler" : "aufgabe");
}

export async function aufgabeEntfernen(formData: FormData) {
  await requireStaff("orga");
  const id = text(formData, "id");
  const modulId = text(formData, "module_id");
  const pfad = istToken(modulId) ? `/team/module/${modulId}/checkliste/` : "/team/aufgaben/";
  if (!istToken(id)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  zurueck(pfad, error ? "fehler" : "aufgabe-entfernt");
}

// ---------------------------------------------------------------------------
// Gruppen und Räume
// ---------------------------------------------------------------------------
export async function gruppeSpeichern(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const id = text(formData, "id");
  const pfad = `/team/module/${modulId}/gruppen/`;
  const name = text(formData, "name", 100);
  if (!istToken(modulId) || !name) zurueck(pfad, "eingabe");
  const werte = { name, room: text(formData, "room", 100) || null, leader: text(formData, "leader", 200) || null };
  const supabase = await createClient();
  const { error } = istToken(id) ? await supabase.from("module_groups").update(werte).eq("id", id) : await supabase.from("module_groups").insert({ ...werte, module_id: modulId });
  zurueck(pfad, error?.code === "23505" ? "gruppe-doppelt" : error ? "fehler" : "gruppe");
}

export async function gruppeEntfernen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const id = text(formData, "id");
  const pfad = `/team/module/${modulId}/gruppen/`;
  if (!istToken(id)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("module_groups").delete().eq("id", id);
  zurueck(pfad, error ? "fehler" : "gruppe-entfernt");
}

export async function mitgliedZuteilen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const person = text(formData, "participant_id");
  const gruppe = text(formData, "group_id");
  const pfad = `/team/module/${modulId}/gruppen/`;
  if (!istToken(modulId) || !istToken(person)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  await supabase.from("group_members").delete().eq("module_id", modulId).eq("participant_id", person);
  if (istToken(gruppe)) {
    const { error } = await supabase.from("group_members").insert({ group_id: gruppe, participant_id: person, module_id: modulId });
    if (error) zurueck(pfad, "fehler");
  }
  zurueck(pfad, "zugeteilt");
}

const landName: Record<string, string> = { DE: "Deutschland", AT: "Österreich", FR: "Frankreich", CH: "Schweiz", NL: "Niederlande", BE: "Belgien" };

/**
 * Vorschlag: alle bestätigten Angemeldeten ohne Gruppe nach Land (oder GT/KGT) auf Gruppen verteilen.
 * Fehlende Gruppen werden angelegt. Bestehende Zuteilungen bleiben unverändert; das Team prüft danach von Hand.
 */
export async function gruppenVorschlag(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id");
  const nach = formData.get("nach") === "branch" ? "branch" : "country";
  const pfad = `/team/module/${modulId}/gruppen/`;
  if (!istToken(modulId)) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  // Land und GT/KGT über die Funktion: das Orga-Team darf participants nicht direkt lesen
  const [{ data: kandidaten }, { data: gruppen }] = await Promise.all([
    supabase.rpc("get_grouping_candidates", { p_module_id: modulId }),
    supabase.from("module_groups").select("id, name").eq("module_id", modulId),
  ]);
  const anmeldungen = (kandidaten ?? []).filter((k) => !k.group_id).map((k) => ({ participant_id: k.participant_id, participant: { country: k.country, branch: k.branch } }));
  const schon = new Set<string>();
  const gruppeVon = new Map((gruppen ?? []).map((g) => [g.name, g.id]));
  let neu = 0;
  for (const a of anmeldungen ?? []) {
    if (schon.has(a.participant_id)) continue;
    const schluessel = nach === "branch" ? a.participant.branch : a.participant.country;
    const name = schluessel ? (nach === "branch" ? schluessel : landName[schluessel] ?? "Andere Länder") : "Ohne Angabe";
    if (!gruppeVon.has(name)) {
      const { data } = await supabase.from("module_groups").insert({ module_id: modulId, name }).select("id").single();
      if (data) gruppeVon.set(name, data.id);
    }
    const { error } = await supabase.from("group_members").insert({ group_id: gruppeVon.get(name)!, participant_id: a.participant_id, module_id: modulId });
    if (!error) neu++;
  }
  zurueck(pfad, `vorschlag-${neu}`);
}

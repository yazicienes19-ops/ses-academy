"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { betragLesen } from "@/lib/betrag";
import { istToken } from "@/lib/codes";
import { csvText } from "@/lib/csv";
import { mailBereit, sendeZimmerliste } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";
import { ladeZimmerplan, zimmerlisteTabelle } from "@/lib/zimmerplan-daten";

// Logistik je Modul (ab Orga-Team): sonstige Kosten, Materialliste, Zimmerliste per Mail ans Hotel.
// Rechte setzt die Datenbank durch (has_orga_access(), ohne auf ein Modul begrenzte Konten).

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

function zurueck(pfad: string, hinweis: string, anker?: string): never {
  revalidatePath(pfad);
  redirect(`${pfad}${pfad.includes("?") ? "&" : "?"}hinweis=${hinweis}${anker ? `#${anker}` : ""}`);
}

// ---------------------------------------------------------------------------
// Kosten
// ---------------------------------------------------------------------------
const kategorien = ["verpflegung", "raum", "technik", "reise", "material", "sonstiges"] as const;

export async function kostenSpeichern(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id", 40);
  const pfad = `/team/module/${modulId}/kosten/`;
  const betrag = betragLesen(text(formData, "amount", 20));
  const kategorie = z.enum(kategorien).safeParse(formData.get("category"));
  const bezeichnung = text(formData, "label", 200);
  if (!istToken(modulId) || !bezeichnung || betrag === null || Number.isNaN(betrag) || !kategorie.success) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("module_costs").insert({ module_id: modulId, label: bezeichnung, category: kategorie.data, amount: betrag, note: text(formData, "note", 1000) });
  zurueck(pfad, error ? "fehler" : "kosten");
}

export async function kostenEntfernen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id", 40);
  const id = text(formData, "id", 40);
  const pfad = `/team/module/${modulId}/kosten/`;
  if (!istToken(modulId) || !istToken(id)) zurueck(pfad, "eingabe");
  if (formData.get("bestaetigt") !== "ja") return;
  const supabase = await createClient();
  const { error } = await supabase.from("module_costs").delete().eq("id", id).eq("module_id", modulId);
  zurueck(pfad, error ? "fehler" : "kosten-entfernt");
}

// ---------------------------------------------------------------------------
// Materialliste
// ---------------------------------------------------------------------------
const materialPfad = (modulId: string) => `/team/module/${modulId}/material/`;

export async function materialSpeichern(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id", 40);
  const id = text(formData, "id", 40);
  const pfad = materialPfad(modulId);
  const werte = { label: text(formData, "label", 200), quantity: text(formData, "quantity", 50), responsible: text(formData, "responsible", 100), note: text(formData, "note", 500) };
  if (!istToken(modulId) || !werte.label) zurueck(pfad, "eingabe", "materialliste");
  const supabase = await createClient();
  const { error } = istToken(id)
    ? await supabase.from("module_materials").update(werte).eq("id", id).eq("module_id", modulId)
    : await supabase.from("module_materials").insert({ ...werte, module_id: modulId });
  zurueck(pfad, error ? "fehler" : "material", "materialliste");
}

export async function materialAbhaken(formData: FormData) {
  const staff = await requireStaff("orga");
  const modulId = text(formData, "module_id", 40);
  const id = text(formData, "id", 40);
  const pfad = materialPfad(modulId);
  if (!istToken(modulId) || !istToken(id)) zurueck(pfad, "eingabe", "materialliste");
  const erledigt = formData.get("erledigt") === "1";
  const supabase = await createClient();
  const { error } = await supabase.from("module_materials")
    .update(erledigt ? { done_at: new Date().toISOString(), done_by: staff.userId } : { done_at: null, done_by: null })
    .eq("id", id).eq("module_id", modulId);
  zurueck(pfad, error ? "fehler" : erledigt ? "material-erledigt" : "material-offen", `m-${id}`);
}

export async function materialEntfernen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id", 40);
  const id = text(formData, "id", 40);
  const pfad = materialPfad(modulId);
  if (!istToken(modulId) || !istToken(id)) zurueck(pfad, "eingabe", "materialliste");
  if (formData.get("bestaetigt") !== "ja") return;
  const supabase = await createClient();
  const { error } = await supabase.from("module_materials").delete().eq("id", id).eq("module_id", modulId);
  zurueck(pfad, error ? "fehler" : "material-entfernt", "materialliste");
}

/** Liste eines früheren Moduls übernehmen (ohne Haken, ohne Doppelte). */
export async function materialUebernehmen(formData: FormData) {
  await requireStaff("orga");
  const modulId = text(formData, "module_id", 40);
  const von = text(formData, "von", 40);
  const pfad = materialPfad(modulId);
  if (!istToken(modulId) || !istToken(von)) zurueck(pfad, "eingabe", "materialliste");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("copy_materials", { p_from: von, p_to: modulId });
  zurueck(pfad, error ? "fehler" : `material-uebernommen-${data ?? 0}`, "materialliste");
}

// ---------------------------------------------------------------------------
// Zimmerliste per Mail ans Hotel
// ---------------------------------------------------------------------------
export async function zimmerlisteSenden(formData: FormData) {
  const staff = await requireStaff("orga");
  const modulId = text(formData, "module_id", 40);
  const hotelId = text(formData, "hotel_id", 40);
  const an = text(formData, "an", 200).toLowerCase();
  const pfad = `/team/module/${modulId}/hotel/?hotel=${hotelId}`;
  if (!istToken(modulId) || !istToken(hotelId)) zurueck(pfad, "eingabe");
  if (!z.email().safeParse(an).success) zurueck(pfad, "liste-adresse", "zimmerliste");
  if (formData.get("bestaetigt") !== "ja") zurueck(pfad, "eingabe", "zimmerliste");
  if (!mailBereit()) zurueck(pfad, "liste-mail-aus", "zimmerliste");
  const d = await ladeZimmerplan(modulId, hotelId);
  if (!d.modul || d.hotel?.id !== hotelId || d.zimmer.length === 0) zurueck(pfad, "liste-leer", "zimmerliste");
  const t = zimmerlisteTabelle(d, 2);
  if (t.gaeste === 0) zurueck(pfad, "liste-leer", "zimmerliste");
  const ergebnis = await sendeZimmerliste(an, {
    modul: d.modul.title, hotel: t.hotelName, zimmer: t.zimmer, gaeste: t.gaeste, csv: csvText(t.zeilen), datei: t.datei, absender: staff.name,
  }, staff.userId, modulId);
  if (!ergebnis.ok) zurueck(pfad, "liste-fehler", "zimmerliste");
  const supabase = await createClient();
  await supabase.from("hotels").update({ room_list_sent_at: new Date().toISOString(), room_list_sent_to: an }).eq("id", hotelId);
  zurueck(pfad, "liste-gesendet", "zimmerliste");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Regieplan: ab orga_team. Öffentliche Felder in agenda_items (Teilnehmende sehen veröffentlichte Punkte
// ihrer Module als „Tagesordnung“), Verantwortlich + Orga-Notiz in agenda_item_internal (nur Kommission).

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const zurueck = (modul: string, fehler?: string) =>
  redirect(`/team/regieplan/?modul=${modul}${fehler ? `&fehler=${encodeURIComponent(fehler)}` : "&hinweis=gespeichert"}`);

export async function punktSpeichern(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  const modul = text(formData.get("modul"));
  const id = text(formData.get("id"));
  const werte = {
    module_day_id: text(formData.get("module_day_id")),
    starts_at: text(formData.get("starts_at")),
    ends_at: text(formData.get("ends_at")) || null,
    title: text(formData.get("title")),
    location: text(formData.get("location")) || null,
    description: text(formData.get("description")),
    published: formData.get("published") === "on",
  };
  if (!werte.starts_at || !werte.title) zurueck(modul, "Uhrzeit und Titel sind Pflicht.");
  const res = id
    ? await supabase.from("agenda_items").update(werte).eq("id", id).select("id").single()
    : await supabase.from("agenda_items").insert(werte).select("id").single();
  if (res.error) zurueck(modul, res.error.code === "23514" ? "Das Ende muss nach dem Beginn liegen." : res.error.message);
  const intern = { item_id: res.data!.id, responsible: text(formData.get("responsible")), note: text(formData.get("note")) };
  await supabase.from("agenda_item_internal").upsert(intern);
  revalidatePath("/team/regieplan/");
  zurueck(modul);
}

export async function punktLoeschen(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  await supabase.from("agenda_items").delete().eq("id", text(formData.get("id")));
  revalidatePath("/team/regieplan/");
  zurueck(text(formData.get("modul")));
}

/** Alle Punkte eines Tages für Teilnehmende sichtbar schalten (oder wieder verbergen). */
export async function tagVeroeffentlichen(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  await supabase.from("agenda_items").update({ published: formData.get("published") === "true" }).eq("module_day_id", text(formData.get("module_day_id")));
  revalidatePath("/team/regieplan/");
  zurueck(text(formData.get("modul")));
}

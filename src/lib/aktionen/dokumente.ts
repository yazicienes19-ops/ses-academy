"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";

const text = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);

export async function dokumentSpeichern(formData: FormData) {
  await requireStaff("orga");
  const id = text(formData, "id");
  const pfad = `/team/dokumente/${id}/`;
  const status = text(formData, "status", 20);
  if (!istToken(id) || !["entwurf", "pruefung", "final", "archiv"].includes(status)) redirect(`${pfad}?hinweis=eingabe`);
  const link = text(formData, "link", 1000);
  if (link && !/^https?:\/\//i.test(link)) redirect(`${pfad}?hinweis=eingabe`);
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({
    title: text(formData, "title", 200), status, commission: text(formData, "commission", 100) || null,
    tags: text(formData, "tags", 500).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20),
    description: text(formData, "description"), link: link || null,
  }).eq("id", id);
  revalidatePath(pfad);
  redirect(`${pfad}?hinweis=${error ? "fehler" : "gespeichert"}`);
}

// ---------------------------------------------------------------------------
// Sitzungen
// ---------------------------------------------------------------------------
export async function sitzungSpeichern(formData: FormData) {
  const staff = await requireStaff("orga");
  const id = text(formData, "id");
  const titel = text(formData, "title", 200);
  const tag = text(formData, "held_on", 10);
  if (!titel || !/^\d{4}-\d{2}-\d{2}$/.test(tag)) redirect(`/team/sitzungen/${istToken(id) ? `${id}/` : ""}?hinweis=eingabe`);
  const werte = { title: titel, held_on: tag, commission: text(formData, "commission", 100) || null, attendees: text(formData, "attendees", 1000), protocol: text(formData, "protocol", 50000) };
  const supabase = await createClient();
  if (istToken(id)) {
    const { error } = await supabase.from("meetings").update(werte).eq("id", id);
    revalidatePath(`/team/sitzungen/${id}/`);
    redirect(`/team/sitzungen/${id}/?hinweis=${error ? "fehler" : "gespeichert"}`);
  }
  const { data, error } = await supabase.from("meetings").insert({ ...werte, created_by: staff.userId }).select("id").single();
  if (error || !data) redirect("/team/sitzungen/?hinweis=fehler");
  redirect(`/team/sitzungen/${data.id}/?hinweis=angelegt`);
}

/** Das Protokoll-Feld wird beim Hinzufügen von Beschlüssen und Aufgaben mitgeschickt; sonst ginge Getipptes verloren. */
async function protokollMitnehmen(supabase: Awaited<ReturnType<typeof createClient>>, id: string, formData: FormData) {
  if (formData.has("protocol")) await supabase.from("meetings").update({ protocol: text(formData, "protocol", 50000) }).eq("id", id);
}

export async function beschlussHinzufuegen(formData: FormData) {
  await requireStaff("orga");
  const id = text(formData, "meeting_id");
  const beschluss = text(formData, "text", 2000);
  if (!istToken(id) || !beschluss) redirect(`/team/sitzungen/${id}/?hinweis=eingabe`);
  const supabase = await createClient();
  await protokollMitnehmen(supabase, id, formData);
  const { error } = await supabase.from("meeting_decisions").insert({ meeting_id: id, text: beschluss });
  revalidatePath(`/team/sitzungen/${id}/`);
  redirect(`/team/sitzungen/${id}/?hinweis=${error ? "fehler" : "gespeichert"}#beschluesse`);
}

export async function sitzungsAufgabe(formData: FormData) {
  const staff = await requireStaff("orga");
  const id = text(formData, "meeting_id");
  const titel = text(formData, "title", 300);
  const frist = text(formData, "due_date", 10);
  const zustaendig = text(formData, "assignee_user", 40);
  if (!istToken(id) || !titel || (frist && !/^\d{4}-\d{2}-\d{2}$/.test(frist))) redirect(`/team/sitzungen/${id}/?hinweis=eingabe`);
  const supabase = await createClient();
  await protokollMitnehmen(supabase, id, formData);
  const { error } = await supabase.from("tasks").insert({
    title: titel, meeting_id: id, due_date: frist || null, assignee_user: istToken(zustaendig) ? zustaendig : null,
    assignee_name: text(formData, "assignee_name", 200) || null, created_by: staff.userId,
  });
  revalidatePath(`/team/sitzungen/${id}/`);
  redirect(`/team/sitzungen/${id}/?hinweis=${error ? "fehler" : "gespeichert"}#aufgaben`);
}

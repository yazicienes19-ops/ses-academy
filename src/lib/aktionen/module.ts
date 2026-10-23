"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { berlinerZeit } from "@/lib/zeit";
import { createClient } from "@/lib/supabase/server";

function zurueck(pfad: string, hinweis: string): never {
  revalidatePath("/team/module/", "layout");
  redirect(`${pfad}?hinweis=${hinweis}`);
}

const modulSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  kind: z.enum(["auftakt", "seminar", "workshop", "winterschool", "sonstiges"]),
  description: z.string().trim().max(5000),
  location: z.string().trim().max(300),
  status: z.enum(["draft", "published", "archived"]),
  capacity: z.string().trim().regex(/^\d*$/),
  ticket_required: z.boolean(),
  counts_for_streak: z.boolean(),
  open_registration: z.boolean(),
});

function leseModul(formData: FormData) {
  return modulSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    kind: formData.get("kind"),
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
    status: formData.get("status"),
    capacity: formData.get("capacity") ?? "",
    ticket_required: formData.get("ticket_required") === "on",
    counts_for_streak: formData.get("counts_for_streak") === "on",
    open_registration: formData.get("open_registration") === "on",
  });
}

/** Neues Modul im aktuellen Jahrgang anlegen (zunächst als Entwurf oder direkt veröffentlicht). */
export async function modulAnlegen(formData: FormData) {
  await requireStaff("alles");
  const d = leseModul(formData);
  if (!d.success) zurueck("/team/module/", "eingabe");
  const supabase = await createClient();
  const { data: jahrgang } = await supabase.from("cohorts").select("id").eq("is_current", true).maybeSingle();
  const { data, error } = await supabase
    .from("modules")
    .insert({ ...d.data, location: d.data.location || null, capacity: d.data.capacity ? Number(d.data.capacity) : null, cohort_id: jahrgang?.id ?? null })
    .select("id")
    .single();
  if (error?.code === "23505") zurueck("/team/module/", "slug-vergeben");
  if (error || !data) zurueck("/team/module/", "fehler");
  redirect(`/team/module/${data.id}/?hinweis=angelegt`);
}

/** Modul speichern. Wird es veröffentlicht, werden alle angenommenen Teilnehmenden des Jahrgangs angemeldet. */
export async function modulSpeichern(formData: FormData) {
  await requireStaff("alles");
  const id = String(formData.get("id"));
  const pfad = `/team/module/${id}/`;
  const d = leseModul(formData);
  if (!d.success) zurueck(pfad, "eingabe");
  const supabase = await createClient();
  const { error } = await supabase
    .from("modules")
    .update({ ...d.data, location: d.data.location || null, capacity: d.data.capacity ? Number(d.data.capacity) : null })
    .eq("id", id);
  if (error?.code === "23505") zurueck(pfad, "slug-vergeben");
  if (error) zurueck(pfad, "fehler");

  if (d.data.status === "published") {
    const { data: neu } = await supabase.rpc("register_cohort_for_module", { p_module_id: id });
    if (typeof neu === "number" && neu > 0) zurueck(pfad, `gespeichert-${neu}`);
  }
  zurueck(pfad, "gespeichert");
}

const tagSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  von: z.string().regex(/^\d{2}:\d{2}$/),
  bis: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().trim().max(100),
});

export async function tagHinzufuegen(formData: FormData) {
  await requireStaff("alles");
  const id = String(formData.get("module_id"));
  const pfad = `/team/module/${id}/`;
  const d = tagSchema.safeParse({ day: formData.get("day"), von: formData.get("von"), bis: formData.get("bis"), label: formData.get("label") ?? "" });
  if (!d.success || d.data.bis <= d.data.von) zurueck(pfad, "tag-eingabe");
  const supabase = await createClient();
  const { error } = await supabase.from("module_days").insert({
    module_id: id,
    day: d.data.day,
    starts_at: berlinerZeit(d.data.day, d.data.von),
    ends_at: berlinerZeit(d.data.day, d.data.bis),
    label: d.data.label || null,
  });
  zurueck(pfad, error?.code === "23505" ? "tag-doppelt" : error ? "fehler" : "tag-angelegt");
}

/** Termin entfernen geht nur, solange dort noch niemand eingecheckt wurde. */
export async function tagEntfernen(formData: FormData) {
  await requireStaff("alles");
  const id = String(formData.get("module_id"));
  const tagId = String(formData.get("day_id"));
  const pfad = `/team/module/${id}/`;
  const supabase = await createClient();
  const { count } = await supabase.from("attendances").select("id", { count: "exact", head: true }).eq("module_day_id", tagId);
  if (count) zurueck(pfad, "tag-hat-checkins");
  const { error } = await supabase.from("module_days").delete().eq("id", tagId).eq("module_id", id);
  zurueck(pfad, error ? "fehler" : "tag-entfernt");
}

export async function modulAbsagen(formData: FormData) {
  await requireStaff("alles");
  const id = String(formData.get("id"));
  const grund = String(formData.get("grund") ?? "").trim().slice(0, 500);
  const supabase = await createClient();
  const { error } = await supabase.from("modules")
    .update({ cancelled_at: new Date().toISOString(), cancellation_reason: grund || null })
    .eq("id", id).is("cancelled_at", null);
  zurueck(`/team/module/${id}/`, error ? "fehler" : "abgesagt");
}

export async function absageZuruecknehmen(formData: FormData) {
  await requireStaff("alles");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("modules").update({ cancelled_at: null, cancellation_reason: null }).eq("id", id);
  zurueck(`/team/module/${id}/`, error ? "fehler" : "reaktiviert");
}

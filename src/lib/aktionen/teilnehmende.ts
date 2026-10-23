"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { sendeTicketMail } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";

const leer = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

const schema = z.object({
  first_name: z.string().trim().min(1, "Vorname fehlt"),
  last_name: z.string().trim(),
  email: z.email("E-Mail-Adresse ist ungültig").nullable(),
  phone: z.string().nullable(),
  region_id: z.coerce.number().int().nullable(),
  country: z.enum(["DE", "AT", "FR", "CH", "NL", "BE", "other"]).nullable(),
  branch: z.enum(["GT", "KGT"]).nullable(),
  mentor_id: z.uuid().nullable(),
  notes: z.string(),
  active: z.boolean(),
});

/** Stammdaten einer Person speichern (nur admin/vorstand, siehe RLS participants_full). */
export async function personSpeichern(formData: FormData) {
  await requireStaff("alles");
  const id = String(formData.get("id"));
  const ziel = `/team/teilnehmende/${id}/`;
  const daten = schema.safeParse({
    first_name: formData.get("first_name"),
    last_name: String(formData.get("last_name") ?? ""),
    email: leer(formData.get("email"))?.toLowerCase() ?? null,
    phone: leer(formData.get("phone")),
    region_id: leer(formData.get("region_id")),
    country: leer(formData.get("country")),
    branch: leer(formData.get("branch")),
    mentor_id: leer(formData.get("mentor_id")),
    notes: String(formData.get("notes") ?? ""),
    active: formData.get("active") === "on",
  });
  if (!daten.success) redirect(`${ziel}?fehler=${encodeURIComponent(daten.error.issues[0].message)}`);
  const supabase = await createClient();
  if (!daten.data.country && daten.data.region_id) {
    const { data: r } = await supabase.from("regions").select("country").eq("id", daten.data.region_id).single();
    daten.data.country = (r?.country ?? null) as z.infer<typeof schema>["country"];
  }
  const { error } = await supabase.from("participants").update(daten.data).eq("id", id);
  if (error) redirect(`${ziel}?fehler=${encodeURIComponent(error.code === "23505" ? "Diese E-Mail-Adresse gehört schon zu einer anderen Person." : error.message)}`);
  revalidatePath("/team/", "layout");
  redirect(`${ziel}?hinweis=gespeichert`);
}

/** Persönlichen QR-Code (gilt für alle Module) per Mail schicken. */
export async function ticketSenden(formData: FormData) {
  const staff = await requireStaff("alles");
  const id = String(formData.get("id"));
  const r = await sendeTicketMail(id, staff.userId);
  redirect(`/team/teilnehmende/${id}/?hinweis=${r.ok ? "ticket-gesendet" : "ticket-fehler"}`);
}

export async function beitragHinzufuegen(formData: FormData) {
  await requireStaff("alles");
  const participant_id = String(formData.get("participant_id"));
  const daten = z
    .object({
      kind: z.enum(["kommentar", "video", "grafik", "podcast", "rede", "artikel"]),
      title: z.string().trim().min(2, "Titel fehlt"),
      url: z.url("Link ist ungültig").nullable(),
      outlet: z.string().nullable(),
      website_slug: z.string().regex(/^[a-z0-9-]+$/, "Slug nur a–z, 0–9 und Bindestriche").nullable(),
      published_on: z.iso.date().nullable(),
    })
    .safeParse({
      kind: formData.get("kind"),
      title: formData.get("title"),
      url: leer(formData.get("url")),
      outlet: leer(formData.get("outlet")),
      website_slug: leer(formData.get("website_slug")),
      published_on: leer(formData.get("published_on")),
    });
  if (!daten.success) redirect(`/team/teilnehmende/${participant_id}/?fehler=${encodeURIComponent(daten.error.issues[0].message)}`);
  const supabase = await createClient();
  const { error } = await supabase.from("contributions").insert({ participant_id, ...daten.data });
  if (error) redirect(`/team/teilnehmende/${participant_id}/?fehler=${encodeURIComponent(error.message)}`);
  revalidatePath(`/team/teilnehmende/${participant_id}/`);
}

export async function beitragEntfernen(formData: FormData) {
  await requireStaff("alles");
  const supabase = await createClient();
  await supabase.from("contributions").delete().eq("id", String(formData.get("id")));
  revalidatePath(`/team/teilnehmende/${String(formData.get("participant_id"))}/`);
}

/** Verantwortliche (Sorumlu) anlegen oder E-Mail für den Login hinterlegen. */
export async function mentorSpeichern(formData: FormData) {
  await requireStaff("alles");
  const id = leer(formData.get("id"));
  const email = leer(formData.get("email"))?.toLowerCase() ?? null;
  if (email && !z.email().safeParse(email).success) redirect(`/team/teilnehmende/?fehler=${encodeURIComponent(`„${email}“ ist keine gültige E-Mail-Adresse.`)}`);
  const werte = { name: String(formData.get("name") ?? "").trim(), email };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("mentors").update(werte).eq("id", id) : await supabase.from("mentors").insert(werte);
  if (error) redirect(`/team/teilnehmende/?ansicht=verantwortliche&fehler=${encodeURIComponent(error.code === "23505" ? "Name oder E-Mail ist schon vergeben." : error.message)}`);
  revalidatePath("/team/teilnehmende/");
  redirect("/team/teilnehmende/?ansicht=verantwortliche&hinweis=gespeichert");
}

/** Anwesenheit an einem Modultag nachtragen oder zurücknehmen (über Enes' Check-in-Funktionen, mit Protokoll). */
export async function anwesenheitSetzen(formData: FormData) {
  await requireStaff("alles");
  const supabase = await createClient();
  const participant = String(formData.get("participant_id"));
  const attendance = leer(formData.get("attendance_id"));
  const { data, error } = attendance
    ? await supabase.rpc("undo_check_in", { p_attendance_id: attendance })
    : await supabase.rpc("check_in_manual", { p_module_day_id: String(formData.get("module_day_id")), p_participant_id: participant, p_allow_off_window: true });
  const ergebnis = (data as { result?: string } | null)?.result;
  revalidatePath(`/team/teilnehmende/${participant}/`);
  if (error || !["checked_in", "already_checked_in", "undone"].includes(ergebnis ?? ""))
    redirect(`/team/teilnehmende/${participant}/?fehler=${encodeURIComponent(error?.message ?? `Nicht gespeichert (${ergebnis}).`)}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { kriterien } from "@/lib/bewertung";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Hausaufgaben und Bewertungen: ab orga_team (Bewertungsteam), siehe RLS in der Migration hausaufgaben_und_portal.

const leer = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export async function hausaufgabeSpeichern(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  const id = leer(formData.get("id"));
  let cohort_id = leer(formData.get("cohort_id"));
  if (!cohort_id) cohort_id = (await supabase.from("cohorts").select("id").eq("is_current", true).maybeSingle()).data?.id ?? null;
  if (!cohort_id) redirect(`/team/hausaufgaben/?fehler=${encodeURIComponent("Kein aktueller Jahrgang angelegt.")}`);
  const werte = { cohort_id, number: Number(formData.get("number")), title: leer(formData.get("title")) ?? "Hausaufgabe", description: String(formData.get("description") ?? ""), due_date: leer(formData.get("due_date")) };
  const res = id ? await supabase.from("assignments").update(werte).eq("id", id).select("id").single() : await supabase.from("assignments").insert(werte).select("id").single();
  if (res.error) redirect(`/team/hausaufgaben/${id ? `${id}/` : ""}?fehler=${encodeURIComponent(res.error.code === "23505" ? "Diese Nummer ist im Jahrgang schon vergeben." : res.error.message)}`);
  revalidatePath("/team/hausaufgaben/", "layout");
  redirect(`/team/hausaufgaben/${res.data.id}/?hinweis=gespeichert`);
}

export async function abgabeAnlegen(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  const assignment_id = String(formData.get("assignment_id"));
  const participant_id = leer(formData.get("participant_id"));
  const { data, error } = await supabase
    .from("submissions")
    .insert({ assignment_id, label: leer(formData.get("label")) ?? "Abgabe", link: leer(formData.get("link")), submitted_on: new Date().toISOString().slice(0, 10) })
    .select("id")
    .single();
  if (error) redirect(`/team/hausaufgaben/${assignment_id}/?fehler=${encodeURIComponent(error.message)}`);
  if (participant_id) await supabase.from("submission_participants").insert({ submission_id: data.id, participant_id });
  redirect(`/team/abgaben/${data.id}/`);
}

export async function abgabeSpeichern(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await supabase.from("submissions").update({ label: leer(formData.get("label")) ?? "Abgabe", link: leer(formData.get("link")), file_name: leer(formData.get("file_name")), note: leer(formData.get("note")) }).eq("id", id);
  revalidatePath(`/team/abgaben/${id}/`);
  redirect(`/team/abgaben/${id}/?hinweis=gespeichert`);
}

export async function abgabeLoeschen(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data } = await supabase.from("submissions").select("assignment_id").eq("id", id).single();
  await supabase.from("submissions").delete().eq("id", id);
  revalidatePath("/team/hausaufgaben/", "layout");
  redirect(`/team/hausaufgaben/${data?.assignment_id ?? ""}/`);
}

export async function personZuordnen(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  const submission_id = String(formData.get("submission_id"));
  const participant_id = leer(formData.get("participant_id"));
  if (participant_id) {
    await supabase.from("submission_participants").upsert({ submission_id, participant_id }, { ignoreDuplicates: true });
    // „Abgegeben“-Markierung aus der Hausaufgabenliste derselben Person durch diese Abgabe ersetzen
    const { data: ab } = await supabase.from("submissions").select("assignment_id").eq("id", submission_id).single();
    const { data: platz } = await supabase
      .from("submissions")
      .select("id, submission_participants!inner(participant_id)")
      .eq("assignment_id", ab!.assignment_id)
      .eq("source", "list")
      .eq("submission_participants.participant_id", participant_id)
      .neq("id", submission_id);
    if (platz?.length) await supabase.from("submissions").delete().in("id", platz.map((x) => x.id));
  }
  revalidatePath("/team/", "layout");
}

export async function personEntfernen(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  await supabase.from("submission_participants").delete().eq("submission_id", String(formData.get("submission_id"))).eq("participant_id", String(formData.get("participant_id")));
  revalidatePath("/team/", "layout");
}

/** Jede Person im Team hat pro Abgabe eine eigene Bewertung; angezeigt wird der Durchschnitt. */
export async function bewertungSpeichern(formData: FormData) {
  const staff = await requireStaff("orga");
  const supabase = await createClient();
  const submission_id = String(formData.get("submission_id"));
  const punkte = Object.fromEntries(
    kriterien.map((k) => {
      const v = Number(formData.get(k.feld));
      return [k.feld, v >= 1 && v <= 5 ? v : null];
    }),
  );
  // Ein importierter Bogen ohne Bewerter:in wird beim ersten Speichern übernommen
  const ziel = leer(formData.get("review_id"));
  const werte = {
    submission_id,
    reviewer_id: staff.userId,
    reviewer_name: staff.name,
    ...punkte,
    strengths: leer(formData.get("strengths")),
    improvements: leer(formData.get("improvements")),
    tip: leer(formData.get("tip")),
    reviewed_on: new Date().toISOString().slice(0, 10),
  };
  const { data: eigene } = await supabase.from("reviews").select("id").eq("submission_id", submission_id).eq("reviewer_id", staff.userId).maybeSingle();
  const id = eigene?.id ?? ziel;
  const { error } = id ? await supabase.from("reviews").update(werte).eq("id", id) : await supabase.from("reviews").insert(werte);
  if (error) redirect(`/team/abgaben/${submission_id}/?fehler=${encodeURIComponent(error.message)}`);
  revalidatePath("/team/hausaufgaben/", "layout");
  redirect(`/team/abgaben/${submission_id}/?hinweis=bewertet`);
}

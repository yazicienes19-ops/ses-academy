"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { sendeFeedbackMail } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { berlinerZeit } from "@/lib/zeit";

function zurModulseite(modulId: string, hinweis: string): never {
  revalidatePath(`/team/module/${modulId}/`);
  redirect(`/team/module/${modulId}/?hinweis=${hinweis}#feedback`);
}

/** Umfrage mit Standardfragen anlegen: offen ab dem letzten Modultag 13:00 Uhr für 14 Tage. */
export async function umfrageAnlegen(formData: FormData) {
  await requireStaff("alles");
  const modulId = String(formData.get("module_id"));
  if (!istToken(modulId)) zurModulseite(modulId, "eingabe");
  const supabase = await createClient();
  const { data: letzter } = await supabase.from("module_days").select("day").eq("module_id", modulId).order("day", { ascending: false }).limit(1).maybeSingle();
  if (!letzter) zurModulseite(modulId, "feedback-ohne-termin");
  const ab = berlinerZeit(letzter.day, "13:00");
  const bis = new Date(Date.parse(ab) + 14 * 86_400_000).toISOString();
  const { error } = await supabase.rpc("create_feedback_survey", { p_module_id: modulId, p_opens_at: ab, p_closes_at: bis });
  zurModulseite(modulId, error ? "fehler" : "feedback-angelegt");
}

const frageSchema = z.object({ prompt: z.string().trim().min(3).max(300), kind: z.enum(["skala", "text"]) });

export async function frageHinzufuegen(formData: FormData) {
  await requireStaff("alles");
  const modulId = String(formData.get("module_id"));
  const umfrage = String(formData.get("survey_id"));
  const d = frageSchema.safeParse({ prompt: formData.get("prompt"), kind: formData.get("kind") });
  if (!istToken(umfrage) || !d.success) zurModulseite(modulId, "eingabe");
  const supabase = await createClient();
  const { data: letzte } = await supabase.from("feedback_questions").select("position").eq("survey_id", umfrage).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("feedback_questions").insert({ survey_id: umfrage, position: (letzte?.position ?? 0) + 1, ...d.data });
  zurModulseite(modulId, error ? "fehler" : "frage-gespeichert");
}

/** Frage entfernen geht nur, solange noch niemand geantwortet hat (sonst wären Antworten ohne Frage). */
export async function frageEntfernen(formData: FormData) {
  await requireStaff("alles");
  const modulId = String(formData.get("module_id"));
  const id = String(formData.get("id"));
  const umfrage = String(formData.get("survey_id"));
  if (!istToken(id) || !istToken(umfrage)) zurModulseite(modulId, "eingabe");
  const { count } = await createAdminClient().from("feedback_responses").select("id", { count: "exact", head: true }).eq("survey_id", umfrage);
  if (count) zurModulseite(modulId, "frage-hat-antworten");
  const supabase = await createClient();
  const { error } = await supabase.from("feedback_questions").delete().eq("id", id);
  zurModulseite(modulId, error ? "fehler" : "frage-entfernt");
}

/** Einladung an alle, die an mindestens einem Tag des Moduls eingecheckt waren und noch nicht geantwortet haben. */
export async function feedbackEinladen(formData: FormData) {
  const staff = await requireStaff("alles");
  const modulId = String(formData.get("module_id"));
  const umfrage = String(formData.get("survey_id"));
  if (!istToken(modulId) || !istToken(umfrage)) zurModulseite(modulId, "eingabe");
  const db = createAdminClient();
  const [{ data: anwesend }, { data: geantwortet }] = await Promise.all([
    db.from("attendances").select("registration:registrations!inner(participant_id, module_id)").eq("registration.module_id", modulId),
    db.from("feedback_responses").select("participant_id").eq("survey_id", umfrage),
  ]);
  const fertig = new Set((geantwortet ?? []).map((r) => r.participant_id));
  const personen = [...new Set((anwesend ?? []).map((a) => a.registration.participant_id))].filter((p) => !fertig.has(p));

  let gesendet = 0;
  let fehler = 0;
  const warteschlange = [...personen];
  async function arbeiter() {
    for (let p = warteschlange.shift(); p; p = warteschlange.shift()) {
      const e = await sendeFeedbackMail(p, umfrage, staff.userId);
      if (e.ok) gesendet++;
      else fehler++;
    }
  }
  await Promise.all(Array.from({ length: 3 }, arbeiter));
  await db.from("feedback_surveys").update({ sent_at: new Date().toISOString() }).eq("id", umfrage);
  zurModulseite(modulId, `feedback-${gesendet}-${fehler}`);
}

export type FeedbackAntworten = Record<string, number | string>;
/** antworten: was gerade abgeschickt wurde bzw. schon gespeichert ist, damit das Formular es weiter zeigt. */
export type FeedbackZustand = { ergebnis: "saved" | "empty" | "closed" | "not_attended" | "not_found" | "fehler" | null; antworten?: FeedbackAntworten; runde?: number };

/** Antwort aus dem Formular /feedback/<token>/<umfrage>/. Der Link-Token aus der Mail ist der Nachweis. */
export async function feedbackAbsenden(vorher: FeedbackZustand, formData: FormData): Promise<FeedbackZustand> {
  const token = String(formData.get("token") ?? "").toLowerCase();
  const umfrage = String(formData.get("survey_id") ?? "");
  if (!istToken(token) || !istToken(umfrage)) return { ergebnis: "not_found" };
  const antworten: FeedbackAntworten = {};
  for (const [schluessel, wert] of formData.entries()) {
    if (!schluessel.startsWith("q_") || typeof wert !== "string" || !wert.trim()) continue;
    const id = schluessel.slice(2);
    if (!istToken(id)) continue;
    antworten[id] = /^[1-5]$/.test(wert) && formData.get(`art_${id}`) === "skala" ? Number(wert) : wert.slice(0, 2000);
  }
  const { data, error } = await createAdminClient().rpc("submit_feedback", { p_token: token, p_survey_id: umfrage, p_answers: antworten });
  const runde = (vorher.runde ?? 0) + 1;
  if (error) return { ergebnis: "fehler", antworten, runde };
  // Leer abgeschickt: die bisher gespeicherten Antworten bleiben stehen
  return { ergebnis: data as FeedbackZustand["ergebnis"], antworten: data === "empty" ? vorher.antworten : antworten, runde };
}

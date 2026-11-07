"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Datenschutz: in „Mein Bereich“ aus dem Verzeichnis austragen und die Löschung beantragen; im Team-Bereich bearbeitet
// ein Admin die Anträge. Die Regeln (wer was darf, was gelöscht bzw. anonymisiert wird) stehen in der Datenbank.

function zurueckMeinBereich(hinweis: string): never {
  revalidatePath("/mein-bereich/");
  redirect(`/mein-bereich/?datenschutz=${hinweis}#datenschutz`);
}

export async function verzeichnisUmschalten(formData: FormData) {
  const supabase = await createClient();
  const raus = formData.get("raus") === "1";
  const { data, error } = await supabase.rpc("set_my_directory_opt_out", { p_opt_out: raus });
  revalidatePath("/mein-bereich/verzeichnis/");
  zurueckMeinBereich(error || data !== "saved" ? "fehler" : raus ? "verzeichnis-raus" : "verzeichnis-rein");
}

export async function loeschungBeantragen(formData: FormData) {
  if (formData.get("bestaetigt") !== "ja") zurueckMeinBereich("bestaetigen");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_my_deletion", { p_reason: String(formData.get("grund") ?? "").slice(0, 1000) });
  revalidatePath("/team/loeschantraege/");
  zurueckMeinBereich(error ? "fehler" : data === "requested" ? "beantragt" : data === "already_open" ? "already_open" : "fehler");
}

export async function loeschungZurueckziehen() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("withdraw_my_deletion");
  revalidatePath("/team/loeschantraege/");
  zurueckMeinBereich(error || data !== "withdrawn" ? "fehler" : "zurueckgezogen");
}

function zurueckTeam(hinweis: string): never {
  revalidatePath("/team/loeschantraege/");
  revalidatePath("/team/", "layout");
  redirect(`/team/loeschantraege/?hinweis=${hinweis}`);
}

/** Admin bestätigt (nach Rückfrage): löschen und anonymisieren, danach das Foto aus dem Speicher entfernen. */
export async function loeschungAusfuehren(formData: FormData) {
  await requireStaff("admin");
  const id = String(formData.get("id"));
  if (!istToken(id)) zurueckTeam("eingabe");
  if (formData.get("bestaetigt") !== "ja") zurueckTeam("bestaetigen");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("execute_deletion", { p_request_id: id, p_note: String(formData.get("notiz") ?? "").slice(0, 1000) });
  const antwort = data as { result?: string; photo_path?: string | null } | null;
  if (error || antwort?.result !== "ok") zurueckTeam(antwort?.result === "erledigt" ? "schon-erledigt" : "fehler");
  if (antwort.photo_path) await createAdminClient().storage.from("fotos").remove([antwort.photo_path]);
  zurueckTeam("geloescht");
}

export async function loeschungAblehnen(formData: FormData) {
  await requireStaff("admin");
  const id = String(formData.get("id"));
  if (!istToken(id)) zurueckTeam("eingabe");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reject_deletion", { p_request_id: id, p_note: String(formData.get("notiz") ?? "").slice(0, 1000) });
  zurueckTeam(error ? "fehler" : data === "note_required" ? "notiz-fehlt" : data === "rejected" ? "abgelehnt" : "fehler");
}

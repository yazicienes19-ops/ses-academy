"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { mailBereit, sendeBewerbungStatus, sendeTicketMail } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";

function zurueck(hinweis: string, filter: FormDataEntryValue | null): never {
  const params = new URLSearchParams({ hinweis });
  if (filter) params.set("status", String(filter));
  revalidatePath("/team/bewerbungen/");
  redirect(`/team/bewerbungen/?${params}`);
}

/** Annehmen: Person anlegen, für alle offenen Module des Jahrgangs anmelden, Ticket-Mail senden. */
export async function annehmen(formData: FormData) {
  const staff = await requireStaff("alles");
  const id = String(formData.get("id"));
  // Folgenschwer (Anmeldung für alle Module, Ticket-Mail): nur nach der Rückfrage
  if (formData.get("bestaetigt") !== "ja") zurueck("bestaetigen", formData.get("filter"));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_application", { p_application_id: id });
  if (error || !data) zurueck("annahme-fehler", formData.get("filter"));
  const participantId = (data as { participant_id: string }).participant_id;
  const mail = await sendeTicketMail(participantId, staff.userId);
  zurueck(mail.ok ? "angenommen" : "angenommen-ohne-mail", formData.get("filter"));
}

/**
 * Status setzen ohne Annahme (in Prüfung, Warteliste, abgelehnt). Warteliste und Ablehnung nur nach Rückfrage; dabei
 * auf Wunsch eine Mail an die Person (Deutsch/Türkisch nach der Sprache der Bewerbung), wenn der Mailversand steht.
 */
export async function statusSetzen(formData: FormData) {
  const staff = await requireStaff("alles");
  const status = String(formData.get("status"));
  const id = String(formData.get("id"));
  if ((status !== "in_pruefung" && status !== "warteliste" && status !== "abgelehnt") || !istToken(id)) zurueck("fehler", formData.get("filter"));
  if (status !== "in_pruefung" && formData.get("bestaetigt") !== "ja") zurueck("bestaetigen", formData.get("filter"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status, reviewed_by: staff.userId, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "angenommen")
    .neq("status", status)
    .select("email, first_name, language");
  if (error) zurueck("fehler", formData.get("filter"));
  const b = data?.[0];
  if (!b || status === "in_pruefung" || formData.get("mail") !== "ja") zurueck("gespeichert", formData.get("filter"));
  if (!mailBereit()) zurueck("status-mail-aus", formData.get("filter"));
  const mail = await sendeBewerbungStatus({ email: b.email, vorname: b.first_name, sprache: b.language, status }, staff.userId);
  zurueck(mail.ok ? `${status}-mail` : "status-mail-fehler", formData.get("filter"));
}

/** Ticket-Mail erneut senden, z. B. wenn die erste im Spam gelandet ist. */
export async function ticketErneutSenden(formData: FormData) {
  const staff = await requireStaff("alles");
  const mail = await sendeTicketMail(String(formData.get("participant_id")), staff.userId);
  zurueck(mail.ok ? "ticket-gesendet" : "mail-fehler", formData.get("filter"));
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { sendeTicketMail } from "@/lib/mail";
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
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_application", { p_application_id: id });
  if (error || !data) zurueck("annahme-fehler", formData.get("filter"));
  const participantId = (data as { participant_id: string }).participant_id;
  const mail = await sendeTicketMail(participantId, staff.userId);
  zurueck(mail.ok ? "angenommen" : "angenommen-ohne-mail", formData.get("filter"));
}

/** Status setzen ohne Annahme (in Prüfung, Warteliste, abgelehnt). */
export async function statusSetzen(formData: FormData) {
  const staff = await requireStaff("alles");
  const status = String(formData.get("status"));
  if (status !== "in_pruefung" && status !== "warteliste" && status !== "abgelehnt") zurueck("fehler", formData.get("filter"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ status, reviewed_by: staff.userId, reviewed_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")))
    .neq("status", "angenommen");
  zurueck(error ? "fehler" : "gespeichert", formData.get("filter"));
}

/** Ticket-Mail erneut senden, z. B. wenn die erste im Spam gelandet ist. */
export async function ticketErneutSenden(formData: FormData) {
  const staff = await requireStaff("alles");
  const mail = await sendeTicketMail(String(formData.get("participant_id")), staff.userId);
  zurueck(mail.ok ? "ticket-gesendet" : "mail-fehler", formData.get("filter"));
}

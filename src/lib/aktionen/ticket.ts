"use server";

import { redirect } from "next/navigation";
import { istToken } from "@/lib/codes";
import { sendeTicketMail } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";

/** Abmelden bzw. entschuldigen über den persönlichen Ticket-Link. Der Token ist der Nachweis. */
export async function perTicketAbmelden(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const moduleId = String(formData.get("module_id") ?? "");
  if (!istToken(token) || !istToken(moduleId)) redirect("/");
  const grund = String(formData.get("grund") ?? "").slice(0, 500);

  const { data } = await createAdminClient().rpc("withdraw_by_token", {
    p_token: token, p_module_id: moduleId, p_excuse_note: grund,
  });
  const antwort = data as { result?: string; promoted_registration_id?: string | null } | null;
  const ergebnis = antwort?.result;

  // Rückt jemand von der Warteliste nach, bekommt diese Person sofort ihr Ticket.
  if (antwort?.promoted_registration_id) {
    const { data: reg } = await createAdminClient().from("registrations").select("participant_id").eq("id", antwort.promoted_registration_id).maybeSingle();
    if (reg) await sendeTicketMail(reg.participant_id);
  }
  const hinweis = ergebnis === "withdrawn" ? "abgemeldet" : ergebnis === "too_late" ? "zu-spaet" : "fehler";
  redirect(`/ticket/${token}/?hinweis=${hinweis}`);
}

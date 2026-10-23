"use server";

import { redirect } from "next/navigation";
import { istToken } from "@/lib/codes";
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
  const ergebnis = (data as { result?: string } | null)?.result;
  const hinweis = ergebnis === "withdrawn" ? "abgemeldet" : ergebnis === "too_late" ? "zu-spaet" : "fehler";
  redirect(`/ticket/${token}/?hinweis=${hinweis}`);
}

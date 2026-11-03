import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = Database["public"]["Enums"]["staff_role"];

export type Staff = { userId: string; email: string; role: StaffRole; name: string };

/** Wer darf was. Spiegelt has_full_access / has_orga_access / has_checkin_access in der Datenbank. */
export const darf = {
  admin: (r: StaffRole) => r === "admin",
  alles: (r: StaffRole) => r === "admin" || r === "vorstand",
  orga: (r: StaffRole) => r === "admin" || r === "vorstand" || r === "orga_team",
  einlass: () => true,
};

export const rollenName: Record<StaffRole, string> = {
  admin: "Admin",
  vorstand: "Vorstand",
  orga_team: "Orga-Team",
  checkin_helper: "Einlass-Helfer:in",
};

/** Angemeldetes Teammitglied oder null. Pro Anfrage nur einmal abgefragt. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("staff_members")
    .select("role, display_name")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!data) return null;
  return { userId: auth.user.id, email: auth.user.email ?? "", role: data.role, name: data.display_name };
});

/**
 * Rolle der angemeldeten Person: „kommission“ = Teamkonto (staff_members), „teilnehmer“ = verknüpftes
 * Teilnehmer-Profil (participants.user_id). Wer beides ist, gilt als Kommission.
 */
export const getRolle = cache(async (): Promise<"kommission" | "teilnehmer" | null> => {
  if (await getStaff()) return "kommission";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("participants").select("id").eq("user_id", auth.user.id).maybeSingle();
  return data ? "teilnehmer" : null;
});

/** Für Seiten und Server Actions: ohne passende Rolle geht es zum Login bzw. zur Übersicht. Teilnehmende landen in „Mein Bereich“. */
export async function requireStaff(recht: keyof typeof darf = "einlass"): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect((await getRolle()) === "teilnehmer" ? "/mein-bereich/" : "/team/login/");
  if (!darf[recht](staff.role)) redirect("/team/?fehler=rechte");
  return staff;
}

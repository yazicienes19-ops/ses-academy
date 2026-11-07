import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = Database["public"]["Enums"]["staff_role"];

/** modulId: Zugang nur für dieses Modul (Einlass und Regieplan), sonst null. Die Datenbank erzwingt das ebenso. */
export type Staff = { userId: string; email: string; role: StaffRole; name: string; gueltigBis: string | null; modulId: string | null };

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
    .select("role, display_name, valid_from, valid_until, module_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!data) return null;
  // Zugang auf Zeit (z. B. Helfer nur an den Modultagen), wie current_staff_role() in der Datenbank
  const jetzt = Date.now();
  if ((data.valid_from && Date.parse(data.valid_from) > jetzt) || (data.valid_until && Date.parse(data.valid_until) <= jetzt)) return null;
  return { userId: auth.user.id, email: auth.user.email ?? "", role: data.role, name: data.display_name, gueltigBis: data.valid_until, modulId: data.module_id };
});

/**
 * Ist der zweite Faktor Pflicht (Admin-Einstellung) und hat diese Sitzung ihn noch nicht? Dann gelten in der Datenbank
 * keine Teamrechte (current_staff_role), und die Seite schickt zur Einrichtung bzw. Eingabe des Codes.
 */
export const fehltZweiterFaktor = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data: pflicht } = await supabase.rpc("mfa_required");
  if (!pflicht) return false;
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel !== "aal2";
});

/**
 * Für Seiten und Server Actions: ohne passende Rolle geht es zum Login bzw. zur Übersicht.
 * Auf ein Modul begrenzte Zugänge kommen nur in Einlass und Regieplan: Seiten und Aktionen ab Orga-Team müssen dafür
 * ausdrücklich modulBezogen sein (die Datenbank prüft dann das Modul, siehe has_orga_access(modul)).
 */
export async function requireStaff(recht: keyof typeof darf = "einlass", optionen: { modulBezogen?: boolean } = {}): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/team/login/");
  if (await fehltZweiterFaktor()) redirect("/team/zweiter-faktor/");
  if (!darf[recht](staff.role)) redirect("/team/?fehler=rechte");
  if (staff.modulId && recht !== "einlass" && !optionen.modulBezogen) redirect("/team/?fehler=rechte");
  return staff;
}

/** Bereiche, die ein auf ein Modul begrenzter Zugang sieht. */
export const modulBereiche = ["start", "einlass", "regieplan"] as const;

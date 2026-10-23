"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const rolle = z.enum(["admin", "vorstand", "orga_team", "checkin_helper"]);

function zurueck(hinweis: string): never {
  revalidatePath("/team/team/");
  redirect(`/team/team/?hinweis=${hinweis}`);
}

/** Neues Team-Konto mit Startpasswort. Das Passwort gibt der Admin persönlich weiter; ändern unter „Passwort“. */
export async function mitgliedAnlegen(formData: FormData) {
  await requireStaff("admin");
  const d = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    name: z.string().trim().min(1).max(80),
    rolle,
    passwort: z.string().min(10).max(72),
  }).safeParse(Object.fromEntries(formData.entries()));
  if (!d.success) zurueck("eingabe");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: d.data.email, password: d.data.passwort, email_confirm: true });
  if (error?.code === "email_exists") zurueck("existiert");
  if (error || !data.user) zurueck("fehler");

  const supabase = await createClient();
  const { error: fehler } = await supabase.from("staff_members").insert({ user_id: data.user.id, role: d.data.rolle, display_name: d.data.name });
  if (fehler) {
    await admin.auth.admin.deleteUser(data.user.id);
    zurueck("fehler");
  }
  zurueck("angelegt");
}

async function anzahlAdmins() {
  const supabase = await createClient();
  const { count } = await supabase.from("staff_members").select("user_id", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

export async function rolleAendern(formData: FormData) {
  const staff = await requireStaff("admin");
  const userId = String(formData.get("user_id"));
  const neu = rolle.safeParse(formData.get("rolle"));
  if (!neu.success) zurueck("eingabe");
  if (userId === staff.userId && neu.data !== "admin" && (await anzahlAdmins()) <= 1) zurueck("letzter-admin");
  const supabase = await createClient();
  const { error } = await supabase.from("staff_members").update({ role: neu.data }).eq("user_id", userId);
  zurueck(error ? "fehler" : "gespeichert");
}

/** Konto entfernen: Login wird gelöscht, bisherige Check-ins bleiben im Protokoll erhalten. */
export async function mitgliedEntfernen(formData: FormData) {
  const staff = await requireStaff("admin");
  const userId = String(formData.get("user_id"));
  if (userId === staff.userId) zurueck("selbst");
  const supabase = await createClient();
  await supabase.from("staff_members").delete().eq("user_id", userId);
  // Fremdschlüssel auf auth.users (checked_in_by, actor_id, ...) verhindern das Löschen, wenn das Konto
  // schon gearbeitet hat; dann wird es stattdessen gesperrt.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  zurueck("entfernt");
}

export type PasswortZustand = { meldung: string | null; ok: boolean };

export async function passwortAendern(_vorher: PasswortZustand, formData: FormData): Promise<PasswortZustand> {
  await requireStaff("einlass");
  const neu = String(formData.get("neu") ?? "");
  if (neu.length < 10) return { meldung: "Das Passwort braucht mindestens 10 Zeichen.", ok: false };
  if (neu !== String(formData.get("wiederholung") ?? "")) return { meldung: "Die beiden Eingaben stimmen nicht überein.", ok: false };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: neu });
  return error ? { meldung: "Das hat nicht geklappt. Ist das neue Passwort gleich dem alten?", ok: false } : { meldung: "Passwort geändert.", ok: true };
}

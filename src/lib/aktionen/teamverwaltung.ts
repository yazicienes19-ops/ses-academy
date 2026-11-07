"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff, rollenName } from "@/lib/auth";
import { mailBereit, sendeTeamWillkommen } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const rolle = z.enum(["admin", "vorstand", "orga_team", "checkin_helper"]);

function zurueck(hinweis: string): never {
  revalidatePath("/team/team/");
  redirect(`/team/team/?hinweis=${hinweis}`);
}

/** Zeitraum eines Moduls für einen Zugang auf Zeit: 4 Stunden vor dem ersten Tag bis 6 Stunden nach dem letzten (wie der Einlass). */
async function modulZeitraum(modulId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("title, module_days(starts_at, ends_at)").eq("id", modulId).maybeSingle();
  if (!data || data.module_days.length === 0) return null;
  const beginn = Math.min(...data.module_days.map((d) => Date.parse(d.starts_at))) - 4 * 3600_000;
  const ende = Math.max(...data.module_days.map((d) => Date.parse(d.ends_at))) + 6 * 3600_000;
  return { valid_from: new Date(beginn).toISOString(), valid_until: new Date(ende).toISOString(), titel: data.title };
}

/** Hat die Datenbank den Antrag abgelehnt, weil Vorstand/Admin nicht auf ein Modul begrenzt werden können? */
const modulRolle = (error: { message?: string } | null) => Boolean(error?.message?.includes("module_scope_role"));

/**
 * Zugang auf ein Modul begrenzen (Einlass und Regieplan dieses Moduls, nur an den Modultagen) oder wieder unbefristet
 * machen. Begrenzen geht sofort; aufheben, verlängern oder auf ein anderes Modul wechseln ist eine Vergabe und braucht
 * die Freigabe eines zweiten Admins. „__bisher“ = Auswahl nicht geändert.
 */
export async function zugangZeitraum(formData: FormData) {
  const staff = await requireStaff("admin");
  const userId = String(formData.get("user_id"));
  const modul = String(formData.get("modul") ?? "");
  if (userId === staff.userId) zurueck("selbst");
  if (modul === "__bisher") zurueck("unveraendert");
  const supabase = await createClient();
  const { data: m } = await supabase.from("staff_members").select("role, valid_from, valid_until, module_id").eq("user_id", userId).maybeSingle();
  if (!m) zurueck("fehler");
  if (modul && m.role !== "orga_team" && m.role !== "checkin_helper") zurueck("modul-rolle");
  const z = modul ? await modulZeitraum(modul) : null;
  if (modul && !z) zurueck("modul-ohne-termin");
  if ((modul || null) === m.module_id && (z?.valid_from ?? null) === m.valid_from && (z?.valid_until ?? null) === m.valid_until) zurueck("unveraendert");
  const zeitWeiter = (m.valid_until && (!z || Date.parse(z.valid_until) > Date.parse(m.valid_until))) || (m.valid_from && (!z || Date.parse(z.valid_from) < Date.parse(m.valid_from)));
  const modulWeiter = m.module_id !== null && m.module_id !== (modul || null);
  if (zeitWeiter || modulWeiter) {
    const { error } = await supabase.rpc("create_approval", { p_action: "team_zugang", p_payload: { art: "zeitraum", user_id: userId, modul: modul || null } });
    zurueck(modulRolle(error) ? "modul-rolle" : error ? "fehler" : "beantragt");
  }
  const { error } = await supabase.from("staff_members").update(z
    ? { valid_from: z.valid_from, valid_until: z.valid_until, module_id: modul, label: `${m.role === "checkin_helper" ? "Helfer" : "Team"} · ${z.titel}` }
    : { valid_from: null, valid_until: null, module_id: null, label: null }).eq("user_id", userId);
  zurueck(error ? "fehler" : "zugang-gespeichert");
}

/**
 * Neuen Team-Zugang beantragen (Vier-Augen-Prinzip, Entscheidung 25.10.2026): ein zweiter Admin gibt frei, danach legt
 * die anfragende Person das Konto an. Ein Passwort gibt es nicht mehr; die Person meldet sich per E-Mail-Code an.
 */
export async function mitgliedAnlegen(formData: FormData) {
  await requireStaff("admin");
  const d = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    name: z.string().trim().min(1).max(80),
    rolle,
  }).safeParse({ email: formData.get("email"), name: formData.get("name"), rolle: formData.get("rolle") });
  if (!d.success) zurueck("eingabe");
  const modul = String(formData.get("modul") ?? "");
  const supabase = await createClient();
  if (modul && d.data.rolle !== "orga_team" && d.data.rolle !== "checkin_helper") zurueck("modul-rolle");
  const { error } = await supabase.rpc("create_approval", {
    p_action: "team_zugang", p_payload: { art: "neu", email: d.data.email, name: d.data.name, rolle: d.data.rolle, modul: modul || null },
  });
  zurueck(modulRolle(error) ? "modul-rolle" : error ? "fehler" : "beantragt");
}

const rang: Record<z.infer<typeof rolle>, number> = { checkin_helper: 0, orga_team: 1, vorstand: 2, admin: 3 };

/**
 * Freigegebenen Antrag ausführen: Konto anlegen bzw. Rolle hochstufen. Die Prüfung (eigener Antrag, freigegeben durch
 * einen anderen Admin, höchstens 24 Stunden alt) und das Eintragen der Rolle macht execute_team_approval in der Datenbank.
 */
export async function teamZugangAusfuehren(formData: FormData) {
  const staff = await requireStaff("admin");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: antrag } = await supabase.from("approvals").select("payload").eq("id", id).eq("action", "team_zugang").maybeSingle();
  const p = antrag?.payload as { art?: "neu" | "rolle" | "zeitraum"; email?: string } | undefined;
  if (!p) zurueck("fehler");
  if (p.art === "rolle" || p.art === "zeitraum") {
    const { data, error } = await supabase.rpc("execute_team_approval", { p_id: id });
    zurueck(error ? "fehler" : data === "ok" ? (p.art === "rolle" ? "gespeichert" : "zugang-gespeichert") : data === "expired" ? "abgelaufen"
      : data === "module_without_days" ? "modul-ohne-termin" : data === "module_scope_role" ? "modul-rolle" : "fehler");
  }
  const admin = createAdminClient();
  const { data: konto, error } = await admin.auth.admin.createUser({ email: p.email!, email_confirm: true });
  if (error?.code === "email_exists") zurueck("existiert");
  if (error || !konto.user) zurueck("fehler");
  const { data: ergebnis, error: fehler } = await supabase.rpc("execute_team_approval", { p_id: id, p_new_user: konto.user.id });
  if (fehler || ergebnis !== "ok") {
    await admin.auth.admin.deleteUser(konto.user.id);
    zurueck(ergebnis === "expired" ? "abgelaufen" : "fehler");
  }
  // Willkommensmail mit Rolle, Umfang und Anleitung zur Anmeldung per Code
  const { data: neu } = await supabase.from("staff_members").select("role, display_name, valid_until, module:modules(title)").eq("user_id", konto.user.id).maybeSingle();
  const { data: pflicht } = await supabase.rpc("mfa_required");
  const mail = neu ? await sendeTeamWillkommen({
    email: p.email!, name: neu.display_name, rolle: rollenName[neu.role], modul: neu.module?.title ?? null, bis: neu.valid_until, zweiterFaktor: Boolean(pflicht),
  }, staff.userId) : { ok: false };
  zurueck(mail.ok ? "angelegt" : mailBereit() ? "angelegt-ohne-mail" : "angelegt-mail-aus");
}

async function anzahlAdmins() {
  const supabase = await createClient();
  const { count } = await supabase.from("staff_members").select("user_id", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

/** Rolle ändern. Herabstufen geht sofort; Hochstufen (mehr Rechte) braucht die Freigabe eines zweiten Admins. */
export async function rolleAendern(formData: FormData) {
  const staff = await requireStaff("admin");
  const userId = String(formData.get("user_id"));
  const neu = rolle.safeParse(formData.get("rolle"));
  if (!neu.success) zurueck("eingabe");
  if (userId === staff.userId && neu.data !== "admin" && (await anzahlAdmins()) <= 1) zurueck("letzter-admin");
  const supabase = await createClient();
  const { data: bisher } = await supabase.from("staff_members").select("role, display_name").eq("user_id", userId).maybeSingle();
  if (bisher && rang[neu.data] > rang[bisher.role]) {
    const { error } = await supabase.rpc("create_approval", { p_action: "team_zugang", p_payload: { art: "rolle", user_id: userId, rolle: neu.data } });
    zurueck(modulRolle(error) ? "modul-rolle" : error ? "fehler" : "beantragt");
  }
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

/** Zweiten Faktor eines Teammitglieds löschen (z. B. Handy verloren). Beim nächsten Login wird neu eingerichtet. */
export async function faktorZuruecksetzen(formData: FormData) {
  const staff = await requireStaff("admin");
  const userId = String(formData.get("user_id"));
  if (userId === staff.userId) zurueck("selbst");
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.mfa.listFactors({ userId });
  for (const f of data?.factors ?? []) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ userId, id: f.id });
    if (error) zurueck("fehler");
  }
  // Laufende Sitzungen beenden (samt Refresh-Tokens), damit niemand mit dem alten Handy weiterarbeitet.
  // Bereits ausgestellte Zugriffstoken laufen spätestens nach einer Stunde ab.
  const { error } = await admin.rpc("end_user_sessions", { p_user_id: userId });
  zurueck(error ? "fehler" : "faktor-zurueckgesetzt");
}

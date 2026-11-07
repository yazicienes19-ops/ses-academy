"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Ein Login für alle (Entscheidung 25.10.2026): ohne Passwort, per Link oder 6-stelligem Code aus der E-Mail.
// Teilnehmende landen in „Mein Bereich“, Teamkonten im Team-Bereich (dort ggf. zusätzlich der zweite Faktor).

/** gesendetUm: Zeitpunkt der letzten Anforderung (für die Wartezeit bis „Code erneut senden“); erneut: zweiter Versand. */
/** fehler: Schlüssel für den Text in der Sprache der Seite (bereich-texte). */
export type PortalLogin = { schritt: "mail" | "code"; email?: string; fehler?: "email" | "zuViele" | "ziffern" | "code"; gesendetUm?: number; erneut?: boolean };

/**
 * Sprache der Login-Mail (GoTrue-Vorlage anmeldung.html liest user_metadata.sprache): Türkisch, wenn das Profil der
 * Person oder die Login-Seite Türkisch ist, sonst Deutsch. Bestehende Konten bekommen den Wert vor dem Versand,
 * neue beim Anlegen. Teamkonten bleiben Deutsch.
 */
async function mailSprache(email: string, seite: string): Promise<{ sprache: "de" | "tr"; userId: string | null }> {
  const { data: p } = await createAdminClient().from("participants").select("preferred_language, user_id").eq("email", email).maybeSingle();
  return { sprache: p?.preferred_language === "tr" || seite === "tr" ? "tr" : "de", userId: p?.user_id ?? null };
}

export async function codeAnfordern(_: PortalLogin, formData: FormData): Promise<PortalLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const erneut = formData.get("erneut") === "ja";
  if (!z.email().safeParse(email).success) return { schritt: "mail", fehler: "email" };
  // Nur hinterlegte Adressen bekommen eine Mail. Die Antwort ist immer gleich, damit niemand
  // herausfinden kann, welche Adressen im System stehen.
  const { data: art } = await createAdminClient().rpc("login_allowed", { p_email: email });
  if (art) {
    const { sprache, userId } = art === "participant" ? await mailSprache(email, String(formData.get("sprache") ?? "")) : { sprache: "de" as const, userId: null };
    if (userId) await createAdminClient().auth.admin.updateUserById(userId, { user_metadata: { sprache } });
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Teilnehmende bekommen beim ersten Login ein Konto; Teamkonten gibt es schon
      options: { shouldCreateUser: art === "participant", emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/bestaetigen/`, data: art === "participant" ? { sprache } : undefined },
    });
    if (error?.status === 429) return { schritt: erneut ? "code" : "mail", email, fehler: "zuViele", gesendetUm: Date.now(), erneut };
    if (error) console.error("Portal-Login:", error.message);
  }
  return { schritt: "code", email, gesendetUm: Date.now(), erneut };
}

export async function codePruefen(vorher: PortalLogin, formData: FormData): Promise<PortalLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (token.length !== 6) return { schritt: "code", email, fehler: "ziffern", gesendetUm: vorher.gesendetUm, erneut: vorher.erneut };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { schritt: "code", email, fehler: "code", gesendetUm: vorher.gesendetUm, erneut: vorher.erneut };
  await supabase.rpc("link_my_account");
  const { data: auth } = await supabase.auth.getUser();
  const { data: team } = await supabase.from("staff_members").select("role").eq("user_id", auth.user?.id ?? "").maybeSingle();
  redirect(team ? "/team/" : "/mein-bereich/");
}

export async function portalWeiter(z: PortalLogin, formData: FormData): Promise<PortalLogin> {
  return formData.get("code") != null ? codePruefen(z, formData) : codeAnfordern(z, formData);
}

export async function portalAbmelden() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/mein-bereich/login/");
}

/** Neue E-Mail-Adresse anfordern. Supabase schickt an die alte und die neue Adresse je einen Bestätigungslink. */
export async function emailAendern(formData: FormData) {
  const neu = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(neu)) redirect("/mein-bereich/?profil=email-ungueltig#profil");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: neu });
  redirect(`/mein-bereich/?profil=${error ? (error.code === "email_exists" ? "email-vergeben" : "fehler") : "email-gesendet"}#profil`);
}

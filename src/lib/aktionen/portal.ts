"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Login für Teilnehmende („Mein Bereich“): ohne Passwort, per Link oder 6-stelligem Code aus der E-Mail.

export type PortalLogin = { schritt: "mail" | "code"; email?: string; fehler?: string };

export async function codeAnfordern(_: PortalLogin, formData: FormData): Promise<PortalLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { schritt: "mail", fehler: "Bitte gib eine gültige E-Mail-Adresse ein." };
  // Nur hinterlegte Adressen bekommen eine Mail. Die Antwort ist immer gleich, damit niemand
  // herausfinden kann, welche Adressen im System stehen.
  const { data } = await createAdminClient().from("participants").select("id").eq("email", email).eq("active", true).maybeSingle();
  if (data) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/bestaetigen/` },
    });
    if (error?.status === 429) return { schritt: "mail", email, fehler: "Zu viele Versuche. Bitte warte eine Minute." };
    if (error) console.error("Portal-Login:", error.message);
  }
  return { schritt: "code", email };
}

export async function codePruefen(_: PortalLogin, formData: FormData): Promise<PortalLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (token.length !== 6) return { schritt: "code", email, fehler: "Der Code hat 6 Ziffern." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { schritt: "code", email, fehler: "Der Code stimmt nicht oder ist abgelaufen." };
  await supabase.rpc("link_my_account");
  redirect("/mein-bereich/");
}

export async function portalWeiter(z: PortalLogin, formData: FormData): Promise<PortalLogin> {
  return formData.get("code") != null ? codePruefen(z, formData) : codeAnfordern(z, formData);
}

export async function portalAbmelden() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/mein-bereich/login/");
}

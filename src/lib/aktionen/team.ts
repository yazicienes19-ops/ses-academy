"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginZustand = { fehler: string | null };

export async function anmelden(_vorher: LoginZustand, formData: FormData): Promise<LoginZustand> {
  const daten = z.object({ email: z.email(), passwort: z.string().min(1) }).safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    passwort: String(formData.get("passwort") ?? ""),
  });
  if (!daten.success) return { fehler: "Bitte E-Mail und Passwort eingeben." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: daten.data.email, password: daten.data.passwort });
  if (error) return { fehler: "E-Mail oder Passwort stimmt nicht." };
  redirect("/team/");
}

export async function abmelden() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/team/login/");
}

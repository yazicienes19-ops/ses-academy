import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt (siehe .env.example).`);
  return value;
}

/**
 * Läuft die Seite unter https (Betrieb), gehen Sitzungs-Cookies nur über verschlüsselte Verbindungen.
 * Eigener Name statt „sb-127-auth-token“: Den teilen sich sonst alle lokalen Supabase-Projekte auf localhost, und
 * Safari speichert unter http kein neues Cookie, wenn ein gleichnamiges per https gesetztes existiert.
 */
const sitzungsCookie = { name: "sb-ses-auth-token", secure: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://") };

/** Supabase mit der Sitzung der angemeldeten Person: alle Rechte laufen über RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookieOptions: sitzungsCookie,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // In Server Components dürfen keine Cookies gesetzt werden; der Proxy frischt die Sitzung auf.
        }
      },
    },
  });
}

export { env };

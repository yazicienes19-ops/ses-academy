import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt (siehe .env.example).`);
  return value;
}

/** Supabase mit der Sitzung der angemeldeten Person: alle Rechte laufen über RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
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

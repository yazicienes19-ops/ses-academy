"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/** Supabase im Browser mit der Sitzung aus den Cookies – nur für Datei-Uploads; Rechte laufen über RLS/Storage-Policies. */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

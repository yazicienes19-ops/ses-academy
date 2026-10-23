import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "./server";

/**
 * Supabase mit Dienstschlüssel, umgeht RLS. Nur für öffentliche Wege, die serverseitig
 * geprüft werden: Bewerbung, Ticket-Link, Mailversand. Niemals an den Browser geben.
 */
export function createAdminClient() {
  return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

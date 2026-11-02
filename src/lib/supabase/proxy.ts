import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Frischt die Supabase-Sitzung auf, damit Team-Logins nicht mitten im Einlass ablaufen. */
export async function sitzungAuffrischen(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    // wie sitzungsCookie in server.ts (der Proxy darf server-only nicht importieren)
    cookieOptions: { name: "sb-ses-auth-token", secure: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://") },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

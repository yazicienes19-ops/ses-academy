import { NextResponse, type NextRequest } from "next/server";
import { GERAET_COOKIE, geraeteHash, geraetCookieOptionen, neueGeraeteKennung } from "@/lib/saalfragen-geraet";
import { sitzungAuffrischen } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  // Saalfragen: die Gerätekennung wird beim Öffnen der Seite vergeben, nicht erst beim Abstimmen
  if (request.nextUrl.pathname.startsWith("/fragen")) {
    const response = NextResponse.next({ request });
    if (!geraeteHash(request.cookies.get(GERAET_COOKIE)?.value)) response.cookies.set(GERAET_COOKIE, neueGeraeteKennung(), geraetCookieOptionen);
    return response;
  }
  return sitzungAuffrischen(request);
}

// Nur Team-Bereich und „Mein Bereich“ brauchen eine Sitzung; die öffentlichen Seiten bleiben unberührt (außer /fragen, s. o.).
// Ausgenommen ist die Hausaufgaben-Abgabe: Der Proxy puffert Anfragen nur bis 10 MB (proxyClientMaxBodySize), Videos
// sind bis 100 MB groß. Die Route prüft Anmeldung und Größe selbst, bevor sie etwas einliest.
export const config = { matcher: ["/team/:path*", "/mein-bereich/((?!abgabe/).*)", "/auth/:path*", "/portal/:path*", "/fragen/:path*"] };

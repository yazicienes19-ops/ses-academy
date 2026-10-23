import type { NextRequest } from "next/server";
import { sitzungAuffrischen } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return sitzungAuffrischen(request);
}

// Nur Team-Bereich und „Mein Bereich“ brauchen eine Sitzung; die öffentlichen Seiten bleiben unberührt.
export const config = { matcher: ["/team/:path*", "/mein-bereich/:path*", "/auth/:path*"] };

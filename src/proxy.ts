import type { NextRequest } from "next/server";
import { sitzungAuffrischen } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return sitzungAuffrischen(request);
}

// Nur der Team-Bereich braucht eine Sitzung; die öffentlichen Seiten bleiben unberührt.
export const config = { matcher: ["/team/:path*"] };

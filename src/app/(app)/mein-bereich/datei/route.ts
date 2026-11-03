import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Download für Teilnehmende: ?material=<resource_id> (nur freigeschaltet, eigener Jahrgang) oder
 * ?abgabe=<submission_id> (nur die eigene). Die Prüfung macht RLS; ohne Treffer gibt es 404.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/mein-bereich/login/", request.url));
  const sp = new URL(request.url).searchParams;
  let bucket: "abgaben" | "material", pfad: string | null = null, name: string | null = null;
  if (sp.get("abgabe")) {
    bucket = "abgaben";
    const { data } = await supabase.from("submissions").select("upload_path,upload_name").eq("id", sp.get("abgabe")!).maybeSingle();
    pfad = data?.upload_path ?? null;
    name = data?.upload_name ?? null;
  } else {
    bucket = "material";
    const { data } = await supabase.from("resources").select("storage_path,file_name").eq("id", sp.get("material") ?? "").maybeSingle();
    pfad = data?.storage_path ?? null;
    name = data?.file_name ?? null;
  }
  if (!pfad) return new NextResponse("Datei nicht gefunden.", { status: 404 });
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pfad, 60, { download: name ?? true });
  if (error || !data) return new NextResponse("Datei nicht gefunden.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}

import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Datei einer Dokumentversion (Standard: aktuelle). Nur Medien und PDF im Browser, sonst Download (mit ?laden=1 immer); CSP-Sandbox. */
export async function GET(request: Request, { params }: RouteContext<"/team/dokumente/[id]/datei">) {
  await requireStaff("orga");
  const { id } = await params;
  if (!istToken(id)) notFound();
  const sp = new URL(request.url).searchParams;
  const v = Number(sp.get("v") ?? 0);
  const laden = sp.get("laden") === "1";
  const supabase = await createClient();
  let abfrage = supabase.from("document_versions").select("storage_path, file_name, mime_type").eq("document_id", id);
  abfrage = v > 0 ? abfrage.eq("version", v) : abfrage.order("version", { ascending: false }).limit(1);
  const { data: version } = await abfrage.maybeSingle();
  if (!version) notFound();
  const { data: datei } = await createAdminClient().storage.from("dokumente").download(version.storage_path);
  if (!datei) notFound();
  const typ = version.mime_type ?? datei.type;
  const sicher = /^(video|audio)\/|^image\/(png|jpeg|gif|webp)$|^application\/pdf$/.test(typ);
  const name = version.file_name.replace(/[^\w.\- ]+/g, "_");
  return new Response(datei, {
    headers: {
      "content-type": sicher ? typ : "application/octet-stream",
      "content-disposition": `${sicher && !laden ? "inline" : "attachment"}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(version.file_name)}`,
      "content-security-policy": "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; object-src 'self'",
      "cache-control": "private, no-store", "x-content-type-options": "nosniff",
    },
  });
}

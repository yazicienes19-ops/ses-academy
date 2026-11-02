import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Die PDF, die für einen Modultag als Regieplan festgelegt ist (aktuelle Version), zum Einbetten im Regieplan.
 * Anders als /team/dokumente/…/datei ohne CSP-Sandbox, weil der PDF-Viewer des Browsers darin nicht anzeigt;
 * deshalb nur echte PDFs, nur ab Orga-Team und nur auf eigenen Seiten einbettbar.
 */
export async function GET(_request: Request, { params }: RouteContext<"/team/regieplan/pdf/[tag]">) {
  await requireStaff("orga");
  const { tag } = await params;
  if (!istToken(tag)) notFound();
  const supabase = await createClient();
  const { data: tagDaten } = await supabase.from("module_days").select("regieplan_document_id").eq("id", tag).maybeSingle();
  if (!tagDaten?.regieplan_document_id) notFound();
  const { data: version } = await supabase.from("document_versions").select("storage_path, file_name, mime_type")
    .eq("document_id", tagDaten.regieplan_document_id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!version) notFound();
  const { data: datei } = await createAdminClient().storage.from("dokumente").download(version.storage_path);
  if (!datei || (version.mime_type ?? datei.type) !== "application/pdf") notFound();
  const name = version.file_name.replace(/[^\w.\- ]+/g, "_");
  return new Response(datei, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}"`,
      "content-security-policy": "frame-ancestors 'self'",
      "cache-control": "private, no-store", "x-content-type-options": "nosniff",
    },
  });
}

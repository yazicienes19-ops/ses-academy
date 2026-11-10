import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { chromium } from "playwright";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";

/**
 * Zimmerliste fürs Hotel als fertige PDF-Datei zum Herunterladen (ab Orga-Team).
 *
 * Der Server druckt dafür die Druckseite /team/module/[id]/zimmerliste/ mit Chromium (wie die Notfall-Liste), mit der
 * Sitzung der anfragenden Person. So hängt das Ergebnis nicht am Druckdialog des Browsers: Safari speicherte die
 * Druckseite am 10.11.2026 wiederholt als leere Seite. Gleiche Angaben wie die Druckseite: ?hotel=…, ?groesse=2|3.
 */
export async function GET(request: Request, { params }: RouteContext<"/team/module/[id]/zimmerliste/pdf">) {
  await requireStaff("orga");
  const { id } = await params;
  if (!istToken(id)) notFound();
  const sp = new URL(request.url).searchParams;
  const hotel = sp.get("hotel");
  const abfrage = new URLSearchParams({ groesse: sp.get("groesse") === "3" ? "3" : "2", ...(hotel && istToken(hotel) ? { hotel } : {}) });

  const supabase = await createClient();
  const [{ data: modul }, { data: hotels }] = await Promise.all([
    supabase.from("modules").select("title").eq("id", id).maybeSingle(),
    supabase.from("hotels").select("id, name").eq("module_id", id).order("created_at"),
  ]);
  if (!modul) notFound();
  // Bei mehreren Hotels gehört der Hotelname in den Dateinamen (eine Liste je Hotel)
  const gewaehlt = (hotels ?? []).find((h) => h.id === hotel) ?? hotels?.[0];
  const datei = `Zimmerliste ${modul.title}${(hotels ?? []).length > 1 && gewaehlt ? ` ${gewaehlt.name}` : ""}.pdf`;

  // Die App selbst, ohne den HTTPS-Zugang davor; next start/dev setzt PORT
  const intern = `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
  const sitzung = (await cookies()).getAll().map(({ name, value }) => ({ name, value, url: intern }));
  const browser = await chromium.launch();
  try {
    const kontext = await browser.newContext();
    await kontext.addCookies(sitzung);
    const seite = await kontext.newPage();
    const antwort = await seite.goto(`${intern}/team/module/${id}/zimmerliste/?${abfrage}`, { waitUntil: "networkidle", timeout: 30_000 });
    // Weiterleitung zum Login o. Ä.: lieber Fehler als eine PDF der falschen Seite
    if (!antwort?.ok() || !new URL(seite.url()).pathname.endsWith("/zimmerliste/")) {
      throw new Error(`Druckseite nicht geladen: ${antwort?.status() ?? "keine Antwort"} ${new URL(seite.url()).pathname}`);
    }
    await seite.evaluate(async () => { await document.fonts.ready; });
    const pdf = await seite.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    const ascii = datei.normalize("NFKD").replace(/[^\w .-]/g, "_");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(datei)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex",
      },
    });
  } catch (fehler) {
    console.error("Zimmerliste als PDF:", fehler);
    return new Response("Die PDF konnte nicht erzeugt werden. Bitte die Druckansicht der Zimmerliste nutzen.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  } finally {
    await browser.close();
  }
}

import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const datum = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
const plusEinTag = (tag: string) => new Date(Date.parse(`${tag}T12:00:00Z`) + 86_400_000);

/**
 * Zimmerliste fürs Hotel (ab Orga-Team): je Zimmer die Gäste. Jedes Zimmer ist einmal für den ganzen Aufenthalt
 * gebucht, Anreise und Abreise stehen deshalb einmal oben. Nur Namen, keine Kontaktdaten oder Hinweise.
 */
export async function GET(_: Request, { params }: RouteContext<"/team/module/[id]/hotel/zimmerliste">) {
  await requireStaff("orga");
  const { id } = await params;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: hotels }, { data: personen }] = await Promise.all([
    supabase.from("modules").select("title").eq("id", id).maybeSingle(),
    supabase.from("hotels").select("name, address, rooms(id, label, capacity, section)").eq("module_id", id).order("created_at"),
    supabase.rpc("get_stay_overview", { p_module_id: id }),
  ]);
  const hotel = hotels?.[0];
  if (!modul || !hotel) notFound();
  const zimmer = [...hotel.rooms].sort((a, b) => a.label.localeCompare(b.label, "de", { numeric: true }));
  const alleNaechte = [...new Set((personen ?? []).flatMap((p) => p.nights))].sort();
  const zeitraum = alleNaechte.length
    ? `Anreise ${datum.format(new Date(`${alleNaechte[0]}T12:00:00Z`))} · Abreise ${datum.format(plusEinTag(alleNaechte.at(-1)!))} · ${alleNaechte.length} ${alleNaechte.length === 1 ? "Nacht" : "Nächte"} für alle Zimmer`
    : "";
  const zeilen = zimmer.flatMap((z) => {
    const gaeste = (personen ?? []).filter((p) => p.room_id === z.id);
    if (gaeste.length === 0) return [];
    return gaeste.map((g, i) => `<tr${i === 0 ? ' class="neu"' : ""}><td>${i === 0 ? esc(z.label) : ""}</td><td>${i === 0 ? z.capacity : ""}</td><td>${i === 0 && z.section ? esc(z.section) : ""}</td><td>${esc(g.name)}</td></tr>`);
  });
  const ohne = (personen ?? []).filter((p) => p.answered && p.nights.length > 0 && !p.room_id).length;
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Zimmerliste ${esc(modul.title)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #13201a; font-size: 10.5pt; margin: 0; }
  h1 { font-size: 16pt; margin: 0 0 2px; } p { margin: 0 0 10px; color: #3c4a42; }
  table { width: 100%; border-collapse: collapse; } thead { display: table-header-group; }
  th, td { padding: 4px 6px; text-align: left; border-bottom: 1px solid #ddd6c4; } th { font-size: 8.5pt; text-transform: uppercase; color: #3c4a42; }
  tr.neu td { border-top: 1.5px solid #13201a; } tr { break-inside: avoid; }
  .druck { position: fixed; top: 12px; right: 12px; padding: 10px 18px; border-radius: 999px; border: 0; background: #13201a; color: #f3efe4; font-weight: bold; cursor: pointer; }
  @media print { .druck { display: none; } }
</style></head><body>
<button class="druck" onclick="window.print()">Drucken / als PDF sichern</button>
<h1>Zimmerliste · ${esc(hotel.name)}</h1>
<p>${esc(modul.title)}${hotel.address ? ` · ${esc(hotel.address)}` : ""}${zeitraum ? `<br><strong>${zeitraum}</strong>` : ""}<br>Stand ${new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date())}</p>
${ohne ? `<p><strong>${ohne} Personen mit Übernachtung haben noch kein Zimmer.</strong></p>` : ""}
<table><thead><tr><th>Zimmer</th><th>Betten</th><th>Bereich</th><th>Name</th></tr></thead><tbody>${zeilen.join("")}</tbody></table>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

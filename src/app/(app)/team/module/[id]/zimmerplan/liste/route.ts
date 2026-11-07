import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { csvAntwort } from "@/lib/csv";
import { ladeZimmerplan, zimmerlisteTabelle } from "@/lib/zimmerplan-daten";

/**
 * Zimmerliste fürs Hotel aus der automatischen Einteilung (ab Orga-Team), als CSV für Excel (Semikolon, UTF-8 mit BOM).
 * Nur Namen und Zimmer, keine Kontaktdaten. Jedes Zimmer wird einmal gebucht (erste bis letzte Nacht seiner Gäste);
 * wer später dazukommt, hat eine eigene Anreise. ?groesse=2 oder 3.
 */
export async function GET(request: Request, { params }: RouteContext<"/team/module/[id]/zimmerplan/liste">) {
  await requireStaff("orga");
  const { id } = await params;
  if (!istToken(id)) notFound();
  const sp = new URL(request.url).searchParams;
  const groesse = sp.get("groesse") === "3" ? 3 : 2;
  const d = await ladeZimmerplan(id, sp.get("hotel"));
  if (!d.modul) notFound();
  const { zeilen, datei } = zimmerlisteTabelle(d, groesse);
  return csvAntwort(zeilen, datei);
}

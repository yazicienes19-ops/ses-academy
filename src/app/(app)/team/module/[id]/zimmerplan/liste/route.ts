import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { csvAntwort } from "@/lib/csv";
import { ladeZimmerplan, probeplan, zimmerArt } from "@/lib/zimmerplan-daten";

const datum = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const tag = (iso: string, plus = 0) => datum.format(new Date(Date.parse(`${iso}T12:00:00Z`) + plus * 86_400_000));

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
  const personen = new Map(d.personen.map((p) => [p.participant_id, p]));
  // Sind Zimmer angelegt, gilt die echte Zuteilung; sonst die automatische Einteilung
  const art = (kap: number) => (kap === 2 || kap === 3 ? zimmerArt[kap] : `${kap}-Bett-Zimmer`);
  const liste = d.zimmer.length
    ? d.zimmer.map((z) => ({ label: z.label, art: art(z.capacity), bereich: z.section ?? "", ids: d.personen.filter((p) => p.room_id === z.id).map((p) => p.participant_id) }))
    : probeplan(d, groesse).zimmer.map((z) => ({ label: z.label, art: zimmerArt[groesse], bereich: z.bereich, ids: z.belegung.map((b) => b.id) }));

  const zeilen = [["Hotel", "Zimmer", "Zimmerart", "Bereich", "Zimmer ab", "Zimmer bis", "Nächte", "Name", "Anreise der Person"]];
  const hotelName = d.hotel && d.hotel.name !== "Hotel (Name folgt)" ? d.hotel.name : "";
  for (const z of liste) {
    const n = [...new Set(z.ids.flatMap((id) => personen.get(id)?.nights ?? []))].sort();
    const an = n[0] ? tag(n[0]) : "", ab = n.length ? tag(n.at(-1)!, 1) : "";
    for (const id of z.ids) {
      const eigene = [...(personen.get(id)?.nights ?? [])].sort();
      zeilen.push([hotelName, z.label, z.art, z.bereich, an, ab, String(n.length), personen.get(id)?.name ?? "", eigene[0] && eigene[0] !== n[0] ? tag(eigene[0]) : an]);
    }
  }
  const datei = `Zimmerliste ${d.modul.title}${d.hotels.length > 1 && hotelName ? ` ${hotelName}` : ""}${d.zimmer.length ? "" : ` ${groesse}er-Zimmer`}.csv`;
  return csvAntwort(zeilen, datei);
}

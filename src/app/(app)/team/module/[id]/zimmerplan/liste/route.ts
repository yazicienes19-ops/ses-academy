import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { ladeZimmerplan, probeplan, zimmerArt } from "@/lib/zimmerplan-daten";

const datum = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const tag = (iso: string, plus = 0) => datum.format(new Date(Date.parse(`${iso}T12:00:00Z`) + plus * 86_400_000));

/** Ein Feld für Excel: Semikolon/Anführungszeichen maskieren, Formeln (=, +, -, @) entschärfen. */
function feld(wert: string | number): string {
  let text = String(wert);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Zimmerliste fürs Hotel aus der automatischen Einteilung (ab Orga-Team), als CSV für Excel (Semikolon, UTF-8 mit BOM).
 * Nur Namen, Zimmer und Nächte, keine Kontaktdaten. ?groesse=2 oder 3.
 */
export async function GET(request: Request, { params }: RouteContext<"/team/module/[id]/zimmerplan/liste">) {
  await requireStaff("orga");
  const { id } = await params;
  if (!istToken(id)) notFound();
  const groesse = new URL(request.url).searchParams.get("groesse") === "3" ? 3 : 2;
  const d = await ladeZimmerplan(id);
  if (!d.modul) notFound();
  const probe = probeplan(d, groesse);
  const personen = new Map(d.personen.map((p) => [p.participant_id, p]));

  const zeilen = [["Zimmer", "Zimmerart", "Bereich", "Name", "Anreise", "Abreise", "Nächte"]];
  for (const z of probe.zimmer) {
    for (const b of z.belegung) {
      const p = personen.get(b.id);
      const n = [...(p?.nights ?? [])].sort();
      zeilen.push([z.label, zimmerArt[groesse], z.bereich, p?.name ?? "", n[0] ? tag(n[0]) : "", n.length ? tag(n.at(-1)!, 1) : "", String(n.length)]);
    }
  }
  const csv = "﻿" + zeilen.map((z) => z.map(feld).join(";")).join("\r\n") + "\r\n";
  const datei = `Zimmerliste ${d.modul.title} ${groesse}er-Zimmer.csv`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="Zimmerliste.csv"; filename*=UTF-8''${encodeURIComponent(datei)}`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

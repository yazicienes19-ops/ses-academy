import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { ladeZimmerplan, probeplan, zimmerArt } from "@/lib/zimmerplan-daten";

const datum = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const tag = (iso: string, plus = 0) => datum.format(new Date(Date.parse(`${iso}T12:00:00Z`) + plus * 86_400_000));

/** Ein Feld für Excel: Zeilenumbrüche/Tabs raus, Formeln (=, +, -, @) entschärfen, immer in Anführungszeichen. */
function feld(wert: string | number): string {
  let text = String(wert).replace(/[\r\n\t]+/g, " ");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Zimmerliste fürs Hotel aus der automatischen Einteilung (ab Orga-Team), als CSV für Excel (Semikolon, UTF-8 mit BOM).
 * Nur Namen und Zimmer, keine Kontaktdaten. Jedes Zimmer wird einmal für den ganzen Aufenthalt gebucht: Anreise
 * und Abreise sind für alle gleich (erste bis letzte Nacht, in der jemand übernachtet). ?groesse=2 oder 3.
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

  const alleNaechte = [...new Set(d.personen.flatMap((p) => p.nights))].sort();
  const anreise = alleNaechte[0] ? tag(alleNaechte[0]) : "";
  const abreise = alleNaechte.length ? tag(alleNaechte.at(-1)!, 1) : "";
  const zeilen = [["Zimmer", "Zimmerart", "Bereich", "Name", "Anreise", "Abreise", "Nächte"]];
  for (const z of probe.zimmer) {
    for (const b of z.belegung) zeilen.push([z.label, zimmerArt[groesse], z.bereich, personen.get(b.id)?.name ?? "", anreise, abreise, String(alleNaechte.length)]);
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

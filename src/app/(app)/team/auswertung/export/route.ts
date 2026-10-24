import { requireStaff } from "@/lib/auth";
import { ladeAuswertung, leseFilter } from "@/lib/auswertung";
import { zugehoerigkeit } from "@/lib/einlass";

/** CSV für Excel (Semikolon, UTF-8 mit BOM). Nur admin/vorstand; enthält E-Mail-Adressen. */
export async function GET(request: Request) {
  await requireStaff("alles");
  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { personen } = await ladeAuswertung(leseFilter(sp));
  const zelle = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Formeln in Excel verhindern (=, +, -, @ am Anfang) und Anführungszeichen maskieren
    const sicher = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[;"\n]/.test(sicher) ? `"${sicher.replace(/"/g, '""')}"` : sicher;
  };
  const kopf = ["Vorname", "Nachname", "E-Mail", "Zugehörigkeit", "Region", "Module angemeldet", "Tage da", "Tage verpasst",
    "Module entschuldigt/abgemeldet", "Quote %", "Aktuelle Serie", "Rekord-Serie", "Zuletzt verpasst in Folge", "Letzte Teilnahme", "Letztes Modul"];
  const zeilen = personen.map((p) => [
    p.vorname, p.nachname, p.email, zugehoerigkeit[p.zugehoerigkeit], p.region, p.total_registered, p.total_attended, p.total_no_shows,
    p.total_cancelled_or_excused, p.attendance_rate?.toString().replace(".", ","), p.current_streak, p.longest_streak, p.trailing_misses,
    p.last_attended_at ? new Date(p.last_attended_at).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : "", p.last_attended_title,
  ]);
  const csv = "﻿" + [kopf, ...zeilen].map((z) => z.map(zelle).join(";")).join("\r\n");
  const tag = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ses-auswertung-${tag}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

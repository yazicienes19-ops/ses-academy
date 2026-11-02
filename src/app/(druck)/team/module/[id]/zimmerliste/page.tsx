import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { ladeZimmerplan, probeplan, zimmerArt } from "@/lib/zimmerplan-daten";

export const metadata: Metadata = { title: "Zimmerliste | SES Academy" };

const gruen = "#3d7a61";
const tinte = "#173226";
const tagLang = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const stand = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

type Zimmer = { label: string; art: string; bereich: string; naechte: string[]; gaeste: { name: string; ab: string | null }[] };
const kurz = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
const nachtDatum = (n: string, plus = 0) => new Date(Date.parse(`${n}T12:00:00Z`) + plus * 86_400_000);

/**
 * Zimmerliste fürs Hotel im SES-Design zum Drucken oder als PDF (ab Orga-Team). Sind Zimmer angelegt, die echte
 * Zuteilung; sonst die automatische Einteilung (?groesse=2 oder 3). Jedes Zimmer ist einmal für den ganzen
 * Aufenthalt gebucht: von der ersten bis zur letzten Nacht seiner Gäste; wer später dazukommt, ist vermerkt.
 * Nur Namen, keine Kontaktdaten.
 */
export default async function Zimmerliste({ params, searchParams }: PageProps<"/team/module/[id]/zimmerliste">) {
  await requireStaff("orga");
  const { id } = await params;
  const sp = await searchParams;
  if (!istToken(id)) notFound();
  const d = await ladeZimmerplan(id);
  if (!d.modul) notFound();
  const groesse = sp.groesse === "3" ? 3 : 2;
  const name = new Map(d.personen.map((p) => [p.participant_id, p.name]));
  const naechteVon = new Map(d.personen.map((p) => [p.participant_id, [...p.nights].sort()]));
  // Ein Zimmer ist ab der frühesten Nacht seiner Gäste gebucht; wer später kommt, bekommt den Vermerk „ab …“
  const belegen = (ids: string[]) => {
    const naechte = [...new Set(ids.flatMap((i) => naechteVon.get(i) ?? []))].sort();
    const gaeste = ids.map((i) => ({ name: name.get(i) ?? "?", ab: (naechteVon.get(i) ?? [])[0] !== naechte[0] ? (naechteVon.get(i) ?? [])[0] ?? null : null }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
    return { naechte, gaeste };
  };
  // Bereich aus den Gästen selbst (die Beschriftung eines Zimmers kann nach Umplanen veraltet sein)
  const bereichVon = (leute: { gender: string | null }[], fallback: string) =>
    leute.length && leute.every((x) => x.gender === "w") ? "Frauen" : leute.length && leute.every((x) => x.gender === "m") ? "Männer" : fallback;

  const echt = d.zimmer.length > 0;
  const zimmer: Zimmer[] = echt
    ? d.zimmer.map((z) => {
        const leute = d.personen.filter((p) => p.room_id === z.id);
        return {
          label: z.label, art: z.capacity === 2 ? zimmerArt[2] : z.capacity === 3 ? zimmerArt[3] : `${z.capacity}-Bett-Zimmer`,
          bereich: bereichVon(leute, z.section ?? ""), ...belegen(leute.map((p) => p.participant_id)),
        };
      }).filter((z) => z.gaeste.length > 0)
    : probeplan(d, groesse).zimmer.map((z) => ({ label: z.label, art: zimmerArt[groesse], bereich: z.bereich, ...belegen(z.belegung.map((b) => b.id)) }));
  const bereiche = [...new Set(zimmer.map((z) => z.bereich || "Zimmer"))];
  const alleNaechte = [...new Set(d.personen.flatMap((p) => p.nights))].sort();
  const anreise = alleNaechte[0] ? new Date(`${alleNaechte[0]}T12:00:00Z`) : null;
  const abreise = alleNaechte.length ? new Date(Date.parse(`${alleNaechte.at(-1)}T12:00:00Z`) + 86_400_000) : null;
  const gaeste = zimmer.reduce((n, z) => n + z.gaeste.length, 0);
  const ohne = echt ? d.personen.filter((p) => p.nights.length > 0 && !p.room_id).length : 0;
  const heute = stand.format(new Date());

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm 16mm 16mm; }
        @media print { .nur-bildschirm { display: none !important; } html, body { background: #fff !important; } .blatt { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; } }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { background: #f1efe8; }
        .blatt { width: 210mm; box-sizing: border-box; margin: 8mm auto; padding: 14mm 16mm 16mm; background: #fff; box-shadow: 0 1mm 6mm rgb(0 0 0 / .12);
          font-family: var(--font-inter), Arial, sans-serif; color: ${tinte}; font-size: 10pt; }
        .serif { font-family: var(--font-newsreader), Georgia, serif; }
        .kopf { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8mm; }
        .kopf img { height: 11mm; }
        .kopf span { font-size: 7.5pt; letter-spacing: .22em; text-transform: uppercase; color: #6b7a71; }
        .band { background: ${gruen}; color: #fff; padding: 4mm 5mm; }
        .band h1 { margin: 0; font-size: 17pt; font-weight: 600; }
        .band p { margin: 1.5mm 0 0; font-size: 9.5pt; opacity: .92; }
        .eckdaten { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin: 5mm 0 2mm; }
        .eckdaten div { border: 0.3mm solid #d9e6de; padding: 2.5mm 3mm; }
        .eckdaten b { display: block; font-size: 13pt; }
        .eckdaten span { font-size: 8pt; color: #5d6b63; }
        h2 { margin: 7mm 0 2mm; font-size: 7.5pt; letter-spacing: .3em; text-transform: uppercase; color: ${gruen}; }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        th { text-align: left; font-size: 7.5pt; letter-spacing: .12em; text-transform: uppercase; color: #5d6b63; padding: 2mm 2.5mm; border-bottom: 0.4mm solid ${gruen}; }
        td { padding: 2.2mm 2.5mm; border-bottom: 0.3mm solid #e4e1d8; vertical-align: top; }
        td.zimmer { width: 22mm; font-weight: 700; white-space: nowrap; }
        td.art { width: 30mm; color: #5d6b63; white-space: nowrap; }
        td.nr { width: 8mm; text-align: center; color: #5d6b63; }
        tr { break-inside: avoid; }
        .gast { display: block; }
        .fuss { margin-top: 6mm; font-size: 8pt; color: #5d6b63; }
      `}</style>

      <div className="nur-bildschirm sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-paper px-5 py-3 text-sm">
        <p className="mr-auto"><span className="font-semibold">Zimmerliste · {d.modul.title}</span> · {zimmer.length} Zimmer, {gaeste} Gäste{echt ? "" : ` · automatische Einteilung mit ${zimmerArt[groesse]}n`}</p>
        <p className="text-ink-soft">Druckdialog: A4, 100 %, Kopf- und Fußzeilen aus. „Als PDF sichern“ zum Verschicken ans Hotel.</p>
        <button id="drucken" className="rounded-full bg-ink px-5 py-2 font-semibold text-paper">Drucken / als PDF sichern</button>
        <script dangerouslySetInnerHTML={{ __html: "document.getElementById('drucken').onclick=()=>window.print()" }} />
      </div>

      <main className="blatt">
        <div className="kopf">
          <img src="/brand/ses-logo.png" alt="SES Academy" />
          <span>Zimmerliste · Stand {heute}</span>
        </div>
        <div className="band">
          <h1 className="serif">{d.modul.title} · Zimmerliste</h1>
          <p>{d.hotel && d.hotel.name !== "Hotel (Name folgt)" ? [d.hotel.name, d.hotel.address].filter(Boolean).join(", ") : `Veranstaltung: ${d.modul.location ?? "Ort folgt"}`}</p>
        </div>
        <div className="eckdaten">
          <div><b>{anreise ? tagLang.format(anreise) : "–"}</b><span>erste Anreise</span></div>
          <div><b>{abreise ? tagLang.format(abreise) : "–"}</b><span>Abreise</span></div>
          <div><b>{zimmer.length}</b><span>Zimmer · {[...new Set(zimmer.map((z) => z.naechte[0]).filter(Boolean))].sort().map((n) => `${zimmer.filter((z) => z.naechte[0] === n).length} ab ${kurz.format(nachtDatum(n))}`).join(", ")}</span></div>
          <div><b>{gaeste}</b><span>Gäste · {alleNaechte.length} {alleNaechte.length === 1 ? "Nacht" : "Nächte"}</span></div>
        </div>

        {bereiche.map((b) => {
          const teil = zimmer.filter((z) => (z.bereich || "Zimmer") === b);
          return (
            <section key={b}>
              <h2>{b} · {teil.length} Zimmer</h2>
              <table>
                <thead><tr><th>Zimmer</th><th>Zimmerart</th><th>Gebucht</th><th>Gäste</th><th className="text-center">Anz.</th></tr></thead>
                <tbody>
                  {teil.map((z) => (
                    <tr key={z.label}>
                      <td className="zimmer">{z.label}</td>
                      <td className="art">{z.art}</td>
                      <td className="art">{z.naechte.length ? `${kurz.format(nachtDatum(z.naechte[0]))} – ${kurz.format(nachtDatum(z.naechte.at(-1)!, 1))}` : "–"}</td>
                      <td>{z.gaeste.map((g) => <span key={g.name} className="gast">{g.name}{g.ab && <span style={{ color: "#5d6b63" }}> (kommt {kurz.format(nachtDatum(g.ab))} dazu)</span>}</span>)}</td>
                      <td className="nr">{z.gaeste.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
        <p className="fuss">
          {echt ? "" : "Die Zimmernummern vergibt das Hotel; „2er 01“ usw. sind nur unsere Bezeichnungen. "}
          {ohne > 0 ? `${ohne} Personen mit Übernachtung haben noch kein Zimmer. ` : ""}
          SES Academy · Islamrat für die Bundesrepublik Deutschland
        </p>
      </main>
    </>
  );
}

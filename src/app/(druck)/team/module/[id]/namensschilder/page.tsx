import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { ladeNamensschilder, type Schild } from "@/lib/namensschilder";

export const metadata: Metadata = { title: "Namensschilder | SES Academy" };

/**
 * Zwei Formate: A7 (105 × 74 mm, acht je A4, passt in die üblichen A7-Hüllen) und Karte (90 × 55 mm, zehn je A4,
 * für Kartenhüllen). Alle Maße in mm, damit der Druck ohne Skalierung stimmt.
 */
const formate = {
  a7: { name: "A7 · 105 × 74 mm · 8 je Seite", spalten: 2, zeilen: 4, b: 105, h: 74.25, rand: [0, 0], je: 8 },
  karte: { name: "Karte · 90 × 55 mm · 10 je Seite", spalten: 2, zeilen: 5, b: 90, h: 55, rand: [11, 15], je: 10 },
} as const;
type Format = keyof typeof formate;

/** Namensschilder zum Drucken (ab Orga-Team), mit QR-Code für den Einlass. */
export default async function Namensschilder({ params, searchParams }: PageProps<"/team/module/[id]/namensschilder">) {
  await requireStaff("orga");
  const { id } = await params;
  const { format: f } = await searchParams;
  if (!istToken(id)) notFound();
  const daten = await ladeNamensschilder(id);
  if (!daten) notFound();
  const format: Format = f === "karte" ? "karte" : "a7";
  const fm = formate[format];
  const seiten = Array.from({ length: Math.ceil(daten.schilder.length / fm.je) }, (_, i) => daten.schilder.slice(i * fm.je, (i + 1) * fm.je));
  const k = fm.h / 74.25;   // Schriftgrößen wachsen mit der Schildhöhe

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print { .nur-bildschirm { display: none !important; } body { background: #fff; } }
        .seite { width: 210mm; height: 297mm; box-sizing: border-box; padding: ${fm.rand[1]}mm ${fm.rand[0]}mm; display: grid;
          grid-template-columns: repeat(${fm.spalten}, ${fm.b}mm); grid-template-rows: repeat(${fm.zeilen}, ${fm.h}mm);
          justify-content: center; break-after: page; }
        .schild { position: relative; box-sizing: border-box; overflow: hidden; outline: 0.15mm dashed #c9c2b0; outline-offset: -0.075mm;
          display: grid; grid-template-rows: auto 1fr auto; background: #fff; color: #173226; font-family: var(--font-inter), Arial, sans-serif; }
        .kopf { display: flex; align-items: center; justify-content: space-between; padding: ${3.5 * k}mm ${5 * k}mm 0 ${6 * k}mm; }
        .kopf img { height: ${12 * k}mm; width: auto; display: block; }
        .rolle { font-size: ${7 * k}pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; background: #d7f36b;
          color: #173226; padding: ${1.2 * k}mm ${2.6 * k}mm; border-radius: 99mm; }
        .mitte { display: flex; align-items: center; gap: ${4 * k}mm; padding: 0 ${5 * k}mm 0 ${7 * k}mm; min-height: 0; }
        .name { flex: 1; min-width: 0; }
        .vorname { margin: 0; font-family: var(--font-bricolage), Arial, sans-serif; font-weight: 800; font-size: ${24 * k}pt; line-height: 1;
          letter-spacing: -0.01em; overflow-wrap: anywhere; }
        .nachname { margin: ${1 * k}mm 0 0; font-family: var(--font-bricolage), Arial, sans-serif; font-weight: 500; font-size: ${14 * k}pt; line-height: 1.1; overflow-wrap: anywhere; }
        .zeile { margin: ${2.6 * k}mm 0 0; font-size: ${8 * k}pt; color: #3f6e57; font-weight: 600; }
        .handschrift { height: ${9 * k}mm; border-bottom: 0.3mm solid #c9c2b0; margin-bottom: ${3 * k}mm; }
        .qr { flex: none; text-align: center; }
        .qr svg { width: ${20 * k}mm; height: ${20 * k}mm; display: block; }
        .code { margin: ${0.6 * k}mm 0 0; font-family: ui-monospace, Menlo, monospace; font-size: ${6 * k}pt; letter-spacing: .08em; color: #3c4a42; }
        .fuss { display: flex; align-items: center; gap: ${3 * k}mm; margin: 0 ${5 * k}mm 0 ${7 * k}mm; padding: ${2.2 * k}mm 0 ${3.2 * k}mm;
          border-top: 0.25mm solid #173226; }
        .fuss img { height: ${5.2 * k}mm; width: auto; display: block; }
        .fuss .modul { margin-left: auto; font-size: ${6.2 * k}pt; letter-spacing: .1em; text-transform: uppercase; color: #3c4a42; text-align: right; }
        .streifen { position: absolute; left: 0; top: 0; bottom: 0; width: ${3 * k}mm; background: #173226; }
        .streifen::after { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 35%; background: #d7f36b; }
      `}</style>

      <div className="nur-bildschirm sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-paper px-5 py-3 text-sm">
        <p className="mr-auto"><span className="font-semibold">Namensschilder · {daten.titel}</span> · {daten.schilder.length - 4} Personen und 4 leere Schilder</p>
        {(Object.keys(formate) as Format[]).map((x) => (
          <a key={x} href={`?format=${x}`} aria-current={x === format ? "page" : undefined}
            className={`rounded-full px-4 py-2 font-semibold ring-1 ${x === format ? "bg-ink text-paper ring-ink" : "bg-white ring-line"}`}>{formate[x].name}</a>
        ))}
        <button id="drucken" className="rounded-full bg-ink px-5 py-2 font-semibold text-paper">Drucken (A4, ohne Ränder, 100 %)</button>
        <script dangerouslySetInnerHTML={{ __html: "document.getElementById('drucken').onclick=()=>window.print()" }} />
      </div>

      {seiten.map((s, i) => (
        <div key={i} className="seite">
          {s.map((schild, j) => <Schildchen key={j} schild={schild} modul={daten.titel} />)}
        </div>
      ))}
    </>
  );
}

function Schildchen({ schild, modul }: { schild: Schild; modul: string }) {
  const leer = !schild.vorname && !schild.nachname;
  return (
    <div className="schild">
      <span className="streifen" aria-hidden />
      <div className="kopf">
        <img src="/brand/ses-logo.png" alt="SES Academy" />
        <span className="rolle" lang="tr">{schild.rolle}</span>
      </div>
      <div className="mitte">
        <div className="name">
          {leer ? (
            <><div className="handschrift" /><div className="handschrift" style={{ width: "70%" }} /></>
          ) : (
            <>
              <p className="vorname">{schild.vorname}</p>
              <p className="nachname">{schild.nachname}</p>
              {schild.zeile && <p className="zeile">{schild.zeile}</p>}
            </>
          )}
        </div>
        {schild.qr && (
          <div className="qr">
            <div dangerouslySetInnerHTML={{ __html: schild.qr }} />
            {schild.code && <p className="code">{schild.code}</p>}
          </div>
        )}
      </div>
      <div className="fuss">
        <img src="/brand/islamrat.png" alt="Islamrat" />
        <img src="/brand/igmg-jugend.png" alt="IGMG" />
        <span className="modul">{modul}</span>
      </div>
    </div>
  );
}

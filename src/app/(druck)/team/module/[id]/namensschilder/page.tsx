import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { ladeNamensschilder, type Schild } from "@/lib/namensschilder";

export const metadata: Metadata = { title: "Namensschilder | SES Academy" };

/**
 * Zwei Formate: A7 (105 × 74 mm, acht je A4, passt in die üblichen A7-Hüllen) und Karte (90 × 55 mm, zehn je A4,
 * für Kartenhüllen). Alle Maße in mm, damit der Druck ohne Skalierung stimmt; die Gestaltung skaliert mit der Höhe.
 */
const formate = {
  a7: { name: "A7 · 105 × 74 mm · 8 je Seite", spalten: 2, zeilen: 4, b: 105, h: 74.25, rand: [0, 0], je: 8 },
  karte: { name: "Karte · 90 × 55 mm · 10 je Seite", spalten: 2, zeilen: 5, b: 90, h: 55, rand: [15, 11], je: 10 },
} as const;
type Format = keyof typeof formate;

/** Immer der Stil „Klassisch“ (zentriert, Serifenschrift, Doppelrahmen), in drei Grundfarben. */
const stile = {
  weiss: "Weiß",
  gruen: "Grün (braucht mehr Farbe)",
  schwarz: "Schwarz (braucht mehr Farbe)",
} as const;
type Stil = keyof typeof stile;

const gruen = "#3d7a61";   // wie das Deckblatt der Regieplan-PDF
const dunkel = "#173226";
const schwarz = "#141816";

/** Lange Namen kleiner setzen, damit sie in eine Zeile passen. */
const groesse = (text: string, basis: number, zeichen: number) => (text.length > zeichen ? Math.max(basis * 0.6, (basis * zeichen) / text.length) : basis);

/** Namensschilder zum Drucken (ab Orga-Team), mit QR-Code für den Einlass. */
export default async function Namensschilder({ params, searchParams }: PageProps<"/team/module/[id]/namensschilder">) {
  await requireStaff("orga");
  const { id } = await params;
  const sp = await searchParams;
  if (!istToken(id)) notFound();
  const daten = await ladeNamensschilder(id);
  if (!daten) notFound();
  const format: Format = sp.format === "karte" ? "karte" : "a7";
  const stil: Stil = typeof sp.stil === "string" && sp.stil in stile ? (sp.stil as Stil) : "weiss";
  const fm = formate[format];
  const seiten = Array.from({ length: Math.ceil(daten.schilder.length / fm.je) }, (_, i) => daten.schilder.slice(i * fm.je, (i + 1) * fm.je));
  const k = fm.h / 74.25;
  const mm = (wert: number) => `${(wert * k).toFixed(2)}mm`;
  const pt = (wert: number) => `${(wert * k).toFixed(2)}pt`;
  const link = (x: { format?: Format; stil?: Stil }) => `?format=${x.format ?? format}&stil=${x.stil ?? stil}`;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print { .nur-bildschirm { display: none !important; } html, body { margin: 0; padding: 0; background: #fff; }
          .seite { margin: 0 !important; box-shadow: none !important; height: 296.5mm; overflow: hidden; } }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .seite { width: 210mm; height: 297mm; box-sizing: border-box; padding: ${fm.rand[1]}mm ${fm.rand[0]}mm; display: grid; background: #fff;
          grid-template-columns: repeat(${fm.spalten}, ${fm.b}mm); grid-template-rows: repeat(${fm.zeilen}, ${fm.h}mm);
          justify-content: center; break-after: page; margin: 8mm auto; box-shadow: 0 1mm 6mm rgb(0 0 0 / .12); }
        /* Nach der letzten Seite kein leeres Blatt */
        .seite:last-of-type { break-after: auto; }
        .schild { position: relative; box-sizing: border-box; overflow: hidden; outline: 0.15mm dashed #cfc8b6; outline-offset: -0.075mm;
          font-family: var(--font-inter), Arial, sans-serif; color: ${dunkel}; }
        .serif { font-family: var(--font-newsreader), Georgia, serif; }
        .qr svg { display: block; width: 100%; height: auto; }
        .code { font-family: ui-monospace, Menlo, monospace; letter-spacing: .08em; }
        .linie { border-bottom: 0.3mm solid #cfc8b6; }

        /* Klassisch, Farbe über Variablen: weiß (Standard), grün, schwarz */
        .klassisch { --grund: #fff; --text: ${dunkel}; --akzent: ${gruen}; --nachname: #2a4a3c; --leise: #55665c; --wasserzeichen: .07;
          background: var(--grund); color: var(--text); text-align: center; }
        .klassisch.gruen { --grund: ${gruen}; --text: #fff; --akzent: #e3f1e9; --nachname: #eef7f1; --leise: #d2e8dc; --wasserzeichen: .12; }
        .klassisch.schwarz { --grund: ${schwarz}; --text: #fff; --akzent: #9fd1b8; --nachname: #e6efe9; --leise: #b7c7be; --wasserzeichen: .1; }
        .klassisch::before { content: ""; position: absolute; right: -${mm(10)}; bottom: -${mm(6)}; width: ${mm(62)}; height: ${mm(47)};
          background: url(/brand/megafon.png) center / contain no-repeat; opacity: var(--wasserzeichen); }
        .klassisch .rahmen { position: absolute; inset: ${mm(3)}; border: 0.25mm solid var(--akzent); }
        .klassisch .rahmen::after { content: ""; position: absolute; inset: ${mm(0.9)}; border: 0.12mm solid var(--akzent); opacity: .5; }
        .klassisch .logo { position: absolute; left: 50%; top: ${mm(6.5)}; transform: translateX(-50%); height: ${mm(10.5)}; }
        .klassisch .rolle { position: absolute; left: 0; right: 0; top: ${mm(19)}; font-size: ${pt(6.8)}; letter-spacing: .38em; font-weight: 600; color: var(--akzent); }
        .klassisch .rolle::before, .klassisch .rolle::after { content: ""; display: inline-block; width: ${mm(8)}; height: 0.2mm; background: var(--akzent); vertical-align: middle; margin: 0 ${mm(2.5)}; }
        .klassisch .name { position: absolute; left: ${mm(8)}; right: ${mm(8)}; top: ${mm(25.5)}; }
        .klassisch .vorname { margin: 0; font-weight: 500; line-height: 1; white-space: nowrap; }
        .klassisch .nachname { margin: ${mm(0.8)} 0 0; font-weight: 400; font-style: italic; line-height: 1.05; white-space: nowrap; color: var(--nachname); }
        .klassisch .zeile { margin: ${mm(2.2)} 0 0; font-size: ${pt(6.6)}; letter-spacing: .16em; text-transform: uppercase; color: var(--leise); }
        .klassisch .qr { position: absolute; left: ${mm(6.5)}; bottom: ${mm(6.5)}; width: ${mm(14)}; }
        .klassisch .code { position: absolute; left: ${mm(21.5)}; bottom: ${mm(7)}; font-size: ${pt(5.4)}; color: var(--leise); }
        .klassisch .partner { position: absolute; right: ${mm(6.5)}; bottom: ${mm(6.8)}; display: flex; gap: ${mm(2.4)}; align-items: center; }
        .klassisch .partner img { height: ${mm(4.2)}; width: auto; }
        /* Auf Farbe: Logos und Megafon weiß, QR-Code auf weißem Feld (sonst liest der Scanner schlecht) */
        .klassisch:is(.gruen, .schwarz) :is(.logo, .partner img), .klassisch:is(.gruen, .schwarz)::before { filter: brightness(0) invert(1); }
        .klassisch:is(.gruen, .schwarz) .qr { background: #fff; padding: ${mm(1)}; border-radius: ${mm(0.8)}; left: ${mm(5.5)}; bottom: ${mm(5.5)}; }
        .klassisch:is(.gruen, .schwarz) .linie { border-color: rgb(255 255 255 / .5); }
      `}</style>

      <div className="nur-bildschirm sticky top-0 z-10 border-b border-line bg-paper px-5 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto"><span className="font-semibold">Namensschilder · {daten.titel}</span> · {daten.schilder.length - 4} Personen und 4 leere Schilder</p>
          <button id="drucken" className="rounded-full bg-ink px-5 py-2 font-semibold text-paper">Drucken</button>
          <script dangerouslySetInnerHTML={{ __html: "document.getElementById('drucken').onclick=()=>window.print()" }} />
        </div>
        <p className="mt-1 text-ink-soft">
          Im Druckdialog: A4, Skalierung 100 %, <span className="font-semibold text-ink">„Kopf- und Fußzeilen drucken“ ausschalten</span> und Ränder „Keine“.
          Sonst verkleinert der Browser die Schilder und sie passen nicht mehr in die Hüllen. Am genauesten druckt Chrome.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-semibold">Farbe</span>
          {(Object.keys(stile) as Stil[]).map((x) => (
            <a key={x} href={link({ stil: x })} aria-current={x === stil ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 ring-1 ${x === stil ? "bg-ink text-paper ring-ink" : "bg-white ring-line"}`}>{stile[x]}</a>
          ))}
          <span className="ml-3 font-semibold">Format</span>
          {(Object.keys(formate) as Format[]).map((x) => (
            <a key={x} href={link({ format: x })} aria-current={x === format ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 ring-1 ${x === format ? "bg-ink text-paper ring-ink" : "bg-white ring-line"}`}>{formate[x].name}</a>
          ))}
        </div>
      </div>

      {seiten.map((s, i) => (
        <div key={i} className="seite">
          {s.map((schild, j) => <Schildchen key={j} schild={schild} stil={stil} pt={pt} mm={mm} />)}
        </div>
      ))}
    </>
  );
}

function Schildchen({ schild, stil, pt, mm }: { schild: Schild; stil: Stil; pt: (w: number) => string; mm: (w: number) => string }) {
  const leer = !schild.vorname && !schild.nachname;
  return (
    <div className={`schild klassisch ${stil}`}>
      <span className="rahmen" aria-hidden />
      <img className="logo" src="/brand/ses-logo.png" alt="SES Academy" />
      <p className="rolle" lang="tr">{schild.rolle}</p>
      <div className="name serif">
        {leer ? (
          <><div className="linie" style={{ height: mm(9) }} /><div className="linie" style={{ height: mm(7), width: "60%", margin: "0 auto" }} /></>
        ) : (
          <>
            <p className="vorname" style={{ fontSize: pt(groesse(schild.vorname, 25, 11)) }}>{schild.vorname}</p>
            <p className="nachname" style={{ fontSize: pt(groesse(schild.nachname, 14, 20)) }}>{schild.nachname}</p>
            {schild.zeile && <p className="zeile">{schild.zeile}</p>}
          </>
        )}
      </div>
      {schild.qr && <div className="qr" dangerouslySetInnerHTML={{ __html: schild.qr }} />}
      {schild.code && <p className="code">{schild.code}</p>}
      <div className="partner"><img src="/brand/islamrat.png" alt="Islamrat" /><img src="/brand/igmg-jugend.png" alt="IGMG" /></div>
    </div>
  );
}

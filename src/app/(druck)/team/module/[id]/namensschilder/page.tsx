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

const stile = {
  klassisch: "Klassisch: weiß, zentriert, Serifenschrift",
  deckblatt: "Deckblatt: grünes Band mit Megafon-Muster",
  dunkel: "Dunkel: ganz in Grün (braucht viel Farbe)",
} as const;
type Stil = keyof typeof stile;

const gruen = "#3d7a61";   // wie das Deckblatt der Regieplan-PDF
const dunkel = "#173226";
const signal = "#d7f36b";

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
  const stil: Stil = typeof sp.stil === "string" && sp.stil in stile ? (sp.stil as Stil) : "klassisch";
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
        @media print { .nur-bildschirm { display: none !important; } body { background: #fff; } .seite { margin: 0 !important; box-shadow: none !important; } }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .seite { width: 210mm; height: 297mm; box-sizing: border-box; padding: ${fm.rand[1]}mm ${fm.rand[0]}mm; display: grid; background: #fff;
          grid-template-columns: repeat(${fm.spalten}, ${fm.b}mm); grid-template-rows: repeat(${fm.zeilen}, ${fm.h}mm);
          justify-content: center; break-after: page; margin: 8mm auto; box-shadow: 0 1mm 6mm rgb(0 0 0 / .12); }
        .schild { position: relative; box-sizing: border-box; overflow: hidden; outline: 0.15mm dashed #cfc8b6; outline-offset: -0.075mm;
          font-family: var(--font-inter), Arial, sans-serif; color: ${dunkel}; }
        .serif { font-family: var(--font-newsreader), Georgia, serif; }
        .qr svg { display: block; width: 100%; height: auto; }
        .code { font-family: ui-monospace, Menlo, monospace; letter-spacing: .08em; }
        .linie { border-bottom: 0.3mm solid #cfc8b6; }

        /* 1 · Deckblatt */
        .deckblatt { background: #fff; }
        .deckblatt .band { position: absolute; inset: 0 0 auto 0; height: ${mm(27)}; background: ${gruen} url(/brand/megafon-muster.png) center / ${mm(60)} auto repeat; }
        .deckblatt .band::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, ${gruen} 30%, rgb(61 122 97 / .55)); }
        .deckblatt .oben { position: absolute; left: ${mm(31)}; right: ${mm(6)}; top: ${mm(6)}; display: flex; justify-content: space-between; align-items: baseline; z-index: 1; color: #fff; }
        .deckblatt .marke { font-size: ${pt(6.4)}; letter-spacing: .22em; text-transform: uppercase; opacity: .92; }
        .deckblatt .rolle { font-size: ${pt(7.5)}; font-weight: 700; letter-spacing: .2em; color: ${signal}; }
        .deckblatt .emblem { position: absolute; left: ${mm(6)}; top: ${mm(10)}; width: ${mm(22)}; height: ${mm(22)}; border-radius: 50%; background: #fff;
          box-shadow: 0 0 0 ${mm(1.1)} #fff, 0 0 0 ${mm(1.5)} ${gruen}; display: grid; place-items: center; z-index: 1; }
        .deckblatt .emblem img { width: 80%; height: auto; transform: translateX(-4%); }
        .deckblatt .name { position: absolute; left: ${mm(6)}; right: ${mm(29)}; top: ${mm(37)}; }
        .deckblatt .vorname { margin: 0; font-weight: 600; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; }
        .deckblatt .nachname { margin: ${mm(1.2)} 0 0; font-weight: 400; line-height: 1.05; white-space: nowrap; color: #2a4a3c; }
        .deckblatt .zeile { margin: ${mm(2.4)} 0 0; font-family: var(--font-inter), Arial, sans-serif; font-size: ${pt(6.6)}; letter-spacing: .12em; text-transform: uppercase; color: ${gruen}; font-weight: 600; }
        .deckblatt .qrbox { position: absolute; right: ${mm(5)}; top: ${mm(31)}; width: ${mm(20)}; text-align: center; }
        .deckblatt .code { font-size: ${pt(5.6)}; margin-top: ${mm(0.4)}; color: #55665c; }
        .deckblatt .fuss { position: absolute; left: ${mm(6)}; right: ${mm(5)}; bottom: ${mm(3.6)}; display: flex; align-items: center; gap: ${mm(3)}; }
        .deckblatt .fuss img { height: ${mm(4.6)}; width: auto; }
        .deckblatt .fuss .modul { margin-left: auto; font-size: ${pt(6)}; letter-spacing: .16em; text-transform: uppercase; color: #55665c; }

        /* 2 · Klassisch */
        .klassisch { background: #fff; text-align: center; }
        .klassisch::before { content: ""; position: absolute; right: -${mm(10)}; bottom: -${mm(6)}; width: ${mm(62)}; height: ${mm(47)};
          background: url(/brand/megafon.png) center / contain no-repeat; opacity: .07; }
        .klassisch .rahmen { position: absolute; inset: ${mm(3)}; border: 0.25mm solid ${gruen}; }
        .klassisch .rahmen::after { content: ""; position: absolute; inset: ${mm(0.9)}; border: 0.12mm solid ${gruen}; opacity: .5; }
        .klassisch .logo { position: absolute; left: 50%; top: ${mm(6.5)}; transform: translateX(-50%); height: ${mm(10.5)}; }
        .klassisch .rolle { position: absolute; left: 0; right: 0; top: ${mm(19)}; font-size: ${pt(6.8)}; letter-spacing: .38em; font-weight: 600; color: ${gruen}; }
        .klassisch .rolle::before, .klassisch .rolle::after { content: ""; display: inline-block; width: ${mm(8)}; height: 0.2mm; background: ${gruen}; vertical-align: middle; margin: 0 ${mm(2.5)}; }
        .klassisch .name { position: absolute; left: ${mm(8)}; right: ${mm(8)}; top: ${mm(25.5)}; }
        .klassisch .vorname { margin: 0; font-weight: 500; line-height: 1; white-space: nowrap; }
        .klassisch .nachname { margin: ${mm(0.8)} 0 0; font-weight: 400; font-style: italic; line-height: 1.05; white-space: nowrap; color: #2a4a3c; }
        .klassisch .zeile { margin: ${mm(2.2)} 0 0; font-size: ${pt(6.6)}; letter-spacing: .16em; text-transform: uppercase; color: #55665c; }
        .klassisch .qr { position: absolute; left: ${mm(6.5)}; bottom: ${mm(6.5)}; width: ${mm(14)}; }
        .klassisch .code { position: absolute; left: ${mm(21.5)}; bottom: ${mm(7)}; font-size: ${pt(5.4)}; color: #55665c; }
        .klassisch .partner { position: absolute; right: ${mm(6.5)}; bottom: ${mm(6.8)}; display: flex; gap: ${mm(2.4)}; align-items: center; }
        .klassisch .partner img { height: ${mm(4.2)}; width: auto; }

        /* 3 · Dunkel */
        .dunkel { background: ${dunkel} url(/brand/megafon-muster.png) right -${mm(10)} top -${mm(4)} / ${mm(70)} auto no-repeat; color: #fff; }
        .dunkel::before { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, ${dunkel} 45%, rgb(23 50 38 / .7)); }
        .dunkel > * { z-index: 1; }
        .dunkel .oben { position: absolute; left: ${mm(6)}; right: ${mm(6)}; top: ${mm(5.5)}; display: flex; justify-content: space-between; align-items: center; }
        .dunkel .marke { font-family: var(--font-newsreader), Georgia, serif; font-size: ${pt(9)}; letter-spacing: .06em; }
        .dunkel .marke b { font-weight: 800; }
        .dunkel .rolle { font-size: ${pt(6.8)}; font-weight: 700; letter-spacing: .18em; background: ${signal}; color: ${dunkel}; padding: ${mm(1.1)} ${mm(2.6)}; border-radius: 99mm; }
        .dunkel .name { position: absolute; left: ${mm(6)}; right: ${mm(30)}; top: ${mm(25)}; }
        .dunkel .vorname { margin: 0; font-family: var(--font-bricolage), Arial, sans-serif; font-weight: 800; line-height: .95; letter-spacing: -0.015em; white-space: nowrap; }
        .dunkel .nachname { margin: ${mm(1.4)} 0 0; font-family: var(--font-bricolage), Arial, sans-serif; font-weight: 400; line-height: 1.05; white-space: nowrap; color: #cfe3d8; }
        .dunkel .zeile { margin: ${mm(2.6)} 0 0; font-size: ${pt(7)}; color: ${signal}; font-weight: 600; letter-spacing: .04em; }
        .dunkel .qr { position: absolute; right: ${mm(6)}; top: ${mm(20)}; width: ${mm(21)}; background: #fff; border-radius: ${mm(2.2)}; padding: ${mm(1.4)}; box-sizing: content-box; }
        .dunkel .code { position: absolute; right: ${mm(6)}; top: ${mm(45.5)}; width: ${mm(23.8)}; text-align: center; font-size: ${pt(5.6)}; color: #cfe3d8; }
        .dunkel .fuss { position: absolute; left: 0; right: 0; bottom: 0; height: ${mm(11)}; background: #fff; display: flex; align-items: center; gap: ${mm(3)}; padding: 0 ${mm(6)}; }
        .dunkel .fuss img { height: ${mm(4.8)}; width: auto; }
        .dunkel .fuss .modul { margin-left: auto; font-size: ${pt(6)}; letter-spacing: .16em; text-transform: uppercase; color: #55665c; }
        .dunkel .linie { border-color: rgb(255 255 255 / .45); }
      `}</style>

      <div className="nur-bildschirm sticky top-0 z-10 border-b border-line bg-paper px-5 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto"><span className="font-semibold">Namensschilder · {daten.titel}</span> · {daten.schilder.length - 4} Personen und 4 leere Schilder</p>
          <button id="drucken" className="rounded-full bg-ink px-5 py-2 font-semibold text-paper">Drucken (A4, ohne Ränder, 100 %)</button>
          <script dangerouslySetInnerHTML={{ __html: "document.getElementById('drucken').onclick=()=>window.print()" }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-semibold">Stil</span>
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
          {s.map((schild, j) => <Schildchen key={j} schild={schild} modul={daten.titel} stil={stil} pt={pt} mm={mm} />)}
        </div>
      ))}
    </>
  );
}

function Schildchen({ schild, modul, stil, pt, mm }: { schild: Schild; modul: string; stil: Stil; pt: (w: number) => string; mm: (w: number) => string }) {
  const leer = !schild.vorname && !schild.nachname;
  const qr = schild.qr && <div className="qr" dangerouslySetInnerHTML={{ __html: schild.qr }} />;
  const code = schild.code && <p className="code">{schild.code}</p>;
  const schreiblinien = (breite: string) => (
    <><div className="linie" style={{ height: mm(9) }} /><div className="linie" style={{ height: mm(7), width: breite, margin: stil === "klassisch" ? "0 auto" : undefined }} /></>
  );

  if (stil === "klassisch") {
    return (
      <div className="schild klassisch">
        <span className="rahmen" aria-hidden />
        <img className="logo" src="/brand/ses-logo.png" alt="SES Academy" />
        <p className="rolle" lang="tr">{schild.rolle}</p>
        <div className="name serif">
          {leer ? schreiblinien("60%") : (
            <>
              <p className="vorname" style={{ fontSize: pt(groesse(schild.vorname, 25, 11)) }}>{schild.vorname}</p>
              <p className="nachname" style={{ fontSize: pt(groesse(schild.nachname, 14, 20)) }}>{schild.nachname}</p>
              {schild.zeile && <p className="zeile">{schild.zeile}</p>}
            </>
          )}
        </div>
        {qr}{schild.code && <p className="code">{schild.code}</p>}
        <div className="partner"><img src="/brand/islamrat.png" alt="Islamrat" /><img src="/brand/igmg-jugend.png" alt="IGMG" /></div>
      </div>
    );
  }

  if (stil === "dunkel") {
    return (
      <div className="schild dunkel">
        <div className="oben"><span className="marke"><b>SES</b> ACADEMY</span><span className="rolle" lang="tr">{schild.rolle}</span></div>
        <div className="name">
          {leer ? schreiblinien("70%") : (
            <>
              <p className="vorname" style={{ fontSize: pt(groesse(schild.vorname, 25, 10)) }}>{schild.vorname}</p>
              <p className="nachname" style={{ fontSize: pt(groesse(schild.nachname, 13, 20)) }}>{schild.nachname}</p>
              {schild.zeile && <p className="zeile">{schild.zeile}</p>}
            </>
          )}
        </div>
        {qr}{code}
        <div className="fuss"><img src="/brand/islamrat.png" alt="Islamrat" /><img src="/brand/igmg-jugend.png" alt="IGMG" /><span className="modul">{modul}</span></div>
      </div>
    );
  }

  return (
    <div className="schild deckblatt">
      <div className="band" aria-hidden />
      <div className="oben"><span className="marke">SES Academy</span><span className="rolle" lang="tr">{schild.rolle}</span></div>
      <div className="emblem"><img src="/brand/megafon.png" alt="" /></div>
      <div className="name serif">
        {leer ? schreiblinien("70%") : (
          <>
            <p className="vorname" style={{ fontSize: pt(groesse(schild.vorname, 23, 11)) }}>{schild.vorname}</p>
            <p className="nachname" style={{ fontSize: pt(groesse(schild.nachname, 13.5, 20)) }}>{schild.nachname}</p>
            {schild.zeile && <p className="zeile">{schild.zeile}</p>}
          </>
        )}
      </div>
      {schild.qr && <div className="qrbox">{qr}{code}</div>}
      <div className="fuss"><img src="/brand/islamrat.png" alt="Islamrat" /><img src="/brand/igmg-jugend.png" alt="IGMG" /><span className="modul">{modul}</span></div>
    </div>
  );
}

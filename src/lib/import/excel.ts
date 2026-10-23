import "server-only";
import JSZip from "jszip";

export type Zeile = (string | number | null)[];

/** Liest .xlsx/.xlsm (Makros werden ignoriert) oder .csv in Blätter mit Zeilen. */
export async function leseTabelle(datei: File): Promise<{ name: string; zeilen: Zeile[] }[]> {
  const buf = Buffer.from(await datei.arrayBuffer());
  if (datei.name.toLowerCase().endsWith(".csv")) {
    const text = buf.toString("utf8").replace(/^\uFEFF/, "");
    const erste = text.split("\n")[0];
    const trenner = (erste.match(/;/g)?.length ?? 0) > (erste.match(/,/g)?.length ?? 0) ? ";" : ",";
    return [{ name: datei.name, zeilen: csv(text, trenner) }];
  }
  return leseXlsx(buf);
}

// ── Schlanker XLSX-Leser: nur Zellwerte, unabhängig vom erzeugenden Programm ─────
// (Excel, Google Tabellen, .NET-Bibliotheken mit BOM, Namensraum-Präfixen oder absoluten Pfaden)

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const dekodiere = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : entities[e] ?? m,
  );

// Tags mit beliebigem Namensraum-Präfix: <x:c …> wie <c …>
const tag = (name: string) => new RegExp(`<(?:\\w+:)?${name}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</(?:\\w+:)?${name}>)`, "g");
const attr = (attrs: string, name: string) => attrs.match(new RegExp(`(?:^|\\s)(?:\\w+:)?${name}="([^"]*)"`))?.[1];
const texte = (xml: string) => [...xml.matchAll(tag("t"))].map((m) => dekodiere(m[2] ?? "")).join("");

function pfadAufloesen(basis: string, ziel: string) {
  if (ziel.startsWith("/")) return ziel.slice(1);
  const teile = basis.split("/").slice(0, -1);
  for (const t of ziel.split("/")) {
    if (t === "..") teile.pop();
    else if (t !== ".") teile.push(t);
  }
  return teile.join("/");
}

function spalteIndex(ref: string) {
  const buchstaben = ref.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "A";
  return [...buchstaben].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
}

async function leseXlsx(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf);
  const datei = async (pfad: string) => (await zip.file(pfad)?.async("string"))?.replace(/^\uFEFF/, "") ?? null;

  const beziehungen = async (pfad: string) => [...((await datei(pfad)) ?? "").matchAll(tag("Relationship"))].map((m) => m[1]);
  const typZiel = (liste: string[], typ: string) => {
    const a = liste.find((x) => attr(x, "Type")?.endsWith(`/${typ}`));
    return a ? attr(a, "Target") : undefined;
  };

  const wbPfad = pfadAufloesen("", typZiel(await beziehungen("_rels/.rels"), "officeDocument") ?? "xl/workbook.xml");
  const wb = (await datei(wbPfad)) ?? "";
  const wbRels = await beziehungen(wbPfad.replace(/[^/]+$/, (n) => `_rels/${n}.rels`));
  const rels = new Map(wbRels.map((a) => [attr(a, "Id")!, attr(a, "Target")!]));

  const geteilt: string[] = [];
  const ssZiel = typZiel(wbRels, "sharedStrings");
  const ss = ssZiel ? await datei(pfadAufloesen(wbPfad, ssZiel)) : null;
  if (ss) for (const m of ss.matchAll(tag("si"))) geteilt.push(texte(m[2] ?? ""));

  const blaetter: { name: string; zeilen: Zeile[] }[] = [];
  for (const m of wb.matchAll(tag("sheet"))) {
    const name = dekodiere(attr(m[1], "name") ?? "Blatt");
    const ziel = rels.get(attr(m[1], "id") ?? "");
    const xml = ziel ? await datei(pfadAufloesen(wbPfad, ziel)) : null;
    if (!xml) continue;
    const zeilen: Zeile[] = [];
    for (const r of xml.matchAll(tag("row"))) {
      const nr = Number(attr(r[1], "r")) || zeilen.length + 1;
      const zeile: Zeile = [];
      let naechste = 0;
      for (const c of (r[2] ?? "").matchAll(tag("c"))) {
        const ref = attr(c[1], "r");
        const i = ref ? spalteIndex(ref) : naechste;
        naechste = i + 1;
        const typ = attr(c[1], "t");
        const inhalt = c[2] ?? "";
        const v = inhalt.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
        let wert: string | number | null = null;
        if (typ === "s") wert = v != null ? geteilt[Number(v)] ?? null : null;
        else if (typ === "inlineStr") wert = texte(inhalt);
        else if (typ === "str" || typ === "e") wert = v != null ? dekodiere(v) : null;
        else if (typ === "b") wert = v === "1" ? 1 : 0;
        else if (v != null && v !== "") wert = Number(v);
        while (zeile.length < i) zeile.push(null);
        zeile[i] = wert === "" ? null : wert;
      }
      while (zeilen.length < nr - 1) zeilen.push([]);
      zeilen[nr - 1] = zeile;
    }
    blaetter.push({ name, zeilen });
  }
  return blaetter;
}

/** Excel-Datumszahl (z. B. 46290) → „2026-09-20“ */
export function excelDatum(v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const s = v == null ? "" : String(v).trim();
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de) return `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

function csv(text: string, t: string): Zeile[] {
  const out: Zeile[] = [];
  let zeile: string[] = [], feld = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === t) { zeile.push(feld); feld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      zeile.push(feld); out.push(zeile.map((x) => (x === "" ? null : x))); zeile = []; feld = "";
    } else feld += c;
  }
  if (feld || zeile.length) { zeile.push(feld); out.push(zeile.map((x) => (x === "" ? null : x))); }
  return out;
}

/** Findet die Kopfzeile: erste Zeile, in der alle Suchbegriffe (gefaltet, Teilstring) vorkommen. */
export function kopfzeile(zeilen: Zeile[], muss: ((zelle: string) => boolean)[], maxZeilen = 30) {
  for (let i = 0; i < Math.min(zeilen.length, maxZeilen); i++) {
    const zellen = zeilen[i].map(klein);
    if (muss.every((m) => zellen.some(m))) return { index: i, zellen };
  }
  return null;
}

/** Kleinschreibung für Spaltenköpfe in DE und TR: „İsim“ → „isim“, „Inhalt“ → „inhalt“ (nicht „ınhalt“). */
export const klein = (v: unknown) => (v == null ? "" : String(v).trim().replace(/[İI]/g, "i").toLowerCase());

export const text = (v: unknown) => (v == null ? "" : String(v).trim());

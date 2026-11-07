// CSV für Excel (Semikolon, UTF-8 mit BOM), wie Zimmerliste und Auswertung-Export.

/** Ein Feld für Excel: Zeilenumbrüche/Tabs raus, Formeln (=, +, -, @) entschärfen, immer in Anführungszeichen. */
export function csvFeld(wert: string | number | null | undefined): string {
  let text = wert === null || wert === undefined ? "" : String(wert).replace(/[\r\n\t]+/g, " ");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Ganze Tabelle als CSV-Text (mit BOM, damit Excel Umlaute richtig liest). */
export function csvText(zeilen: (string | number | null | undefined)[][]): string {
  return "﻿" + zeilen.map((z) => z.map(csvFeld).join(";")).join("\r\n") + "\r\n";
}

/** Download-Antwort; der Dateiname darf Umlaute enthalten (filename* nach RFC 5987). */
export function csvAntwort(zeilen: (string | number | null | undefined)[][], dateiname: string): Response {
  const ascii = dateiname.normalize("NFKD").replace(/[^\w .-]/g, "_");
  return new Response(csvText(zeilen), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(dateiname)}`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

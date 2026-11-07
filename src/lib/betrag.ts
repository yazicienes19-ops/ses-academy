// Geldbeträge, wie man sie tippt und wie man sie liest.

/** Betrag wie man ihn tippt: „1.250,50“, „1250,5“, „250.50“, „250 €“. Leer → null; ungültig oder negativ → NaN. */
export function betragLesen(v: string): number | null {
  const t = v.replace(/\s|€|eur(o)?/gi, "");
  if (!t) return null;
  const norm = /,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  const n = Number(norm);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

const euroFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
/** 1250.5 → „1.250,50 €“ */
export function euro(n: number): string {
  return euroFormat.format(n);
}

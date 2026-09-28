import { de } from "./texte/de";
import { en } from "./texte/en";
import { fr } from "./texte/fr";
import { nl } from "./texte/nl";
import { tr } from "./texte/tr";
import { locale, type Sprache, type Texte } from "./typ";

export const texte: Record<Sprache, Texte> = { de, tr, en, fr, nl };

/** z. B. „11.–12. April 2026“ bzw. „11–12 April 2026“ – je nach Sprache. */
export function zeitraum(l: Sprache, von: string, bis: string): string {
  const f = new Intl.DateTimeFormat(locale[l], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  return f.formatRange(new Date(`${von}T12:00:00Z`), new Date(`${bis}T12:00:00Z`));
}

/** Kurzform für kleine Flächen, z. B. „14.–15. Nov.“ */
export function zeitraumKurz(l: Sprache, von: string, bis: string): string {
  const f = new Intl.DateTimeFormat(locale[l], { day: "numeric", month: "short", timeZone: "Europe/Berlin" });
  return f.formatRange(new Date(`${von}T12:00:00Z`), new Date(`${bis}T12:00:00Z`));
}

export * from "./typ";

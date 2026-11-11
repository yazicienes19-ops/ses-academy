import type { TicketModul } from "./teilnahme";

/** Wallet-Karten sind bewusst immer englisch (Veranstaltung ist international), unabhängig von der Sprache der Person. */
export const WALLET_SPRACHE = "en" as const;

const EVENT_NAMEN: Record<string, string> = { demokratie: "DEMOCRACY IN EUROPE" };

/** Titel der Veranstaltung auf der Karte: bekannte Module mit englischem Namen, sonst der Titel in Großbuchstaben. */
export function walletEventName(m: { titel: string }): string {
  return EVENT_NAMEN[m.titel.trim().toLowerCase()] ?? m.titel.toUpperCase();
}

/** Kurzes Datum wie „14-15 Nov 2026“ bzw. „14 Nov 2026“. */
export function walletDatum(m: TicketModul): string {
  if (m.tage.length === 0) return "–";
  const teil = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", ...o }).format(new Date(d));
  const von = m.tage[0].beginn, bis = m.tage[m.tage.length - 1].beginn;
  const tag = (d: string) => teil(d, { day: "numeric" });
  const monatJahr = (d: string) => teil(d, { month: "short", year: "numeric" });
  const tagMonat = (d: string) => teil(d, { day: "numeric", month: "short" });
  if (tag(von) === tag(bis) && monatJahr(von) === monatJahr(bis)) return `${tag(von)} ${monatJahr(von)}`;
  if (monatJahr(von) === monatJahr(bis)) return `${tag(von)}-${tag(bis)} ${monatJahr(von)}`;
  return `${tagMonat(von)} - ${tagMonat(bis)} ${teil(bis, { year: "numeric" })}`;
}

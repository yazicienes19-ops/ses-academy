// Impressum und Datenschutz: die Seiten des Islamrats (Träger der SES Academy), wie im Fuß der öffentlichen Website.
// Eigene Rechtstexte gibt es nicht; geändert wird nur hier.

import { texte } from "@/i18n";
import type { Sprache } from "@/i18n/typ";

export const IMPRESSUM_URL = "https://www.islamrat.de/impressum/";
export const DATENSCHUTZ_URL = "https://www.islamrat.de/disclaimer/";

/** Beschriftungen in der Sprache der Person (wie im Fuß der Website). */
export function rechtlicheTexte(l: Sprache) {
  return { impressum: texte[l].footer.impressum, datenschutz: texte[l].footer.datenschutz };
}

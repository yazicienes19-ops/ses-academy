// Bewertungsbogen für Rhetorik-Videos (Vorlage des Bewertungsteams, Kommissionsbeschluss 17.09.2026).
export const kriterien = [
  { feld: "content", name: "Inhalt", hinweis: "Klare Kernaussage, Relevanz, passende Argumente und Beispiele" },
  { feld: "structure", name: "Aufbau & Struktur", hinweis: "Gelungener Einstieg, roter Faden, logische Übergänge, klarer Abschluss" },
  { feld: "body_language", name: "Körpersprache", hinweis: "Aufrechte Haltung, natürliche Gestik, offene und sichere Wirkung" },
  { feld: "facial_expression", name: "Mimik & Blickkontakt", hinweis: "Passender Gesichtsausdruck, Blick in die Kamera bzw. zum Publikum" },
  { feld: "voice", name: "Stimme & Sprechweise", hinweis: "Lautstärke, Betonung, Tempo, deutliche Aussprache und sinnvolle Pausen" },
  { feld: "language", name: "Ausdruck & Sprache", hinweis: "Verständliche Wortwahl, klare Sätze, wenige Füllwörter, möglichst frei" },
  { feld: "presence", name: "Auftreten & Sicherheit", hinweis: "Ruhiges, authentisches, selbstbewusstes und überzeugendes Auftreten" },
  { feld: "impact", name: "Publikumswirkung", hinweis: "Aufmerksamkeit gehalten, Interesse geweckt, Botschaft überzeugend vermittelt" },
  { feld: "overall", name: "Gesamteindruck", hinweis: "Stimmigkeit und Wirkung des Videos insgesamt" },
] as const;

export type KriteriumFeld = (typeof kriterien)[number]["feld"];

export const skala: Record<number, string> = { 5: "sehr gut", 4: "gut", 3: "solide", 2: "ausbaufähig", 1: "deutlicher Verbesserungsbedarf" };

/** Gesamtbewertung wie im Excel-Bogen (Durchschnitt aller ausgefüllten Kriterien). */
export function gesamtbewertung(durchschnitt: number | null | undefined) {
  if (durchschnitt == null) return null;
  if (durchschnitt >= 4.5) return "Sehr überzeugend";
  if (durchschnitt >= 3.5) return "Überzeugend";
  if (durchschnitt >= 2.5) return "Solide";
  if (durchschnitt >= 1.5) return "Ausbaufähig";
  return "Deutlicher Verbesserungsbedarf";
}

export function auswerten(b: Partial<Record<KriteriumFeld, number | null>>) {
  const werte = kriterien.map((k) => b[k.feld]).filter((x): x is number => typeof x === "number");
  if (!werte.length) return { punkte: null, durchschnitt: null, anzahl: 0, urteil: null };
  const punkte = werte.reduce((a, x) => a + x, 0);
  const durchschnitt = Math.round((punkte / werte.length) * 10) / 10;
  return { punkte, durchschnitt, anzahl: werte.length, urteil: gesamtbewertung(durchschnitt) };
}

/** Mehrere Bewertungen einer Abgabe (verschiedene Bewerter:innen) zu einem Ergebnis zusammenfassen. */
export function zusammenfassen(liste: Partial<Record<KriteriumFeld, number | null>>[]) {
  const einzeln = liste.map(auswerten).filter((e) => e.durchschnitt != null);
  if (!einzeln.length) return { durchschnitt: null, urteil: null, anzahl: 0 };
  const durchschnitt = Math.round((einzeln.reduce((a, e) => a + e.durchschnitt!, 0) / einzeln.length) * 10) / 10;
  return { durchschnitt, urteil: gesamtbewertung(durchschnitt), anzahl: einzeln.length };
}

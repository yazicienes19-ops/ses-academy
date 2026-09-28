// Beiträge der Teilnehmenden („Stimmen“). Anleitung zum Eintragen: ~/SES_ACADEMY/STIMMEN_LEITFADEN.md
// Beiträge erscheinen in ihrer Originalsprache auf allen Sprachversionen der Seite.
import type { ModulSlug, Sprache } from "./typ";

export type BeitragTyp = "kommentar" | "video" | "grafik" | "podcast";
export type Land = "de" | "fr" | "at" | "nl" | "be" | "ch" | "andere";

export type Beitrag = {
  slug: string;
  typ: BeitragTyp;
  modul: ModulSlug;
  land: Land;
  sprache: Sprache;
  datum: string; // ISO
  titel: string;
  teaser: string;
  text: string[]; // Absätze
  autor: { name: string; alter?: number; stadt?: string };
  /** YouTube-Video-ID; wird erst nach Klick geladen (Datenschutz). */
  youtube?: string;
  bild?: string;
  /** Fiktiver Beispielbeitrag – erscheint nur, wenn beim Build SES_MUSTER=1 gesetzt ist. */
  muster?: boolean;
};

const alle: Beitrag[] = [
  {
    slug: "muster-kommentar",
    muster: true,
    typ: "kommentar",
    modul: "verfassungen",
    land: "de",
    sprache: "de",
    datum: "2026-06-20",
    titel: "Eine Verfassung ist kein Museumsstück",
    teaser: "MUSTER – So könnte ein Kommentar nach dem Verfassungs-Modul aussehen. Dieser Text ist fiktiv.",
    text: [
      "MUSTER – Dieser Beitrag ist ein fiktiver Platzhalter und zeigt nur, wie ein echter Beitrag auf der Seite aussieht.",
      "Vor dem Wochenende in Köln hätte ich gesagt: Das Grundgesetz ist etwas für Jurist:innen. Nach zwei Tagen mit Keynotes, Panels und unserer Ländergruppe sehe ich das anders. Eine Verfassung lebt davon, dass Menschen sie kennen, sich auf sie berufen – und sie verteidigen, wenn es darauf ankommt.",
      "Am meisten hat mich der Vergleich mit Frankreich und Österreich beschäftigt: Dieselbe Idee von Religionsfreiheit, drei sehr unterschiedliche Wege, sie umzusetzen.",
    ],
    autor: { name: "Vorname N. (Muster)", alter: 22, stadt: "Köln" },
  },
];

export const zeigeMuster = process.env.SES_MUSTER === "1";

export const beitraege: Beitrag[] = alle
  .filter((b) => zeigeMuster || !b.muster)
  .sort((a, b) => b.datum.localeCompare(a.datum));

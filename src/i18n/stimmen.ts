// Beiträge der Teilnehmenden („Stimmen“). Anleitung zum Eintragen: ~/SES_ACADEMY/STIMMEN_LEITFADEN.md
// Beiträge erscheinen in ihrer Originalsprache auf allen Sprachversionen der Seite.
import type { ModulSlug, Sprache } from "./typ";

export type BeitragTyp = "kommentar" | "video" | "grafik" | "podcast" | "rede" | "artikel";
export type Land = "de" | "fr" | "at" | "nl" | "be" | "ch" | "andere";

export type Beitrag = {
  slug: string;
  typ: BeitragTyp;
  /** Modul, in dem der Beitrag entstanden ist – entfällt z. B. bei Reden oder Presseartikeln außerhalb der Academy. */
  modul?: ModulSlug;
  land: Land;
  sprache: Sprache;
  datum: string; // ISO
  titel: string;
  teaser: string;
  text: string[]; // Absätze; bei Artikeln genügt eine kurze Zusammenfassung
  autor: { name: string; alter?: number; stadt?: string };
  /** YouTube-Video-ID; wird erst nach Klick geladen (Datenschutz). */
  youtube?: string;
  bild?: string;
  /** Nur bei Reden: wo und zu welchem Anlass die Rede gehalten wurde, z. B. „Landesparteitag Bündnis 90/Die Grünen NRW, Köln“. */
  anlass?: string;
  /** Nur bei Artikeln: Link zum Originalbeitrag im Medium (Zeitung, Magazin, Blog). */
  extern?: { url: string; medium: string };
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
  {
    slug: "muster-rede",
    muster: true,
    typ: "rede",
    land: "de",
    sprache: "de",
    datum: "2026-10-10",
    titel: "Teilhabe ist kein Gnadenakt",
    teaser: "MUSTER – So erscheint eine Rede, die eine Teilnehmerin außerhalb der Academy gehalten hat. Dieser Text ist fiktiv.",
    anlass: "Kreismitgliederversammlung einer Partei, Köln (Muster)",
    text: [
      "MUSTER – Dieser Beitrag ist ein fiktiver Platzhalter. Bei Reden steht hier der Redetext oder ein Auszug; ein Video kann zusätzlich über die YouTube-ID eingebunden werden.",
    ],
    autor: { name: "Vorname N. (Muster)", alter: 24, stadt: "Köln" },
  },
  {
    slug: "muster-artikel",
    muster: true,
    typ: "artikel",
    land: "de",
    sprache: "de",
    datum: "2026-10-01",
    titel: "Was junge Muslime von der Politik erwarten",
    teaser: "MUSTER – So erscheint ein Gastbeitrag, den ein Teilnehmer in einer Zeitung veröffentlicht hat. Dieser Text ist fiktiv.",
    extern: { url: "https://example.org/", medium: "Beispielzeitung (Muster)" },
    text: ["MUSTER – Bei Artikeln genügen zwei, drei Sätze Zusammenfassung; der vollständige Text bleibt beim Medium und wird verlinkt."],
    autor: { name: "Vorname N. (Muster)", alter: 26, stadt: "Düsseldorf" },
  },
  {
    slug: "fransa-17-ekim-eylemleri",
    typ: "artikel",
    land: "fr",
    sprache: "tr",
    datum: "2026-10-20",
    titel: "Fransa’da Sokakların Öfkesi, Devletin Sınavı: 17 Ekim Eylemlerini Nasıl Okumalı?",
    teaser: "Öğrencilerin, sendikaların ve toplumsal hareketlerin 17 Ekim’de Fransa genelinde düzenlediği gösteriler üzerine bir analiz.",
    text: [
      "Perspektif’te yayımlanan yazı, 17 Ekim eylemlerini Fransa’nın protesto geleneği, sosyal medyada yayılan görüntüler ve polis müdahalesine ilişkin tartışmalar ışığında değerlendiriyor.",
    ],
    extern: { url: "https://perspektif.eu/2026/10/20/fransada-sokaklarin-ofkesi-devletin-sinavi-17-ekim-eylemlerini-nasil-okumali", medium: "Perspektif" },
    autor: { name: "Büşra D.", stadt: "Lyon" },
  },
  {
    slug: "ed-miliband-kimdir",
    typ: "artikel",
    land: "fr",
    sprache: "tr",
    datum: "2026-09-24",
    titel: "İngiltere’nin İsrail Politikasını Sertleştiren Yahudi Dışişleri Bakanı: Ed Miliband Kimdir?",
    teaser: "Ed Miliband’ın siyasi biyografisi ve Birleşik Krallık’ın İsrail politikasındaki değişime etkisi üzerine bir portre.",
    text: [
      "Perspektif’te yayımlanan portre, Miliband’ın İşçi Partisi’ndeki yükselişini, iklim politikasındaki rolünü ve İsrail-Filistin konusundaki tutumunun aile geçmişi ve kimliğiyle bağlantısını ele alıyor.",
    ],
    extern: { url: "https://perspektif.eu/2026/09/24/ingilterenin-israil-politikasini-sertlestiren-yahudi-disisleri-bakani-ed-miliband-kimdir", medium: "Perspektif" },
    autor: { name: "Büşra D.", stadt: "Lyon" },
  },
];

export const zeigeMuster = process.env.SES_MUSTER === "1";

export const beitraege: Beitrag[] = alle
  .filter((b) => zeigeMuster || !b.muster)
  .sort((a, b) => b.datum.localeCompare(a.datum));

export const sprachen = ["de", "tr", "en", "fr", "nl"] as const;
export type Sprache = (typeof sprachen)[number];

export const sprachNamen: Record<Sprache, string> = {
  de: "Deutsch",
  tr: "Türkçe",
  en: "English",
  fr: "Français",
  nl: "Nederlands",
};

export const locale: Record<Sprache, string> = {
  de: "de-DE",
  tr: "tr-TR",
  en: "en-GB",
  fr: "fr-FR",
  nl: "nl-NL",
};

/** Deutsch liegt wie auf der bisherigen WordPress-Seite unter "/", alle anderen unter "/<sprache>". */
export function pfad(l: Sprache, rest = ""): string {
  const basis = l === "de" ? "" : `/${l}`;
  return basis + rest || "/";
}

export function istSprache(x: string): x is Sprache {
  return (sprachen as readonly string[]).includes(x);
}

export type ModulSlug = "auftakt" | "verfassungen" | "skills-workshop" | "demokratie" | "winter-school";

export type Texte = {
  meta: { titel: string; beschreibung: string };
  nav: { programm: string; kompetenzen: string; rueckblick: string; faq: string; kontakt: string; menue: string; schliessen: string };
  hero: {
    kicker: string;
    zeilen: [string, string, string];
    claim: string;
    intro: string;
    ctaProgramm: string;
    ctaFaq: string;
    laufzeitLabel: string;
    laufzeit: string;
    ortLabel: string;
    ort: string;
    alterLabel: string;
    alter: string;
    kostenLabel: string;
    kosten: string;
    fotoAlt: string;
    fotoText: string;
  };
  laufband: string[];
  bewerbung: { titel: string; text: string; cta: string };
  naechstes: { kicker: string; mehr: string };
  programm: {
    kicker: string;
    titel: string;
    intro: string;
    vorbei: string;
    naechstes: string;
    geplant: string;
    modul: string;
    weitereTitel: string;
    weitereText: string;
    details: string;
    art: Record<"auftakt" | "seminar" | "workshop" | "winterschool", string>;
  };
  kompetenzen: { kicker: string; titel: string; intro: string; liste: { name: string; kurz: string; text: string }[] };
  rueckblick: { kicker: string; titel: string; text: string; gaesteTitel: string; alle: string };
  ueber: {
    kicker: string;
    titel: string;
    text: string;
    fuerWenTitel: string;
    fuerWenText: string;
    fuerWenZusatz: string;
    ablaufTitel: string;
    ablauf: { titel: string; text: string }[];
  };
  faq: { kicker: string; titel: string; suche: string; keineTreffer: string; liste: { frage: string; antwort: string[]; punkte?: string[]; nachsatz?: string }[] };
  kontakt: { titel: string; text: string; cta: string };
  footer: { claim: string; traeger: string; impressum: string; datenschutz: string; islamrat: string; kontakt: string };
  seminar: { zurueck: string; datum: string; ort: string; ortOffen: string; vorher: string; nachher: string; gaeste: string; eindruecke: string };
  formate: Record<"keynote" | "panel" | "grusswort" | "videobotschaft" | "moderation" | "eroeffnung" | "studie" | "laendergruppe" | "gespraech" | "schlusswort", string>;
  seminare: Record<ModulSlug, { titel: string; text: string[] }>;
  bewerbungSeite: {
    nav: string;
    meta: string;
    kicker: string;
    titel: [string, string];
    intro: string;
    status: string;
    voraussetzungenTitel: string;
    voraussetzungen: string[];
    ablaufTitel: string;
    ablauf: { titel: string; text: string }[];
    formTitel: string;
    felder: {
      vorname: string; nachname: string; email: string; telefon: string; geburtsjahr: string; land: string; stadt: string;
      sprachen: string; spracheEn: string; spracheTr: string; spracheLand: string;
      motivation: string; motivationHilfe: string; quelle: string; optional: string;
    };
    einwilligung: string;
    senden: string;
    hinweis: string;
    danke: string;
    mailBetreff: string;
  };
  stimmen: {
    nav: string;
    meta: string;
    kicker: string;
    titel: [string, string];
    intro: string;
    leer: string;
    filterModul: string;
    filterLand: string;
    alle: string;
    typ: Record<"kommentar" | "video" | "grafik" | "podcast", string>;
    laender: Record<"de" | "fr" | "at" | "nl" | "be" | "ch" | "andere", string>;
    lesen: string;
    zurueck: string;
    videoLaden: string;
    videoHinweis: string;
    hinweis: string;
    muster: string;
    startseiteTitel: string;
    startseiteText: string;
  };
  presse: {
    nav: string;
    meta: string;
    kicker: string;
    titel: string;
    intro: string;
    kurzTitel: string;
    kurz: string[];
    faktenTitel: string;
    fakten: [string, string][];
    gaesteTitel: string;
    downloadsTitel: string;
    onepager: string;
    logo: string;
    fotos: string;
    fotoCredit: string;
    kontaktTitel: string;
    kontaktRolle: string;
  };
  berichte: {
    kicker: string;
    folgt: string;
    laut: string;
    module: Partial<Record<ModulSlug, { absaetze: string[]; zitate?: { text: string; wer: string }[] }>>;
  };
};

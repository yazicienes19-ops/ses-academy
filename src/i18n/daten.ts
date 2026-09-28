// Sprachunabhängige Daten. Quellen:
//   [WEB] ses.islamrat.de (WordPress-Inhalte, Stand 28.09.2026)
//   [AG]  SES Academy Agenda Juni 2026
//   [PR]  Presseberichte IGMG (13.04.2026) und IslamiQ (14.04.2026) zum Auftakt; Fotos: Islamrat
//   [EG]  Einladungsbrief an Dr. Gregor Gysi (Auftakt-Gäste Yousaf, Rohe, Heil)
import type { ModulSlug, Sprache } from "./typ";

export type Modul = {
  slug: ModulSlug;
  art: "auftakt" | "seminar" | "workshop" | "winterschool";
  von: string; // ISO-Datum
  bis: string;
  ort: string | null; // null = Ort noch in Planung
};

// [WEB] Veranstaltungsplan
export const modulplan: Modul[] = [
  {
    slug: "auftakt", art: "auftakt", von: "2026-04-11", bis: "2026-04-12", ort: "Colonia-Allee 3, 51067 Köln",
  },
  {
    slug: "verfassungen", art: "seminar", von: "2026-06-13", bis: "2026-06-14", ort: "Colonia-Allee 3, 51067 Köln",
  },
  {
    slug: "skills-workshop", art: "workshop", von: "2026-09-12", bis: "2026-09-13", ort: "Colonia-Allee 3, 51067 Köln",
  },
  {
    slug: "demokratie", art: "seminar", von: "2026-11-14", bis: "2026-11-15", ort: "Colonia-Allee 3, 51067 Köln",
  },
  {
    slug: "winter-school", art: "winterschool", von: "2026-12-18", bis: "2026-12-23", ort: null,
  },
];

export type Format = "keynote" | "panel" | "grusswort" | "eroeffnung" | "studie" | "laendergruppe" | "gespraech" | "schlusswort";
export type Gast = { name: string; modul: ModulSlug; format: Format; rolle?: Partial<Record<Sprache, string>> & { de: string } };

const alle = (s: string) => ({ de: s, tr: s, en: s, fr: s, nl: s });

// Nur tatsächlich aufgetretene Gäste. Auftakt: [PR] + [EG]; Juni: [AG]
export const gaeste: Gast[] = [
  { name: "Burhan Kesici", modul: "auftakt", format: "eroeffnung", rolle: { de: "Vorsitzender des Islamrats", tr: "İslam Konseyi Başkanı", en: "Chairman of the Islamrat", fr: "Président de l’Islamrat", nl: "Voorzitter van de Islamrat" } },
  { name: "Kemal Ergün", modul: "auftakt", format: "grusswort" },
  { name: "Humza Yousaf", modul: "auftakt", format: "keynote", rolle: { de: "Ehemaliger First Minister von Schottland", tr: "İskoçya eski Başbakanı", en: "Former First Minister of Scotland", fr: "Ancien Premier ministre d’Écosse", nl: "Voormalig premier van Schotland" } },
  { name: "Prof. Dr. Mathias Rohe", modul: "auftakt", format: "keynote", rolle: alle("Universität Erlangen-Nürnberg") },
  { name: "Hubertus Heil", modul: "auftakt", format: "grusswort", rolle: { de: "Bundesminister a. D.", tr: "Eski Federal Bakan", en: "Former Federal Minister", fr: "Ancien ministre fédéral", nl: "Voormalig federaal minister" } },
  { name: "Prof. Mahmut Hakkı Akın", modul: "auftakt", format: "studie", rolle: { de: "Befragung von 2.091 Jugendlichen in 9 Ländern", tr: "9 ülkede 2.091 gençle anket", en: "Survey of 2,091 young people in 9 countries", fr: "Enquête auprès de 2 091 jeunes dans 9 pays", nl: "Onderzoek onder 2.091 jongeren in 9 landen" } },
  { name: "Oğuzhan Yazıcı", modul: "auftakt", format: "panel", rolle: alle("CDU") },
  { name: "Hakan Gördü", modul: "auftakt", format: "panel", rolle: alle("SÖZ") },
  { name: "Dr. Fatima Zibouh", modul: "auftakt", format: "panel" },
  { name: "Prof. Murat Erdoğan", modul: "auftakt", format: "panel" },
  { name: "Maryam Pougetoux", modul: "auftakt", format: "panel" },
  { name: "Dunia Khalil", modul: "auftakt", format: "panel" },
  { name: "Emran Feroz", modul: "auftakt", format: "panel" },
  { name: "Melina Borčak", modul: "auftakt", format: "panel" },
  { name: "Dr. Özgür Özvatan", modul: "auftakt", format: "panel" },
  { name: "Rumeysa Yazıcı", modul: "auftakt", format: "panel" },
  { name: "Furkan Kahraman", modul: "auftakt", format: "panel" },
  { name: "Murat Gümüş", modul: "auftakt", format: "schlusswort", rolle: { de: "Generalsekretär des Islamrats", tr: "İslam Konseyi Genel Sekreteri", en: "Secretary General of the Islamrat", fr: "Secrétaire général de l’Islamrat", nl: "Secretaris-generaal van de Islamrat" } },
  { name: "Farid Hafez, Ph.D.", modul: "verfassungen", format: "keynote", rolle: alle("William & Mary, USA") },
  { name: "Dr. Mustafa Cerić", modul: "verfassungen", format: "panel", rolle: { de: "Ehemaliger Reis-ul-Ulema von Bosnien", tr: "Bosna eski Reisü’l-Ulemâsı", en: "Former Reis-ul-Ulema of Bosnia", fr: "Ancien Reis-ul-Ulema de Bosnie", nl: "Voormalig Reis-ul-Ulema van Bosnië" } },
  { name: "Bünyamin Kalem", modul: "verfassungen", format: "panel", rolle: alle("IGMG Jugend") },
  { name: "Büşra Çatal", modul: "verfassungen", format: "panel", rolle: alle("IGMG Frauenjugend") },
  { name: "Jun.-Prof. Dr. Idris Nassery", modul: "verfassungen", format: "laendergruppe", rolle: alle("Universität Paderborn") },
  { name: "Selda Can", modul: "verfassungen", format: "laendergruppe", rolle: { de: "Rechtsanwältin", tr: "Avukat", en: "Lawyer", fr: "Avocate", nl: "Advocaat" } },
  { name: "Mehmet Daimagüler", modul: "verfassungen", format: "gespraech", rolle: { de: "Rechtsanwalt und Autor", tr: "Avukat ve yazar", en: "Lawyer and author", fr: "Avocat et auteur", nl: "Advocaat en auteur" } },
  { name: "Elif Zehra Kandemir", modul: "verfassungen", format: "gespraech", rolle: alle("Perspektif") },
];

// Fotos vom Auftakt [PR], Urheber: Islamrat
export const fotos: { src: string; alt: Record<Sprache, string>; breit?: boolean }[] = [
  { src: "/fotos/yousaf.jpg", breit: true, alt: { de: "Humza Yousaf bei seiner Keynote", tr: "Humza Yousaf açılış konuşmasında", en: "Humza Yousaf giving his keynote", fr: "Humza Yousaf lors de son discours", nl: "Humza Yousaf tijdens zijn keynote" } },
  { src: "/fotos/kesici.jpg", alt: { de: "Burhan Kesici eröffnet die Academy", tr: "Burhan Kesici akademiyi açıyor", en: "Burhan Kesici opening the Academy", fr: "Burhan Kesici ouvre l’Academy", nl: "Burhan Kesici opent de Academy" } },
  { src: "/fotos/panel.jpg", alt: { de: "Panel mit jungen Stimmen", tr: "Genç seslerle panel", en: "Panel with young voices", fr: "Table ronde avec de jeunes voix", nl: "Panel met jonge stemmen" } },
  { src: "/fotos/yousaf-rohe.jpg", breit: true, alt: { de: "Panel mit Humza Yousaf und Prof. Dr. Mathias Rohe", tr: "Humza Yousaf ve Prof. Dr. Mathias Rohe ile panel", en: "Panel with Humza Yousaf and Prof. Dr. Mathias Rohe", fr: "Table ronde avec Humza Yousaf et le Prof. Mathias Rohe", nl: "Panel met Humza Yousaf en prof. dr. Mathias Rohe" } },
  { src: "/fotos/akin.jpg", alt: { de: "Prof. Akın stellt seine Studie vor", tr: "Prof. Akın araştırmasını sunuyor", en: "Prof. Akın presenting his study", fr: "Le Prof. Akın présente son étude", nl: "Prof. Akın presenteert zijn onderzoek" } },
  { src: "/fotos/publikum.jpg", alt: { de: "Publikum beim Auftakt", tr: "Açılışta dinleyiciler", en: "Audience at the launch", fr: "Le public lors du lancement", nl: "Publiek bij de aftrap" } },
];

// Zentrale Inhaltsquelle der Website.
// Jede Angabe stammt aus einer der Primärquellen in ~/SES_ACADEMY/dokumente bzw. ~/SES_ACADEMY/einladungen:
//   [MP]  SES_Academy_Modül Planlaması_3-4Temmuz26.docx (Modulplanung)
//   [AG]  SES Academy Agenda.pdf (Modul Juni 2026)
//   [EG]  Einladung an Dr. Gregor Gysi (21.09.2026)
//   [EP]  Einladung an Ruprecht Polenz (28.09.2026)
//   [WEB] ses.islamrat.de (offizielle Seite) + Presse IGMG/IslamiQ zum Auftakt, Stand 28.09.2026 (fotos/recherche/QUELLEN.md)
// Eingeladene, aber nicht bestätigte Gäste werden bewusst NICHT genannt.

export const site = {
  name: "SES Academy",
  // [WEB]
  langname: "Sosyal ve Siyasal Eğitim Semineri",
  kostenlos: true,
  bewerbungsschluss: "15. Januar 2026",
  claim: "Politische Bildung für junge Muslim:innen in Europa",
  // [EG] [EP]
  facts: {
    teilnehmende: "rund 150",
    alter: "18 bis 30",
    laender: ["Deutschland", "Frankreich", "Österreich"],
    dauer: "zweieinhalb Jahre",
    start: "April 2026",
    ende: "Mai 2028",
  },
  // [EG] wörtlich aus der Zielbeschreibung
  ziel:
    "Jungen Musliminnen und Muslimen die Möglichkeit geben, in Zeiten sich überschlagender politischer, sozialer und wirtschaftlicher Entwicklungen diese Vorgänge gut einordnen zu können – und sie dazu befähigen, sich mitgestaltend einzubringen.",
  traeger: {
    name: "Islamrat für die Bundesrepublik Deutschland",
    partner: "Jugend- und Frauenjugendorganisation der IGMG",
    adresse: ["Colonia-Allee 3", "51067 Köln"],
    hauptstadtbuero: ["Boppstraße 4", "10967 Berlin"],
    telefon: "+49 221 9422402-12",
    email: "ses@islamrat.de",
    web_ses: "https://ses.islamrat.de",
    web: "https://www.islamrat.de",
    instagram: "https://www.instagram.com/islamratbrd/",
  },
};

export type ModulStatus = "abgeschlossen" | "naechstes" | "geplant";

export type Modul = {
  nr: number;
  datum: string;
  jahr: number;
  titel: string;
  art: "Seminar" | "Skills" | "Auftakt" | "Abschluss";
  ort?: string;
  themen: string[];
  status: ModulStatus;
};

// [MP], Titel für November aus [EG]
export const modulplan: Modul[] = [
  {
    nr: 1, jahr: 2026, datum: "11.–12. April 2026", art: "Auftakt", ort: "Köln", status: "abgeschlossen",
    titel: "Identität, Verantwortung und Partizipation",
    themen: ["Jung und muslimisch in Europa"],
  },
  {
    nr: 2, jahr: 2026, datum: "13.–14. Juni 2026", art: "Seminar", ort: "Köln", status: "abgeschlossen",
    titel: "Verfassungen in Europa",
    themen: ["Grundlagen und aktuelle Herausforderungen", "Religionsfreiheit und Grundrechte", "Constitutional Advocacy (Workshop)"],
  },
  {
    nr: 3, jahr: 2026, datum: "12.–13. September 2026", art: "Skills", ort: "Köln", status: "abgeschlossen",
    titel: "Analytisches und kritisches Denken",
    themen: ["Informationsmanagement"],
  },
  {
    nr: 4, jahr: 2026, datum: "14.–15. November 2026", art: "Seminar", ort: "Köln", status: "naechstes",
    titel: "Demokratie in Europa – Formen, Chancen und Belastungsproben",
    themen: ["Demokratie, Gewaltenteilung, Wahlrecht", "Parteien in Europa: rechts, links, Mitte, Populismus", "Politische Systeme im Ländervergleich", "Jugendorganisationen der Parteien"],
  },
  {
    nr: 5, jahr: 2026, datum: "18.–23. Dezember 2026", art: "Seminar", status: "geplant",
    titel: "Winter School: Islam, Partizipation und globale Herausforderungen",
    themen: ["Teilhabe im Islam: Medina-Vertrag bis heute", "Minderheit, Zugehörigkeit, Transnationalität", "Debatte, kritisches Denken, Konfliktmanagement"],
  },
  {
    nr: 6, jahr: 2027, datum: "20.–21. März 2027", art: "Seminar", ort: "Brüssel / Straßburg", status: "geplant",
    titel: "Internationale Beziehungen und globale Politik",
    themen: ["Einführung in die Internationalen Beziehungen", "Außenpolitik der drei Länder im Vergleich"],
  },
  {
    nr: 7, jahr: 2027, datum: "22.–23. Mai 2027", art: "Seminar", status: "geplant",
    titel: "Globale Krisen und Konflikte",
    themen: ["Naher Osten"],
  },
  {
    nr: 8, jahr: 2027, datum: "10.–11. Juli 2027", art: "Skills", status: "geplant",
    titel: "Digitaler Aktivismus",
    themen: ["Presse und Social Media", "Blog, Vlog, Podcast"],
  },
  {
    nr: 9, jahr: 2027, datum: "11.–12. September 2027", art: "Seminar", status: "geplant",
    titel: "Politische Teilhabe und Kommunalpolitik",
    themen: ["Beispiele gelungener Beteiligung", "Politik vor Ort"],
  },
  {
    nr: 10, jahr: 2027, datum: "6.–7. November 2027", art: "Seminar", status: "geplant",
    titel: "Diskriminierung, Rassismus und Populismus",
    themen: ["Leben in pluralen Gesellschaften"],
  },
  {
    nr: 11, jahr: 2027, datum: "23.–30. Dezember 2027", art: "Seminar", status: "geplant",
    titel: "Zukunftsthemen",
    themen: ["Gesundheit, Wirtschaft, Umwelt", "Sozialstaatsmodelle und Kapitalismus", "Künstliche Intelligenz und Ethik", "Networking-Workshop"],
  },
  {
    nr: 12, jahr: 2028, datum: "März 2028", art: "Skills", status: "geplant",
    titel: "Leadership",
    themen: ["Führung und Teamarbeit", "Projektmanagement"],
  },
  {
    nr: 13, jahr: 2028, datum: "Mai 2028", art: "Abschluss", status: "geplant",
    titel: "Abschlussprogramm",
    themen: [],
  },
];

export type Gast = { name: string; rolle: string; modul: number; format?: string };

// Nur tatsächlich aufgetretene Gäste. Modul 1: [EG]/[EP]/[WEB]; Modul 2: [AG]
export const gaeste: Gast[] = [
  { name: "Humza Yousaf", rolle: "Ehemaliger First Minister von Schottland", modul: 1, format: "Keynote" },
  { name: "Prof. Dr. Mathias Rohe", rolle: "Universität Erlangen-Nürnberg", modul: 1, format: "Keynote" },
  { name: "Hubertus Heil", rolle: "Bundesminister a. D.", modul: 1, format: "Grußwort" },
  { name: "Prof. Mahmut Hakkı Akın", rolle: "Studie: 2.091 junge Menschen in 9 Ländern befragt", modul: 1, format: "Studienvorstellung" },
  { name: "Oğuzhan Yazıcı", rolle: "CDU", modul: 1, format: "Panel" },
  { name: "Hakan Gördü", rolle: "SÖZ", modul: 1, format: "Panel" },
  { name: "Maryam Pougetoux", rolle: "", modul: 1, format: "Panel" },
  { name: "Emran Feroz", rolle: "", modul: 1, format: "Panel" },
  { name: "Melina Borčak", rolle: "", modul: 1, format: "Panel" },
  { name: "Dr. Fatima Zibouh", rolle: "", modul: 1, format: "Panel" },
  { name: "Prof. Murat Erdoğan", rolle: "", modul: 1, format: "Panel" },
  { name: "Dr. Özgür Özvatan", rolle: "", modul: 1, format: "Panel" },
  { name: "Farid Hafez, Ph.D.", rolle: "William & Mary, USA", modul: 2, format: "Keynote & Panel" },
  { name: "Dr. Mustafa Cerić", rolle: "Ehemaliger Reis-ul-Ulema von Bosnien", modul: 2, format: "Panel" },
  { name: "Jun.-Prof. Dr. Idris Nassery", rolle: "Universität Paderborn", modul: 2, format: "Ländergruppe Deutschland" },
  { name: "Selda Can", rolle: "Rechtsanwältin", modul: 2, format: "Ländergruppe Frankreich" },
  { name: "Mehmet Daimagüler", rolle: "Rechtsanwalt und Autor", modul: 2, format: "Eğri Doğru" },
  { name: "Elif Zehra Kandemir", rolle: "Perspektif", modul: 2, format: "Eğri Doğru" },
];

// [AG] [EG] [EP]
export const formate = [
  {
    titel: "Keynotes",
    text: "Menschen, die Politik gemacht, erforscht oder erlitten haben, sprechen – und stellen sich danach den Fragen aus dem Saal.",
  },
  {
    titel: "Ländergruppen",
    text: "Deutschland, Frankreich, Österreich: Jedes Thema wird in eigenen Ländergruppen vertieft, begleitet von Wissenschaftler:innen.",
  },
  {
    titel: "Skills-Workshops",
    text: "Rhetorik, digitaler Aktivismus, Leadership. Handwerk, das man braucht, um gehört zu werden.",
  },
  {
    titel: "Eğri Doğru",
    text: "„Eğri oturup doğru konuşalım“ – lass uns offen reden. Der Samstagabend wird bewusst nicht aufgezeichnet: ein geschützter Raum für echte Fragen.",
  },
];

// [WEB] Die fünf Kompetenzfelder der Academy
export const kompetenzen = [
  { name: "Insight", text: "Politik, Recht und Gesellschaft verstehen und einordnen." },
  { name: "Voice", text: "Die eigene Position finden – und hörbar machen." },
  { name: "Connect", text: "Netzwerke knüpfen, über Ländergrenzen hinweg." },
  { name: "Create", text: "Eigene Projekte, Kampagnen und Inhalte entwickeln." },
  { name: "Participate", text: "Mitmachen: in Vereinen, Parteien, Parlamenten, vor Ort." },
];

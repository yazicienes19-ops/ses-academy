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

export type Format = "keynote" | "panel" | "grusswort" | "videobotschaft" | "moderation" | "eroeffnung" | "studie" | "laendergruppe" | "gespraech" | "schlusswort";
export type Gast = { name: string; modul: ModulSlug; format: Format; rolle?: Partial<Record<Sprache, string>> & { de: string } };

const alle = (s: string) => ({ de: s, tr: s, en: s, fr: s, nl: s });

// Nur tatsächlich aufgetretene Gäste. Auftakt: [PR] + [EG]; Juni: [AG] + Instagram-Stories; September: Instagram-Stories
export const gaeste: Gast[] = [
  { name: "Burhan Kesici", modul: "auftakt", format: "eroeffnung", rolle: { de: "Vorsitzender des Islamrats", tr: "İslam Konseyi Başkanı", en: "Chairman of the Islamrat", fr: "Président de l’Islamrat", nl: "Voorzitter van de Islamrat" } },
  { name: "Kemal Ergün", modul: "auftakt", format: "grusswort" },
  { name: "Humza Yousaf", modul: "auftakt", format: "keynote", rolle: { de: "Ehemaliger First Minister von Schottland", tr: "İskoçya eski Başbakanı", en: "Former First Minister of Scotland", fr: "Ancien Premier ministre d’Écosse", nl: "Voormalig premier van Schotland" } },
  { name: "Prof. Dr. Mathias Rohe", modul: "auftakt", format: "keynote", rolle: alle("Universität Erlangen-Nürnberg") },
  { name: "Hubertus Heil", modul: "auftakt", format: "videobotschaft", rolle: { de: "Bundesminister a. D.", tr: "Eski Federal Bakan", en: "Former Federal Minister", fr: "Ancien ministre fédéral", nl: "Voormalig federaal minister" } },
  { name: "Prof. Jocelyne Cesari", modul: "auftakt", format: "videobotschaft" },
  { name: "Prof. Mahmut Hakkı Akın", modul: "auftakt", format: "studie", rolle: alle("Istanbul Medeniyet University") },
  { name: "Furkan Kahraman", modul: "auftakt", format: "panel", rolle: { de: "Vorsitzender der IGMG-Jugend", tr: "IGMG Gençlik Teşkilatı Başkanı", en: "Chairman of IGMG Youth", fr: "Président de la jeunesse de la CIMG", nl: "Voorzitter IGMG Jongeren" } },
  { name: "Dr. Fatima Zibouh", modul: "auftakt", format: "panel", rolle: alle("Université de Liège") },
  { name: "Prof. Murat Erdoğan", modul: "auftakt", format: "panel", rolle: alle("Ankara University") },
  { name: "Maryam Pougetoux", modul: "auftakt", format: "panel", rolle: { de: "Ehem. Vizepräsidentin der UNEF", tr: "UNEF eski başkan yardımcısı", en: "Former Vice-President of UNEF", fr: "Ancienne vice-présidente de l’UNEF", nl: "Voormalig vicevoorzitter van UNEF" } },
  { name: "Dunia Khalil", modul: "auftakt", format: "panel", rolle: alle("Documentation Centre on Anti-Muslim Racism & Islamophobia") },
  { name: "Emran Feroz", modul: "auftakt", format: "panel" },
  { name: "Melina Borčak", modul: "auftakt", format: "panel" },
  { name: "Dr. Özgür Özvatan", modul: "auftakt", format: "panel" },
  { name: "Oğuzhan Yazıcı", modul: "auftakt", format: "panel", rolle: alle("CDU") },
  { name: "Hakan Gördü", modul: "auftakt", format: "panel", rolle: alle("SÖZ") },
  { name: "Rumeysa Yazıcı", modul: "auftakt", format: "panel" },
  { name: "Hande Taner", modul: "auftakt", format: "moderation", rolle: alle("FEMYSO Board of Advisors") },
  { name: "Furkan Kökcan", modul: "auftakt", format: "moderation" },
  { name: "Murat Gümüş", modul: "auftakt", format: "schlusswort", rolle: { de: "Generalsekretär des Islamrats", tr: "İslam Konseyi Genel Sekreteri", en: "Secretary General of the Islamrat", fr: "Secrétaire général de l’Islamrat", nl: "Secretaris-generaal van de Islamrat" } },
  { name: "Burhan Kesici", modul: "verfassungen", format: "eroeffnung", rolle: { de: "Vorsitzender des Islamrats", tr: "İslam Konseyi Başkanı", en: "Chairman of the Islamrat", fr: "Président de l’Islamrat", nl: "Voorzitter van de Islamrat" } },
  { name: "Farid Hafez, Ph.D.", modul: "verfassungen", format: "keynote", rolle: alle("William & Mary, USA") },
  { name: "Dr. Mustafa Cerić", modul: "verfassungen", format: "panel", rolle: { de: "Ehemaliger Reis-ul-Ulema von Bosnien", tr: "Bosna eski Reisü’l-Ulemâsı", en: "Former Reis-ul-Ulema of Bosnia", fr: "Ancien Reis-ul-Ulema de Bosnie", nl: "Voormalig Reis-ul-Ulema van Bosnië" } },
  { name: "Bünyamin Kalem", modul: "verfassungen", format: "panel", rolle: alle("IGMG Jugend") },
  { name: "Büşra Çatal", modul: "verfassungen", format: "panel", rolle: alle("IGMG Frauenjugend") },
  { name: "Jun.-Prof. Dr. Idris Nassery", modul: "verfassungen", format: "laendergruppe", rolle: alle("Universität Paderborn") },
  { name: "Selda Can", modul: "verfassungen", format: "laendergruppe", rolle: { de: "Rechtsanwältin", tr: "Avukat", en: "Lawyer", fr: "Avocate", nl: "Advocaat" } },
  { name: "Mehmet Daimagüler", modul: "verfassungen", format: "gespraech", rolle: { de: "Rechtsanwalt und Autor", tr: "Avukat ve yazar", en: "Lawyer and author", fr: "Avocat et auteur", nl: "Advocaat en auteur" } },
  { name: "Elif Zehra Kandemir", modul: "verfassungen", format: "gespraech", rolle: alle("Perspektif") },
  { name: "Burhan Kesici", modul: "skills-workshop", format: "eroeffnung", rolle: { de: "Vorsitzender des Islamrats", tr: "İslam Konseyi Başkanı", en: "Chairman of the Islamrat", fr: "Président de l’Islamrat", nl: "Voorzitter van de Islamrat" } },
  { name: "Zehra Karataş", modul: "skills-workshop", format: "eroeffnung", rolle: { de: "Vorsitzende der IGMG-Frauenjugend", tr: "IGMG Kadın Gençlik Teşkilatı Başkanı", en: "Chair of IGMG Women’s Youth", fr: "Présidente de la jeunesse féminine de la CIMG", nl: "Voorzitter IGMG Vrouwenjongeren" } },
];

// Fotos je Modul; Auftakt [PR], Urheber: Islamrat
export type Foto = { src: string; alt: Record<Sprache, string>; breit?: boolean };

const fotosAuftakt: Foto[] = [
  { src: "/fotos/yousaf.jpg", breit: true, alt: { de: "Humza Yousaf bei seiner Keynote", tr: "Humza Yousaf açılış konuşmasında", en: "Humza Yousaf giving his keynote", fr: "Humza Yousaf lors de son discours", nl: "Humza Yousaf tijdens zijn keynote" } },
  { src: "/fotos/kesici.jpg", alt: { de: "Burhan Kesici eröffnet die Academy", tr: "Burhan Kesici akademiyi açıyor", en: "Burhan Kesici opening the Academy", fr: "Burhan Kesici ouvre l’Academy", nl: "Burhan Kesici opent de Academy" } },
  { src: "/fotos/akin.jpg", alt: { de: "Prof. Akın stellt seine Studie vor", tr: "Prof. Akın araştırmasını sunuyor", en: "Prof. Akın presenting his study", fr: "Le Prof. Akın présente son étude", nl: "Prof. Akın presenteert zijn onderzoek" } },
  { src: "/fotos/yousaf-rohe.jpg", breit: true, alt: { de: "Panel mit Humza Yousaf, Prof. Dr. Mathias Rohe und Moderatorin Hande Taner", tr: "Humza Yousaf, Prof. Dr. Mathias Rohe ve moderatör Hande Taner ile panel", en: "Panel with Humza Yousaf, Prof. Dr. Mathias Rohe and moderator Hande Taner", fr: "Table ronde avec Humza Yousaf, le Prof. Mathias Rohe et la modératrice Hande Taner", nl: "Panel met Humza Yousaf, prof. dr. Mathias Rohe en moderator Hande Taner" } },
  { src: "/fotos/panel-teilhabe.jpg", alt: { de: "Panel „Patterns of Political & Social Involvement“", tr: "„Patterns of Political & Social Involvement“ paneli", en: "Panel “Patterns of Political & Social Involvement”", fr: "Table ronde « Patterns of Political & Social Involvement »", nl: "Panel ‘Patterns of Political & Social Involvement’" } },
  { src: "/fotos/panel-lebensrealitaeten.jpg", alt: { de: "Panel „Muslim Youth in Europe – Lived Realities and Perspectives“", tr: "„Muslim Youth in Europe – Lived Realities and Perspectives“ paneli", en: "Panel “Muslim Youth in Europe – Lived Realities and Perspectives”", fr: "Table ronde « Muslim Youth in Europe – Lived Realities and Perspectives »", nl: "Panel ‘Muslim Youth in Europe – Lived Realities and Perspectives’" } },
  { src: "/fotos/saal.jpg", breit: true, alt: { de: "Rund 200 Teilnehmende im Saal", tr: "Salonda yaklaşık 200 katılımcı", en: "Around 200 participants in the hall", fr: "Environ 200 participant·e·s dans la salle", nl: "Ongeveer 200 deelnemers in de zaal" } },
  { src: "/fotos/panel.jpg", alt: { de: "Panel mit jungen Stimmen", tr: "Genç seslerle panel", en: "Panel with young voices", fr: "Table ronde avec de jeunes voix", nl: "Panel met jonge stemmen" } },
  { src: "/fotos/publikum.jpg", alt: { de: "Publikum beim Auftakt", tr: "Açılışta dinleyiciler", en: "Audience at the launch", fr: "Le public lors du lancement", nl: "Publiek bij de aftrap" } },
];

// Juni und September: Ausschnitte aus den offiziellen Story-Grafiken von @islamratbrd (Highlight „SES Academy“)
const fotosJuni: Foto[] = [
  { src: "/fotos/juni-hafez-keynote.jpg", breit: true, alt: {"de": "Farid Hafez bei seiner Keynote zu Verfassungen in Europa", "tr": "Farid Hafez Avrupa anayasaları üzerine ana konuşmasında", "en": "Farid Hafez giving his keynote on constitutions in Europe", "fr": "Farid Hafez lors de son discours sur les constitutions en Europe", "nl": "Farid Hafez tijdens zijn keynote over grondwetten in Europa"} },
  { src: "/fotos/juni-kesici.jpg", alt: {"de": "Burhan Kesici eröffnet das Modul", "tr": "Burhan Kesici modülü açıyor", "en": "Burhan Kesici opening the module", "fr": "Burhan Kesici ouvre le module", "nl": "Burhan Kesici opent de module"} },
  { src: "/fotos/juni-panel-ceric-catal.jpg", alt: {"de": "Panel mit Büşra Çatal und Dr. Mustafa Cerić", "tr": "Büşra Çatal ve Dr. Mustafa Cerić ile panel", "en": "Panel with Büşra Çatal and Dr. Mustafa Cerić", "fr": "Table ronde avec Büşra Çatal et le Dr Mustafa Cerić", "nl": "Panel met Büşra Çatal en dr. Mustafa Cerić"} },
  { src: "/fotos/juni-publikum-a.jpg", breit: true, alt: {"de": "Teilnehmende an den Tischreihen", "tr": "Masalarda katılımcılar", "en": "Participants at the tables", "fr": "Participant·e·s aux tables", "nl": "Deelnemers aan de tafels"} },
  { src: "/fotos/juni-panel-hafez-kalem.jpg", alt: {"de": "Panel mit Farid Hafez und Bünyamin Kalem", "tr": "Farid Hafez ve Bünyamin Kalem ile panel", "en": "Panel with Farid Hafez and Bünyamin Kalem", "fr": "Table ronde avec Farid Hafez et Bünyamin Kalem", "nl": "Panel met Farid Hafez en Bünyamin Kalem"} },
  { src: "/fotos/juni-ceric.jpg", alt: {"de": "Dr. Mustafa Cerić im Gespräch", "tr": "Dr. Mustafa Cerić söyleşide", "en": "Dr. Mustafa Cerić in conversation", "fr": "Le Dr Mustafa Cerić en discussion", "nl": "Dr. Mustafa Cerić in gesprek"} },
  { src: "/fotos/juni-podium.jpg", alt: {"de": "Moderation am Rednerpult", "tr": "Kürsüde moderasyon", "en": "Moderation at the lectern", "fr": "Modération au pupitre", "nl": "Moderatie achter het spreekgestoelte"} },
  { src: "/fotos/juni-publikum-b.jpg", alt: {"de": "Blick in den Saal", "tr": "Salondan bir görüntü", "en": "View of the hall", "fr": "Vue de la salle", "nl": "Blik in de zaal"} },
];

const fotosSeptember: Foto[] = [
  { src: "/fotos/sept-karatas.jpg", breit: true, alt: {"de": "Zehra Karataş, Vorsitzende der IGMG-Frauenjugend, bei ihrem Grußwort", "tr": "IGMG Kadın Gençlik Teşkilatı Başkanı Zehra Karataş konuşmasında", "en": "Zehra Karataş, chair of IGMG Women’s Youth, giving her opening remarks", "fr": "Zehra Karataş, présidente de la jeunesse féminine de la CIMG, lors de son allocution", "nl": "Zehra Karataş, voorzitter van IGMG Vrouwenjongeren, tijdens haar openingswoord"} },
  { src: "/fotos/sept-kesici.jpg", alt: {"de": "Burhan Kesici eröffnet den Skills Workshop", "tr": "Burhan Kesici beceri atölyesini açıyor", "en": "Burhan Kesici opening the skills workshop", "fr": "Burhan Kesici ouvre l’atelier", "nl": "Burhan Kesici opent de workshop"} },
  { src: "/fotos/sept-workshop-trainer.jpg", alt: {"de": "Der Trainer im Workshop", "tr": "Atölyede eğitmen", "en": "The trainer in the workshop", "fr": "Le formateur pendant l’atelier", "nl": "De trainer tijdens de workshop"} },
  { src: "/fotos/sept-workshop-a.jpg", breit: true, alt: {"de": "Gruppenarbeit im Workshop", "tr": "Atölyede grup çalışması", "en": "Group work in the workshop", "fr": "Travail en groupe pendant l’atelier", "nl": "Groepswerk in de workshop"} },
  { src: "/fotos/sept-workshop-c.jpg", alt: {"de": "Austausch in der Kleingruppe", "tr": "Küçük grupta fikir alışverişi", "en": "Exchange in a small group", "fr": "Échange en petit groupe", "nl": "Uitwisseling in een kleine groep"} },
  { src: "/fotos/sept-eroeffnung.jpg", alt: {"de": "Eröffnung vor dem Plenum", "tr": "Genel oturumda açılış", "en": "Opening in the plenary", "fr": "Ouverture en plénière", "nl": "Opening in de plenaire zaal"} },
  { src: "/fotos/sept-workshop-d.jpg", alt: {"de": "Teilnehmende im Workshop-Raum", "tr": "Atölye salonunda katılımcılar", "en": "Participants in the workshop room", "fr": "Participant·e·s dans la salle d’atelier", "nl": "Deelnemers in de workshopruimte"} },
  { src: "/fotos/sept-workshop-e.jpg", alt: {"de": "Konzentriertes Zuhören", "tr": "Dikkatle dinleyen katılımcılar", "en": "Listening closely", "fr": "Écoute attentive", "nl": "Aandachtig luisteren"} },
];

export const fotos: Partial<Record<ModulSlug, Foto[]>> = {
  auftakt: fotosAuftakt,
  verfassungen: fotosJuni,
  "skills-workshop": fotosSeptember,
};

import Link from "next/link";
import { ArrowLeft, Calendar, Tag, Share2 } from "lucide-react";

interface NewsArticle {
  title: string;
  date: string;
  category: string;
  content: string[];
}

const newsData: Record<string, NewsArticle> = {
  "launch": {
    title: "SES Academy erfolgreich gestartet",
    date: "12. April 2026",
    category: "Modul-Bericht",
    content: [
      "Die Auftaktveranstaltung der SES Academy fand am 11.-12. April 2026 in Köln statt. Rund 150 junge Muslime aus Deutschland, Frankreich und Österreich versammelten sich zum Auftakt des zweijährigen Bildungsprogramms.",
      "Die Eröffnung wurde von zwei internationalen Keynotes markiert: Humza Yousaf, der ehemalige First Minister of Scotland, teilte seine Erfahrungen als Muslim in der europäischen Politik. Prof. Dr. Mathias Rohe von der Universität Erlangen-Nürnberg gab akademische Einblicke in die Beziehung zwischen Islam und Demokratie.",
      "Der ehemalige Bundesminister Hubertus Heil schickte eine Videobotschaft und begrüßte die Initiative. Die Teilnehmer*innen waren begeistert vom Auftakt des Programms."
    ]
  },
  "modul-2": {
    title: "Modul 2: Verfassungen in Europa",
    date: "15. Juni 2026",
    category: "Modul-Bericht",
    content: [
      "Das zweite Modul widmete sich den Verfassungen europäischer Staaten. Die Teilnehmer*innen verglichen die verfassungsrechtlichen Grundlagen verschiedener Länder.",
      "Prof. Dr. Klaus Schubert erläuterte die theoretischen Hintergründe und regte zu lebhaften Diskussionen an."
    ]
  },
  "skills-workshop": {
    title: "Skills Workshop stärkt Kompetenzen",
    date: "15. September 2026",
    category: "Modul-Bericht",
    content: [
      "Der dritte Workshop konzentrierte sich auf analytische Fähigkeiten, kritisches Denken und Informationsmanagement.",
      "In praktischen Übungen analysierten die Teilnehmer*innen aktuelle Nachrichtenartikel und erkannten Manipulationstechniken."
    ]
  },
  "gysi-keynote": {
    title: "Dr. Gregor Gysi spricht auf der SES Academy",
    date: "14. November 2026",
    category: "Ankündigung",
    content: [
      "Dr. Gregor Gysi, Mitglied des Deutschen Bundestages, wird als Keynote-Redner zum vierten Modul am 14. November 2026 in Köln erwartet.",
      "Das Modul trägt den Titel 'Demokratie in Europa – Formen, Chancen und Belastungsproben'. Dr. Gysi wird seine Sicht zur Lage der europäischen Demokratien teilen."
    ]
  },
};

export function generateStaticParams() { return Object.keys(newsData).map((slug) => ({ slug })); }

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = newsData[slug];
  if (!article) return (
    <section className="pt-36 pb-32 bg-white text-center">
      <h1 className="text-2xl font-bold mb-4">Artikel nicht gefunden</h1>
      <Link href="/aktuelles" className="text-ses-green hover:underline">Zurück</Link>
    </section>
  );

  return (
    <>
      <section className="pt-36 pb-12 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <Link href="/aktuelles" className="inline-flex items-center gap-2 text-ses-green hover:underline mb-8 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Aktuelles
          </Link>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1 text-muted">
              <Calendar className="w-4 h-4" />
              {article.date}
            </div>
            <div className="flex items-center gap-1 text-ses-green">
              <Tag className="w-4 h-4" />
              {article.category}
            </div>
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-bold text-foreground mb-8 leading-tight">{article.title}</h1>
        </div>
      </section>

      <section className="pb-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          <div className="space-y-6">
            {article.content.map((p: string, i: number) => (
              <p key={i} className="text-muted leading-relaxed text-lg">{p}</p>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
            <Link href="/aktuelles" className="text-ses-green hover:underline text-sm">← Zurück zu allen Artikeln</Link>
            <button className="flex items-center gap-2 text-sm text-muted hover:text-ses-green transition-colors">
              <Share2 className="w-4 h-4" />
              Teilen
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

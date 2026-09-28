import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ArrowRight, Tag } from "lucide-react";

export const metadata: Metadata = { title: "Aktuelles", description: "Neuigkeiten und Berichte aus der SES Academy." };

const news = [
  { id: 1, title: "SES Academy erfolgreich gestartet mit internationalen Keynotes", date: "12. April 2026", category: "Modul-Bericht", excerpt: "Die Auftaktveranstaltung der SES Academy fand in Köln statt. Rund 150 junge Muslime aus drei Ländern starteten in das Programm.", slug: "launch" },
  { id: 2, title: "Modul 2: Verfassungen in Europa vertieft behandelt", date: "15. Juni 2026", category: "Modul-Bericht", excerpt: "Im zweiten Modul haben sich die Teilnehmer*innen intensiv mit den Verfassungen europäischer Staaten befasst.", slug: "modul-2" },
  { id: 3, title: "Skills Workshop stärkt analytische Kompetenzen", date: "15. September 2026", category: "Modul-Bericht", excerpt: "Der dritte Workshop konzentrierte sich auf analytische Fähigkeiten und kritisches Denken.", slug: "skills-workshop" },
  { id: 4, title: "Dr. Gregor Gysi spricht auf der SES Academy", date: "14. November 2026", category: "Ankündigung", excerpt: "Dr. Gregor Gysi wird als Keynote-Redner zum Modul 'Demokratie in Europa' erwartet.", slug: "gysi-keynote" },
];

export default function AktuellesPage() {
  return (
    <>
      <section className="pt-36 pb-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="ses-eyebrow mb-4">Neuigkeiten</div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground mb-6">Aktuelles</h1>
            <p className="text-lg text-muted leading-relaxed">Neuigkeiten, Einblicke und Berichte aus der SES Academy.</p>
          </div>
        </div>
      </section>

      <section className="pb-24 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 gap-5">
          {news.map((article) => (
            <article key={article.id} className="bg-white rounded-xl border border-border overflow-hidden hover:border-ses-green-muted hover:shadow-md transition-all duration-200">
              <div className="h-40 bg-gradient-to-br from-ses-green-light to-ses-green-50 flex items-center justify-center relative">
                <span className="font-[family-name:var(--font-playfair)] text-ses-green/25 text-6xl font-bold">{article.id}</span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3 text-sm">
                  <div className="flex items-center gap-1 text-muted">
                    <Calendar className="w-4 h-4" />
                    {article.date}
                  </div>
                  <div className="flex items-center gap-1 text-ses-green">
                    <Tag className="w-4 h-4" />
                    {article.category}
                  </div>
                </div>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-foreground mb-3">{article.title}</h2>
                <p className="text-muted text-sm leading-relaxed mb-4">{article.excerpt}</p>
                <Link href={`/aktuelles/${article.slug}`} className="inline-flex items-center gap-2 text-ses-green font-medium text-sm hover:gap-3 transition-all duration-200">
                  Weiterlesen
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

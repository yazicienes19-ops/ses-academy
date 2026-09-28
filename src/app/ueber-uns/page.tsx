import type { Metadata } from "next";
import { Target, Users, Globe, BookOpen, Handshake } from "lucide-react";

export const metadata: Metadata = { title: "Über die SES Academy", description: "Erfahren Sie mehr über Mission, Vision und Ziele der SES Academy." };

const goals = [
  { icon: Target, title: "Mission", description: "Politisch interessierte muslimische Jugendliche in Europa fördern und ihre gesellschaftliche Teilhabe stärken." },
  { icon: Users, title: "Zielgruppe", description: "Junge Muslime zwischen 18 und 30 Jahren, die ihre Rolle in der Gesellschaft aktiv mitgestalten möchten." },
  { icon: Globe, title: "Europäisch", description: "Teilnehmer aus Deutschland, Frankreich und Österreich lernen zusammen." },
  { icon: BookOpen, title: "Bildungsprogramm", description: "Über zwei Jahre hinweg finden Seminare an Wochenenden statt." },
  { icon: Handshake, title: "Träger", description: "Ein Projekt des Islamrats für die BRD in Kooperation mit den IGMG-Jugendorganisationen." },
];

const timeline = [
  { date: "April 2026", event: "Auftaktveranstaltung in Köln mit Humza Yousaf und Prof. Dr. Mathias Rohe" },
  { date: "Juni 2026", event: "Modul: Verfassungen in Europa" },
  { date: "September 2026", event: "Skills Workshop: Analyse und kritisches Denken" },
  { date: "November 2026", event: "Modul: Demokratie in Europa (Keynote: Dr. Gregor Gysi)" },
  { date: "2027–2028", event: "Weitere Module, Winter- und Sommercamps" },
  { date: "Juni 2028", event: "Abschlussveranstaltung" },
];

export default function UeberUnsPage() {
  return (
    <>
      <section className="pt-36 pb-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="ses-eyebrow mb-4">Über uns</div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">Politische Bildung für junge Muslime in Europa</h1>
            <p className="text-lg text-muted leading-relaxed">Die SES Academy (Sosyal ve Siyasal Eğitim Semineri) ist ein zweijähriges Bildungsprogramm, das jungen Muslimen in Europa hilft, ein politisches Bewusstsein zu entwickeln und sich sozial zu engagieren.</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => (
            <div key={goal.title} className="bg-white p-8 rounded-xl border border-border hover:border-ses-green-muted hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-ses-green-light rounded-xl flex items-center justify-center mb-6">
                <goal.icon className="w-6 h-6 text-ses-green" />
              </div>
              <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-foreground mb-3">{goal.title}</h3>
              <p className="text-muted leading-relaxed text-sm">{goal.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="mb-16">
              <div className="ses-eyebrow mb-4">Zeitstrahl</div>
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground">Unsere Reise</h2>
            </div>
            <div className="relative">
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-12">
                {timeline.map((item, index) => (
                  <div key={item.date} className={`relative flex items-start gap-8 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                    <div className={`absolute left-4 md:left-1/2 w-4 h-4 rounded-full -translate-x-1/2 mt-1 ${index % 2 === 0 ? "bg-ses-green" : "bg-gold"}`} />
                    <div className={`flex-grow ml-12 md:ml-0 ${index % 2 === 0 ? "md:text-right md:pr-12" : "md:text-left md:pl-12"}`}>
                      <div className="ses-badge ses-badge-green inline-block mb-2">{item.date}</div>
                      <p className="text-muted">{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { Calendar, MapPin, ArrowLeft, Users, Send, Clock } from "lucide-react";

interface Speaker {
  name: string;
  role: string;
  bio: string;
}

interface ScheduleItem {
  time: string;
  activity: string;
}

interface ModuleData {
  number: number;
  title: string;
  date: string;
  location: string;
  status: string;
  description: string;
  details: string;
  speakers: Speaker[];
  schedule: ScheduleItem[];
}

const modulesData: Record<string, ModuleData> = {
  "4": {
    number: 4,
    title: "Demokratie in Europa – Formen, Chancen und Belastungsproben",
    date: "14.–15. November 2026",
    location: "Köln",
    status: "upcoming",
    description: "Demokratie ist nicht überall gleich – aber überall herausgefordert. Es geht um unterschiedliche demokratische Modelle in Europa, um Themen wie Populismus, Vertrauensverlust in Institutionen und politische Teilhabe.",
    details: "Das vierte Modul der SES Academy widmet sich der Frage, wie Demokratie in Europa funktioniert – und wo sie unter Druck gerät. Die Teilnehmer*innen werden verschiedene demokratische Modelle kennenlernen, sich mit aktuellen Herausforderungen auseinandersetzen und diskutieren, wie Demokratie auch in zwanzig Jahren noch als überzeugendes Versprechen funktionieren kann.\n\nIm Mittelpunkt stehen Themen wie Populismus, Vertrauensverlust in politische Institutionen, politische Teilhabe von Minderheiten und die Zukunft der Demokratie in einer sich wandelnden Gesellschaft.",
    speakers: [
      { name: "Dr. Gregor Gysi", role: "Keynote-Redner", bio: "Dr. Gregor Gysi ist Mitglied des Deutschen Bundestages und einer der bekanntesten deutschen Politiker." },
      { name: "Prof. Dr. Klaus Schubert", role: "Leiter Ländergruppe Deutschland", bio: "Prof. Dr. Klaus Schubert ist Politikwissenschaftler an der Universität Münster." },
    ],
    schedule: [
      { time: "09:00", activity: "Empfang & Kaffee" },
      { time: "09:30", activity: "Eröffnung und Einführung" },
      { time: "10:00", activity: "Keynote: Dr. Gregor Gysi" },
      { time: "11:00", activity: "Moderierte Fragerunde" },
      { time: "12:00", activity: "Mittagspause" },
      { time: "13:30", activity: "Workshop: Demokratische Modelle im Vergleich" },
      { time: "15:00", activity: "Ländergruppen-Arbeit" },
      { time: "16:30", activity: "Plenumsdiskussion" },
    ],
  },
};

export function generateStaticParams() { return Object.keys(modulesData).map((slug) => ({ slug })); }

export default async function ModulDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const modul = modulesData[slug];
  if (!modul) return (
    <section className="pt-36 pb-32 bg-white text-center">
      <h1 className="text-2xl font-bold mb-4">Modul nicht gefunden</h1>
      <Link href="/module" className="text-ses-green hover:underline">Zurück</Link>
    </section>
  );

  return (
    <>
      <section className="pt-36 pb-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <Link href="/module" className="inline-flex items-center gap-2 text-ses-green hover:underline mb-8 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Zurück zu allen Modulen
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-ses-green text-white">
              {modul.number}
            </div>
            <span className="ses-badge bg-ses-green text-white">Nächstes Modul</span>
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">{modul.title}</h1>
          <div className="flex flex-wrap gap-6 text-muted text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ses-green" />
              {modul.date}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-ses-green" />
              {modul.location}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground mb-4">Über dieses Modul</h2>
                <div className="text-muted leading-relaxed space-y-4">
                  {modul.details.split("\n\n").map((p: string, i: number) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground mb-6">Ablauf</h2>
                <div className="space-y-2">
                  {modul.schedule.map((item: ScheduleItem, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-ses-green-muted transition-colors duration-200">
                      <span className="flex items-center gap-2 text-sm font-mono text-ses-green font-medium w-16 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {item.time}
                      </span>
                      <span className="text-foreground-secondary text-sm">{item.activity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-ses-green" />
                  Referent*innen
                </h3>
                <div className="space-y-4">
                  {modul.speakers.map((speaker: Speaker) => (
                    <div key={speaker.name} className="pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="font-medium text-foreground">{speaker.name}</div>
                      <div className="text-sm text-ses-green mb-1">{speaker.role}</div>
                      <div className="text-sm text-muted">{speaker.bio}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-ses-green-dark p-6 rounded-xl text-white relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-ses-green-muted/20 rounded-full blur-xl" />
                <h3 className="font-semibold mb-2 relative">Anmeldung</h3>
                <p className="text-white/70 text-sm mb-4 relative">Sichern Sie sich Ihren Platz für dieses Modul.</p>
                <Link href="/bewerbung" className="relative inline-flex items-center gap-2 px-6 py-3 bg-white text-ses-green font-semibold rounded-lg hover:bg-ses-green-light transition-colors w-full justify-center">
                  <Send className="w-4 h-4" />
                  Jetzt anmelden
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

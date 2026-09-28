import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight, CheckCircle, Clock, Send } from "lucide-react";

export const metadata: Metadata = { title: "Module & Termine", description: "Alle Module und Termine der SES Academy." };

const modules = [
  { number: 1, title: "Identity, Responsibility & Participation", date: "11.–12. April 2026", location: "Köln", status: "completed" as const, speakers: ["Humza Yousaf", "Prof. Dr. Mathias Rohe"] },
  { number: 2, title: "Constitutions in Europe", date: "13.–14. Juni 2026", location: "Köln", status: "completed" as const, speakers: ["Prof. Dr. Klaus Schubert"] },
  { number: 3, title: "Skills Workshop – Analysis & Critical Thinking", date: "12.–13. September 2026", location: "Köln", status: "completed" as const, speakers: [] },
  { number: 4, title: "Demokratie in Europa – Formen, Chancen und Belastungsproben", date: "14.–15. November 2026", location: "Köln", status: "upcoming" as const, speakers: ["Dr. Gregor Gysi"] },
  { number: 5, title: "Economy, Environment & Digitalisation", date: "März 2027", location: "Köln", status: "planned" as const, speakers: [] },
  { number: 6, title: "International Organisations – UN & EU", date: "Mai 2027", location: "Brüssel", status: "planned" as const, speakers: [] },
  { number: 7, title: "Religious & Cultural Diversity", date: "September 2027", location: "Paris", status: "planned" as const, speakers: [] },
  { number: 8, title: "Media & Public Discourse", date: "November 2027", location: "Wien", status: "planned" as const, speakers: [] },
  { number: 9, title: "Winter Camp", date: "Dezember 2027", location: "TBD", status: "planned" as const, speakers: [] },
  { number: 10, title: "Summer Camp & Abschluss", date: "Juni 2028", location: "Köln", status: "planned" as const, speakers: [] },
];

const statusConfig = {
  completed: { label: "Stattgefunden", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  upcoming: { label: "Nächstes Modul", icon: Send, color: "bg-ses-green text-white" },
  planned: { label: "Geplant", icon: Clock, color: "bg-gray-100 text-gray-600" },
};

export default function ModulePage() {
  return (
    <>
      <section className="pt-36 pb-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="ses-eyebrow mb-4">Programm</div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground mb-6">Module & Termine</h1>
            <p className="text-lg text-muted leading-relaxed">Zwei Jahre. Zehn Module. Jedes Wochenende ein Schritt.</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl relative">
            <div className="absolute left-[27px] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {modules.map((module) => {
                const status = statusConfig[module.status];
                return (
                  <div key={module.number} className="relative flex gap-8">
                    <div className="relative z-10 flex-shrink-0">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm border-4 border-gray-50 ${
                        module.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : module.status === "upcoming"
                            ? "bg-ses-green text-white ring-4 ring-ses-green/20"
                            : "bg-white text-gray-500 border-gray-200"
                      }`}>
                        {module.number}
                      </div>
                    </div>

                    <div className="flex-grow pb-4">
                      <div className="bg-white rounded-xl p-6 border border-border hover:border-ses-green-muted hover:shadow-md transition-all duration-200">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-foreground">{module.title}</h3>
                          <span className={`ses-badge ${status.color}`}>
                            <status.icon className="w-3 h-3 mr-1" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-ses-green" />
                            {module.date}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-ses-green" />
                            {module.location}
                          </div>
                        </div>
                        {module.speakers.length > 0 && (
                          <p className="text-sm text-muted mb-2">
                            <span className="font-medium text-muted-strong">Referenten: </span>
                            {module.speakers.join(", ")}
                          </p>
                        )}
                        {module.status === "upcoming" && (
                          <Link
                            href={`/module/${module.number}`}
                            className="inline-flex items-center gap-2 text-ses-green font-medium text-sm hover:gap-3 transition-all duration-200 mt-3"
                          >
                            Details & Anmeldung
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft, Users, Download } from "lucide-react";

const results = [
  { question: "Wie zufrieden waren Sie mit dem letzten Modul?", data: [{ label: "1", value: 2 }, { label: "2", value: 5 }, { label: "3", value: 18 }, { label: "4", value: 35 }, { label: "5", value: 27 }], total: 87 },
  { question: "Qualität der Referent*innen", data: [{ label: "Sehr gut", value: 42 }, { label: "Gut", value: 31 }, { label: "Befriedigend", value: 10 }, { label: "Ausreichend", value: 3 }, { label: "Mangelhaft", value: 1 }], total: 87 },
  { question: "Gewünschte Themen", data: [{ label: "Klimawandel", value: 45 }, { label: "Digitalisierung", value: 52 }, { label: "Menschenrechte", value: 68 }, { label: "Bildung", value: 41 }, { label: "Integration", value: 57 }], total: 87 },
];

export default function UmfrageErgebnissePage() {
  return (
    <>
      <section className="pt-36 pb-12 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <Link href="/umfragen" className="inline-flex items-center gap-2 text-ses-green hover:underline mb-8 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground mb-2">Ergebnisse: Zufriedenheit mit Modul 3</h1>
          <div className="flex items-center gap-4 text-sm text-muted">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              87 Teilnehmer*innen
            </div>
            <span>Beendet am 30. September 2026</span>
          </div>
        </div>
      </section>

      <section className="pb-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 space-y-6">
          {results.map((r, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-border">
              <h2 className="font-semibold text-foreground mb-6">{r.question}</h2>
              <div className="space-y-4">
                {r.data.map((item) => {
                  const pct = Math.round((item.value / r.total) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted">{item.label}</span>
                        <span className="font-medium text-foreground">{item.value} ({pct}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-ses-green to-ses-green-muted rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex justify-center pt-4">
            <button className="ses-button ses-button-outline">
              <Download className="w-4 h-4" />
              Als PDF herunterladen
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

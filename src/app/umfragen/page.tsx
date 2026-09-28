import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Users, Clock, CheckCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Umfragen & Meinungen", description: "Ihre Stimme zählt. Nehmen Sie an unseren Umfragen teil." };

const activeSurveys = [
  { id: 1, title: "Zufriedenheit mit Modul 3", description: "Wie bewerten Sie den letzten Skills Workshop?", participants: 87, endsAt: "30. September 2026" },
  { id: 2, title: "Themenwunsch für Wintercamp 2027", description: "Welche Themen sollten auf dem Wintercamp behandelt werden?", participants: 45, endsAt: "15. Oktober 2026" },
];

const pastSurveys = [
  { id: 3, title: "Erwartungen an die SES Academy", description: "Was erhoffen Sie sich von der SES Academy?", participants: 142, endedAt: "15. März 2026" },
  { id: 4, title: "Bevorzugte Veranstaltungsorte", description: "In welchen Städten sollten zukünftige Module stattfinden?", participants: 128, endedAt: "1. April 2026" },
];

export default function UmfragenPage() {
  return (
    <>
      <section className="pt-36 pb-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="ses-eyebrow mb-4">Ihre Stimme</div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground mb-6">Umfragen & Meinungen</h1>
            <p className="text-lg text-muted leading-relaxed">Ihre Rückmeldung ist uns wichtig. Nehmen Sie an unseren Umfragen teil.</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-3 h-3 bg-ses-green rounded-full" />
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground">Aktive Umfragen</h2>
            </div>
            <div className="space-y-4">
              {activeSurveys.map((survey) => (
                <div key={survey.id} className="bg-white rounded-xl p-6 border-2 border-ses-green hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <span className="ses-badge bg-ses-green text-white">
                      <span className="w-2 h-2 bg-white rounded-full mr-2" />
                      Aktiv
                    </span>
                    <div className="flex items-center gap-1 text-sm text-muted">
                      <Clock className="w-4 h-4" />
                      Endet: {survey.endsAt}
                    </div>
                  </div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-foreground mb-2">{survey.title}</h3>
                  <p className="text-muted text-sm mb-4">{survey.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-sm text-muted">
                      <Users className="w-4 h-4" />
                      {survey.participants} Teilnehmer*innen
                    </div>
                    <Link href={`/umfragen/${survey.id}`} className="inline-flex items-center gap-2 text-ses-green font-medium text-sm hover:gap-3 transition-all duration-200">
                      Jetzt mitmachen
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
              <CheckCircle className="w-6 h-6 text-muted" />
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground">Vergangene Umfragen</h2>
            </div>
            <div className="space-y-4">
              {pastSurveys.map((survey) => (
                <div key={survey.id} className="bg-gray-50 rounded-xl p-6 border border-border hover:border-ses-green-muted transition-colors duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <span className="ses-badge bg-gray-100 text-gray-600">Beendet</span>
                    <div className="flex items-center gap-1 text-sm text-muted">
                      <Clock className="w-4 h-4" />
                      Beendet: {survey.endedAt}
                    </div>
                  </div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-foreground mb-2">{survey.title}</h3>
                  <p className="text-muted text-sm mb-4">{survey.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1 text-sm text-muted">
                      <Users className="w-4 h-4" />
                      {survey.participants} Teilnehmer*innen
                    </div>
                    <Link href={`/umfragen/ergebnisse/${survey.id}`} className="inline-flex items-center gap-2 text-ses-green font-medium text-sm hover:gap-3 transition-all duration-200">
                      Ergebnisse ansehen
                      <BarChart3 className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

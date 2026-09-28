import type { Metadata } from "next";
import { Mail } from "lucide-react";

export const metadata: Metadata = { title: "Referenten & Experten", description: "Wissenschaftler*innen, Politiker*innen und Praktiker*innen der SES Academy." };

const speakers = [
  { name: "Dr. Gregor Gysi", role: "Keynote-Redner", organization: "Mitglied des Deutschen Bundestages", bio: "Dr. Gregor Gysi ist einer der bekanntesten deutschen Politiker und erfahrener Demokrat.", module: "Modul 4: Demokratie in Europa" },
  { name: "Humza Yousaf", role: "Keynote-Redner", organization: "Ehemaliger First Minister of Scotland", bio: "Humza Yousaf war der erste Muslim, der als First Minister of Scotland amtierte.", module: "Modul 1: Identity, Responsibility & Participation" },
  { name: "Prof. Dr. Mathias Rohe", role: "Referent", organization: "Universität Erlangen-Nürnberg", bio: "Prof. Dr. Mathias Rohe ist einer der führenden Experten für islamisches Recht in Europa.", module: "Modul 1" },
  { name: "Prof. Dr. Klaus Schubert", role: "Referent", organization: "Universität Münster", bio: "Prof. Dr. Klaus Schubert ist Experte für europäische Politik und Verfassungsvergleich.", module: "Modul 2 & 4" },
  { name: "Burhan Kesici", role: "Vorsitzender", organization: "Islamrat für die BRD", bio: "Burhan Kesici ist Vorsitzender des Islamrats und Initiator der SES Academy.", module: "Alle Module" },
  { name: "Murat Gümüş", role: "Generalsekretär", organization: "Islamrat für die BRD", bio: "Murat Gümüş koordiniert die SES Academy als Projektleiter.", module: "Alle Module" },
];

export default function ReferentenPage() {
  return (
    <>
      <section className="pt-36 pb-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="ses-eyebrow mb-4">Experten</div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground mb-6">Referenten & Experten</h1>
            <p className="text-lg text-muted leading-relaxed">Wissenschaftler*innen, Politiker*innen und Praktiker*innen begleiten die SES Academy.</p>
          </div>
        </div>
      </section>

      <section className="pb-20 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {speakers.map((speaker) => (
            <div key={speaker.name} className="bg-white rounded-xl border border-border overflow-hidden hover:border-ses-green-muted hover:shadow-md transition-all duration-200">
              <div className="h-40 bg-gradient-to-br from-ses-green-dark to-ses-green flex items-center justify-center relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
                <span className="font-[family-name:var(--font-playfair)] text-5xl font-bold text-white/40">{speaker.name.split(" ").map(n => n[0]).join("")}</span>
              </div>
              <div className="p-6">
                <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-foreground mb-1">{speaker.name}</h3>
                <p className="text-ses-green font-medium text-sm mb-1">{speaker.role}</p>
                <p className="text-muted text-sm mb-4">{speaker.organization}</p>
                <p className="text-muted text-sm leading-relaxed mb-4">{speaker.bio}</p>
                <div className="pt-4 border-t border-border">
                  <span className="text-xs font-medium text-muted-strong">Beteiligt an: </span>
                  <span className="text-xs text-ses-green">{speaker.module}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground mb-4">Sie möchten Referent*in werden?</h2>
          <p className="text-muted mb-8">Wir freuen uns über Expert*innen aus Wissenschaft, Politik und Zivilgesellschaft.</p>
          <a href="mailto:ses@islamrat.de" className="ses-button ses-button-primary">
            <Mail className="w-4 h-4" />
            Kontakt aufnehmen
          </a>
        </div>
      </section>
    </>
  );
}

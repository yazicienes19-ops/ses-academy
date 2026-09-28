import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

export default function DatenschutzPage() {
  return (
    <section className="pt-36 pb-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="max-w-3xl">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-foreground mb-8">Datenschutzerklärung</h1>
          <div className="space-y-8 text-muted">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Datenschutz auf einen Blick</h2>
              <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Verantwortliche Stelle</h2>
              <p>Islamrat für die Bundesrepublik Deutschland e.V.<br />Colonia-Allee 3, 51067 Köln<br />Telefon: +49 221 942 240 – 210<br />E-Mail: ses@islamrat.de</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Datenerfassung auf dieser Website</h2>
              <h3 className="text-lg font-medium text-foreground mb-2">Server-Log-Dateien</h3>
              <p>Der Provider erhebt automatisch Informationen in Server-Log-Dateien: Browsertyp, Betriebssystem, Referrer URL, IP-Adresse, Uhrzeit der Anfrage.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Kontaktaufnahme</h3>
              <p>Wenn Sie uns kontaktieren, werden Ihre Anfrage inklusive personenbezogener Daten zum Zwecke der Bearbeitung gespeichert.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Bewerbungsformular</h3>
              <p>Ihre Bewerbungsdaten werden zum Zwecke der Bearbeitung bei uns gespeichert und nach 6 Monaten gelöscht.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Newsletter</h3>
              <p>Für den Newsletter speichern wir Ihre E-Mail-Adresse bis zum Abbestellen.</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Ihre Rechte</h2>
              <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung und Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten. Außerdem haben Sie das Recht auf Datenübertragbarkeit und Beschwerde bei einer Aufsichtsbehörde.</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Kontakt</h2>
              <p>Bei Fragen zum Datenschutz: ses@islamrat.de oder +49 221 942 240 – 210</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

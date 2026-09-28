import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <section className="pt-36 pb-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="max-w-3xl">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-foreground mb-8">Impressum</h1>
          <div className="space-y-8 text-muted">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Angaben gemäß § 5 TMG</h2>
              <p>Islamrat für die Bundesrepublik Deutschland e.V.<br />Colonia-Allee 3<br />51067 Köln</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Vertreten durch</h2>
              <p>Burhan Kesici, Vorsitzender<br />Murat Gümüş, Generalsekretär</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Kontakt</h2>
              <p>Telefon: +49 221 942 240 – 210<br />E-Mail: ses@islamrat.de</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Registereintrag</h2>
              <p>Eintragung im Vereinsregister.<br />Registergericht: Amtsgericht Köln</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Streitschlichtung</h2>
              <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" className="text-ses-green hover:underline" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr/</a></p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Haftung für Inhalte</h2>
              <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Haftung für Links</h2>
              <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">Urheberrecht</h2>
              <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

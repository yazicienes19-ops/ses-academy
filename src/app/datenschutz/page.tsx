import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Datenschutz", robots: { index: false } };

export default function DatenschutzPage() {
  const t = site.traeger;
  return (
    <article className="mx-auto max-w-3xl px-4 pt-14 pb-28 sm:px-6 sm:pt-20">
      <h1 className="font-display text-5xl font-extrabold sm:text-6xl">Datenschutz</h1>
      <div className="mt-12 space-y-10 text-lg text-ink-soft [&_h2]:font-display [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink">
        <section>
          <h2>Verantwortliche Stelle</h2>
          <p>
            {t.name} e.V., {t.adresse[0]}, {t.adresse[1]}
            <br />
            E-Mail: {t.email} · Telefon: {t.telefon}
          </p>
        </section>
        <section>
          <h2>Kurz gesagt</h2>
          <p>
            Diese Website setzt keine Cookies, nutzt keine Analyse- oder Tracking-Werkzeuge und enthält keine Formulare. Schriften werden
            von unserem eigenen Server ausgeliefert, nicht von Google.
          </p>
        </section>
        <section>
          <h2>Server-Logdateien</h2>
          <p>
            Beim Aufruf der Seite verarbeitet unser Hosting-Anbieter technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite,
            Browsertyp), um die Website auszuliefern und ihre Sicherheit zu gewährleisten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
          </p>
        </section>
        <section>
          <h2>Kontakt per E-Mail</h2>
          <p>
            Wenn du uns schreibst, verarbeiten wir deine Angaben, um deine Anfrage zu beantworten (Art. 6 Abs. 1 lit. b bzw. f DSGVO), und
            löschen sie, sobald sie dafür nicht mehr gebraucht werden.
          </p>
        </section>
        <section>
          <h2>Links zu Instagram</h2>
          <p>
            Wir verlinken auf unser Instagram-Profil. Es handelt sich um einen einfachen Link; erst wenn du ihn anklickst, gelten die
            Datenschutzbestimmungen von Meta.
          </p>
        </section>
        <section>
          <h2>Deine Rechte</h2>
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch
            sowie das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
          </p>
        </section>
      </div>
    </article>
  );
}

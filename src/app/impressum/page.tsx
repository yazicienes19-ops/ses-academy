import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Impressum", robots: { index: false } };

export default function ImpressumPage() {
  const t = site.traeger;
  return (
    <article className="mx-auto max-w-3xl px-4 pt-14 pb-28 sm:px-6 sm:pt-20">
      <h1 className="font-display text-5xl font-extrabold sm:text-6xl">Impressum</h1>
      <div className="mt-12 space-y-10 text-lg text-ink-soft [&_h2]:font-display [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink">
        <section>
          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            {t.name} e.V.
            <br />
            {t.adresse[0]}
            <br />
            {t.adresse[1]}
          </p>
        </section>
        <section>
          <h2>Vertreten durch</h2>
          <p>Burhan Kesici, Vorsitzender</p>
        </section>
        <section>
          <h2>Kontakt</h2>
          <p>
            Telefon: {t.telefon}
            <br />
            E-Mail: <a href={`mailto:${t.email}`} className="text-ink underline underline-offset-4">{t.email}</a>
          </p>
        </section>
        <section>
          <h2>Registereintrag</h2>
          <p>Vereinsregister beim Amtsgericht Köln, Registernummer: VR [bitte ergänzen]</p>
        </section>
        <section>
          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            Burhan Kesici, {t.adresse[0]}, {t.adresse[1]}
          </p>
        </section>
      </div>
    </article>
  );
}

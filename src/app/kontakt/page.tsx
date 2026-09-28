import type { Metadata } from "next";
import { site } from "@/content/site";
import { Seitenkopf } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "So erreichst du die SES Academy.",
};

export default function KontaktPage() {
  const t = site.traeger;
  const karten = [
    { titel: "E-Mail", zeile: t.email, href: `mailto:${t.email}?subject=SES%20Academy`, aktion: "Mail schreiben" },
    { titel: "Instagram", zeile: "@islamratbrd", href: t.instagram, aktion: "Folgen" },
    { titel: "Telefon", zeile: t.telefon, href: `tel:${t.telefon.replace(/[^+\d]/g, "")}`, aktion: "Anrufen" },
  ];
  return (
    <>
      <Seitenkopf
        kicker="Kontakt"
        titel={
          <>
            Fragen? <span className="marker">Schreib uns.</span>
          </>
        }
        text="Ob Presse, Kooperation oder Interesse an der Academy – wir melden uns."
      />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:px-6 md:grid-cols-3 lg:px-10">
        {karten.map((k) => (
          <a
            key={k.titel}
            href={k.href}
            {...(k.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group flex flex-col justify-between rounded-3xl bg-white/60 p-8 ring-1 ring-line transition hover:bg-forest hover:text-paper"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-sage uppercase group-hover:text-signal">{k.titel}</p>
            <p className="font-display mt-10 text-2xl font-bold break-words">{k.zeile}</p>
            <p className="mt-6 text-sm font-semibold">{k.aktion} →</p>
          </a>
        ))}
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-10">
        <div className="grid gap-8 rounded-3xl bg-paper-deep p-8 sm:grid-cols-2 sm:p-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sage uppercase">Hauptgeschäftsstelle</p>
            <p className="mt-3 text-lg">
              {t.name}
              <br />
              {t.adresse[0]}, {t.adresse[1]}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sage uppercase">Hauptstadtbüro</p>
            <p className="mt-3 text-lg">
              {t.hauptstadtbuero[0]}, {t.hauptstadtbuero[1]}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { formate, site } from "@/content/site";
import { Kicker, Seitenkopf } from "@/components/ui";

export const metadata: Metadata = {
  title: "Über uns",
  description: "Wer hinter der SES Academy steht und was sie will.",
};

export default function UeberUnsPage() {
  const f = site.facts;
  return (
    <>
      <Seitenkopf
        kicker="Über die SES Academy"
        titel={
          <>
            Ses heißt <span className="marker">Stimme.</span>
          </>
        }
        text={`Auf Türkisch – und als Abkürzung für „${site.langname}“, Seminar für soziale und politische Bildung. Die SES Academy ist ein Bildungs- und Empowerment-Programm für junge Musliminnen und Muslime in Europa. Seit April 2026.`}
      />

      <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-2 lg:px-10">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-paper-deep">
          <Image src="/fotos/gruppe.jpg" alt="Teilnehmende der SES Academy beim Auftakt in Köln" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center">
          <Kicker>Unser Ziel</Kicker>
          <p className="font-serif mt-6 text-2xl leading-snug sm:text-3xl">{site.ziel}</p>
          <p className="mt-8 rounded-2xl bg-paper-deep p-5 text-ink-soft">
            Die Teilnahme ist kostenlos. Die Bewerbungsphase für den aktuellen Jahrgang endete am {site.bewerbungsschluss}.
          </p>
        </div>
      </section>

      <section className="bg-forest text-paper">
        <div className="mx-auto grid max-w-7xl gap-px px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-10">
          {[
            [f.teilnehmende, "Teilnehmende pro Jahrgang"],
            [f.alter, "Jahre alt"],
            [String(f.laender.length), f.laender.join(" · ")],
            ["2,5", "Jahre Programm"],
          ].map(([zahl, text]) => (
            <div key={text} className="py-8 sm:px-4">
              <p className="font-display text-5xl font-extrabold text-signal">{zahl}</p>
              <p className="mt-2 text-paper/75">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
        <Kicker>So arbeiten wir</Kicker>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {formate.map((fm, i) => (
            <article key={fm.titel} className="rounded-3xl bg-white/60 p-8 ring-1 ring-line">
              <p className="font-display text-sm font-bold text-sage">0{i + 1}</p>
              <h2 className="font-display mt-3 text-3xl font-bold">{fm.titel}</h2>
              <p className="mt-3 text-lg text-ink-soft">{fm.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-10">
          <div>
            <Kicker>Träger</Kicker>
            <h2 className="font-display mt-5 text-4xl font-extrabold sm:text-5xl">Wer dahinter steht</h2>
          </div>
          <div className="space-y-5 text-lg text-ink-soft">
            <p>
              Die SES Academy ist ein Projekt des <strong className="text-ink">{site.traeger.name}</strong> in Kooperation mit der{" "}
              {site.traeger.partner}.
            </p>
            <p>
              Der Islamrat ist eine bundesweit tätige islamische Religionsgemeinschaft. Neben religiösen und sozialen Angeboten in rund 500
              Moscheen und mehreren Bildungseinrichtungen setzt er sich mit gesamtgesellschaftlichen Fragen auseinander – mit Konferenzen,
              Fachforen und Bildungsprogrammen wie diesem.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

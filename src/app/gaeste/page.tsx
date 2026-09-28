import type { Metadata } from "next";
import Image from "next/image";
import { gaeste, modulplan } from "@/content/site";
import { Seitenkopf } from "@/components/ui";

export const metadata: Metadata = {
  title: "Gäste",
  description: "Wer bei der SES Academy bisher gesprochen hat.",
};

export default function GaestePage() {
  const mitGaesten = modulplan.filter((m) => gaeste.some((g) => g.modul === m.nr));
  return (
    <>
      <Seitenkopf
        kicker="Gäste"
        titel={
          <>
            Wer schon <span className="marker">da war.</span>
          </>
        }
        text="Politik, Wissenschaft, Recht, Medien: Bei der SES Academy sprechen Menschen, die ihr Feld kennen – und sich danach den Fragen aus dem Saal stellen."
      />

      <section className="mx-auto grid max-w-7xl gap-3 px-4 pb-20 sm:grid-cols-2 sm:px-6 lg:px-10">
        <figure className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-paper-deep">
          <Image src="/fotos/yousaf.jpg" alt="Humza Yousaf am Rednerpult" fill sizes="(min-width:640px) 50vw, 100vw" className="object-cover" />
          <figcaption className="absolute bottom-4 left-4 rounded-full bg-paper px-4 py-2 text-sm font-semibold">Humza Yousaf · Keynote</figcaption>
        </figure>
        <figure className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-paper-deep">
          <Image src="/fotos/yousaf-rohe.jpg" alt="Panel mit Humza Yousaf und Prof. Dr. Mathias Rohe" fill sizes="(min-width:640px) 50vw, 100vw" className="object-cover" />
          <figcaption className="absolute bottom-4 left-4 rounded-full bg-paper px-4 py-2 text-sm font-semibold">Panel mit Yousaf und Rohe</figcaption>
        </figure>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-10">
        {mitGaesten.map((m) => (
          <section key={m.nr} className="grid gap-6 border-t border-line py-12 lg:grid-cols-[280px_1fr] lg:gap-12">
            <div>
              <p className="font-display text-sm font-bold text-sage">Modul {String(m.nr).padStart(2, "0")}</p>
              <h2 className="font-display mt-2 text-2xl leading-tight font-bold">{m.titel}</h2>
              <p className="mt-1 text-ink-soft">{m.datum}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {gaeste
                .filter((g) => g.modul === m.nr)
                .map((g) => (
                  <li key={g.name} className="rounded-3xl bg-white/60 p-6 ring-1 ring-line">
                    <p className="text-xs font-semibold tracking-[0.15em] text-sage uppercase">{g.format}</p>
                    <p className="font-display mt-3 text-2xl font-bold">{g.name}</p>
                    {g.rolle && <p className="mt-1 text-ink-soft">{g.rolle}</p>}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

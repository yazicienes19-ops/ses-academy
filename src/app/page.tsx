import Image from "next/image";
import Link from "next/link";
import { formate, gaeste, kompetenzen, modulplan, site } from "@/content/site";
import { ArtBadge, Kicker } from "@/components/ui";

const highlights = ["Humza Yousaf", "Prof. Dr. Mathias Rohe", "Hubertus Heil", "Prof. Mahmut Hakkı Akın", "Farid Hafez, Ph.D.", "Dr. Mustafa Cerić"];

const themen = [
  "Demokratie", "Verfassung", "Teilhabe", "Rhetorik", "Europa", "Kommunalpolitik", "Menschenrechte",
  "Digitaler Aktivismus", "Religionsfreiheit", "Leadership", "Internationale Politik", "Gegen Rassismus",
];

export default function Home() {
  const naechstes = modulplan.find((m) => m.status === "naechstes")!;
  const f = site.facts;

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 pb-14 sm:px-6 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-14 lg:px-10 lg:pb-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold tracking-wide text-paper">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
              Politische Bildung · 2026–2028
            </p>
            <h1 className="font-display mt-7 text-[clamp(3.2rem,10.5vw,8.4rem)] leading-[0.86] font-extrabold">
              Deine
              <br />
              Stimme.
              <br />
              <span className="marker">Dein Europa.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-ink-soft sm:text-xl">
              Die SES Academy bringt {f.teilnehmende} junge Musliminnen und Muslime aus {f.laender.join(", ").replace(/, ([^,]*)$/, " und $1")}{" "}
              zusammen – um Politik zu verstehen, mitzureden und mitzugestalten.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/programm" className="rounded-full bg-ink px-7 py-4 font-semibold text-paper transition hover:bg-forest">
                Zum Programm →
              </Link>
              <Link href="/ueber-uns" className="rounded-full px-7 py-4 font-semibold ring-1 ring-ink/25 transition hover:bg-paper-deep">
                Was ist SES?
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-paper-deep sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src="/fotos/hero.jpg"
                alt="Panel beim Auftakt der SES Academy in Köln, eine Teilnehmerin spricht ins Mikrofon"
                fill
                priority
                sizes="(min-width:1024px) 45vw, 100vw"
                className="object-cover object-[72%_50%]"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent" />
              <p className="absolute bottom-5 left-5 right-5 text-sm font-medium text-paper/90">Auftakt · April 2026 · Köln</p>
            </div>
            <div className="absolute -top-5 -left-4 rotate-[-6deg] rounded-2xl bg-signal px-5 py-3 shadow-lg sm:-left-8">
              <p className="font-display text-3xl leading-none font-extrabold">{f.alter}</p>
              <p className="text-xs font-semibold">Jahre jung</p>
            </div>
          </div>
        </div>

        {/* Laufband */}
        <div className="overflow-hidden border-y border-ink bg-ink py-4 text-paper">
          <div className="laufband flex w-max gap-10 whitespace-nowrap">
            {[...themen, ...themen].map((t, i) => (
              <span key={i} className="font-display flex items-center gap-10 text-2xl font-bold sm:text-3xl">
                {t}
                <span className="text-signal" aria-hidden>✺</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ZAHLEN */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
        <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
          {[
            ["150", "Teilnehmende"],
            ["3", "Länder"],
            ["13", "Module"],
            ["2,5", "Jahre"],
          ].map(([z, l]) => (
            <div key={l} className="border-l-2 border-ink pl-5">
              <dt className="order-2 mt-1 text-ink-soft">{l}</dt>
              <dd className="font-display text-6xl font-extrabold sm:text-7xl">{z}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* NÄCHSTES MODUL */}
      <section className="px-4 sm:px-6 lg:px-10">
        <div className="muster relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-forest text-paper">
          <div className="absolute inset-0 bg-forest/90" aria-hidden />
          <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:p-16">
            <div>
              <Kicker hell>Als Nächstes · Modul {naechstes.nr}</Kicker>
              <h2 className="font-display mt-6 text-[clamp(2.2rem,5vw,4rem)] leading-[0.98] font-extrabold">{naechstes.titel}</h2>
              <p className="font-serif mt-6 max-w-xl text-xl text-paper/85 italic">
                Demokratie ist nicht überall gleich – aber überall herausgefordert.
              </p>
            </div>
            <div className="flex flex-col justify-between gap-8">
              <div className="rounded-3xl bg-paper p-6 text-ink">
                <p className="font-display text-5xl font-extrabold">14.–15.</p>
                <p className="font-display text-2xl font-bold">November 2026</p>
                <p className="mt-2 text-ink-soft">{naechstes.ort} · Colonia-Allee 3</p>
              </div>
              <ul className="space-y-2 text-paper/85">
                {naechstes.themen.map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="text-signal" aria-hidden>→</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FORMATE */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Kicker>So läuft&apos;s</Kicker>
            <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.95] font-extrabold">
              Zuhören. Streiten.
              <br />
              <span className="text-sage">Selber reden.</span>
            </h2>
          </div>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {formate.map((fm, i) => (
            <article
              key={fm.titel}
              className={`flex flex-col rounded-3xl p-7 ${
                i === 3 ? "bg-signal" : i === 2 ? "bg-mint text-white" : "bg-white/60 ring-1 ring-line"
              }`}
            >
              <p className="font-display text-sm font-bold opacity-60">0{i + 1}</p>
              <h3 className="font-display mt-8 text-3xl font-bold">{fm.titel}</h3>
              <p className={`mt-3 ${i === 2 ? "text-white/90" : "text-ink-soft"}`}>{fm.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* KOMPETENZEN */}
      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <Kicker hell>Was du mitnimmst</Kicker>
              <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.95] font-extrabold">
                Fünf Kompetenzen.
                <br />
                <span className="text-signal">Eine Haltung.</span>
              </h2>
              <div className="relative mt-10 hidden aspect-[4/3] w-full max-w-sm lg:block">
                <Image src="/brand/megafon.png" alt="" fill sizes="384px" className="rounded-3xl bg-paper object-contain p-6" />
              </div>
            </div>
            <ol className="divide-y divide-paper/15 border-y border-paper/15">
              {kompetenzen.map((k, i) => (
                <li key={k.name} className="group grid grid-cols-[3rem_1fr] items-baseline gap-4 py-6 sm:grid-cols-[3rem_17rem_1fr]">
                  <span className="font-display text-sm font-bold text-paper/40">0{i + 1}</span>
                  <p className="font-display text-4xl font-extrabold transition-colors group-hover:text-signal sm:text-5xl">{k.name}</p>
                  <p className="col-start-2 text-paper/75 sm:col-start-3">{k.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FOTOSTRECKE */}
      <section className="overflow-hidden pt-24 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <Kicker>Rückblick · Auftakt April 2026</Kicker>
        </div>
        <div className="mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-4 md:grid-rows-2 lg:px-10">
          {[
            { src: "/fotos/yousaf.jpg", alt: "Humza Yousaf bei seiner Keynote", cls: "col-span-2 row-span-2 aspect-square md:aspect-auto" },
            { src: "/fotos/saal.jpg", alt: "Voller Saal beim Auftakt der SES Academy", cls: "col-span-2 aspect-[2/1]" },
            { src: "/fotos/panel.jpg", alt: "Podiumsdiskussion mit jungen Teilnehmenden", cls: "aspect-square" },
            { src: "/fotos/gespraech.jpg", alt: "Teilnehmerinnen im Gespräch", cls: "aspect-square" },
          ].map((b) => (
            <div key={b.src} className={`relative overflow-hidden rounded-3xl bg-paper-deep ${b.cls}`}>
              <Image src={b.src} alt={b.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-700 hover:scale-105" />
            </div>
          ))}
        </div>
      </section>

      {/* GÄSTE */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Kicker>Bisher zu Gast</Kicker>
              <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.95] font-extrabold">Wer schon da war</h2>
            </div>
            <Link href="/gaeste" className="rounded-full px-6 py-3 font-semibold ring-1 ring-ink/25 hover:bg-paper-deep">
              Alle Gäste →
            </Link>
          </div>
          <ul className="mt-12 divide-y divide-line border-y border-line">
            {gaeste.filter((g) => highlights.includes(g.name)).map((g) => (
              <li key={g.name} className="grid gap-1 py-5 sm:grid-cols-[1.2fr_1fr_auto] sm:items-baseline sm:gap-6">
                <p className="font-display text-2xl font-bold sm:text-3xl">{g.name}</p>
                <p className="text-ink-soft">{g.rolle}</p>
                <p className="text-sm font-medium text-sage">
                  Modul {g.modul} · {g.format}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ZIEL */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10">
        <div className="grid gap-10 rounded-[2rem] bg-paper-deep p-8 sm:p-12 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16 lg:p-16">
          <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full sm:h-52 sm:w-52">
            <Image src="/fotos/kesici.jpg" alt="Burhan Kesici" fill sizes="208px" className="object-cover object-top" />
          </div>
          <div>
            <Kicker>Warum es SES gibt</Kicker>
            <p className="font-serif mt-6 text-2xl leading-snug sm:text-3xl">{site.ziel}</p>
            <p className="mt-6 font-semibold">Burhan Kesici eröffnete die Academy im April 2026</p>
            <p className="text-ink-soft">Vorsitzender des Islamrats für die Bundesrepublik Deutschland</p>
          </div>
        </div>
      </section>

      {/* PROGRAMM-VORSCHAU */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
          <Kicker hell>Der Weg bis 2028</Kicker>
          <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.95] font-extrabold">13 Module</h2>
        </div>
        <div className="flex snap-x gap-4 overflow-x-auto px-4 pb-24 sm:px-6 lg:px-10 [scrollbar-width:thin]">
          {modulplan.map((m) => (
            <Link
              href="/programm"
              key={m.nr}
              className={`flex w-72 shrink-0 snap-start flex-col rounded-3xl p-6 transition hover:-translate-y-1 ${
                m.status === "naechstes" ? "bg-signal text-ink" : m.status === "abgeschlossen" ? "bg-forest-2" : "bg-paper/8 ring-1 ring-paper/15"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-4xl font-extrabold opacity-40">{String(m.nr).padStart(2, "0")}</span>
                {m.status === "naechstes" ? <span className="text-xs font-bold">● als Nächstes</span> : <ArtBadge art={m.art} />}
              </div>
              <p className="font-display mt-10 text-xl leading-tight font-bold">{m.titel}</p>
              <p className="mt-auto pt-6 text-sm opacity-75">{m.datum}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

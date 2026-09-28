import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Faq } from "./Faq";
import { Naechstes, ProgrammListe, type Eintrag } from "./Programm";
import { fotos, gaeste, modulplan } from "@/i18n/daten";
import { pfad, sprachen, texte, zeitraum, type ModulSlug, type Sprache, type Texte } from "@/i18n";

const SITE = "https://ses.islamrat.de";

export function eintraege(l: Sprache): Eintrag[] {
  const t = texte[l];
  return modulplan.map((m) => ({
    ...m,
    titel: t.seminare[m.slug].titel,
    teaser: t.seminare[m.slug].text[0],
    datum: zeitraum(l, m.von, m.bis),
    ortText: m.ort ?? `${t.seminar.ort}: ${t.seminar.ortOffen}`,
    artText: t.programm.art[m.art],
    href: pfad(l, `/seminar/${m.slug}`),
  }));
}

export function metaFuer(l: Sprache, rest = "", titel?: string, beschreibung?: string): Metadata {
  const t = texte[l];
  const languages = Object.fromEntries(sprachen.map((s) => [s, pfad(s, rest)]));
  return {
    metadataBase: new URL(SITE),
    title: titel ? `${titel} | SES Academy` : t.meta.titel,
    description: beschreibung ?? t.meta.beschreibung,
    alternates: { canonical: pfad(l, rest), languages: { ...languages, "x-default": pfad("de", rest) } },
    openGraph: {
      title: titel ?? t.meta.titel,
      description: beschreibung ?? t.meta.beschreibung,
      type: "website",
      siteName: "SES Academy",
      images: [{ url: "/fotos/og.jpg", width: 1200, height: 630 }],
    },
    icons: { icon: [{ url: "/favicon.png", type: "image/png" }] },
  };
}

function Kicker({ children, hell = false }: { children: React.ReactNode; hell?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-semibold tracking-[0.2em] uppercase ${hell ? "text-signal" : "text-sage"}`}>
      <span className={`h-px w-8 ${hell ? "bg-signal" : "bg-sage"}`} aria-hidden />
      {children}
    </p>
  );
}

const h2 = "font-display mt-5 text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.95] font-extrabold";

function GaesteListe({ l, t, slug }: { l: Sprache; t: Texte; slug?: ModulSlug }) {
  const liste = slug ? gaeste.filter((g) => g.modul === slug) : gaeste;
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {liste.map((g) => (
        <li key={g.name + g.modul} className="border-t border-line py-4">
          <p className="text-xs font-semibold tracking-[0.15em] text-sage uppercase">{t.formate[g.format]}</p>
          <p className="font-display mt-1 text-xl font-bold">{g.name}</p>
          {g.rolle && <p className="text-ink-soft">{g.rolle[l] ?? g.rolle.de}</p>}
        </li>
      ))}
    </ul>
  );
}

export function Startseite({ l }: { l: Sprache }) {
  const t = texte[l];
  const e = eintraege(l);
  const h = t.hero;

  return (
    <>
      {/* HERO */}
      <section>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 pb-14 sm:px-6 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14 lg:px-10 lg:pb-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold tracking-wide text-paper">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
              {h.kicker}
            </p>
            <h1 className="font-display mt-7 text-[clamp(3.1rem,10vw,8rem)] leading-[0.88] font-extrabold">
              <span className="sr-only">SES Academy – </span>
              {h.zeilen[0]}
              <br />
              {h.zeilen[1]}
              <br />
              <span className="marker">{h.zeilen[2]}</span>
            </h1>
            <p className="font-serif mt-8 text-2xl italic">{h.claim}</p>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">{h.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#programm" className="rounded-full bg-ink px-7 py-4 font-semibold text-paper transition hover:bg-forest">
                {h.ctaProgramm} →
              </a>
              <a href="#faq" className="rounded-full px-7 py-4 font-semibold ring-1 ring-ink/25 transition hover:bg-paper-deep">
                {h.ctaFaq}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-paper-deep sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image src="/fotos/hero.jpg" alt={h.fotoAlt} fill priority sizes="(min-width:1024px) 45vw, 100vw" className="object-cover object-[72%_50%]" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent" />
              <p className="absolute right-5 bottom-5 left-5 text-sm font-medium text-paper/90">{h.fotoText}</p>
            </div>
            <div className="absolute -top-5 -left-3 rotate-[-6deg] rounded-2xl bg-signal px-5 py-3 shadow-lg sm:-left-8">
              <p className="font-display text-3xl leading-none font-extrabold">{h.alter}</p>
              <p className="text-xs font-semibold">{h.kosten}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border-y border-ink bg-ink py-4 text-paper" aria-hidden>
          <div className="laufband flex w-max gap-10 whitespace-nowrap">
            {[...t.laufband, ...t.laufband].map((w, i) => (
              <span key={i} className="font-display flex items-center gap-10 text-2xl font-bold sm:text-3xl">
                {w}
                <span className="text-signal">✺</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ECKDATEN */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [h.laufzeitLabel, h.laufzeit],
            [h.ortLabel, h.ort],
            [h.alterLabel, h.alter],
            [h.kostenLabel, h.kosten],
          ].map(([k, v]) => (
            <div key={k} className="border-l-2 border-ink pl-5">
              <dt className="text-sm text-ink-soft">{k}</dt>
              <dd className="font-display mt-1 text-2xl leading-tight font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Naechstes eintraege={e} t={t} />

      {/* KOMPETENZEN */}
      <section id="kompetenzen" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.35fr]">
            <div>
              <Kicker>{t.kompetenzen.kicker}</Kicker>
              <h2 className={h2}>{t.kompetenzen.titel}</h2>
              <p className="mt-6 max-w-md text-lg text-ink-soft">{t.kompetenzen.intro}</p>
              <div className="relative mt-10 hidden aspect-[4/3] w-full max-w-sm lg:block">
                <Image src="/brand/megafon.png" alt="" fill sizes="384px" className="object-contain" />
              </div>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {t.kompetenzen.liste.map((k, i) => (
                <li key={k.name} className="group grid grid-cols-[2.5rem_1fr] gap-x-4 py-7">
                  <span className="font-display pt-2 text-sm font-bold text-ink/35">0{i + 1}</span>
                  <div>
                    <p className="font-display text-4xl font-extrabold transition-colors group-hover:text-sage sm:text-5xl">{k.name}</p>
                    <p className="mt-3 text-lg font-semibold">{k.kurz}</p>
                    <p className="mt-1 text-ink-soft">{k.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* PROGRAMM */}
      <section id="programm" className="scroll-mt-20 bg-paper-deep/50">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <Kicker>{t.programm.kicker}</Kicker>
              <h2 className={h2}>{t.programm.titel}</h2>
            </div>
            <p className="text-lg text-ink-soft">{t.programm.intro}</p>
          </div>
          <div className="mt-12">
            <ProgrammListe eintraege={e} t={t} />
          </div>
        </div>
      </section>

      {/* ÜBER + ABLAUF */}
      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Kicker hell>{t.ueber.kicker}</Kicker>
              <h2 className={h2}>{t.ueber.titel}</h2>
              <p className="mt-6 text-lg text-paper/80">{t.ueber.text}</p>
            </div>
            <div className="rounded-[2rem] bg-signal p-8 text-ink sm:p-10">
              <p className="font-display text-3xl leading-tight font-extrabold">{t.ueber.fuerWenTitel}</p>
              <p className="mt-4 text-lg">{t.ueber.fuerWenText}</p>
              <p className="font-serif mt-6 text-2xl italic">{t.ueber.fuerWenZusatz}</p>
            </div>
          </div>
          <p className="font-display mt-20 text-2xl font-bold">{t.ueber.ablaufTitel}</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.ueber.ablauf.map((a, i) => (
              <li key={a.titel} className="rounded-3xl bg-forest-2 p-7">
                <p className="font-display text-sm font-bold text-signal">0{i + 1}</p>
                <p className="font-display mt-6 text-2xl font-bold">{a.titel}</p>
                <p className="mt-2 text-paper/75">{a.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* RÜCKBLICK */}
      <section id="rueckblick" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <Kicker>{t.rueckblick.kicker}</Kicker>
              <h2 className={h2}>{t.rueckblick.titel}</h2>
            </div>
            <p className="text-lg text-ink-soft">{t.rueckblick.text}</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
            {fotos.map((f) => (
              <figure key={f.src} className={`relative overflow-hidden rounded-3xl bg-paper-deep ${f.breit ? "col-span-2 aspect-[16/10]" : "aspect-square md:aspect-auto"}`}>
                <Image src={f.src} alt={f.alt[l]} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-700 hover:scale-105" />
              </figure>
            ))}
          </div>
          <p className="font-display mt-16 text-2xl font-bold">{t.rueckblick.gaesteTitel}</p>
          <div className="mt-6">
            <GaesteListe l={l} t={t} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_2fr] lg:px-10">
          <div>
            <Kicker>{t.faq.kicker}</Kicker>
            <h2 className={h2}>{t.faq.titel}</h2>
          </div>
          <Faq t={t.faq} />
        </div>
      </section>

      <Kontakt t={t} />
    </>
  );
}

function Kontakt({ t }: { t: Texte }) {
  return (
    <section id="kontakt" className="scroll-mt-20 px-4 pb-24 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] bg-ink p-8 text-paper sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:p-16">
        <div>
          <p className="font-display text-[clamp(2.2rem,5vw,4rem)] leading-[0.95] font-extrabold">{t.kontakt.titel}</p>
          <p className="mt-4 text-lg text-paper/75">{t.kontakt.text}</p>
          <p className="mt-6 max-w-xl text-paper/60">
            <strong className="text-paper">{t.bewerbung.titel}</strong> {t.bewerbung.text}
          </p>
        </div>
        <a
          href="mailto:ses@islamrat.de?subject=SES%20Academy"
          className="font-display group flex items-center justify-between gap-4 rounded-3xl bg-signal p-6 text-2xl font-bold text-ink transition hover:bg-paper sm:text-3xl"
        >
          <span>
            {t.kontakt.cta}
            <span className="mt-1 block font-sans text-base font-medium">ses@islamrat.de</span>
          </span>
          <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}

export function Seminarseite({ l, slug }: { l: Sprache; slug: ModulSlug }) {
  const t = texte[l];
  const e = eintraege(l);
  const i = e.findIndex((m) => m.slug === slug);
  const m = e[i];
  const vorher = e[i - 1];
  const nachher = e[i + 1];
  const hatGaeste = gaeste.some((g) => g.modul === slug);

  return (
    <>
      <article>
        <header className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 sm:pt-16 lg:px-10">
          <Link href={`${pfad(l)}#programm`} className="text-sm font-semibold text-ink-soft hover:text-ink">
            ← {t.seminar.zurueck}
          </Link>
          <p className="mt-10 w-fit rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-paper">
            {t.programm.modul} {String(i + 1).padStart(2, "0")} · {m.artText}
          </p>
          <h1 className="font-display mt-6 max-w-5xl text-[clamp(2.4rem,6.5vw,5.5rem)] leading-[0.95] font-extrabold">{m.titel}</h1>
          <dl className="mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="border-l-2 border-ink pl-5">
              <dt className="text-sm text-ink-soft">{t.seminar.datum}</dt>
              <dd className="font-display mt-1 text-2xl font-bold">{m.datum}</dd>
            </div>
            <div className="border-l-2 border-ink pl-5">
              <dt className="text-sm text-ink-soft">{t.seminar.ort}</dt>
              <dd className="font-display mt-1 text-2xl font-bold">{m.ort ?? t.seminar.ortOffen}</dd>
            </div>
          </dl>
        </header>

        <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
          <div className="max-w-3xl space-y-5 text-xl leading-relaxed">
            {t.seminare[slug].text.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>

        {slug === "auftakt" && (
          <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
            <p className="font-display text-2xl font-bold">{t.seminar.eindruecke}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              {fotos.map((f) => (
                <figure key={f.src} className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-paper-deep">
                  <Image src={f.src} alt={f.alt[l]} fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" />
                </figure>
              ))}
            </div>
          </section>
        )}

        {hatGaeste && (
          <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
            <p className="font-display text-2xl font-bold">{t.seminar.gaeste}</p>
            <div className="mt-6">
              <GaesteListe l={l} t={t} slug={slug} />
            </div>
          </section>
        )}

        <nav className="mx-auto grid max-w-7xl gap-3 px-4 pb-24 sm:grid-cols-2 sm:px-6 lg:px-10" aria-label={t.programm.titel}>
          {vorher ? (
            <Link href={vorher.href} className="rounded-3xl bg-white/50 p-6 ring-1 ring-line hover:bg-white">
              <p className="text-sm text-ink-soft">← {t.seminar.vorher}</p>
              <p className="font-display mt-2 text-xl font-bold">{vorher.titel}</p>
            </Link>
          ) : (
            <span />
          )}
          {nachher && (
            <Link href={nachher.href} className="rounded-3xl bg-white/50 p-6 text-right ring-1 ring-line hover:bg-white">
              <p className="text-sm text-ink-soft">{t.seminar.nachher} →</p>
              <p className="font-display mt-2 text-xl font-bold">{nachher.titel}</p>
            </Link>
          )}
        </nav>
      </article>
      <Kontakt t={t} />
    </>
  );
}

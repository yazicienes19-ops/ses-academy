import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BewerbungsFormular } from "./BewerbungsFormular";
import { ModulAnmeldung } from "./ModulAnmeldung";
import { StimmenKarte, StimmenListe, YoutubeKlick, type Karte } from "./Stimmen";
import { beitraege } from "@/i18n/stimmen";
import { Faq } from "./Faq";
import { Naechstes, NaechstesBadge, ProgrammListe, type Eintrag } from "./Programm";
import { bewerbungOffen, eindeutigeGaeste, fotos, gaeste, gaesteHervorgehoben, modulplan } from "@/i18n/daten";
import { locale, pfad, sprachen, texte, zeitraum, zeitraumKurz, type ModulSlug, type Sprache, type Texte } from "@/i18n";
import { Pfeil } from "./Pfeil";

const SITE = "https://ses.islamrat.de";

/** Build-Datum; Rückblicke erscheinen für Module, die zum Build-Zeitpunkt vorbei sind. */
const heute = () => new Date().toISOString().slice(0, 10);

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
    <p className={`mono flex items-center gap-3 text-xs tracking-[0.14em] uppercase ${hell ? "text-signal" : "text-sage"}`}>
      <span className={`h-px w-8 ${hell ? "bg-signal" : "bg-sage"}`} aria-hidden />
      {children}
    </p>
  );
}

const h2 = "font-display mt-5 text-[clamp(2.2rem,5.2vw,4.2rem)] leading-[0.95] font-extrabold";
/** Editorial-Knöpfe: rechteckig, kein Pillen-Look. */
const knopfPrimaer = "inline-flex items-center bg-forest px-6 py-4 font-semibold text-paper transition hover:bg-signal hover:text-ink";
const knopfRahmen = "inline-flex items-center border border-ink/30 px-5 py-3 font-semibold transition hover:border-ink hover:bg-ink hover:text-paper";
/** Abstand zwischen Abschnitten (vorher py-24, jetzt ~25 % kompakter). */
const abschnitt = "mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-10";

function GaesteListe({ l, t, slug }: { l: Sprache; t: Texte; slug?: ModulSlug }) {
  const liste = eindeutigeGaeste(slug ? gaeste.filter((g) => g.modul === slug) : gaeste);
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {liste.map((g) => (
        <li key={g.name + g.modul} className="border-t border-line py-4">
          <p className="mono text-[11px] tracking-[0.14em] text-sage uppercase">{t.formate[g.format]}</p>
          <p className="font-display mt-1 text-xl font-bold">{g.name}</p>
          {g.rolle && <p className="text-ink-soft">{g.rolle[l] ?? g.rolle.de}</p>}
        </li>
      ))}
    </ul>
  );
}

function GaesteHervorgehoben({ l, t }: { l: Sprache; t: Texte }) {
  const liste = gaesteHervorgehoben.flatMap((h) => {
    const g = gaeste.find((x) => x.name === h.name);
    return g ? [{ ...h, g }] : [];
  });
  return (
    <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
      {liste.map(({ foto, pos, zoom, g }) => (
        <li key={g.name}>
          <div className="relative aspect-[4/5] overflow-hidden bg-paper-deep">
            <Image
              src={foto}
              alt={g.name}
              fill
              sizes={zoom ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"}
              className="object-cover"
              style={{ objectPosition: pos, transform: zoom ? `scale(${zoom.faktor})` : undefined, transformOrigin: zoom?.um }}
            />
          </div>
          <p className="mono mt-4 border-t border-ink pt-3 text-[11px] tracking-[0.14em] text-sage uppercase">{t.formate[g.format]}</p>
          <p className="font-display mt-1 text-lg leading-tight font-bold sm:text-xl">{g.name}</p>
          {g.rolle && <p className="mt-1 text-sm text-ink-soft">{g.rolle[l] ?? g.rolle.de}</p>}
        </li>
      ))}
    </ul>
  );
}

function StimmenTeaser({ l }: { l: Sprache }) {
  const t = texte[l].stimmen;
  const karten = stimmenKarten(l).slice(0, 3);
  if (karten.length === 0) return null;
  return (
    <section id="stimmen" className="scroll-mt-20 border-t border-line bg-paper-deep/50">
      <div className={abschnitt}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <Kicker>{t.kicker}</Kicker>
            <h2 className={h2}>{t.startseiteTitel}</h2>
          </div>
          <p className="text-lg text-ink-soft">{t.startseiteText}</p>
        </div>
        <ul className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {karten.map((k) => (
            <li key={k.slug}>
              <StimmenKarte k={k} t={t} />
            </li>
          ))}
        </ul>
        <Link href={pfad(l, "/stimmen/")} className={`mt-10 ${knopfRahmen}`}>
          {t.startseiteAlle} <Pfeil className="ml-2" />
        </Link>
      </div>
    </section>
  );
}

export function Startseite({ l }: { l: Sprache }) {
  const t = texte[l];
  const e = eintraege(l);
  const h = t.hero;
  const ed = h.editorial;
  const auftakt = fotos.auftakt ?? [];
  const fotoKeynote = auftakt.find((f) => f.src === "/fotos/yousaf.jpg");
  const fotoSaal = auftakt.find((f) => f.src === "/fotos/saal.jpg");

  return (
    <>
      {/* HERO – Editorial Split: links 60 % Text, rechts 40 % Foto-Arrangement; Desktop max. 90vh */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 pb-12 sm:px-6 sm:pt-12 lg:h-[calc(90vh-4.5rem)] lg:max-h-[860px] lg:min-h-[600px] lg:grid-cols-[3fr_2fr] lg:gap-14 lg:px-10 lg:py-10">
          <div className="flex flex-col justify-center">
            <p className="mono text-[11px] tracking-[0.14em] text-ink-soft uppercase sm:text-xs">[ {ed.kicker} ]</p>
            <h1 className="ohne-trennung font-display mt-6 text-[clamp(2.5rem,5.2vw,4.75rem)] leading-[0.98] font-extrabold">
              <span className="sr-only">SES Academy – </span>
              {ed.vor}
              <span className="akzent text-forest">{ed.akzent}</span>
              {ed.nach}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">{ed.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a href={pfad(l, "/bewerbung/")} className={knopfPrimaer}>
                {bewerbungOffen ? t.bewerbungSeite.nav : h.ctaVormerken} <Pfeil className="ml-2" />
              </a>
              <a href="#programm" className="font-semibold underline decoration-ink/35 decoration-1 underline-offset-[6px] transition hover:decoration-ink">
                {ed.ctaProgramm}
              </a>
            </div>
            <ul className="mono mt-10 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-4 text-[12px] tracking-[0.12em] text-ink-soft uppercase">
              {ed.trust.map((x, i) => (
                <li key={x} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden>•</span>}
                  {x}
                </li>
              ))}
            </ul>
          </div>

          {/* Asymmetrisches Foto-Arrangement: Keynote groß, Panel versetzt darüber, Publikum klein */}
          <div className="relative grid h-[26rem] grid-cols-6 grid-rows-6 gap-3 sm:h-[34rem] lg:h-auto">
            {fotoKeynote && (
              <figure className="relative col-span-5 col-start-2 row-span-4 row-start-1 overflow-hidden bg-paper-deep">
                <Image src={fotoKeynote.src} alt={fotoKeynote.alt[l]} fill priority sizes="(min-width:1024px) 34vw, 85vw" className="object-cover object-[40%_30%]" />
                <figcaption className="mono absolute top-3 right-3 bg-paper/90 px-2 py-1 text-[10px] tracking-[0.12em] text-ink uppercase">{h.fotoText}</figcaption>
              </figure>
            )}
            <figure className="relative z-10 col-span-4 col-start-1 row-span-3 row-start-4 overflow-hidden bg-paper-deep outline-8 outline-paper">
              <Image src="/fotos/hero.jpg" alt={h.fotoAlt} fill sizes="(min-width:1024px) 27vw, 66vw" className="object-cover object-[60%_55%]" />
            </figure>
            {fotoSaal && (
              <figure className="relative col-span-2 col-start-5 row-span-2 row-start-5 overflow-hidden bg-paper-deep">
                <Image src={fotoSaal.src} alt={fotoSaal.alt[l]} fill sizes="(min-width:1024px) 14vw, 33vw" className="object-cover" />
              </figure>
            )}
            <NaechstesBadge
              eintraege={e}
              kicker={t.naechstes.kicker}
              modulWort={t.programm.modul}
              kurzDaten={modulplan.map((m) => zeitraumKurz(l, m.von, m.bis))}
              ortOffen={t.seminar.ortOffen}
              className="absolute top-4 left-0 z-20 sm:top-6"
            />
          </div>
        </div>

        <div className="overflow-hidden bg-forest py-3 text-paper" aria-hidden>
          <div className="laufband flex w-max gap-8 whitespace-nowrap">
            {[...t.laufband, ...t.laufband].map((w, i) => (
              <span key={i} className="font-display flex items-center gap-8 text-xl font-bold sm:text-2xl">
                {w}
                <span className="text-signal">✺</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ECKDATEN – offizielle Einleitung + Fakten im Raster */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.6fr] lg:gap-16">
          <p className="text-lg text-ink-soft">{h.intro}</p>
          <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
            {[
              [h.laufzeitLabel, h.laufzeit],
              [h.ortLabel, h.ort],
              [h.alterLabel, h.alter],
              [h.kostenLabel, h.kosten],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-ink py-4">
                <dt className="mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">{k}</dt>
                <dd className="font-display mt-2 text-lg leading-tight font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Naechstes eintraege={e} t={t} />

      {/* KOMPETENZEN */}
      <section id="kompetenzen" className="scroll-mt-20">
        <div className={abschnitt}>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.35fr]">
            <div>
              <Kicker>{t.kompetenzen.kicker}</Kicker>
              <h2 className={h2}>{t.kompetenzen.titel}</h2>
              <p className="mt-6 max-w-md text-lg text-ink-soft">{t.kompetenzen.intro}</p>
              <div className="relative mt-10 hidden aspect-[4/3] w-full max-w-xs lg:block">
                <Image src="/brand/megafon.png" alt="" fill sizes="320px" className="object-contain" />
              </div>
            </div>
            <ol className="divide-y divide-line border-y border-ink">
              {t.kompetenzen.liste.map((k, i) => (
                <li key={k.name} className="group grid grid-cols-[3rem_1fr] gap-x-4 py-6">
                  <span className="mono pt-3 text-xs text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
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
      <section id="programm" className="scroll-mt-20 border-t border-line bg-paper-deep/50">
        <div className={abschnitt}>
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
        <div className={abschnitt}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Kicker hell>{t.ueber.kicker}</Kicker>
              <h2 className={h2}>{t.ueber.titel}</h2>
              <p className="mt-6 text-lg text-paper/80">{t.ueber.text}</p>
            </div>
            <div className="border-t-4 border-signal bg-signal/95 p-8 text-ink sm:p-10">
              <p className="font-display text-3xl leading-tight font-extrabold">{t.ueber.fuerWenTitel}</p>
              <p className="mt-4 text-lg">{t.ueber.fuerWenText}</p>
              <p className="akzent mt-6 text-2xl">{t.ueber.fuerWenZusatz}</p>
            </div>
          </div>
          <p className="mono mt-16 text-xs tracking-[0.14em] text-signal uppercase">{t.ueber.ablaufTitel}</p>
          <ol className="mt-5 grid border-t border-paper/25 sm:grid-cols-2 lg:grid-cols-4">
            {t.ueber.ablauf.map((a, i) => (
              <li key={a.titel} className="border-b border-paper/15 py-6 sm:pr-8 lg:border-b-0 lg:border-l lg:px-6 lg:first:border-l-0 lg:first:pl-0">
                <p className="mono text-xs text-signal">{String(i + 1).padStart(2, "0")}</p>
                <p className="font-display mt-4 text-2xl font-bold">{a.titel}</p>
                <p className="mt-2 text-paper/75">{a.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* RÜCKBLICK */}
      <section id="rueckblick" className="scroll-mt-20">
        <div className={abschnitt}>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <Kicker>{t.rueckblick.kicker}</Kicker>
              <h2 className={h2}>{t.rueckblick.titel}</h2>
            </div>
            <p className="text-lg text-ink-soft">{t.rueckblick.text}</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-2 md:grid-cols-4">
            {auftakt.slice(0, 6).map((f) => (
              <figure key={f.src} className={`relative overflow-hidden bg-paper-deep ${f.breit ? "col-span-2 aspect-[16/10]" : "aspect-square md:aspect-auto"}`}>
                <Image src={f.src} alt={f.alt[l]} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-700 hover:scale-105" />
              </figure>
            ))}
          </div>
          <ul className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-3">
            {e
              .filter((m) => m.bis < heute())
              .map((m) => {
                const cover = fotos[m.slug]?.[0];
                return (
                  <li key={m.slug}>
                    <Link href={m.href} className="group flex h-full flex-col">
                      <div className="relative aspect-[16/9] overflow-hidden bg-forest">
                        {cover ? (
                          <Image src={cover.src} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                        ) : (
                          <div className="muster absolute inset-0 opacity-25" aria-hidden />
                        )}
                      </div>
                      <p className="mono mt-4 flex justify-between gap-4 border-t border-ink pt-3 text-[11px] tracking-[0.12em] text-ink-soft uppercase">
                        <span>{m.artText}</span>
                        <span>{m.datum}</span>
                      </p>
                      <p className="font-display mt-2 text-xl leading-tight font-bold">{m.titel}</p>
                      <p className="mt-auto pt-4 text-sm font-semibold underline-offset-4 group-hover:underline">
                        {t.berichte.module[m.slug] ? <>{t.berichte.kicker} <Pfeil className="ml-1" /></> : t.berichte.folgt}
                      </p>
                    </Link>
                  </li>
                );
              })}
          </ul>
          <p className="mono mt-16 text-xs tracking-[0.14em] text-sage uppercase">{t.rueckblick.gaesteTitel}</p>
          <GaesteHervorgehoben l={l} t={t} />
          <details className="group mt-10">
            <summary className={`cursor-pointer list-none gap-3 [&::-webkit-details-marker]:hidden ${knopfRahmen}`}>
              {t.rueckblick.alleZeigen.replace("{n}", String(eindeutigeGaeste(gaeste).length))}
              <span className="transition group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <div className="mt-6">
              <GaesteListe l={l} t={t} />
            </div>
          </details>
        </div>
      </section>

      <StimmenTeaser l={l} />

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line">
        <div className={`${abschnitt} grid gap-12 lg:grid-cols-[1fr_2fr]`}>
          <div>
            <Kicker>{t.faq.kicker}</Kicker>
            <h2 className={h2}>{t.faq.titel}</h2>
          </div>
          <Faq t={t.faq} />
        </div>
      </section>

      <Kontakt l={l} t={t} />
    </>
  );
}

function Kontakt({ l, t }: { l: Sprache; t: Texte }) {
  return (
    <section id="kontakt" className="scroll-mt-20 bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:px-10">
        <div>
          <p className="font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.95] font-extrabold">{t.kontakt.titel}</p>
          <p className="mt-4 text-lg text-paper/75">{t.kontakt.text}</p>
          <p className="mt-6 max-w-xl border-t border-paper/20 pt-4 text-paper/60">
            <strong className="text-paper">{t.bewerbung.titel}</strong> {t.bewerbungSeite.status}
          </p>
          <a href={pfad(l, "/bewerbung/")} className="mt-6 inline-flex items-center border border-paper/40 px-5 py-3 font-semibold transition hover:bg-paper hover:text-ink">
            {bewerbungOffen ? t.bewerbungSeite.nav : t.hero.ctaVormerken} <Pfeil className="ml-2" />
          </a>
        </div>
        <a
          href="mailto:ses@islamrat.de?subject=SES%20Academy"
          className="font-display group flex items-center justify-between gap-4 bg-signal p-6 text-2xl font-bold text-ink transition hover:bg-paper sm:p-8 sm:text-3xl"
        >
          <span>
            {t.kontakt.cta}
            <span className="mono mt-2 block text-sm font-normal tracking-normal">ses@islamrat.de</span>
          </span>
          <Pfeil className="text-3xl" />
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
            <Pfeil richtung="links" className="mr-1.5" />{t.seminar.zurueck}
          </Link>
          <p className="mt-10 w-fit bg-ink px-4 py-1.5 text-xs font-semibold text-paper">
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

        <ModulAnmeldung l={l} slug={slug} felder={t.bewerbungSeite.felder} />

        {(t.berichte.module[slug] || m.bis < heute()) && (
          <section className="bg-paper-deep/50">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
              <Kicker>{t.berichte.kicker}</Kicker>
              {t.berichte.module[slug] ? (
                <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
                  <div className="space-y-5 text-lg leading-relaxed">
                    {t.berichte.module[slug]!.absaetze.map((a) => (
                      <p key={a}>{a}</p>
                    ))}
                  </div>
                  {t.berichte.module[slug]!.zitate && (
                    <div className="space-y-4">
                      {t.berichte.module[slug]!.zitate!.map((z) => (
                        <figure key={z.text} className="bg-forest p-7 text-paper">
                          <blockquote className="font-serif text-2xl leading-snug italic">{z.text}</blockquote>
                          <figcaption className="mt-3 text-sm">
                            <span className="font-semibold text-signal">{z.wer}</span>
                            <span className="block text-paper/60">{z.quelle}</span>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="font-display mt-6 text-2xl font-bold">{t.berichte.folgt}</p>
              )}
            </div>
          </section>
        )}

        {fotos[slug] && (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
            <p className="font-display text-2xl font-bold">{t.seminar.eindruecke}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              {fotos[slug]!.map((f) => (
                <figure key={f.src} className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
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
            <Link href={vorher.href} className="bg-white/50 p-6 ring-1 ring-line hover:bg-white">
              <p className="text-sm text-ink-soft"><Pfeil richtung="links" className="mr-1.5" />{t.seminar.vorher}</p>
              <p className="font-display mt-2 text-xl font-bold">{vorher.titel}</p>
            </Link>
          ) : (
            <span />
          )}
          {nachher && (
            <Link href={nachher.href} className="bg-white/50 p-6 text-right ring-1 ring-line hover:bg-white">
              <p className="text-sm text-ink-soft">{t.seminar.nachher}<Pfeil className="ml-1.5" /></p>
              <p className="font-display mt-2 text-xl font-bold">{nachher.titel}</p>
            </Link>
          )}
        </nav>
      </article>
      <Kontakt l={l} t={t} />
    </>
  );
}

export function Bewerbungsseite({ l }: { l: Sprache }) {
  const t = texte[l];
  const b = t.bewerbungSeite;
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:px-10">
        <div>
          <Kicker>{b.kicker}</Kicker>
          <h1 className="ohne-trennung font-display mt-6 text-[clamp(3.4rem,11vw,9rem)] leading-[0.86] font-extrabold">
            {b.titel[0]}
            <br />
            <span className="marker">{b.titel[1]}</span>
          </h1>
          <p className="mt-8 max-w-xl text-xl text-ink-soft">{b.intro}</p>
        </div>
        <div className="bg-signal p-7 sm:p-9">
          <p className="font-display text-2xl leading-tight font-extrabold">{t.bewerbung.titel}</p>
          <p className="mt-3 text-lg">{b.status}</p>
        </div>
      </section>

      <section className="bg-forest text-paper">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-10">
          <div>
            <p className="font-display text-3xl font-extrabold">{b.voraussetzungenTitel}</p>
            <ul className="mt-6 space-y-4">
              {b.voraussetzungen.map((v) => (
                <li key={v} className="flex gap-4 text-lg text-paper/85">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal text-sm font-bold text-ink" aria-hidden>✓</span>
                  {v}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold">{b.ablaufTitel}</p>
            <ol className="mt-6 space-y-3">
              {b.ablauf.map((a, i) => (
                <li key={a.titel} className="bg-forest-2 p-6">
                  <p className="font-display text-sm font-bold text-signal">0{i + 1}</p>
                  <p className="font-display mt-2 text-2xl font-bold">{a.titel}</p>
                  <p className="mt-1 text-paper/75">{a.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="formular" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-none font-extrabold">{b.formTitel}</h2>
        <div className="mt-10">
          <BewerbungsFormular t={b} l={l} />
        </div>
      </section>
    </>
  );
}

export function stimmenKarten(l: Sprache): Karte[] {
  const t = texte[l];
  const df = new Intl.DateTimeFormat(locale[l], { day: "numeric", month: "long", year: "numeric" });
  return beitraege.map((b) => ({
    ...b,
    href: pfad(l, `/stimmen/${b.slug}/`),
    modulTitel: b.modul ? t.seminare[b.modul].titel : undefined,
    datumText: df.format(new Date(`${b.datum}T12:00:00Z`)),
  }));
}

export function Stimmenseite({ l }: { l: Sprache }) {
  const t = texte[l].stimmen;
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 sm:pt-16 lg:px-10">
        <Kicker>{t.kicker}</Kicker>
        <h1 className="ohne-trennung font-display mt-6 text-[clamp(3rem,9vw,7.5rem)] leading-[0.88] font-extrabold">
          {t.titel[0]}
          <br />
          <span className="marker">{t.titel[1]}</span>
        </h1>
        <p className="mt-8 max-w-2xl text-xl text-ink-soft">{t.intro}</p>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10">
        <StimmenListe karten={stimmenKarten(l)} t={t} />
        <p className="mt-10 text-sm text-ink-soft">{t.hinweis}</p>
      </section>
    </>
  );
}

export function Beitragsseite({ l, slug }: { l: Sprache; slug: string }) {
  const t = texte[l].stimmen;
  const k = stimmenKarten(l).find((b) => b.slug === slug)!;
  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 pb-24 sm:px-6 sm:pt-16">
      <Link href={pfad(l, "/stimmen/")} className="text-sm font-semibold text-ink-soft hover:text-ink">
        <Pfeil richtung="links" className="mr-1.5" />{t.zurueck}
      </Link>
      <div className="mt-10 flex flex-wrap items-center gap-2 text-xs font-semibold">
        {k.muster && <span className="bg-signal px-2.5 py-1 uppercase">{t.muster}</span>}
        <span className="bg-ink px-2.5 py-1 text-paper">{t.typ[k.typ]}</span>
        <span className="text-ink-soft">{t.laender[k.land]}</span>
      </div>
      <h1 lang={k.sprache} className="font-display mt-6 text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] font-extrabold">{k.titel}</h1>
      <p className="mt-6 text-ink-soft">
        <span className="font-semibold text-ink">{k.autor.name}</span>
        {k.autor.alter ? `, ${k.autor.alter}` : ""}
        {k.autor.stadt ? ` · ${k.autor.stadt}` : ""} · {k.datumText}
        {k.anlass && (
          <>
            <br />
            {t.anlass}: <span lang={k.sprache}>{k.anlass}</span>
          </>
        )}
        {k.extern && (
          <>
            <br />
            {t.erschienenIn}: <span className="font-semibold text-ink">{k.extern.medium}</span>
          </>
        )}
        {k.modul && (
          <>
            <br />
            <Link href={pfad(l, `/seminar/${k.modul}/`)} className="underline underline-offset-4">{k.modulTitel}</Link>
          </>
        )}
      </p>
      {k.youtube && (
        <div className="mt-10">
          <YoutubeKlick id={k.youtube} titel={k.titel} t={t} />
        </div>
      )}
      {k.bild && (
        <div className="relative mt-10 aspect-[4/3] overflow-hidden bg-paper-deep">
          <Image src={k.bild} alt="" fill sizes="768px" className="object-contain" />
        </div>
      )}
      <div lang={k.sprache} className="mt-10 space-y-5 text-xl leading-relaxed">
        {k.text.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {k.extern && (
        <a
          href={k.extern.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex bg-forest px-7 py-4 font-semibold text-paper transition hover:bg-signal hover:text-ink"
        >
          {t.zumArtikel} · {k.extern.medium}
          <Pfeil richtung="extern" className="ml-2" />
        </a>
      )}
      <p className="mt-12 border-t border-line pt-6 text-sm text-ink-soft">{t.hinweis}</p>
    </article>
  );
}

const pressefotos = ["/fotos/yousaf.jpg", "/fotos/yousaf-rohe.jpg", "/fotos/saal.jpg", "/fotos/panel-lebensrealitaeten.jpg"];

export function Presseseite({ l }: { l: Sprache }) {
  const t = texte[l];
  const p = t.presse;
  const auswahl = ["Humza Yousaf", "Prof. Dr. Mathias Rohe", "Hubertus Heil", "Prof. Jocelyne Cesari", "Farid Hafez, Ph.D.", "Dr. Mustafa Cerić", "Mehmet Daimagüler"];
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 sm:pt-16 lg:px-10">
        <Kicker>{p.kicker}</Kicker>
        <h1 className="font-display mt-6 max-w-4xl text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.9] font-extrabold">{p.titel}</h1>
        <p className="mt-8 max-w-2xl text-xl text-ink-soft">{p.intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`/presse/SES-Academy-${l}.pdf`} download className="bg-forest px-7 py-4 font-semibold text-paper transition hover:bg-signal hover:text-ink">
            <Pfeil richtung="runter" className="mr-2" />{p.onepager}
          </a>
          <a href="/brand/ses-logo.png" download="SES-Academy-Logo.png" className="px-7 py-4 font-semibold ring-1 ring-ink/25 transition hover:bg-paper-deep">
            <Pfeil richtung="runter" className="mr-2" />{p.logo}
          </a>
        </div>
      </section>

      <section className="bg-forest text-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-10">
          <div>
            <p className="font-display text-3xl font-extrabold">{p.kurzTitel}</p>
            <div className="mt-6 space-y-4 text-lg text-paper/85">
              {p.kurz.map((k) => (
                <p key={k}>{k}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold">{p.faktenTitel}</p>
            <dl className="mt-6 divide-y divide-paper/15 border-y border-paper/15">
              {p.fakten.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-6">
                  <dt className="text-sm font-semibold text-signal">{k}</dt>
                  <dd className="text-paper/85">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
        <p className="font-display text-3xl font-extrabold">{p.gaesteTitel}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {gaeste
            .filter((g) => auswahl.includes(g.name))
            .map((g) => (
              <li key={g.name} className="bg-white/60 px-4 py-2 ring-1 ring-line">
                <span className="font-semibold">{g.name}</span>
                {g.rolle && <span className="text-ink-soft"> · {g.rolle[l] ?? g.rolle.de}</span>}
              </li>
            ))}
        </ul>

        <p className="font-display mt-16 text-3xl font-extrabold">{p.fotos}</p>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {pressefotos.map((src) => (
            <li key={src}>
              <a href={src} download className="group block">
                <span className="relative block aspect-[4/3] overflow-hidden bg-paper-deep">
                  <Image src={src} alt="" fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover transition group-hover:scale-105" />
                </span>
                <span className="mt-2 block text-sm text-ink-soft"><Pfeil richtung="runter" className="mr-1.5" />{p.fotoCredit}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-6 bg-signal p-8 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold">{p.kontaktTitel}</p>
            <p className="font-display mt-2 text-3xl font-extrabold">Murat Gümüş</p>
            <p>{p.kontaktRolle}</p>
          </div>
          <div className="text-lg">
            <a href="mailto:ses@islamrat.de" className="block font-semibold underline underline-offset-4">ses@islamrat.de</a>
            <a href="tel:+492219422402210" className="block">+49 221 942 240-210</a>
          </div>
        </div>
      </section>
    </>
  );
}

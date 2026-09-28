import Image from "next/image";
import type { Texte } from "@/i18n/typ";

export function Footer({ t }: { t: Texte }) {
  return (
    <footer className="bg-forest text-paper">
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6 lg:px-10">
        <p className="font-display max-w-4xl text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.95] font-extrabold">
          {t.hero.zeilen[0]} {t.hero.zeilen[1]}
          <br />
          <span className="text-signal">{t.hero.zeilen[2]}</span>
        </p>
        <p className="mt-6 max-w-xl text-paper/70">{t.footer.claim}</p>

        <div className="mt-14 grid gap-10 border-t border-paper/15 pt-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <p className="max-w-md text-paper/80">{t.footer.traeger}</p>
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-paper/50 uppercase">{t.footer.kontakt}</p>
            <p className="mt-3 text-paper/85">
              <a href="mailto:ses@islamrat.de" className="underline decoration-paper/30 underline-offset-4 hover:decoration-signal">
                ses@islamrat.de
              </a>
              <br />
              Colonia-Allee 3, 51067 Köln
            </p>
          </div>
          <ul className="space-y-1 text-paper/85">
            <li><a href="https://www.islamrat.de/" className="hover:text-signal">{t.footer.islamrat} ↗</a></li>
            <li><a href="https://www.islamrat.de/impressum/" className="hover:text-signal">{t.footer.impressum} ↗</a></li>
            <li><a href="https://www.islamrat.de/disclaimer/" className="hover:text-signal">{t.footer.datenschutz} ↗</a></li>
          </ul>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-paper/15 pt-8">
          <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-paper px-5 py-3">
            <Image src="/brand/ses-logo.png" alt="SES Academy" width={1196} height={593} className="h-10 w-auto" />
            <span className="h-8 w-px bg-line" aria-hidden />
            <Image src="/brand/islamrat.png" alt="Islamrat für die Bundesrepublik Deutschland" width={1798} height={435} className="h-7 w-auto" />
            <span className="h-8 w-px bg-line" aria-hidden />
            <Image src="/brand/igmg-jugend.png" alt="IGMG Jugend und Frauenjugend" width={2560} height={597} className="h-7 w-auto" />
          </div>
          <p className="text-sm text-paper/50">© {new Date().getFullYear()} Islamrat für die BRD</p>
        </div>
      </div>
    </footer>
  );
}

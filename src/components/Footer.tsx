import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";

export function Footer() {
  const t = site.traeger;
  return (
    <footer className="relative overflow-hidden bg-forest text-paper">
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6 lg:px-10">
        <p className="font-display max-w-4xl text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.95] font-extrabold">
          Deine Stimme <span className="text-signal">zählt.</span>
          <br />
          Mach was draus.
        </p>

        <div className="mt-16 grid gap-10 border-t border-paper/15 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-paper/50 uppercase">Träger</p>
            <p className="mt-3 text-paper/85">
              {t.name}
              <br />
              in Kooperation mit der {t.partner}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-paper/50 uppercase">Adresse</p>
            <p className="mt-3 text-paper/85">
              {t.adresse[0]}
              <br />
              {t.adresse[1]}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-paper/50 uppercase">Kontakt</p>
            <p className="mt-3 text-paper/85">
              <a href={`mailto:${t.email}`} className="underline decoration-paper/30 underline-offset-4 hover:decoration-signal">
                {t.email}
              </a>
              <br />
              <a href={t.instagram} className="underline decoration-paper/30 underline-offset-4 hover:decoration-signal" target="_blank" rel="noopener noreferrer">
                Instagram @islamratbrd
              </a>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-paper/50 uppercase">Seiten</p>
            <ul className="mt-3 space-y-1 text-paper/85">
              <li><Link href="/programm" className="hover:text-signal">Programm</Link></li>
              <li><Link href="/gaeste" className="hover:text-signal">Gäste</Link></li>
              <li><Link href="/impressum" className="hover:text-signal">Impressum</Link></li>
              <li><Link href="/datenschutz" className="hover:text-signal">Datenschutz</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-paper/15 pt-8">
          <div className="flex items-center gap-4 rounded-2xl bg-paper px-5 py-3">
            <Image src="/brand/ses-logo.png" alt="SES Academy" width={110} height={55} className="h-9 w-auto" />
            <span className="h-8 w-px bg-line" aria-hidden />
            <Image src="/brand/islamrat.png" alt="Islamrat für die Bundesrepublik Deutschland" width={90} height={50} className="h-8 w-auto" />
          </div>
          <p className="text-sm text-paper/50">© {new Date().getFullYear()} SES Academy · Ein Projekt des Islamrats</p>
        </div>
      </div>
    </footer>
  );
}

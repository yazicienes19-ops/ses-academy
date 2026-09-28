"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sprachen, sprachNamen, type Sprache, type Texte } from "@/i18n/typ";

type Props = {
  lang: Sprache;
  start: string;
  nav: Texte["nav"];
  /** Link auf dieselbe Seite in jeder Sprache */
  alternativen: Record<Sprache, string>;
};

export function Header({ lang, start, nav, alternativen }: Props) {
  const [offen, setOffen] = useState(false);
  const [gescrollt, setGescrollt] = useState(false);

  useEffect(() => {
    const onScroll = () => setGescrollt(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `${start}#programm`, label: nav.programm },
    { href: `${start}#kompetenzen`, label: nav.kompetenzen },
    { href: `${start}#rueckblick`, label: nav.rueckblick },
    { href: `${start}#faq`, label: nav.faq },
    { href: `${start}#kontakt`, label: nav.kontakt },
  ];

  const sprachwahl = (
    <ul className="flex items-center gap-1" aria-label="Sprache / Language">
      {sprachen.map((s) => (
        <li key={s}>
          <a
            href={alternativen[s]}
            hrefLang={s}
            lang={s}
            title={sprachNamen[s]}
            aria-current={s === lang ? "true" : undefined}
            className={`block rounded-full px-2.5 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors ${
              s === lang ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
            }`}
          >
            {s}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
        gescrollt || offen ? "bg-paper/95 shadow-[0_1px_0_var(--line)] backdrop-blur" : "bg-paper"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href={start} className="relative block h-12 w-[120px] shrink-0 sm:w-[140px]" aria-label="SES Academy">
          <Image src="/brand/ses-logo.png" alt="SES Academy" fill sizes="140px" className="object-contain object-left" priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation">
          {links.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-[15px] font-medium text-ink transition-colors hover:bg-paper-deep">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden sm:block lg:ml-0">{sprachwahl}</div>

        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
          aria-expanded={offen}
          aria-controls="mobilnav"
          aria-label={offen ? nav.schliessen : nav.menue}
        >
          <span className="relative block h-3 w-6">
            <span className={`absolute left-0 h-0.5 w-6 bg-ink transition-transform ${offen ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-0.5 w-6 bg-ink transition-transform ${offen ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      <nav id="mobilnav" className={`border-t border-line lg:hidden ${offen ? "block" : "hidden"}`} aria-label="Navigation">
        <ul className="px-4 py-3">
          {links.map((n) => (
            <li key={n.href}>
              <a href={n.href} onClick={() => setOffen(false)} className="font-display block py-2.5 text-3xl font-bold">
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-3 py-4 sm:hidden">{sprachwahl}</div>
      </nav>
    </header>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SprachMenue } from "./SprachWahl";
import type { Sprache, Texte } from "@/i18n/typ";

type Props = {
  lang: Sprache;
  start: string;
  nav: Texte["nav"];
  bewerben: { href: string; label: string };
  stimmen: { href: string; label: string };
};

export function Header({ lang, start, nav, bewerben, stimmen }: Props) {
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
    { href: stimmen.href, label: stimmen.label },
    { href: `${start}#faq`, label: nav.faq },
    { href: `${start}#kontakt`, label: nav.kontakt },
  ];

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

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <SprachMenue lang={lang} />
          <a href={bewerben.href} className="hidden rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-forest sm:block">
            {bewerben.label}
          </a>
        </div>

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
          <li>
            <a href={bewerben.href} className="font-display mt-2 block rounded-2xl bg-signal px-4 py-3 text-3xl font-bold">
              {bewerben.label} →
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}

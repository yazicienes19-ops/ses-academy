"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { href: "/programm", label: "Programm" },
  { href: "/gaeste", label: "Gäste" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
];

export function Header() {
  const pathname = usePathname();
  const [offen, setOffen] = useState(false);
  const [gescrollt, setGescrollt] = useState(false);

  useEffect(() => {
    const onScroll = () => setGescrollt(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
        gescrollt || offen ? "bg-paper/95 shadow-[0_1px_0_var(--line)] backdrop-blur" : "bg-paper"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="relative block h-14 w-[150px] shrink-0 sm:w-[170px]" aria-label="SES Academy – Startseite">
          <Image src="/brand/ses-logo.png" alt="SES Academy" fill sizes="170px" className="object-contain object-left" priority />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
          {nav.map((n) => {
            const aktiv = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
                  aktiv ? "bg-ink text-paper" : "text-ink hover:bg-paper-deep"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full md:hidden"
          aria-expanded={offen}
          aria-controls="mobilnav"
          aria-label={offen ? "Menü schließen" : "Menü öffnen"}
        >
          <span className="relative block h-3 w-6">
            <span className={`absolute left-0 h-0.5 w-6 bg-ink transition-transform ${offen ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-0.5 w-6 bg-ink transition-transform ${offen ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      <nav
        id="mobilnav"
        className={`overflow-hidden border-t border-line md:hidden ${offen ? "block" : "hidden"}`}
        aria-label="Mobile Navigation"
      >
        <ul className="px-4 py-4">
          {nav.map((n) => (
            <li key={n.href}>
              <Link href={n.href} onClick={() => setOffen(false)} className="font-display block py-3 text-3xl font-bold">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sprachen, sprachNamen, type Sprache } from "@/i18n/typ";

/** Dieselbe Seite in einer anderen Sprache: "/en/seminar/auftakt/" → "/tr/seminar/auftakt/". */
function gleicheSeite(pfadname: string, ziel: Sprache): string {
  const rest = pfadname.replace(/^\/(tr|en|fr|nl)(?=\/|$)/, "") || "/";
  return ziel === "de" ? rest : `/${ziel}${rest === "/" ? "/" : rest}`;
}

function Globus() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
    </svg>
  );
}

function Eintrag({ s, lang, href }: { s: Sprache; lang: Sprache; href: string }) {
  const aktiv = s === lang;
  return (
    <a
      href={href}
      hrefLang={s}
      lang={s}
      aria-current={aktiv ? "page" : undefined}
      className={`flex items-center justify-between gap-6 rounded-xl px-3 py-2.5 transition-colors ${
        aktiv ? "bg-ink text-paper" : "hover:bg-paper-deep"
      }`}
    >
      <span className="font-medium">{sprachNamen[s]}</span>
      <span className={`text-xs font-bold uppercase ${aktiv ? "text-signal" : "text-ink-soft"}`}>{aktiv ? "✓" : s}</span>
    </a>
  );
}

/** Aufklappmenü für Desktop. */
export function SprachMenue({ lang }: { lang: Sprache }) {
  const pfadname = usePathname();
  const [offen, setOffen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    const klick = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOffen(false);
    const taste = (e: KeyboardEvent) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        aria-haspopup="true"
        aria-label={`Sprache / Language: ${sprachNamen[lang]}`}
        className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-ink/15 transition hover:bg-paper-deep"
      >
        <Globus />
        <span className="uppercase">{lang}</span>
        <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${offen ? "rotate-180" : ""}`} aria-hidden>
          <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {offen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-paper p-2 shadow-[0_12px_40px_rgb(19_32_26/0.18)] ring-1 ring-line">
          {sprachen.map((s) => (
            <Eintrag key={s} s={s} lang={lang} href={gleicheSeite(pfadname, s)} />
          ))}
        </div>
      )}
    </div>
  );
}

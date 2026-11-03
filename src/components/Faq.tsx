"use client";

import { useId, useState } from "react";
import type { Texte } from "@/i18n/typ";
import { Pfeil } from "./Pfeil";

export function Faq({ t }: { t: Texte["faq"] }) {
  const [suche, setSuche] = useState("");
  const id = useId();
  const q = suche.trim().toLocaleLowerCase();
  const treffer = t.liste.filter((f) =>
    !q ? true : [f.frage, ...f.antwort, ...(f.punkte ?? []), f.nachsatz ?? ""].join(" ").toLocaleLowerCase().includes(q),
  );

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {t.suche}
      </label>
      <input
        id={id}
        type="search"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        placeholder={t.suche}
        className="w-full border-b border-ink bg-transparent px-1 py-4 text-lg outline-none placeholder:text-ink-soft/60 focus:border-forest focus:bg-white/40"
      />
      {treffer.length === 0 ? (
        <p className="mt-6 border-t border-line py-6 text-lg text-ink-soft">{t.keineTreffer}</p>
      ) : (
        <div className="mt-6 grid gap-x-12 md:grid-cols-2">
          {[treffer.slice(0, Math.ceil(treffer.length / 2)), treffer.slice(Math.ceil(treffer.length / 2))].map((spalte, si) => (
            <div key={si} className={`divide-y divide-line border-y border-line ${si === 1 ? "border-t-0 md:border-t" : ""}`}>
              {spalte.map((f) => (
              <details key={f.frage} className="group" open={q.length > 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-lg leading-snug font-bold sm:text-xl">{f.frage}</span>
                  <span
                    className="mono flex h-9 w-9 shrink-0 items-center justify-center border border-ink text-xl leading-none text-ink transition-transform group-hover:bg-ink group-hover:text-paper group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <div className="space-y-3 pb-6 text-ink-soft">
                  {f.antwort.map((a) => (
                    <p key={a}>{a}</p>
                  ))}
                  {f.punkte && (
                    <ul className="space-y-1.5 pl-1">
                      {f.punkte.map((p) => (
                        <li key={p} className="flex gap-3">
                          <Pfeil className="mt-[0.3em] text-sage" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                  {f.nachsatz && <p>{f.nachsatz}</p>}
                </div>
              </details>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

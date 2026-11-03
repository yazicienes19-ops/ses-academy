"use client";

import { useId, useRef, useState } from "react";
import type { Texte } from "@/i18n/typ";

/**
 * Editorial-Accordion: immer genau ein Punkt offen (Start: 01). Klick öffnet; mit Maus genügt Überfahren.
 * Hover reagiert nur auf echte Mausbewegung + kurze Verzögerung, damit beim Auf-/Zuklappen
 * (Liste verschiebt sich unter dem Zeiger) keine Kettenreaktion entsteht.
 */
export function KompetenzenAkkordeon({ liste }: { liste: Texte["kompetenzen"]["liste"] }) {
  const [offen, setOffen] = useState(0);
  const basis = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const vorschau = (i: number) => {
    if (i === offen || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOffen(i), 140);
  };

  return (
    <ol className="border-y border-ink">
      {liste.map((k, i) => {
        const auf = offen === i;
        const kopf = `${basis}-k${i}`;
        const inhalt = `${basis}-i${i}`;
        return (
          <li key={k.name} className="border-t border-line first:border-t-0" onMouseMove={() => vorschau(i)} onMouseLeave={() => clearTimeout(timer.current)}>
            <h3>
              <button
                id={kopf}
                type="button"
                aria-expanded={auf}
                aria-controls={inhalt}
                onClick={() => {
                  clearTimeout(timer.current);
                  setOffen(i);
                }}
                className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-4 text-left sm:grid-cols-[3rem_auto_1fr_auto]"
              >
                <span className="mono text-xs text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                <span className={`font-display text-3xl font-extrabold transition-colors sm:text-4xl ${auf ? "text-ink" : "text-ink/80 group-hover:text-sage"}`}>
                  {k.name}
                </span>
                <span
                  className={`hidden truncate text-right text-sm text-ink-soft transition-opacity sm:block ${auf ? "opacity-0" : "opacity-100"}`}
                  aria-hidden={auf}
                >
                  {k.kurz}
                </span>
                <span className={`mono justify-self-end text-lg leading-none transition-transform duration-300 ${auf ? "rotate-45" : ""}`} aria-hidden>
                  +
                </span>
              </button>
            </h3>
            <div
              id={inhalt}
              role="region"
              aria-labelledby={kopf}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${auf ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden" inert={!auf}>
                <div className="pb-5 pl-[3.5rem] sm:pl-[4rem]">
                  <p className="text-lg font-semibold">{k.kurz}</p>
                  <p className="mt-1 max-w-xl text-ink-soft">{k.text}</p>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

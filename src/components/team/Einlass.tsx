"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { abhaken, scannen, zuruecknehmen } from "@/lib/aktionen/einlass";
import { anmeldestatus, deute, uhrzeit, zugehoerigkeit, type EinlassAntwort, type EinlassErgebnis, type Zaehler } from "@/lib/einlass";
import { istGueltigesFormat, kurzcodeAnzeige, normalisiereCode } from "@/lib/codes";
import { Scanner } from "./Scanner";

export type ListenEintrag = {
  participant_id: string;
  display_name: string;
  affiliation_status: keyof typeof zugehoerigkeit;
  short_code: string;
  registration_status: keyof typeof anmeldestatus;
  attendance_id: string | null;
  checked_in_at: string | null;
};

type Props = {
  tagId: string;
  ticketNoetig: boolean;
  zaehler: Zaehler | null;
  /** null = Rolle darf die Liste nicht sehen (Einlass-Helfer:innen) */
  liste: ListenEintrag[] | null;
  darfZeitfensterIgnorieren: boolean;
};

const tonKlassen = {
  gruen: "bg-emerald-100 text-emerald-950 ring-emerald-600",
  gelb: "bg-amber-100 text-amber-950 ring-amber-500",
  rot: "bg-red-100 text-red-950 ring-red-600",
};

export function Einlass({ tagId, ticketNoetig, zaehler: start, liste, darfZeitfensterIgnorieren }: Props) {
  const router = useRouter();
  const eingabeRef = useRef<HTMLInputElement>(null);
  const [zaehler, setZaehler] = useState(start);
  const [ergebnis, setErgebnis] = useState<EinlassErgebnis | null>(null);
  const [code, setCode] = useState("");
  const [zeitfensterIgnorieren, setZeitfensterIgnorieren] = useState(false);
  const [suche, setSuche] = useState("");
  const [laeuft, starte] = useTransition();

  const uebernehmen = useCallback((antwort: EinlassAntwort) => {
    setErgebnis(antwort.ergebnis);
    if (antwort.zaehler) setZaehler(antwort.zaehler);
    navigator.vibrate?.(antwort.ergebnis.result === "checked_in" ? 80 : [80, 60, 80]);
    if (liste) router.refresh();
  }, [liste, router]);

  const vomScanner = useCallback(async (inhalt: string) => {
    uebernehmen(await scannen(tagId, inhalt, "qr", zeitfensterIgnorieren));
  }, [tagId, zeitfensterIgnorieren, uebernehmen]);

  function codeAbsenden(e: React.FormEvent) {
    e.preventDefault();
    const normal = normalisiereCode(code);
    if (!istGueltigesFormat(normal)) {
      setErgebnis({ result: "invalid_code" });
      return;
    }
    starte(async () => {
      uebernehmen(await scannen(tagId, normal, "short_code", zeitfensterIgnorieren));
      setCode("");
      eingabeRef.current?.focus();
    });
  }

  const gefiltert = liste?.filter((p) => {
    const s = suche.trim().toLowerCase();
    return !s || p.display_name.toLowerCase().includes(s) || p.short_code.toLowerCase().startsWith(normalisiereCode(s).toLowerCase());
  });

  return (
    <div className="grid gap-6">
      {zaehler && (
        <section aria-label="Live-Stand" className="rounded-3xl bg-white/80 p-6 text-center ring-1 ring-line">
          <p className="font-display text-6xl font-bold tabular-nums">
            {zaehler.checked_in}
            <span className="text-3xl text-ink-soft"> von {zaehler.expected}</span>
          </p>
          <p className="mt-1 font-semibold">eingecheckt</p>
          <p className="mt-2 text-sm text-ink-soft">{zaehler.waitlist} auf der Warteliste · {zaehler.excused} entschuldigt oder abgemeldet</p>
        </section>
      )}

      {ergebnis && <Ergebniskarte ergebnis={ergebnis} />}

      <section className="rounded-3xl bg-white/60 p-5 ring-1 ring-line">
        {ticketNoetig ? (
          <Scanner onCode={vomScanner} onKeineKamera={() => eingabeRef.current?.focus()} />
        ) : (
          <p className="rounded-2xl bg-amber-100 p-4 text-amber-950">Für dieses Modul gibt es kein Ticket. Bitte die Anwesenheit über die Liste abhaken.</p>
        )}

        <form onSubmit={codeAbsenden} className="mt-6">
          <label htmlFor="kurzcode" className="mb-1.5 block font-semibold">Kurzcode eingeben</label>
          <div className="flex gap-2">
            <input
              ref={eingabeRef} id="kurzcode" value={code} onChange={(e) => setCode(e.target.value)}
              autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="A1B2-C3D4"
              className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-4 font-mono text-2xl tracking-widest uppercase ring-1 ring-line outline-none focus:ring-2 focus:ring-ink"
            />
            <button type="submit" disabled={laeuft || !code.trim()} className="shrink-0 rounded-2xl bg-ink px-6 font-semibold text-paper disabled:opacity-50">
              Prüfen
            </button>
          </div>
        </form>

        {darfZeitfensterIgnorieren && (
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={zeitfensterIgnorieren} onChange={(e) => setZeitfensterIgnorieren(e.target.checked)} className="h-4 w-4" />
            Einlass auch außerhalb des Zeitfensters zulassen (nur Vorstand und Admin)
          </label>
        )}
      </section>

      {gefiltert && (
        <section className="rounded-3xl bg-white/60 p-5 ring-1 ring-line">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Anwesenheitsliste</h2>
            <input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Name oder Code suchen"
              className="rounded-full bg-white px-4 py-2 ring-1 ring-line outline-none focus:ring-2 focus:ring-ink" />
          </div>
          <ul className="mt-4 divide-y divide-line">
            {gefiltert.map((p) => (
              <li key={p.participant_id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="mr-auto min-w-0">
                  <p className="truncate font-semibold">{p.display_name}</p>
                  <p className="text-sm text-ink-soft">
                    {zugehoerigkeit[p.affiliation_status]} · {kurzcodeAnzeige(p.short_code)}
                    {p.registration_status !== "confirmed" && ` · ${anmeldestatus[p.registration_status]}`}
                  </p>
                </div>
                {p.checked_in_at ? (
                  <>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-950">da seit {uhrzeit(p.checked_in_at, false)}</span>
                    <button type="button" disabled={laeuft} onClick={() => {
                      if (!confirm(`Check-in von ${p.display_name} zurücknehmen?`)) return;
                      starte(async () => { await zuruecknehmen(p.attendance_id!); router.refresh(); });
                    }} className="text-sm font-semibold text-ink-soft underline">
                      zurücknehmen
                    </button>
                  </>
                ) : p.registration_status === "confirmed" ? (
                  <button type="button" disabled={laeuft} onClick={() => starte(async () => uebernehmen(await abhaken(tagId, p.participant_id, zeitfensterIgnorieren)))}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
                    Abhaken
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {gefiltert.length === 0 && <p className="mt-4 text-ink-soft">Keine Einträge.</p>}
        </section>
      )}
    </div>
  );
}

function Ergebniskarte({ ergebnis }: { ergebnis: EinlassErgebnis }) {
  const { ton, titel, text } = deute(ergebnis);
  return (
    <section role="status" aria-live="assertive" className={`rounded-3xl p-6 ring-2 ${tonKlassen[ton]}`}>
      {ergebnis.display_name && <p className="font-display text-4xl font-bold leading-tight">{ergebnis.display_name}</p>}
      <p className={`${ergebnis.display_name ? "mt-2 text-lg" : "font-display text-3xl"} font-bold`}>{titel}</p>
      {text && <p className="mt-1">{text}</p>}
      {ergebnis.display_name && (
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {ergebnis.affiliation_status && <div><dt className="opacity-70">Zugehörigkeit</dt><dd className="font-semibold">{zugehoerigkeit[ergebnis.affiliation_status]}</dd></div>}
          {ergebnis.module_title && <div><dt className="opacity-70">Veranstaltung</dt><dd className="font-semibold">{ergebnis.module_title}</dd></div>}
          {ergebnis.registration_status && <div><dt className="opacity-70">Anmeldung</dt><dd className="font-semibold">{anmeldestatus[ergebnis.registration_status]}</dd></div>}
        </dl>
      )}
    </section>
  );
}

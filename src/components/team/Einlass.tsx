"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { abhaken, scannen, walkIn, zuruecknehmen } from "@/lib/aktionen/einlass";
import { istGueltigesFormat, kurzcodeAnzeige, normalisiereCode } from "@/lib/codes";
import { anmeldestatus, deute, uhrzeit, zugehoerigkeit, type EinlassAntwort, type EinlassErgebnis, type Zaehler } from "@/lib/einlass";
import { aufraeumen, listeSpeichern, offlinePruefen, warteschlange, warteschlangeAbonnieren, warteschlangeSetzen, type OfflineEintrag } from "@/lib/offline-einlass";
import { Scanner } from "./Scanner";

export type ListenEintrag = OfflineEintrag & { attendance_id: string | null };

type Props = {
  tagId: string;
  modulTitel: string;
  ticketNoetig: boolean;
  zaehler: Zaehler | null;
  /** Schlanke Liste für den Offline-Modus (alle Rollen; wird nicht angezeigt). */
  offlineListe: OfflineEintrag[];
  /** Sichtbare Anwesenheitsliste; null = Rolle darf sie nicht sehen (Einlass-Helfer:innen). */
  liste: ListenEintrag[] | null;
  darfZeitfensterIgnorieren: boolean;
  darfWalkIn: boolean;
};

const tonKlassen = {
  gruen: "bg-emerald-100 text-emerald-950 ring-emerald-600",
  gelb: "bg-amber-100 text-amber-950 ring-amber-500",
  rot: "bg-red-100 text-red-950 ring-red-600",
};

const LIVE_ABSTAND_MS = 30_000;

export function Einlass({ tagId, modulTitel, ticketNoetig, zaehler: start, offlineListe, liste, darfZeitfensterIgnorieren, darfWalkIn }: Props) {
  const router = useRouter();
  const eingabeRef = useRef<HTMLInputElement>(null);
  const [zaehler, setZaehler] = useState(start);
  const [letzterStart, setLetzterStart] = useState(start);
  if (start !== letzterStart) {
    // frischer Stand vom Server (Live-Aktualisierung)
    setLetzterStart(start);
    setZaehler(start);
  }
  const [ergebnis, setErgebnis] = useState<EinlassErgebnis | null>(null);
  const [code, setCode] = useState("");
  const [zeitfensterIgnorieren, setZeitfensterIgnorieren] = useState(false);
  const [suche, setSuche] = useState("");
  const offen = useSyncExternalStore(warteschlangeAbonnieren, () => warteschlange().length, () => 0); // Scans in der Warteschlange
  const [syncMeldung, setSyncMeldung] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [laeuft, starte] = useTransition();
  const synchronisiertRef = useRef(false);

  // Frische Daten vom Server übernehmen und für den Offline-Fall speichern
  useEffect(() => {
    aufraeumen();
    if (offlineListe.length) {
      // Lokal vorgemerkte, noch nicht übertragene Scans nicht überschreiben
      const vorgemerkt = new Map(warteschlange().filter((s) => s.tagId === tagId).map((s) => [s.participantId, s.gescanntUm]));
      listeSpeichern(tagId, modulTitel, offlineListe.map((e) => ({ ...e, checked_in_at: e.checked_in_at ?? vorgemerkt.get(e.participant_id) ?? null })));
    }
  }, [offlineListe, tagId, modulTitel]);

  const synchronisieren = useCallback(async () => {
    const scans = warteschlange();
    if (!scans.length) return;
    let ok = 0;
    const abgelehnt: string[] = [];
    const rest = [];
    for (const s of scans) {
      try {
        const a = await scannen(s.tagId, s.code, "offline_sync", false, s.gescanntUm);
        if (a.ergebnis.result === "checked_in" || a.ergebnis.result === "already_checked_in") ok++;
        else abgelehnt.push(`${s.name}: ${deute(a.ergebnis).titel}`);
        if (s.tagId === tagId && a.zaehler) setZaehler(a.zaehler);
      } catch {
        rest.push(s); // immer noch offline
      }
    }
    warteschlangeSetzen(rest);
    if (ok || abgelehnt.length) {
      setSyncMeldung(`${ok} Offline-Check-in${ok === 1 ? "" : "s"} übertragen.${abgelehnt.length ? ` Nicht übernommen: ${abgelehnt.join("; ")}` : ""}`);
      router.refresh();
    }
  }, [router, tagId]);

  // Online/offline verfolgen, beim Wiederverbinden automatisch übertragen, sonst alle 30 s live aktualisieren
  useEffect(() => {
    const aktualisieren = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) synchronisieren();
    };
    aktualisieren();
    window.addEventListener("online", aktualisieren);
    window.addEventListener("offline", aktualisieren);
    const takt = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible") router.refresh();
    }, LIVE_ABSTAND_MS);
    return () => {
      window.removeEventListener("online", aktualisieren);
      window.removeEventListener("offline", aktualisieren);
      clearInterval(takt);
    };
  }, [router, synchronisieren]);

  useEffect(() => {
    if (!synchronisiertRef.current && offen > 0 && navigator.onLine) {
      synchronisiertRef.current = true;
      synchronisieren();
    }
  }, [offen, synchronisieren]);

  const zeigen = useCallback((e: EinlassErgebnis) => {
    setErgebnis(e);
    const gut = e.result === "checked_in" || e.result === "offline_vorgemerkt";
    navigator.vibrate?.(gut ? 80 : [80, 60, 80]);
  }, []);

  const uebernehmen = useCallback((antwort: EinlassAntwort) => {
    zeigen(antwort.ergebnis);
    if (antwort.zaehler) setZaehler(antwort.zaehler);
    if (liste) router.refresh();
  }, [liste, router, zeigen]);

  /** Erst online versuchen; ohne Verbindung gegen die gespeicherte Liste prüfen. */
  const pruefen = useCallback(async (roh: string, methode: "qr" | "short_code") => {
    const normal = normalisiereCode(roh);
    if (!istGueltigesFormat(normal)) {
      zeigen({ result: "invalid_code" });
      return;
    }
    if (navigator.onLine) {
      try {
        uebernehmen(await scannen(tagId, normal, methode, zeitfensterIgnorieren));
        return;
      } catch {
        /* Server nicht erreichbar: weiter mit offline */
      }
    }
    setOnline(false);
    zeigen(await offlinePruefen(tagId, normal));
    synchronisiertRef.current = false;
  }, [tagId, zeitfensterIgnorieren, uebernehmen, zeigen]);

  const vomScanner = useCallback((inhalt: string) => pruefen(inhalt, "qr"), [pruefen]);

  function codeAbsenden(e: React.FormEvent) {
    e.preventDefault();
    starte(async () => {
      await pruefen(code, "short_code");
      setCode("");
      eingabeRef.current?.focus();
    });
  }

  function walkInAbsenden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formular = e.currentTarget;
    const daten = new FormData(formular);
    starte(async () => {
      try {
        const antwort = await walkIn(tagId, daten);
        uebernehmen(antwort);
        if (antwort.ergebnis.result === "checked_in") formular.reset();
      } catch {
        zeigen({ result: "fehler" });
      }
    });
  }

  const gefiltert = liste?.filter((p) => {
    const s = suche.trim().toLowerCase();
    return !s || p.display_name.toLowerCase().includes(s) || p.short_code.toLowerCase().startsWith(normalisiereCode(s).toLowerCase());
  });

  return (
    <div className="grid gap-6">
      {(!online || offen > 0 || syncMeldung) && (
        <section role="status" className={`rounded-3xl p-4 ring-1 ${online ? "bg-white/80 ring-line" : "bg-amber-100 text-amber-950 ring-amber-500"}`}>
          {!online && <p className="font-semibold">Offline: Scans werden auf diesem Gerät geprüft und vorgemerkt.</p>}
          {offen > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p>{offen} Check-in{offen === 1 ? "" : "s"} warten auf Übertragung.</p>
              <button type="button" onClick={() => starte(synchronisieren)} disabled={laeuft || !online} className="knopf">
                Jetzt synchronisieren
              </button>
            </div>
          )}
          {syncMeldung && <p className="mt-1">{syncMeldung}</p>}
        </section>
      )}

      {zaehler && (
        <section aria-label="Live-Stand" className="rounded-3xl bg-white/80 p-6 text-center ring-1 ring-line">
          <p className="font-display text-6xl font-bold tabular-nums">
            {zaehler.checked_in}
            <span className="text-3xl text-ink-soft"> von {zaehler.expected}</span>
          </p>
          <p className="mt-1 font-semibold">eingecheckt{offen > 0 ? ` (+${offen} offline vorgemerkt)` : ""}</p>
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

      {darfWalkIn && (
        <details className="rounded-3xl bg-white/60 p-5 ring-1 ring-line">
          <summary className="cursor-pointer font-display text-xl font-bold">Walk-in: nicht angemeldete Person erfassen</summary>
          <form onSubmit={walkInAbsenden} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="wi-vorname" className="etikett">Vorname</label><input id="wi-vorname" name="vorname" required className="feld" /></div>
            <div><label htmlFor="wi-nachname" className="etikett">Nachname</label><input id="wi-nachname" name="nachname" className="feld" /></div>
            <div>
              <label htmlFor="wi-email" className="etikett">E-Mail (optional, dann kommt das Ticket per Mail)</label>
              <input id="wi-email" name="email" type="email" className="feld" />
            </div>
            <div>
              <label htmlFor="wi-zugehoerigkeit" className="etikett">Zugehörigkeit</label>
              <select id="wi-zugehoerigkeit" name="zugehoerigkeit" defaultValue="guest" className="feld">
                {Object.entries(zugehoerigkeit).map(([w, n]) => <option key={w} value={w}>{n}</option>)}
              </select>
            </div>
            <label className="flex gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="einwilligung" value="ja" required className="mt-0.5 h-4 w-4 shrink-0" />
              Die Person ist einverstanden, dass ihre Angaben zur Organisation der SES Academy verarbeitet werden.
            </label>
            <button type="submit" disabled={laeuft || !online} className="knopf sm:justify-self-start">Erfassen und einchecken</button>
            {!online && <p className="text-sm text-ink-soft sm:col-span-2">Walk-ins brauchen Internet.</p>}
          </form>
        </details>
      )}

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
                    <button type="button" disabled={laeuft || !p.attendance_id} onClick={() => {
                      if (!confirm(`Check-in von ${p.display_name} zurücknehmen?`)) return;
                      starte(async () => { await zuruecknehmen(p.attendance_id!); router.refresh(); });
                    }} className="text-sm font-semibold text-ink-soft underline">
                      zurücknehmen
                    </button>
                  </>
                ) : p.registration_status === "confirmed" ? (
                  <button type="button" disabled={laeuft || !online} onClick={() => starte(async () => uebernehmen(await abhaken(tagId, p.participant_id, zeitfensterIgnorieren)))}
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

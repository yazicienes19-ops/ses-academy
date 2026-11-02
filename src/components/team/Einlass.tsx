"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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
const FRIST_MS = 6_000; // so lange auf den Server warten, dann offline weiter
const PROBE_ABSTAND_MS = 10_000; // im Offline-Zustand so oft prüfen, ob der Server wieder erreichbar ist

/** Server-Aktion mit Zeitgrenze: hängt das WLAN, geht es nach FRIST_MS offline weiter statt ohne Rückmeldung zu warten. */
function mitFrist<T>(anfrage: Promise<T>): Promise<T> {
  return Promise.race([anfrage, new Promise<never>((_, nein) => setTimeout(() => nein(new Error("zeitueberschreitung")), FRIST_MS))]);
}

/** Für die Suche: Groß/Klein und türkische/deutsche Sonderzeichen egal („gul“ findet „Gül“, „yilmaz“ findet „Yılmaz“). */
function suchform(text: string) {
  return text.toLocaleLowerCase("de").replace(/ı/g, "i").replace(/ß/g, "ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

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
  /** false, sobald eine Anfrage scheitert (auch bei „WLAN verbunden, aber kein Internet“); die Probe setzt es zurück. */
  const [online, setOnline] = useState(true);
  const onlineRef = useRef(true);
  // Eigener Zähler statt useTransition: die Knöpfe sind nach der Zeitgrenze wieder frei, auch wenn die hängende
  // Anfrage im Hintergrund noch läuft (eine Transition bliebe so lange „pending“)
  const [offeneArbeiten, setOffeneArbeiten] = useState(0);
  const laeuft = offeneArbeiten > 0;
  const starte = useCallback((arbeit: () => Promise<unknown>) => {
    setOffeneArbeiten((n) => n + 1);
    void arbeit().finally(() => setOffeneArbeiten((n) => n - 1));
  }, []);
  const synchronisiertRef = useRef(false);
  const karteRef = useRef<HTMLDivElement>(null);
  const [ergebnisZeit, setErgebnisZeit] = useState<string | null>(null);
  /** Rückmeldung direkt in der Listenzeile (am Handy ist die Ergebniskarte dort nicht im Blick). */
  const [zeilenHinweis, setZeilenHinweis] = useState<{ id: string; ergebnis: EinlassErgebnis } | null>(null);
  const [doppelt, setDoppelt] = useState(false); // Walk-in: Name schon angemeldet, „Trotzdem neu anlegen“ anbieten

  const verbindung = useCallback((da: boolean) => {
    onlineRef.current = da;
    setOnline(da);
  }, []);

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
        const a = await mitFrist(scannen(s.tagId, s.code, "offline_sync", false, s.gescanntUm));
        verbindung(true);
        if (a.ergebnis.result === "checked_in" || a.ergebnis.result === "already_checked_in") ok++;
        else abgelehnt.push(`${s.name}: ${deute(a.ergebnis).titel}`);
        if (s.tagId === tagId && a.zaehler) setZaehler(a.zaehler);
      } catch {
        rest.push(s); // immer noch offline
      }
    }
    if (rest.length) verbindung(false);
    warteschlangeSetzen(rest);
    if (ok || abgelehnt.length) {
      setSyncMeldung(`${ok} Offline-Check-in${ok === 1 ? "" : "s"} übertragen.${abgelehnt.length ? ` Nicht übernommen: ${abgelehnt.join("; ")}` : ""}`);
      router.refresh();
    }
  }, [router, tagId, verbindung]);

  // Online/offline verfolgen, beim Wiederverbinden automatisch übertragen, sonst alle 30 s live aktualisieren
  useEffect(() => {
    const aktualisieren = () => {
      verbindung(navigator.onLine);
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
  }, [router, synchronisieren, verbindung]);

  // Offline: regelmäßig prüfen, ob der Server wieder antwortet. navigator.onLine allein merkt ein hängendes WLAN nicht.
  useEffect(() => {
    if (online) return;
    const probe = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const antwort = await fetch(window.location.href, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(5_000) });
        if (!antwort.ok) return;
        verbindung(true);
        await synchronisieren();
        router.refresh();
      } catch {
        /* weiter offline */
      }
    }, PROBE_ABSTAND_MS);
    return () => clearInterval(probe);
  }, [online, router, synchronisieren, verbindung]);

  useEffect(() => {
    if (!synchronisiertRef.current && offen > 0 && navigator.onLine) {
      synchronisiertRef.current = true;
      synchronisieren();
    }
  }, [offen, synchronisieren]);

  const zeigen = useCallback((e: EinlassErgebnis) => {
    setErgebnis(e);
    setErgebnisZeit(new Date().toISOString());
    const gut = e.result === "checked_in" || e.result === "offline_vorgemerkt";
    navigator.vibrate?.(gut ? 80 : [80, 60, 80]);
  }, []);

  const uebernehmen = useCallback((antwort: EinlassAntwort) => {
    zeigen(antwort.ergebnis);
    if (antwort.zaehler) setZaehler(antwort.zaehler);
    if (liste) router.refresh();
  }, [liste, router, zeigen]);

  /** Ergebnis eines Scans oder Kurzcodes: Karte samt Eingabefeld in den Blick holen (am Handy liegt sie sonst außerhalb). */
  const blickRef = useRef(false);
  const inDenBlick = useCallback(() => {
    blickRef.current = true;
  }, []);
  // Erst nach dem Rendern scrollen: die Karte entsteht in einer Transition und steht vorher noch nicht an ihrem Platz
  useEffect(() => {
    if (!blickRef.current) return;
    blickRef.current = false;
    karteRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [ergebnisZeit]);

  /** Erst online versuchen (mit Zeitgrenze); ohne Verbindung gegen die gespeicherte Liste prüfen. */
  const pruefen = useCallback(async (roh: string, methode: "qr" | "short_code") => {
    const normal = normalisiereCode(roh);
    if (!istGueltigesFormat(normal)) {
      zeigen({ result: "invalid_code" });
      inDenBlick();
      return;
    }
    if (navigator.onLine && onlineRef.current) {
      try {
        uebernehmen(await mitFrist(scannen(tagId, normal, methode, zeitfensterIgnorieren)));
        inDenBlick();
        return;
      } catch {
        /* Server nicht erreichbar oder zu langsam: weiter mit offline */
      }
    }
    verbindung(false);
    zeigen(await offlinePruefen(tagId, normal));
    inDenBlick();
    synchronisiertRef.current = false;
  }, [tagId, zeitfensterIgnorieren, uebernehmen, zeigen, inDenBlick, verbindung]);

  const vomScanner = useCallback((inhalt: string) => pruefen(inhalt, "qr"), [pruefen]);

  function codeAbsenden(e: React.FormEvent) {
    e.preventDefault();
    const gesendet = code;
    starte(async () => {
      await pruefen(gesendet, "short_code");
      // Was währenddessen schon für die nächste Person getippt wurde, bleibt stehen
      setCode((jetzt) => (jetzt === gesendet ? "" : jetzt));
      eingabeRef.current?.focus({ preventScroll: true });
    });
  }

  /** Abhaken aus der Liste: Ergebnis in der Zeile zeigen; ohne Verbindung klar sagen, dass nichts gespeichert ist. */
  function listeAbhaken(p: ListenEintrag) {
    starte(async () => {
      try {
        const antwort = await mitFrist(abhaken(tagId, p.participant_id, zeitfensterIgnorieren));
        verbindung(true);
        uebernehmen(antwort);
        setZeilenHinweis(antwort.ergebnis.result === "checked_in" ? null : { id: p.participant_id, ergebnis: antwort.ergebnis });
      } catch {
        verbindung(false);
        setZeilenHinweis({ id: p.participant_id, ergebnis: { result: "fehler" } });
      }
    });
  }

  function listeZuruecknehmen(p: ListenEintrag) {
    if (!p.attendance_id || !confirm(`Check-in von ${p.display_name} zurücknehmen?`)) return;
    starte(async () => {
      let ok = false;
      try {
        ok = await mitFrist(zuruecknehmen(p.attendance_id!));
        verbindung(true);
      } catch {
        verbindung(false);
      }
      if (ok) {
        // Eine Karte „bereits eingecheckt“ für diese Person stimmt jetzt nicht mehr
        if (ergebnis?.participant_id === p.participant_id) setErgebnis(null);
        setZeilenHinweis(null);
        router.refresh();
      } else {
        setZeilenHinweis({ id: p.participant_id, ergebnis: { result: "fehler" } });
      }
    });
  }

  function walkInAbsenden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formular = e.currentTarget;
    const daten = new FormData(formular);
    starte(async () => {
      try {
        const antwort = await mitFrist(walkIn(tagId, daten, zeitfensterIgnorieren));
        verbindung(true);
        uebernehmen(antwort);
        setDoppelt(antwort.ergebnis.result === "possible_duplicate");
        if (antwort.ergebnis.result === "checked_in") formular.reset();
      } catch {
        verbindung(false);
        zeigen({ result: "fehler" });
      }
      inDenBlick();
    });
  }

  // Jedes Suchwort muss im Namen vorkommen, Reihenfolge egal („demir yusuf“ findet „Yusuf Demir“); sortiert wie angezeigt
  const woerter = suchform(suche).split(/\s+/).filter(Boolean);
  const gefiltert = liste
    ?.filter((p) => {
      if (!woerter.length) return true;
      const name = suchform(p.display_name);
      return woerter.every((w) => name.includes(w)) || p.short_code.toLowerCase().startsWith(normalisiereCode(suche).toLowerCase());
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));

  const liveStand = zaehler && (
    <section aria-label="Live-Stand" className="rounded-3xl bg-white/80 p-4 text-center ring-1 ring-line lg:p-6">
      <p className="font-display text-4xl font-bold tabular-nums lg:text-6xl">
        {zaehler.checked_in}
        <span className="text-2xl text-ink-soft lg:text-3xl"> von {zaehler.expected}</span>
      </p>
      <p className="mt-1 font-semibold">eingecheckt{offen > 0 ? ` (+${offen} offline vorgemerkt)` : ""}</p>
      <div className="mx-auto mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-paper-deep" aria-hidden>
        <div className="h-full rounded-full bg-forest" style={{ width: `${zaehler.expected ? Math.min(100, (zaehler.checked_in / zaehler.expected) * 100) : 0}%` }} />
      </div>
      <p className="mt-2 text-sm text-ink-soft">{zaehler.waitlist} auf der Warteliste · {zaehler.excused} entschuldigt oder abgemeldet</p>
    </section>
  );

  const zeitfensterHaken = darfZeitfensterIgnorieren && (
    <label className="mt-4 flex items-center gap-2 text-sm">
      <input type="checkbox" checked={zeitfensterIgnorieren} onChange={(e) => setZeitfensterIgnorieren(e.target.checked)} className="h-4 w-4" />
      Einlass auch außerhalb des Zeitfensters zulassen (nur Vorstand und Admin)
    </label>
  );

  // Am Laptop zweispaltig: links Scanner, Kurzcode und Walk-in, rechts Stand und Liste. Am Handy eine Spalte, Stand oben.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {(!online || offen > 0 || syncMeldung) && (
        <section role="status" className={`rounded-3xl p-4 ring-1 ${online ? "bg-white/80 ring-line" : "bg-amber-100 text-amber-950 ring-amber-500"}`}>
          {!online && <p className="font-semibold">Offline: Scans werden auf diesem Gerät geprüft und vorgemerkt. Die Seite prüft alle 10 Sekunden, ob die Verbindung wieder da ist.</p>}
          {offen > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p>{offen} Check-in{offen === 1 ? "" : "s"} warten auf Übertragung.</p>
              <button type="button" onClick={() => starte(synchronisieren)} disabled={laeuft} className="knopf">
                Jetzt synchronisieren
              </button>
            </div>
          )}
          {syncMeldung && <p className="mt-1">{syncMeldung}</p>}
        </section>
      )}

      {liveStand && <div className="lg:hidden">{liveStand}</div>}

      {!ticketNoetig ? (
        <section className="rounded-3xl bg-amber-100 p-5 text-amber-950 ring-1 ring-amber-500">
          <p className="font-semibold">Für dieses Modul gibt es kein Ticket.</p>
          <p className="mt-1">
            {liste
              ? <>Anwesende bitte in der Anwesenheitsliste abhaken<span className="lg:hidden"> (weiter unten)</span>.</>
              : "Die Anwesenheit hakt das Orga-Team in der Liste ab. Als Einlass-Helfer:in ist hier nichts einzutragen."}
          </p>
          {zeitfensterHaken}
          {ergebnis && <div ref={karteRef} className="mt-4 scroll-mt-20"><Ergebniskarte ergebnis={ergebnis} zeit={ergebnisZeit} /></div>}
        </section>
      ) : (
      <section className="rounded-3xl bg-white/60 p-5 ring-1 ring-line">
        {ergebnis && <div ref={karteRef} className="mb-5 scroll-mt-20"><Ergebniskarte ergebnis={ergebnis} zeit={ergebnisZeit} /></div>}

        <form onSubmit={codeAbsenden}>
          <label htmlFor="kurzcode" className="mb-1.5 block font-semibold">Kurzcode eingeben</label>
          <div className="flex gap-2">
            <input
              ref={eingabeRef} id="kurzcode" value={code} onChange={(e) => setCode(e.target.value)}
              autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="A1B2-C3D4"
              className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-4 font-mono text-2xl tracking-widest uppercase ring-1 ring-line outline-none focus:ring-2 focus:ring-ink"
            />
            <button type="submit" disabled={laeuft || !code.trim()} className="shrink-0 rounded-2xl bg-ink px-6 font-semibold text-paper disabled:opacity-50">
              {laeuft ? "Prüfe …" : "Prüfen"}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <Scanner onCode={vomScanner} onKeineKamera={() => eingabeRef.current?.focus()} />
        </div>

        {zeitfensterHaken}
      </section>
      )}

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
            {doppelt && (
              <label className="flex gap-2 rounded-2xl bg-amber-100 p-3 text-sm text-amber-950 sm:col-span-2">
                <input type="checkbox" name="trotzdem" value="ja" className="mt-0.5 h-4 w-4 shrink-0" />
                Trotzdem als neue Person anlegen (es ist jemand anderes mit gleichem Namen)
              </label>
            )}
            <button type="submit" disabled={laeuft} className="knopf sm:justify-self-start">{laeuft ? "Speichere …" : "Erfassen und einchecken"}</button>
            {!online && <p className="text-sm text-ink-soft sm:col-span-2">Walk-ins brauchen Internet. Ohne Verbindung wird nichts gespeichert.</p>}
          </form>
        </details>
      )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:sticky lg:top-6">
      {liveStand && <div className="hidden lg:block">{liveStand}</div>}
      {gefiltert && (
        <section className="rounded-3xl bg-white/60 p-5 ring-1 ring-line lg:flex lg:max-h-[calc(100vh-15rem)] lg:flex-col">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Anwesenheitsliste</h2>
            <input type="search" aria-label="Name oder Code suchen" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Name oder Code suchen"
              className="rounded-full bg-white px-4 py-2 ring-1 ring-line outline-none focus:ring-2 focus:ring-ink" />
          </div>
          <ul className="mt-4 divide-y divide-line lg:-mr-2 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
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
                    <button type="button" disabled={laeuft || !p.attendance_id} onClick={() => listeZuruecknehmen(p)} className="text-sm font-semibold text-ink-soft underline">
                      zurücknehmen
                    </button>
                  </>
                ) : p.registration_status === "confirmed" ? (
                  <button type="button" disabled={laeuft} onClick={() => listeAbhaken(p)}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">
                    Abhaken
                  </button>
                ) : null}
                {zeilenHinweis?.id === p.participant_id && <ZeilenHinweis ergebnis={zeilenHinweis.ergebnis} />}
              </li>
            ))}
          </ul>
          {gefiltert.length === 0 && <p className="mt-4 text-ink-soft">Keine Einträge.</p>}
        </section>
      )}
      </div>
    </div>
  );
}

function ZeilenHinweis({ ergebnis }: { ergebnis: EinlassErgebnis }) {
  const { ton, titel, text } = deute(ergebnis);
  return (
    <p role="status" className={`w-full rounded-2xl px-3 py-2 text-sm ring-1 ${tonKlassen[ton]}`}>
      <span className="font-semibold">{ergebnis.result === "fehler" ? "Keine Antwort vom Server." : titel}</span>
      {ergebnis.result === "fehler" ? " Springt die Zeile nicht gleich auf „da“, bitte noch einmal tippen." : text ? ` ${text}` : ""}
    </p>
  );
}

function Ergebniskarte({ ergebnis, zeit }: { ergebnis: EinlassErgebnis; zeit: string | null }) {
  const { ton, titel, text } = deute(ergebnis);
  return (
    <section role="status" aria-live="assertive" className={`rounded-3xl p-5 ring-2 sm:p-6 ${tonKlassen[ton]}`}>
      {ergebnis.display_name && <p className="font-display text-3xl font-bold leading-tight sm:text-4xl">{ergebnis.display_name}</p>}
      <p className={`${ergebnis.display_name ? "mt-2 text-lg" : "font-display text-3xl"} font-bold`}>{titel}</p>
      {text && <p className="mt-1">{text}</p>}
      {ergebnis.display_name && (
        <dl className="mt-4 hidden gap-x-6 gap-y-1 text-sm sm:grid sm:grid-cols-3">
          {ergebnis.affiliation_status && <div><dt className="opacity-70">Zugehörigkeit</dt><dd className="font-semibold">{zugehoerigkeit[ergebnis.affiliation_status]}</dd></div>}
          {ergebnis.module_title && <div><dt className="opacity-70">Veranstaltung</dt><dd className="font-semibold">{ergebnis.module_title}</dd></div>}
          {ergebnis.registration_status && <div><dt className="opacity-70">Anmeldung</dt><dd className="font-semibold">{anmeldestatus[ergebnis.registration_status]}</dd></div>}
        </dl>
      )}
      {/* Gleicher Fehler zweimal hintereinander: an der Uhrzeit sieht man, dass neu geprüft wurde */}
      {zeit && <p className="mt-3 text-xs opacity-70">Geprüft um {uhrzeit(zeit)} Uhr</p>}
    </section>
  );
}

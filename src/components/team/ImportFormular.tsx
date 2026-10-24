"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { importieren, type ImportZustand } from "@/lib/aktionen/import";

const arten = [
  { wert: "emails", name: "E-Mail-Adressen", text: "z. B. Export der Google-Formular-Antworten: Spalten mit Name (oder Vor-/Nachname) und E-Mail." },
  { wert: "teilnehmerliste", name: "Teilnehmerliste", text: "„SES Academy Katılımcı listesi“: Bölge, İsim Soyisim, KGT/GT, Modul 1…n (+/–), Sorumlu Kişi. Modul 1 = Auftakt, 2 = Verfassungen, 3 = Skills-Workshop." },
  { wert: "hausaufgaben", name: "Hausaufgabenliste", text: "„Ödev Takip Çizelgesi“: Name, Bölge, Ülke, Ödev 1…n (✓)." },
  { wert: "bewertungsbogen", name: "Bewertungsbogen Rhetorik", text: "„Bewertungsbogen_Rhetorik“ (.xlsx/.xlsm): Blatt „Alle Videos“ mit 9 Kriterien und Feedback." },
] as const;

export function ImportFormular() {
  const [z, aktion, laeuft] = useActionState<ImportZustand, FormData>(importieren, {});
  const [art, setArt] = useState<string>("emails");
  const form = useRef<HTMLFormElement>(null);
  const warnungen = z.bericht?.hinweise.filter((h) => h.stufe === "warnung") ?? [];
  const infos = z.bericht?.hinweise.filter((h) => h.stufe !== "warnung") ?? [];

  // Ohne <form action>: React würde das Formular (samt gewählter Datei) nach der Vorschau zurücksetzen.
  const senden = (m: "vorschau" | "anwenden") => {
    if (!form.current?.reportValidity()) return;
    const daten = new FormData(form.current);
    daten.set("modus", m);
    startTransition(() => aktion(daten));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form ref={form} onSubmit={(e) => { e.preventDefault(); senden("vorschau"); }} className="karte space-y-5">
        <fieldset>
          <legend className="etikett">1. Was für eine Datei?</legend>
          <div className="space-y-2">
            {arten.map((a) => (
              <label key={a.wert} className={`flex cursor-pointer gap-3 rounded-2xl p-3 ring-1 transition ${art === a.wert ? "bg-paper ring-ink" : "ring-line hover:bg-paper"}`}>
                <input type="radio" name="art" value={a.wert} checked={art === a.wert} onChange={() => setArt(a.wert)} className="mt-1 accent-ink" />
                <span><span className="font-semibold">{a.name}</span><span className="block text-xs text-ink-soft">{a.text}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="etikett" htmlFor="datei">2. Datei auswählen</label>
          <input id="datei" name="datei" type="file" accept=".xlsx,.xlsm,.csv" required className="feld file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-paper" />
        </div>
        <fieldset className="space-y-2 text-sm">
          <legend className="etikett">3. Optionen</legend>
          {art === "bewertungsbogen" && (
            <label className="flex items-center gap-2">Gehört zu Hausaufgabe Nr. <input name="hausaufgabe_nr" type="number" min={1} defaultValue={1} className="feld w-20 py-1" /></label>
          )}
          <label className="flex items-start gap-2"><input type="checkbox" name="vorschlaege" className="mt-0.5 accent-ink" /> Ähnliche Namen automatisch zuordnen (Tippfehler, nur Vorname, abgeschnittene Namen) – erst nach Prüfung der Vorschau anhaken</label>
          {art !== "teilnehmerliste" && <label className="flex items-start gap-2"><input type="checkbox" name="anlegen" className="mt-0.5 accent-ink" /> Personen, die noch nicht im Portal sind, neu anlegen</label>}
          {art === "emails" && <label className="flex items-start gap-2"><input type="checkbox" name="ueberschreiben" className="mt-0.5 accent-ink" /> Vorhandene E-Mail-Adressen überschreiben</label>}
        </fieldset>
        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <button type="button" onClick={() => senden("vorschau")} className="knopf-hell" disabled={laeuft}>{laeuft ? "Wird gelesen …" : "Vorschau anzeigen"}</button>
          <button type="button" onClick={() => senden("anwenden")} className="knopf" disabled={laeuft || !z.bericht || z.bericht.angewendet}>Jetzt übernehmen</button>
        </div>
        <p className="text-xs text-ink-soft">Die Vorschau ändert nichts. Erst „Jetzt übernehmen“ schreibt in die Datenbank. Mehrfaches Importieren derselben Datei legt nichts doppelt an.</p>
      </form>

      <section aria-live="polite">
        {z.fehler && <div className="rounded-3xl bg-rot-hell p-6 font-semibold text-rot">{z.fehler}</div>}
        {z.bericht && (
          <div className="karte">
            <p className="text-sm font-semibold tracking-wide text-sage uppercase">{z.bericht.angewendet ? "Übernommen" : "Vorschau – noch nichts gespeichert"}</p>
            <h2 className="font-display mt-1 text-2xl font-bold">{z.bericht.titel}</h2>
            <p className="text-sm text-ink-soft">{z.dateiname}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {z.bericht.zahlen.map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-paper p-3">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="font-display text-2xl font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            {warnungen.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold">Bitte prüfen ({warnungen.length})</h3>
                <ul className="mt-2 max-h-96 space-y-1.5 overflow-y-auto text-sm">
                  {warnungen.map((h, i) => <li key={i} className="rounded-xl bg-gelb-hell px-3 py-2">{h.text}</li>)}
                </ul>
              </div>
            )}
            {infos.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold">Hinweise</h3>
                <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto text-sm text-ink-soft">
                  {infos.map((h, i) => <li key={i}>• {h.text}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        {!z.bericht && !z.fehler && (
          <div className="rounded-3xl border-2 border-dashed border-line p-8 text-ink-soft">
            <p className="font-semibold text-ink">So funktioniert’s</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              <li>Art der Datei wählen und Datei hochladen.</li>
              <li>„Vorschau anzeigen“: Das Portal zeigt, was es erkannt hat und welche Namen unklar sind.</li>
              <li>Bei Bedarf „Ähnliche Namen zuordnen“ anhaken und erneut Vorschau ansehen.</li>
              <li>„Jetzt übernehmen“. Unklare Fälle danach im Portal von Hand zuordnen.</li>
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}

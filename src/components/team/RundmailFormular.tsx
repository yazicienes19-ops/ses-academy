"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { MailWarning } from "lucide-react";
import { rundmailPruefen, rundmailTesten, rundmailVorlegen, vorlageLoeschen, vorlageSpeichern, type RundmailPruefung } from "@/lib/aktionen/rundmail";

export type Vorlage = { id: string; name: string; subject_de: string; body_de: string; subject_tr: string; body_tr: string };
type Option = { id: string | number; name: string };
export type FilterOptionen = { generationen: Option[]; regionen: Option[]; sorumlu: Option[]; module: Option[]; gruppen: Option[] };

const sprachen = [
  { wert: "de", name: "Deutsch", text: "alle bekommen den deutschen Text" },
  { wert: "tr", name: "Türkisch", text: "alle bekommen den türkischen Text" },
  { wert: "konto", name: "Nach Kontosprache", text: "Türkisch für Konten auf Türkisch, sonst Deutsch (beide Texte nötig)" },
] as const;
type Sprache = (typeof sprachen)[number]["wert"];

const filterFelder = [
  { k: "cohort_id", name: "Generation", leer: "alle Generationen", liste: "generationen" },
  { k: "region_id", name: "Region", leer: "alle Regionen", liste: "regionen" },
  { k: "mentor_id", name: "Sorumlu", leer: "alle Sorumlu-Gruppen", liste: "sorumlu" },
  { k: "module_id", name: "Modul", leer: "unabhängig von Modulen", liste: "module" },
  { k: "group_id", name: "Gruppe", leer: "alle Gruppen", liste: "gruppen" },
] as const;

/** Angehakte Personen der Teilnehmendenliste (Kästchen mit data-rundmail). */
function angehakt(): string[] {
  return [...document.querySelectorAll<HTMLInputElement>("input[data-rundmail]:checked")].map((e) => e.value);
}

/**
 * Rundmail schreiben und zur Freigabe vorlegen: Vorlage wählen oder speichern, Deutsch/Türkisch/nach Kontosprache,
 * an Filter (Nachrichten) oder an die Auswahl (Teilnehmende). Vor dem Vorlegen: Empfängerzahl und Testmail an sich selbst.
 */
export function RundmailFormular({ vorlagen, mailBereit, email, filterOptionen, auswahl }: {
  vorlagen: Vorlage[]; mailBereit: boolean; email: string; filterOptionen?: FilterOptionen;
  auswahl?: { beschreibung: string };
}) {
  const [vorlage, setVorlage] = useState("");
  const [sprache, setSprache] = useState<Sprache>("de");
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [betreffTr, setBetreffTr] = useState("");
  const [textTr, setTextTr] = useState("");
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [pruefung, setPruefung] = useState<{ schluessel: string; ergebnis: RundmailPruefung } | null>(null);
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [vorlageName, setVorlageName] = useState("");
  const [laeuft, starte] = useTransition();

  // Auswahl in der Liste mitverfolgen (Kästchen sind Teil der Tabelle, nicht dieses Formulars)
  const auswahlText = useSyncExternalStore(
    (melden) => {
      if (!auswahl) return () => {};
      document.addEventListener("change", melden);
      return () => document.removeEventListener("change", melden);
    },
    () => (auswahl ? angehakt().join(",") : ""),
    () => "",
  );
  const ids = useMemo(() => (auswahlText ? auswahlText.split(",") : []), [auswahlText]);

  const eingabe = useMemo(() => ({
    betreff, text, betreffTr, textTr, sprache, filter: auswahl ? {} : filter, ids: auswahl ? ids : undefined, auswahl: auswahl?.beschreibung,
  }), [betreff, text, betreffTr, textTr, sprache, filter, ids, auswahl]);
  const schluessel = JSON.stringify(eingabe);
  // Nach jeder Änderung muss neu geprüft werden: was vorgelegt wird, ist genau das Geprüfte
  const aktuell = pruefung?.schluessel === schluessel ? pruefung.ergebnis : null;
  const deutsch = sprache !== "tr";
  const tuerkisch = sprache !== "de";

  const vorlageWaehlen = (id: string) => {
    setVorlage(id);
    const v = vorlagen.find((x) => x.id === id);
    if (!v) return;
    setBetreff(v.subject_de); setText(v.body_de); setBetreffTr(v.subject_tr); setTextTr(v.body_tr); setVorlageName(v.name);
    setSprache(v.subject_de && v.subject_tr ? "konto" : v.subject_tr ? "tr" : "de");
    setMeldung(null);
  };

  const pruefen = () => starte(async () => {
    setTest(null);
    const ergebnis = await rundmailPruefen(eingabe);
    setPruefung({ schluessel, ergebnis });
  });
  const testen = () => starte(async () => setTest(await rundmailTesten(eingabe)));
  const vorlegen = () => starte(async () => {
    const r = await rundmailVorlegen(eingabe);
    if (r?.fehler) setPruefung({ schluessel, ergebnis: { ok: false, fehler: r.fehler } });
  });
  const speichern = () => starte(async () => {
    const r = await vorlageSpeichern({ name: vorlageName, betreff: deutsch ? betreff : "", text: deutsch ? text : "", betreffTr: tuerkisch ? betreffTr : "", textTr: tuerkisch ? textTr : "" });
    setMeldung(r);
    if (r.ok && r.id) setVorlage(r.id);
  });
  const loeschen = () => starte(async () => {
    if (!vorlage) return;
    setMeldung(await vorlageLoeschen(vorlage));
    setVorlage("");
  });

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="etikett" htmlFor="vorlage">Vorlage</label>
          <select id="vorlage" value={vorlage} onChange={(e) => vorlageWaehlen(e.target.value)} className="feld">
            <option value="">{vorlagen.length ? "ohne Vorlage" : "noch keine Vorlagen gespeichert"}</option>
            {vorlagen.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        {vorlage && <button type="button" onClick={loeschen} disabled={laeuft} className="text-sm font-semibold text-ink-soft underline sm:mb-3">Vorlage löschen</button>}
      </div>

      <fieldset>
        <legend className="etikett">Sprache</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {sprachen.map((s) => (
            <label key={s.wert} className={`flex cursor-pointer gap-2 rounded-2xl p-3 ring-1 ${sprache === s.wert ? "bg-paper ring-ink" : "ring-line"}`}>
              <input type="radio" name="sprache" value={s.wert} checked={sprache === s.wert} onChange={() => setSprache(s.wert)} className="mt-1 accent-ink" />
              <span><span className="font-semibold">{s.name}</span><span className="block text-xs text-ink-soft">{s.text}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={`grid gap-4 ${deutsch && tuerkisch ? "lg:grid-cols-2" : ""}`}>
        {deutsch && (
          <div className="grid gap-3">
            <div><label className="etikett" htmlFor="betreff">Betreff{tuerkisch ? " (Deutsch)" : ""}</label><input id="betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} maxLength={200} className="feld" /></div>
            <div><label className="etikett" htmlFor="text">Text{tuerkisch ? " (Deutsch)" : ""}</label><textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={10000} className="feld" placeholder="Die Anrede „Hallo Vorname,“ und der Gruß kommen automatisch dazu." /></div>
          </div>
        )}
        {tuerkisch && (
          <div className="grid gap-3" lang="tr">
            <div><label className="etikett" htmlFor="betreff_tr">Betreff (Türkisch)</label><input id="betreff_tr" value={betreffTr} onChange={(e) => setBetreffTr(e.target.value)} maxLength={200} className="feld" /></div>
            <div><label className="etikett" htmlFor="text_tr">Text (Türkisch)</label><textarea id="text_tr" value={textTr} onChange={(e) => setTextTr(e.target.value)} rows={8} maxLength={10000} className="feld" placeholder="„Merhaba Vorname,“ und der Gruß kommen automatisch dazu." /></div>
          </div>
        )}
      </div>

      <details className="rounded-2xl bg-paper p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Als Vorlage speichern</summary>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1"><label className="etikett" htmlFor="vorlage_name">Name der Vorlage</label><input id="vorlage_name" value={vorlageName} onChange={(e) => setVorlageName(e.target.value)} maxLength={100} className="feld" placeholder="z. B. Erinnerung Zusage" /></div>
          <button type="button" onClick={speichern} disabled={laeuft} className="knopf-hell">Vorlage speichern</button>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Gleicher Name überschreibt die vorhandene Vorlage. Gespeichert werden Betreff und Text in den gewählten Sprachen.</p>
      </details>
      {meldung && <p role="status" className={`rounded-2xl p-3 text-sm ${meldung.ok ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{meldung.text}</p>}

      {filterOptionen && (
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="etikett">An wen? (leer = alle aktiven mit E-Mail)</legend>
          {filterFelder.map((f) => (
            <select key={f.k} aria-label={f.name} value={filter[f.k] ?? ""} onChange={(e) => setFilter({ ...filter, [f.k]: e.target.value })} className="feld">
              <option value="">{f.leer}</option>
              {filterOptionen[f.liste].map((o) => <option key={o.id} value={String(o.id)}>{f.k === "module_id" ? `angemeldet: ${o.name}` : o.name}</option>)}
            </select>
          ))}
        </fieldset>
      )}
      {auswahl && (
        <p className="rounded-2xl bg-paper p-3 text-sm">
          <span className="font-semibold">An die Auswahl in der Liste: {ids.length} {ids.length === 1 ? "Person" : "Personen"} angehakt.</span>
          {auswahl.beschreibung && <span className="block text-ink-soft">Filter: {auswahl.beschreibung}</span>}
          <span className="block text-ink-soft">Wer keine E-Mail-Adresse hat oder ausgeschieden ist, bekommt nichts.</span>
        </p>
      )}

      <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <p className="font-semibold">Vor dem Vorlegen prüfen</p>
        <p className="text-sm text-ink-soft">Zählt die Empfänger und schickt auf Wunsch eine Testmail an dich ({email}).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={pruefen} disabled={laeuft} className="knopf-hell">{laeuft && !aktuell ? "Wird geprüft …" : "Empfänger zählen und prüfen"}</button>
        </div>
        {pruefung && !aktuell && pruefung.ergebnis.ok && <p className="mt-3 text-sm text-amber-900">Seit der Prüfung wurde etwas geändert. Bitte neu prüfen.</p>}
        {aktuell && !aktuell.ok && <p role="alert" className="mt-3 rounded-2xl bg-gelb-hell p-3 text-sm font-semibold">{aktuell.fehler}</p>}
        {aktuell?.ok && (
          <div className="mt-3 space-y-3" role="status">
            <p className="rounded-2xl bg-gruen-hell p-3">
              <span className="font-display block text-2xl font-extrabold">{aktuell.anzahl} {aktuell.anzahl === 1 ? "Empfänger" : "Empfänger:innen"}</span>
              <span className="text-sm">
                {sprache === "konto" ? `${aktuell.anzahl - aktuell.tuerkisch} auf Deutsch, ${aktuell.tuerkisch} auf Türkisch` : sprache === "tr" ? "alle auf Türkisch" : "alle auf Deutsch"}
                {aktuell.ohneAdresse > 0 ? ` · ${aktuell.ohneAdresse} aus der Auswahl ohne E-Mail-Adresse (bekommen nichts)` : ""}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={testen} disabled={laeuft || !mailBereit} className="knopf-hell">Testmail an mich</button>
              <button type="button" onClick={vorlegen} disabled={laeuft || aktuell.anzahl === 0} className="knopf">Zur Freigabe vorlegen</button>
            </div>
            {test && <p role="status" className={`rounded-2xl p-3 text-sm ${test.ok ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{test.text}</p>}
            <p className="text-xs text-ink-soft">Danach gibt eine zweite Person die Nachricht unter „Freigaben“ frei; verschickt wird erst dann, unter „Nachrichten“.</p>
          </div>
        )}
        {!mailBereit && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-2xl bg-rot-hell px-4 py-2.5 text-sm font-semibold text-rot">
            <MailWarning aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            Mailversand ist nicht eingerichtet: Hier geht im Moment keine Mail raus.
          </p>
        )}
      </div>
    </div>
  );
}

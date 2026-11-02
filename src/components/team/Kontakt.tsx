import { MessageCircle, Phone } from "lucide-react";
import { kontaktEintragen, kontaktLoeschen } from "@/lib/aktionen/kontakte";
import { telLink, whatsappLink } from "@/lib/telefon";
import { jetztMs } from "@/lib/zeit";

/** Rückmeldungen der Kontakt-Aktionen für <Hinweis />. */
export const kontaktHinweise: Record<string, { text: string; gut: boolean }> = {
  kontakt: { text: "Kontakt vermerkt.", gut: true },
  "kontakt-geloescht": { text: "Eintrag entfernt.", gut: true },
  "kontakt-eingabe": { text: "Bitte die Angaben prüfen.", gut: false },
  "kontakt-fehler": { text: "Das hat nicht geklappt. Eigene Einträge lassen sich nur 24 Stunden lang entfernen.", gut: false },
};

const ergebnisse = {
  erreicht: { text: "erreicht", klasse: "bg-gruen-hell" },
  nicht_erreicht: { text: "nicht erreicht", klasse: "bg-rot-hell text-rot" },
  rueckruf: { text: "Rückruf", klasse: "bg-gelb-hell" },
} as const;
const kanaele: Record<string, string> = { anruf: "Anruf", whatsapp: "WhatsApp", mail: "Mail", persoenlich: "persönlich" };

const uhr = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const tagUndUhr = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const tagIso = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });

/** „heute 14:05“, „gestern 09:30“, sonst „Mo., 2.11., 14:05“ */
export function wann(zeitpunkt: string) {
  const d = new Date(zeitpunkt);
  const heute = tagIso.format(jetztMs());
  const gestern = tagIso.format(jetztMs() - 86_400_000);
  const tag = tagIso.format(d);
  return tag === heute ? `heute ${uhr.format(d)}` : tag === gestern ? `gestern ${uhr.format(d)}` : tagUndUhr.format(d);
}

export { telLink, whatsappLink } from "@/lib/telefon";

export type Kontakt = {
  id: string; participant_id: string; module_title?: string | null; channel: string; outcome: string; note: string;
  created_at: string; by_name: string | null; mine: boolean;
};

/** Ergebnis als farbiger Chip. */
export function Ergebnis({ outcome }: { outcome: string }) {
  const e = ergebnisse[outcome as keyof typeof ergebnisse];
  return e ? <span className={`chip ${e.klasse}`}>{e.text}</span> : null;
}

/** Eine Zeile „heute 14:05 · Murat · Anruf · nicht erreicht · Notiz“. */
export function LetzterKontakt({ at, outcome, channel, by, note }: { at: string; outcome: string; channel: string; by: string | null; note: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
      <Ergebnis outcome={outcome} />
      <span>{wann(at)} · {by ?? "ehemaliges Teammitglied"}{channel !== "anruf" ? ` · ${kanaele[channel] ?? channel}` : ""}</span>
      {note && <span className="text-ink">„{note}“</span>}
    </p>
  );
}

/** Anrufen und WhatsApp öffnen; das Ergebnis trägt man danach mit <KontaktFormular /> ein. */
export function KontaktKnoepfe({ name, phone }: { name: string; phone: string | null }) {
  if (!phone) return <span className="text-sm text-ink-soft">keine Nummer</span>;
  const wa = whatsappLink(phone);
  return (
    <span className="flex flex-wrap gap-2">
      <a href={telLink(phone)} className="knopf !px-4 !py-2" aria-label={`${name} anrufen`}><Phone aria-hidden className="h-4 w-4" />Anrufen</a>
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="knopf-hell !px-4 !py-2" aria-label={`${name} auf WhatsApp schreiben`}><MessageCircle aria-hidden className="h-4 w-4" />WhatsApp</a>}
    </span>
  );
}

/**
 * Ergebnis eintragen: Kanal, kurze Notiz, dann einer der Knöpfe. kompakt = nur „erreicht“ / „nicht erreicht“
 * per Anruf (Eventtag, wenn es schnell gehen muss).
 */
export function KontaktFormular({ participantId, moduleId, zurueck, kompakt = false }:
  { participantId: string; moduleId: string | null; zurueck: string; kompakt?: boolean }) {
  return (
    <form action={kontaktEintragen} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="participant_id" value={participantId} />
      <input type="hidden" name="module_id" value={moduleId ?? ""} />
      <input type="hidden" name="zurueck" value={zurueck} />
      {kompakt ? <input type="hidden" name="channel" value="anruf" /> : (
        <>
          <label className="sr-only" htmlFor={`kanal-${participantId}`}>Kanal</label>
          <select id={`kanal-${participantId}`} name="channel" defaultValue="anruf" className="feld !w-auto !py-2 text-sm">
            {Object.entries(kanaele).map(([wert, text]) => <option key={wert} value={wert}>{text}</option>)}
          </select>
          <label className="sr-only" htmlFor={`notiz-${participantId}`}>Notiz</label>
          <input id={`notiz-${participantId}`} name="note" maxLength={300} placeholder="Notiz (optional)" className="feld !py-2 min-w-40 flex-1 text-sm" />
        </>
      )}
      <button name="outcome" value="erreicht" className="knopf !px-4 !py-2">Erreicht</button>
      <button name="outcome" value="nicht_erreicht" className="knopf-hell !px-4 !py-2">Nicht erreicht</button>
      {!kompakt && <button name="outcome" value="rueckruf" className="knopf-hell !px-4 !py-2">Rückruf</button>}
    </form>
  );
}

/** Alle Einträge zu einer Person, neueste zuerst; eigene lassen sich 24 Stunden lang entfernen. */
export function KontaktVerlauf({ eintraege, zurueck, mitModul = false }: { eintraege: Kontakt[]; zurueck: string; mitModul?: boolean }) {
  if (eintraege.length === 0) return <p className="text-sm text-ink-soft">Noch kein Kontakt vermerkt.</p>;
  const grenze = jetztMs() - 24 * 3600_000;
  return (
    <ul className="divide-y divide-line text-sm">
      {eintraege.map((k) => (
        <li key={k.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
          <Ergebnis outcome={k.outcome} />
          <span className="text-ink-soft">
            {wann(k.created_at)} · {k.by_name ?? "ehemaliges Teammitglied"} · {kanaele[k.channel] ?? k.channel}
            {mitModul && k.module_title ? ` · ${k.module_title}` : ""}
          </span>
          {k.note && <span>„{k.note}“</span>}
          {k.mine && Date.parse(k.created_at) > grenze && (
            <form action={kontaktLoeschen} className="ml-auto">
              <input type="hidden" name="id" value={k.id} />
              <input type="hidden" name="participant_id" value={k.participant_id} />
              <input type="hidden" name="zurueck" value={zurueck} />
              <button className="text-xs font-semibold text-ink-soft underline hover:text-rot">entfernen</button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

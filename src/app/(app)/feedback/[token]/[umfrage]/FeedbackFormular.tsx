"use client";

import { useActionState } from "react";
import { feedbackAbsenden, type FeedbackAntworten } from "@/lib/aktionen/feedback";
import { bereichTexte, type BereichSprache } from "@/lib/bereich-texte";

type Frage = { id: string; kind: string; prompt: string };

/**
 * Formular der Feedback-Umfrage. Zeigt gespeicherte Antworten vorausgefüllt (auch nach dem Absenden, React leert
 * Formulare sonst nach einer Aktion), alle Fragen sind freiwillig, mindestens eine muss beantwortet sein.
 */
export function FeedbackFormular({ l, token, umfrage, fragen, gespeichert }: { l: BereichSprache; token: string; umfrage: string; fragen: Frage[]; gespeichert: FeedbackAntworten | null }) {
  const t = bereichTexte[l];
  const [zustand, absenden, laeuft] = useActionState(feedbackAbsenden, { ergebnis: null, antworten: gespeichert ?? undefined, runde: 0 });
  const meldung = zustand.ergebnis ? t.feedbackMeldungen[zustand.ergebnis] : null;
  const werte = zustand.antworten ?? {};
  return (
    <form key={zustand.runde} action={absenden} className="mt-6 space-y-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="survey_id" value={umfrage} />
      {gespeichert && !zustand.ergebnis && <p role="status" className="rounded-2xl bg-gruen-hell p-4 text-sm">{t.feedbackSchonGespeichert}</p>}
      <p className="text-sm text-ink-soft">{t.feedbackFreiwillig}</p>
      {fragen.map((f, i) => (
        <fieldset key={f.id} className="karte">
          <legend className="sr-only">{f.prompt}</legend>
          <input type="hidden" name={`art_${f.id}`} value={f.kind} />
          <p className="font-semibold" aria-hidden>{i + 1}. {f.prompt}</p>
          {f.kind === "skala" ? (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {t.feedbackSkala.map((text, n) => ({ wert: n + 1, text })).map((s) => (
                <label key={s.wert} className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl bg-white p-2 text-center ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-paper">
                  <input type="radio" name={`q_${f.id}`} value={s.wert} defaultChecked={werte[f.id] === s.wert} className="sr-only" />
                  <span className="font-display text-xl font-bold">{s.wert}</span>
                  <span className="text-[11px] leading-tight">{s.text}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea name={`q_${f.id}`} rows={3} maxLength={2000} defaultValue={typeof werte[f.id] === "string" ? String(werte[f.id]) : ""} className="feld mt-3" aria-label={f.prompt} />
          )}
        </fieldset>
      ))}
      {meldung && <p role="status" className={`rounded-2xl p-4 font-semibold ${meldung.gut ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{meldung.text}</p>}
      <button type="submit" disabled={laeuft} className="knopf w-full !py-3.5 text-base">{laeuft ? t.feedbackSpeichert : gespeichert || zustand.ergebnis === "saved" ? t.feedbackAktualisieren : t.feedbackAbsenden}</button>
    </form>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TagesordnungKnoepfe } from "@/components/team/Dokumente";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulFormular } from "@/components/team/ModulFormular";
import { ModulReiter } from "@/components/team/ModulReiter";
import { TeamKopf } from "@/components/team/TeamKopf";
import { feedbackEinladen, frageEntfernen, frageHinzufuegen, umfrageAnlegen } from "@/lib/aktionen/feedback";
import { absageZuruecknehmen, modulAbsagen, modulSpeichern, tagEntfernen, tagHinzufuegen } from "@/lib/aktionen/module";
import { requireStaff } from "@/lib/auth";
import { anmeldestatus } from "@/lib/einlass";
import { createClient } from "@/lib/supabase/server";
import { istToken } from "@/lib/codes";

export const metadata: Metadata = { title: "Modul | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  angelegt: { text: "Modul angelegt. Jetzt Termine eintragen und veröffentlichen.", gut: true },
  gespeichert: { text: "Gespeichert.", gut: true },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  "slug-vergeben": { text: "Diesen Kurznamen gibt es schon.", gut: false },
  "tag-eingabe": { text: "Bitte Datum und Uhrzeiten prüfen (Ende nach Beginn).", gut: false },
  "tag-doppelt": { text: "Für diesen Tag gibt es schon einen Termin.", gut: false },
  "tag-angelegt": { text: "Termin eingetragen.", gut: true },
  "tag-entfernt": { text: "Termin entfernt.", gut: true },
  "tag-hat-checkins": { text: "An diesem Tag wurde schon eingecheckt. Der Termin bleibt deshalb bestehen.", gut: false },
  abgesagt: { text: "Modul abgesagt. Der Einlass ist gesperrt, Tickets gelten für dieses Modul nicht mehr.", gut: true },
  "absage-bestaetigen": { text: "Bitte das Absagen ausdrücklich bestätigen. Es wurde nichts geändert.", gut: false },
  reaktiviert: { text: "Absage zurückgenommen.", gut: true },
  "feedback-angelegt": { text: "Umfrage mit Standardfragen angelegt. Fragen prüfen, dann nach dem Modul die Einladung senden.", gut: true },
  "feedback-ohne-termin": { text: "Zuerst Termine eintragen, die Umfrage öffnet am letzten Modultag.", gut: false },
  "frage-gespeichert": { text: "Frage hinzugefügt.", gut: true },
  "frage-entfernt": { text: "Frage entfernt.", gut: true },
  "frage-hat-antworten": { text: "Es gibt schon Antworten. Fragen lassen sich jetzt nicht mehr entfernen.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const tagFormat = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
const zeitFormat = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export default async function ModulDetail({ params, searchParams }: PageProps<"/team/module/[id]">) {
  const staff = await requireStaff("alles");
  const { id } = await params;
  const { hinweis } = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("modules")
    .select("*, module_days(id, day, starts_at, ends_at, label, attendances(count)), registrations(status)")
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();

  const { data: infoRoh } = await supabase.rpc("get_info_status", { p_module_id: m.id });
  const info = infoRoh ?? [];
  const infoAnzahl = (s: string) => info.filter((t) => t.info_status === s).length;

  // Fertige Tagesordnungen (PDF) aus „Material“ mit dem Schlagwort „Tagesordnung“, zum direkten Herunterladen
  const { data: tagesordnungen } = await supabase.from("documents").select("id, title").eq("module_id", m.id)
    .contains("tags", ["Tagesordnung"]).gt("current_version", 0).neq("status", "archiv");

  const { data: umfrage } = await supabase.from("feedback_surveys").select("id, opens_at, closes_at, sent_at, feedback_questions(id, position, kind, prompt)").eq("module_id", m.id).maybeSingle();
  const { data: ergebnisse } = umfrage ? await supabase.rpc("get_feedback_results", { p_survey_id: umfrage.id }) : { data: null };
  const { count: anwesende } = await supabase.from("attendances").select("registration_id, registrations!inner(module_id)", { count: "exact", head: true }).eq("registrations.module_id", m.id);
  const fragen = umfrage ? [...umfrage.feedback_questions].sort((a, b) => a.position - b.position) : [];
  const feedbackVersand = typeof hinweis === "string" && /^feedback-\d+-\d+$/.test(hinweis) ? hinweis.split("-").slice(1).map(Number) : null;
  const antworten = Math.max(0, ...(ergebnisse ?? []).map((e) => e.answers));

  const code = typeof hinweis === "string" && hinweis.startsWith("gespeichert-") ? "gespeichert" : typeof hinweis === "string" && hinweis.startsWith("abgesagt-") ? "abgesagt" : hinweis;
  const absageInformiert = typeof hinweis === "string" && hinweis.startsWith("abgesagt-") ? Number(hinweis.split("-")[1]) : null;
  const neuAngemeldet = typeof hinweis === "string" && hinweis.startsWith("gespeichert-") ? Number(hinweis.split("-")[1]) : 0;
  const tage = [...m.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const zaehlung = Object.entries(anmeldestatus)
    .map(([s, name]) => ({ name, anzahl: m.registrations.filter((r) => r.status === s).length }))
    .filter((z) => z.anzahl > 0);
  const feld = "rounded-2xl bg-white px-4 py-3 ring-1 ring-line";

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ModulReiter id={m.id} titel={m.title} aktiv="" />
        {m.cancelled_at && <p className="mt-2 font-semibold text-red-900">Abgesagt{m.cancellation_reason ? `: ${m.cancellation_reason}` : ""}</p>}
        <Hinweis code={code} texte={hinweise} />
        {absageInformiert !== null && absageInformiert > 0 && <p role="status" className="mt-2 rounded-2xl bg-emerald-100 p-4 text-emerald-950">{absageInformiert} Angemeldete per Mail informiert.</p>}
        {neuAngemeldet > 0 && <p role="status" className="mt-2 rounded-2xl bg-emerald-100 p-4 text-emerald-950">{neuAngemeldet} angenommene Teilnehmende wurden automatisch angemeldet.</p>}

        <p className="mt-4 text-ink-soft">
          Anmeldungen: {zaehlung.length ? zaehlung.map((z) => `${z.anzahl} ${z.name.toLowerCase()}`).join(" · ") : "noch keine"}
        </p>

        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Termine</h2>
          <p className="mt-1 text-sm text-ink-soft">Eingecheckt wird pro Termin. Einlass ist 4 Stunden vor Beginn bis 6 Stunden nach Ende möglich.</p>
          <ul className="mt-4 divide-y divide-line">
            {tage.map((t) => {
              const checkins = t.attendances[0]?.count ?? 0;
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="mr-auto">
                    <p className="font-semibold">{tagFormat.format(new Date(t.starts_at))}{t.label ? ` · ${t.label}` : ""}</p>
                    <p className="text-sm text-ink-soft">{zeitFormat.format(new Date(t.starts_at))} bis {zeitFormat.format(new Date(t.ends_at))} Uhr · {checkins} eingecheckt</p>
                  </div>
                  <Link href={`/team/einlass/?tag=${t.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line">Einlass</Link>
                  <Link href={`/team/regieplan/?tag=${t.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line">Regieplan</Link>
                  {checkins === 0 && (
                    <form action={tagEntfernen}>
                      <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="day_id" value={t.id} />
                      <button type="submit" className="text-sm font-semibold text-ink-soft underline">entfernen</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {tage.length === 0 && <p className="mt-3 text-ink-soft">Noch keine Termine.</p>}
          <form action={tagHinzufuegen} className="mt-5 flex flex-wrap items-end gap-2">
            <input type="hidden" name="module_id" value={m.id} />
            <div><label htmlFor="day" className="mb-1 block text-sm font-semibold">Datum</label><input id="day" name="day" type="date" required className={feld} /></div>
            <div><label htmlFor="von" className="mb-1 block text-sm font-semibold">Beginn</label><input id="von" name="von" type="time" required defaultValue="10:00" className={feld} /></div>
            <div><label htmlFor="bis" className="mb-1 block text-sm font-semibold">Ende</label><input id="bis" name="bis" type="time" required defaultValue="18:00" className={feld} /></div>
            <div className="min-w-40 flex-1"><label htmlFor="label" className="mb-1 block text-sm font-semibold">Bezeichnung (optional)</label><input id="label" name="label" placeholder="z. B. Tag 1" className={`${feld} w-full`} /></div>
            <button type="submit" className="rounded-full bg-ink px-5 py-3 font-semibold text-paper">Termin eintragen</button>
          </form>
        </section>


        <section id="tickets" className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Info-Mail und Unterlagen</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Eine Mail an alle mit Ticket (QR-Code), Ort, Übernachtung mit Hotel und Zimmer und der Tagesordnung. Vorher in der Vorschau prüfen.
          </p>
          <p className="mt-3">
            {infoAnzahl("gesendet")} von {info.length} haben die Info-Mail
            {infoAnzahl("fehlgeschlagen") > 0 && ` · ${infoAnzahl("fehlgeschlagen")} fehlgeschlagen`}
            {infoAnzahl("keine_mail") > 0 && ` · ${infoAnzahl("keine_mail")} ohne E-Mail-Adresse`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/team/module/${m.id}/infomail/`} className="rounded-full bg-ink px-5 py-3 font-semibold text-paper">Info-Mail: Vorschau und Versand</Link>
            <Link href={`/team/module/${m.id}/tagesordnung/`} target="_blank" className="rounded-full bg-white px-5 py-3 font-semibold ring-1 ring-line">Tagesordnung drucken</Link>
            <Link href={`/team/module/${m.id}/notfall/`} className="rounded-full bg-white px-5 py-3 font-semibold ring-1 ring-line">Notfall-Liste drucken</Link>
            <Link href={`/team/module/${m.id}/namensschilder/`} className="rounded-full bg-white px-5 py-3 font-semibold ring-1 ring-line">Namensschilder drucken</Link>
            <Link href={`/team/module/${m.id}/hotel/`} className="rounded-full bg-white px-5 py-3 font-semibold ring-1 ring-line">Übernachtung und Hotel{m.stay_form_open ? " (Abfrage offen)" : ""}</Link>
          </div>
          <TagesordnungKnoepfe dokumente={tagesordnungen ?? []} />
        </section>


        <section id="feedback" className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Feedback</h2>
          {feedbackVersand && (
            <p role="status" className={`mt-3 rounded-2xl p-4 ${feedbackVersand[1] ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-950"}`}>
              {feedbackVersand[0]} Einladungen verschickt{feedbackVersand[1] ? `, ${feedbackVersand[1]} fehlgeschlagen (meist fehlt die E-Mail-Adresse).` : "."}
            </p>
          )}
          {!umfrage ? (
            <form action={umfrageAnlegen} className="mt-3">
              <p className="text-sm text-ink-soft">Die Umfrage öffnet am letzten Modultag um 13 Uhr und bleibt 14 Tage offen. Antworten können nur Anwesende.</p>
              <input type="hidden" name="module_id" value={m.id} />
              <button type="submit" className="mt-3 rounded-full bg-ink px-5 py-3 font-semibold text-paper">Umfrage anlegen</button>
            </form>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                Offen {tagFormat.format(new Date(umfrage.opens_at))}, {zeitFormat.format(new Date(umfrage.opens_at))} Uhr bis {tagFormat.format(new Date(umfrage.closes_at))}
                {umfrage.sent_at ? ` · Einladung zuletzt am ${tagFormat.format(new Date(umfrage.sent_at))} verschickt` : ""} · {antworten} Antworten
              </p>
              <form action={feedbackEinladen} className="mt-3">
                <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="survey_id" value={umfrage.id} />
                <button type="submit" disabled={!anwesende} className="rounded-full bg-ink px-5 py-3 font-semibold text-paper disabled:opacity-50">
                  Einladung an alle Anwesenden ohne Antwort senden
                </button>
                {!anwesende && <span className="ml-3 text-sm text-ink-soft">Noch niemand eingecheckt.</span>}
              </form>

              {antworten > 0 && (
                <div className="mt-6 space-y-4">
                  {(ergebnisse ?? []).map((e) => (
                    <div key={e.question_id}>
                      <p className="font-semibold">{e.nr}. {e.prompt}</p>
                      {e.kind === "skala" ? (
                        <div className="mt-1">
                          <p className="text-sm text-ink-soft">{e.average !== null ? `Durchschnitt ${String(e.average).replace(".", ",")} von 5` : "noch keine Antworten"} · {e.answers} Antworten</p>
                          <div className="mt-2 flex h-6 overflow-hidden rounded-full ring-1 ring-line" role="img" aria-label={`Verteilung 1 bis 5: ${(e.distribution ?? []).join(", ")}`}>
                            {(e.distribution ?? []).map((n, i) => n > 0 && (
                              <div key={i} className={["bg-rot-hell", "bg-amber-100", "bg-paper-deep", "bg-emerald-100", "bg-emerald-300"][i]} style={{ width: `${(n / e.answers) * 100}%` }}>
                                <span className="block text-center text-xs leading-6 font-semibold">{i + 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{(e.texts ?? []).map((t, i) => <li key={i}>{t}</li>)}</ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <details className="mt-6">
                <summary className="cursor-pointer font-semibold">Fragen bearbeiten ({fragen.length})</summary>
                <ol className="mt-3 space-y-2">
                  {fragen.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="mr-auto">{f.position}. {f.prompt} <span className="text-ink-soft">({f.kind === "skala" ? "Skala 1–5" : "Freitext"})</span></span>
                      {antworten === 0 && (
                        <form action={frageEntfernen}>
                          <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="survey_id" value={umfrage.id} /><input type="hidden" name="id" value={f.id} />
                          <button type="submit" className="font-semibold text-ink-soft underline">entfernen</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ol>
                <form action={frageHinzufuegen} className="mt-4 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="survey_id" value={umfrage.id} />
                  <div className="min-w-60 flex-1"><label htmlFor="prompt" className="mb-1 block text-sm font-semibold">Neue Frage</label><input id="prompt" name="prompt" required minLength={3} maxLength={300} className={`${feld} w-full`} /></div>
                  <div><label htmlFor="kind" className="mb-1 block text-sm font-semibold">Art</label>
                    <select id="kind" name="kind" className={feld}><option value="skala">Skala 1–5</option><option value="text">Freitext</option></select></div>
                  <button type="submit" className="rounded-full bg-white px-5 py-3 font-semibold ring-1 ring-line">Hinzufügen</button>
                </form>
              </details>
            </>
          )}
        </section>

        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="mb-4 font-display text-xl font-bold">Einstellungen</h2>
          <ModulFormular modul={m} aktion={modulSpeichern} knopf="Speichern" />
        </section>

        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">{m.cancelled_at ? "Absage" : "Modul absagen"}</h2>
          {m.cancelled_at ? (
            <form action={absageZuruecknehmen} className="mt-3">
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" className="rounded-full bg-white px-5 py-3 font-semibold ring-1 ring-line">Absage zurücknehmen</button>
            </form>
          ) : (
            <form action={modulAbsagen} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={m.id} />
              <div className="min-w-60 flex-1"><label htmlFor="grund" className="mb-1 block text-sm font-semibold">Grund (intern)</label><input id="grund" name="grund" className={`${feld} w-full`} /></div>
              <div className="w-full space-y-1.5 text-sm">
                <label className="flex gap-2"><input type="checkbox" name="benachrichtigen" value="ja" defaultChecked className="mt-0.5" /> Alle Angemeldeten und die Warteliste per Mail informieren</label>
                <label className="flex gap-2 rounded-2xl bg-rot-hell p-3 text-rot"><input type="checkbox" name="bestaetigt" value="ja" required className="mt-0.5" /> Ja, das Modul wirklich absagen. Der Einlass wird gesperrt.</label>
              </div>
              <button type="submit" className="rounded-full bg-red-800 px-5 py-3 font-semibold text-white">Absagen</button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}

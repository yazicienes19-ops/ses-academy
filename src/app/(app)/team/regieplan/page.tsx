import type { Metadata } from "next";
import Link from "next/link";
import { Ellipsis, Phone, Printer } from "lucide-react";
import { AutoAktualisieren } from "@/components/team/AutoAktualisieren";
import { Hinweis } from "@/components/team/Hinweis";
import { TagWahl } from "@/components/team/TagWahl";
import { Rueckfrage } from "@/components/team/Rueckfrage";
import { TeamKopf } from "@/components/team/TeamKopf";
import { punktEnde, punktZustand, telLink, zustaendigWaehrend } from "@/lib/ablauf";
import {
  einsaetzeUebernehmen, einsatzAnlegen, einsatzBearbeiten, einsatzEntfernen, programmpunktAnlegen, programmpunktBearbeiten, programmpunktEntfernen, programmpunktStatus,
  programmVerschieben, regieplanPdfSetzen,
} from "@/lib/aktionen/eventtag";
import { darf, requireStaff } from "@/lib/auth";
import { uhrzeit } from "@/lib/einlass";
import { ladeModultage, tagBezeichnung } from "@/lib/eventtag";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Regieplan | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  "punkt-angelegt": { text: "Programmpunkt eingetragen.", gut: true },
  "punkt-entfernt": { text: "Programmpunkt entfernt.", gut: true },
  "punkt-geaendert": { text: "Programmpunkt geändert.", gut: true },
  "einsatz-geaendert": { text: "Einsatz geändert.", gut: true },
  status: { text: "Geändert.", gut: true },
  verschoben: { text: "Verschoben. Alle sehen die neuen Zeiten.", gut: true },
  "einsatz-angelegt": { text: "Einsatz eingetragen.", gut: true },
  "einsatz-entfernt": { text: "Einsatz entfernt.", gut: true },
  nichts: { text: "Am gewählten Tag gibt es keine Einsätze zum Übernehmen.", gut: false },
  "schon-uebernommen": { text: "Diese Einsätze stehen schon an diesem Tag. Nichts doppelt angelegt.", gut: true },
  pdf: { text: "PDF als Regieplan für diesen Tag festgelegt.", gut: true },
  "pdf-entfernt": { text: "PDF entfernt. Der Regieplan zeigt wieder die Programmliste.", gut: true },
  eingabe: { text: "Bitte die Angaben prüfen (Ende nach Beginn).", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const zeitspanne = (von: string | null, bis: string | null) => (von ? `${uhrzeit(von, false)}${bis ? `–${uhrzeit(bis, false)}` : ""}` : "ganztägig");

/**
 * Regieplan und Rollenplan eines Modultags auf einer Seite: links das Programm (Stand nach der Uhr, mit den
 * Eingeteilten je Punkt), rechts das Team des Tages mit Leitung und Telefon. Druckansicht unter ./druck/.
 */
export default async function Regieplan({ searchParams }: PageProps<"/team/regieplan">) {
  const staff = await requireStaff("einlass");
  const { tag: gewaehlt, hinweis, bearbeiten, einsatz: einsatzBearbeitet } = await searchParams;
  const { tage, vorschlag } = await ladeModultage(staff.modulId);
  const tag = tage.find((t) => t.id === gewaehlt) ?? vorschlag;
  const darfPflegen = darf.orga(staff.role);
  // Auf ein Modul begrenzte Zugänge: Programm und Team pflegen ja, Dokumentenablage, Druck-Listen und PDF nein
  const unbegrenzt = !staff.modulId;

  const supabase = await createClient();
  const [{ data: punkte }, { data: einsaetzeRoh }, { data: dokumente }] = tag
    ? await Promise.all([
        supabase.from("program_items").select("*").eq("module_day_id", tag.id).order("starts_at"),
        darfPflegen
          ? supabase.from("duty_assignments").select("*").eq("module_day_id", tag.id).order("is_lead", { ascending: false }).order("starts_at", { nullsFirst: true }).order("person_name")
          : Promise.resolve({ data: [] }),
        // PDFs aus der Ablage zur Auswahl (nur Orga-Team sieht die Ablage); das Modul des Tages zuerst
        darfPflegen && unbegrenzt
          ? supabase.from("documents").select("id, title, status, module_id, document_versions(version, mime_type, uploaded_at)").order("updated_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const pdfs = (dokumente ?? [])
    .map((d) => ({ ...d, aktuell: [...d.document_versions].sort((a, b) => b.version - a.version)[0] }))
    .filter((d) => d.aktuell?.mime_type === "application/pdf" && (d.status !== "archiv" || d.id === tag?.regieplan_document_id))
    .sort((a, b) => Number(b.module_id === tag?.module_id) - Number(a.module_id === tag?.module_id));
  const pdf = darfPflegen && tag?.regieplan_document_id ? pdfs.find((d) => d.id === tag.regieplan_document_id) ?? null : null;
  const liste = punkte ?? [];
  const einsaetze = einsaetzeRoh ?? [];
  const leitung = einsaetze.filter((e) => e.is_lead);
  const jetzt = jetztMs();
  const zustand = (i: number) => punktZustand(liste, i, jetzt);
  const laufendIdx = liste.findIndex((_, i) => zustand(i) === "jetzt");
  const naechsterIdx = liste.findIndex((_, i) => zustand(i) === "kommt");
  const laufend = laufendIdx >= 0 ? liste[laufendIdx] : null;
  const naechster = naechsterIdx >= 0 ? liste[naechsterIdx] : null;
  const anker = laufend ?? naechster;
  const andereTage = tag ? tage.filter((t) => t.module_id === tag.module_id && t.id !== tag.id) : [];
  const code = typeof hinweis === "string" && hinweis.startsWith("uebernommen-") ? undefined : hinweis;
  const uebernommen = typeof hinweis === "string" && hinweis.startsWith("uebernommen-") ? Number(hinweis.split("-")[1]) : 0;

  return (
    <>
      <TeamKopf staff={staff} aktiv="regieplan" />
      {/* Beim Bearbeiten nicht alle 30 Sekunden neu laden */}
      {!bearbeiten && !einsatzBearbeitet && <AutoAktualisieren />}
      <main className={`mx-auto px-4 py-6 ${darfPflegen ? "max-w-6xl" : "max-w-3xl"}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Regieplan</h1>
          {tag && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/team/regieplan/druck/?tag=${tag.id}`} target="_blank" className="knopf-hell"><Printer aria-hidden className="h-4 w-4" />Regieplan fürs Team drucken</Link>
              {darfPflegen && unbegrenzt && <Link href={`/team/module/${tag.module_id}/tagesordnung/`} target="_blank" className="knopf"><Printer aria-hidden className="h-4 w-4" />Tagesordnung für Teilnehmende</Link>}
              {darfPflegen && unbegrenzt && <Link href={`/team/module/${tag.module_id}/namensschilder/`} target="_blank" className="knopf-hell">Namensschilder</Link>}
              {darfPflegen && unbegrenzt && <Link href={`/team/module/${tag.module_id}/notfall/`} target="_blank" className="knopf-hell">Notfall-Liste</Link>}
            </div>
          )}
        </div>
        <Hinweis code={code} texte={hinweise} />
        {uebernommen > 0 && <p role="status" className="mt-4 rounded-2xl bg-gruen-hell p-4 text-sm font-semibold">{uebernommen} Einsätze übernommen.</p>}
        {!tag ? (
          <p className="karte mt-6">Es gibt noch keine veröffentlichten Modultage.</p>
        ) : (
          <>
            <TagWahl tage={tage} aktiv={tag.id} pfad="/team/regieplan/" jetzt={jetzt} />

            <div className={`mt-4 grid items-start gap-6 ${darfPflegen ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}>
              {/* Programm: als PDF, wenn für den Tag festgelegt; die Liste ist dann aufklappbar */}
              <div className="min-w-0">
                {pdf && (
                  <section aria-label="Regieplan als PDF" className="karte overflow-hidden !p-0">
                    <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                      <div className="mr-auto min-w-0">
                        <p className="font-display truncate text-xl font-bold">{pdf.title}</p>
                        <p className="text-sm text-ink-soft">Stand {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(pdf.aktuell.uploaded_at))} · Version {pdf.aktuell.version}</p>
                      </div>
                      <a href={`/team/regieplan/pdf/${tag.id}/`} target="_blank" rel="noopener" className="knopf-hell">In neuem Tab öffnen</a>
                      <Link href={`/team/dokumente/${pdf.id}/`} className="knopf-hell">Neue Fassung hochladen</Link>
                    </div>
                    <iframe src={`/team/regieplan/pdf/${tag.id}/`} title={pdf.title} className="block h-[80vh] w-full border-t border-line bg-paper-deep" />
                  </section>
                )}
                {darfPflegen && unbegrenzt && (
                  <details className={`rounded-3xl bg-paper-deep/60 px-4 py-3 text-sm ${pdf ? "mt-3" : "mb-4"}`}>
                    <summary className="cursor-pointer font-semibold">{pdf ? "Andere PDF wählen oder entfernen" : "PDF als Regieplan für diesen Tag festlegen"}</summary>
                    {pdfs.length === 0 ? (
                      <p className="mt-2 text-ink-soft">Noch keine PDF in der Ablage. Unter <Link href="/team/dokumente/" className="link">Dokumente</Link> hochladen, dann hier auswählen.</p>
                    ) : (
                      <form action={regieplanPdfSetzen} className="mt-3 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="tag" value={tag.id} />
                        <label className="sr-only" htmlFor="document_id">PDF</label>
                        <select id="document_id" name="document_id" defaultValue={pdf?.id ?? pdfs[0].id} className="feld !w-auto min-w-64 flex-1">
                          {pdf && <option value="">keine PDF, wieder die Programmliste zeigen</option>}
                          {pdfs.map((d) => <option key={d.id} value={d.id}>{d.title}{d.module_id === tag.module_id ? " (dieses Modul)" : ""}</option>)}
                        </select>
                        <button className="knopf">Übernehmen</button>
                      </form>
                    )}
                  </details>
                )}
                <ProgrammHuelle eingeklappt={Boolean(pdf)} anzahl={liste.length}>
                {(laufend || naechster) && (
                  <section aria-label="Jetzt und als Nächstes" className="grid gap-3 sm:grid-cols-2">
                    {laufend && (
                      <div className="rounded-3xl bg-forest p-5 text-paper">
                        <p className="text-xs font-semibold tracking-wide text-signal uppercase">Läuft gerade</p>
                        <p className="font-display mt-1 text-xl font-bold">{laufend.title}</p>
                        <p className="text-sm text-paper/70">bis {uhrzeit(new Date(punktEnde(liste, laufendIdx)).toISOString(), false)} Uhr{laufend.room ? ` · ${laufend.room}` : ""}</p>
                      </div>
                    )}
                    {naechster && (
                      <div className="rounded-3xl bg-weiss p-5 ring-1 ring-line">
                        <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Als Nächstes</p>
                        <p className="font-display mt-1 text-xl font-bold">{naechster.title}</p>
                        <p className="text-sm text-ink-soft">{uhrzeit(naechster.starts_at, false)} Uhr{naechster.room ? ` · ${naechster.room}` : ""}{naechster.responsible ? ` · ${naechster.responsible}` : ""}</p>
                      </div>
                    )}
                  </section>
                )}

                {darfPflegen && anker && (
                  <section aria-label="Verspätung" className="mt-3 flex flex-wrap items-center gap-2 rounded-3xl bg-paper-deep/60 px-4 py-3">
                    <p className="mr-auto text-sm"><span className="font-semibold">Zeitplan verschieben</span><span className="text-ink-soft"> ab „{anker.title}“</span></p>
                    {[-5, 5, 10, 15, 30].map((min) => (
                      <form key={min} action={programmVerschieben}>
                        <input type="hidden" name="tag" value={tag.id} /><input type="hidden" name="id" value={anker.id} />
                        <input type="hidden" name="minuten" value={min} />
                        <button type="submit" className="rounded-full bg-weiss px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:ring-ink/30"
                          aria-label={`${Math.abs(min)} Minuten ${min > 0 ? "später" : "früher"}: diesen und alle folgenden Punkte verschieben`}>
                          {min > 0 ? `+${min}` : `−${-min}`} Min.
                        </button>
                      </form>
                    ))}
                  </section>
                )}

                <ol className="mt-4 rounded-3xl bg-weiss ring-1 ring-line">
                  {liste.map((p, i) => {
                    const z = zustand(i);
                    const wer = darfPflegen ? zustaendigWaehrend(liste, i, einsaetze) : [];
                    if (darfPflegen && bearbeiten === p.id)
                      return (
                        <li key={p.id} id={`punkt-${p.id}`} className="border-b border-line bg-gelb-hell/40 px-4 py-4 first:rounded-t-3xl last:rounded-b-3xl last:border-b-0">
                          <form action={programmpunktBearbeiten} className="grid gap-3 sm:grid-cols-4">
                            <input type="hidden" name="tag" value={tag.id} /><input type="hidden" name="id" value={p.id} />
                            <p className="font-semibold sm:col-span-4">Programmpunkt bearbeiten</p>
                            <div><label htmlFor="b-von" className="etikett">Beginn</label><input id="b-von" name="von" type="time" required defaultValue={uhrzeit(p.starts_at, false)} className="feld" /></div>
                            <div><label htmlFor="b-bis" className="etikett">Ende</label><input id="b-bis" name="bis" type="time" defaultValue={p.ends_at ? uhrzeit(p.ends_at, false) : ""} className="feld" /></div>
                            <div className="sm:col-span-2"><label htmlFor="b-title" className="etikett">Titel</label><input id="b-title" name="title" required maxLength={200} defaultValue={p.title} className="feld" /></div>
                            <div><label htmlFor="b-room" className="etikett">Raum</label><input id="b-room" name="room" maxLength={100} defaultValue={p.room ?? ""} className="feld" /></div>
                            <div><label htmlFor="b-responsible" className="etikett">Verantwortlich</label><input id="b-responsible" name="responsible" maxLength={200} defaultValue={p.responsible ?? ""} className="feld" /></div>
                            <div className="sm:col-span-2"><label htmlFor="b-note" className="etikett">Untertitel</label><input id="b-note" name="note" maxLength={1000} defaultValue={p.note ?? ""} className="feld" /></div>
                            <div className="flex flex-wrap gap-2 sm:col-span-4">
                              <button type="submit" className="knopf">Speichern</button>
                              <Link href={`/team/regieplan/?tag=${tag.id}`} className="knopf-hell">Abbrechen</Link>
                            </div>
                          </form>
                        </li>
                      );
                    return (
                      <li key={p.id} className={`relative flex gap-4 border-b border-line px-4 py-3.5 first:rounded-t-3xl last:rounded-b-3xl last:border-b-0 has-[details[open]]:z-30 ${z === "jetzt" ? "bg-gruen-hell" : ""} ${z === "vorbei" ? "opacity-50" : ""}`}>
                        {z === "jetzt" && <span aria-hidden className="absolute inset-y-0 left-0 w-1 rounded-l-3xl bg-forest" />}
                        <span className={`w-24 shrink-0 font-mono text-sm leading-6 font-semibold tabular-nums ${z === "entfaellt" ? "text-ink-soft line-through" : ""}`}>
                          {uhrzeit(p.starts_at, false)}{p.ends_at ? `–${uhrzeit(p.ends_at, false)}` : ""}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`leading-6 font-semibold ${z === "entfaellt" ? "text-ink-soft line-through" : ""}`}>
                            {p.title}
                            {z === "jetzt" && <span className="chip ml-2 bg-forest align-middle text-paper">jetzt</span>}
                            {z === "entfaellt" && <span className="chip ml-2 bg-rot-hell align-middle text-rot">entfällt</span>}
                            {p.status === "verschoben" && z !== "vorbei" && z !== "entfaellt" && <span className="chip ml-2 bg-gelb-hell align-middle">verschoben</span>}
                          </p>
                          {(p.room || p.responsible || p.note) && (
                            <p className="text-sm text-ink-soft">{[p.room, p.responsible, p.note].filter(Boolean).join(" · ")}</p>
                          )}
                          {wer.length > 0 && (
                            <ul className="mt-1.5 flex flex-wrap gap-1">
                              {wer.map((e) => <li key={e.id} className="chip bg-paper py-1 ring-1 ring-line"><span className="font-semibold">{e.person_name}</span><span className="ml-1 font-normal text-ink-soft">{e.task}</span></li>)}
                            </ul>
                          )}
                        </div>
                        {darfPflegen && (
                          <details className="relative shrink-0 self-start">
                            <summary aria-label={`Optionen für „${p.title}“`} className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-ink [&::-webkit-details-marker]:hidden">
                              <Ellipsis aria-hidden className="h-5 w-5" />
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 w-56 rounded-2xl bg-weiss p-1.5 shadow-xl ring-1 ring-ink/10">
                              <form action={programmpunktStatus}>
                                <input type="hidden" name="tag" value={tag.id} /><input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="status" value={p.status === "entfaellt" ? "geplant" : "entfaellt"} />
                                <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-paper">{p.status === "entfaellt" ? "Findet doch statt" : "Entfällt"}</button>
                              </form>
                              <Link href={`/team/regieplan/?tag=${tag.id}&bearbeiten=${p.id}#punkt-${p.id}`} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-paper">Bearbeiten</Link>
                              {z !== "vorbei" && z !== "entfaellt" && [10, 15].map((min) => (
                                <form key={min} action={programmVerschieben}>
                                  <input type="hidden" name="tag" value={tag.id} /><input type="hidden" name="id" value={p.id} />
                                  <input type="hidden" name="minuten" value={min} />
                                  <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-paper">Ab hier +{min} Min.</button>
                                </form>
                              ))}
                              <form action={programmpunktEntfernen}>
                                <input type="hidden" name="tag" value={tag.id} /><input type="hidden" name="id" value={p.id} />
                                <Rueckfrage knopf="Entfernen" knopfKlasse="w-full rounded-xl px-3 py-2 text-left text-sm text-rot hover:bg-rot-hell" gefahr ja="Ja, entfernen"
                                  frage={`„${p.title}“ aus dem Programm entfernen? Die Eingeteilten zu diesem Punkt bleiben im Rollenplan.`} />
                              </form>
                            </div>
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {liste.length === 0 && <p className="mt-4 rounded-3xl border-2 border-dashed border-line p-8 text-center text-ink-soft">Für diesen Tag ist noch kein Programm eingetragen.</p>}

                {darfPflegen && (
                  <details className="karte mt-4">
                    <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">+ Programmpunkt eintragen</summary>
                    <form action={programmpunktAnlegen} className="mt-4 grid gap-3 sm:grid-cols-4">
                      <input type="hidden" name="tag" value={tag.id} />
                      <div><label htmlFor="von" className="etikett">Beginn</label><input id="von" name="von" type="time" required className="feld" /></div>
                      <div><label htmlFor="bis" className="etikett">Ende</label><input id="bis" name="bis" type="time" className="feld" /></div>
                      <div className="sm:col-span-2"><label htmlFor="title" className="etikett">Titel</label><input id="title" name="title" required maxLength={200} className="feld" placeholder="z. B. Vortrag Ruprecht Polenz" /></div>
                      <div><label htmlFor="room" className="etikett">Raum</label><input id="room" name="room" maxLength={100} className="feld" /></div>
                      <div><label htmlFor="responsible" className="etikett">Verantwortlich</label><input id="responsible" name="responsible" maxLength={200} className="feld" /></div>
                      <div className="sm:col-span-2"><label htmlFor="note" className="etikett">Untertitel <span className="font-normal text-ink-soft">(steht in der Tagesordnung; interne Zeilen mit „intern:“ beginnen)</span></label><input id="note" name="note" maxLength={1000} className="feld" placeholder="z. B. Referent · Funktion; intern: Mikro 2" /></div>
                      <div className="sm:col-span-4"><button type="submit" className="knopf">Eintragen</button></div>
                    </form>
                  </details>
                )}
                </ProgrammHuelle>
              </div>

              {/* Team des Tages (früher Rollenplan) */}
              {darfPflegen && (
                <aside aria-label="Team des Tages" className="space-y-4 lg:sticky lg:top-6">
                  {leitung.length > 0 && (
                    <section className="rounded-3xl bg-gelb-hell p-5 ring-1 ring-line">
                      <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Entscheidet bei Problemen</p>
                      {leitung.map((e) => (
                        <p key={e.id} className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-lg font-semibold">{e.person_name}</span>
                          {e.phone && <a href={telLink(e.phone)} className="knopf !px-3 !py-1.5" aria-label={`${e.person_name} anrufen`}><Phone aria-hidden className="h-4 w-4" /></a>}
                        </p>
                      ))}
                    </section>
                  )}
                  <section className="karte !p-0">
                    <h2 className="font-display px-5 pt-5 text-xl font-bold">Team heute</h2>
                    {einsaetze.length ? (
                      <ul className="mt-2 divide-y divide-line">
                        {einsaetze.map((e) => einsatzBearbeitet === e.id ? (
                          <li key={e.id} id={`einsatz-${e.id}`} className="bg-gelb-hell/40 px-5 py-4">
                            <form action={einsatzBearbeiten} className="grid grid-cols-2 gap-3">
                              <input type="hidden" name="tag" value={tag.id} /><input type="hidden" name="id" value={e.id} />
                              <p className="col-span-2 font-semibold">Einsatz bearbeiten</p>
                              <div className="col-span-2"><label htmlFor="eb-name" className="etikett">Name</label><input id="eb-name" name="person_name" required maxLength={200} defaultValue={e.person_name} className="feld" /></div>
                              <div className="col-span-2"><label htmlFor="eb-task" className="etikett">Aufgabe</label><input id="eb-task" name="task" required maxLength={300} defaultValue={e.task ?? ""} className="feld" /></div>
                              <div className="col-span-2"><label htmlFor="eb-phone" className="etikett">Telefon</label><input id="eb-phone" name="phone" type="tel" maxLength={40} defaultValue={e.phone ?? ""} className="feld" /></div>
                              <div><label htmlFor="eb-von" className="etikett">von</label><input id="eb-von" name="von" type="time" defaultValue={e.starts_at ? uhrzeit(e.starts_at, false) : ""} className="feld" /></div>
                              <div><label htmlFor="eb-bis" className="etikett">bis</label><input id="eb-bis" name="bis" type="time" defaultValue={e.ends_at ? uhrzeit(e.ends_at, false) : ""} className="feld" /></div>
                              <label className="col-span-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="is_lead" defaultChecked={e.is_lead} className="h-4 w-4 accent-ink" /> Entscheidet bei Problemen vor Ort</label>
                              <div className="col-span-2 flex flex-wrap gap-2">
                                <button type="submit" className="knopf">Speichern</button>
                                <Link href={`/team/regieplan/?tag=${tag.id}`} className="knopf-hell">Abbrechen</Link>
                              </div>
                            </form>
                          </li>
                        ) : (
                          <li key={e.id} className="group flex items-center gap-3 px-5 py-2.5 has-[details[open]]:relative has-[details[open]]:z-30">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{e.person_name}{e.is_lead && <span className="chip ml-1.5 bg-gelb-hell">Leitung</span>}</p>
                              <p className="truncate text-sm text-ink-soft">{e.task} · {zeitspanne(e.starts_at, e.ends_at)}</p>
                            </div>
                            {e.phone && <a href={telLink(e.phone)} title={e.phone} aria-label={`${e.person_name} anrufen`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink-soft ring-1 ring-line hover:bg-forest hover:text-paper"><Phone className="h-4 w-4" /></a>}
                            <details className="relative shrink-0">
                              <summary aria-label={`Optionen für ${e.person_name}`} className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-ink [&::-webkit-details-marker]:hidden"><Ellipsis aria-hidden className="h-5 w-5" /></summary>
                              <div className="absolute right-0 z-20 mt-1 w-44 rounded-2xl bg-weiss p-1.5 shadow-xl ring-1 ring-ink/10">
                                <Link href={`/team/regieplan/?tag=${tag.id}&einsatz=${e.id}#einsatz-${e.id}`} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-paper">Bearbeiten</Link>
                                <form action={einsatzEntfernen}>
                                  <input type="hidden" name="tag" value={tag.id} /><input type="hidden" name="id" value={e.id} />
                                  <Rueckfrage knopf="Entfernen" knopfKlasse="w-full rounded-xl px-3 py-2 text-left text-sm text-rot hover:bg-rot-hell" gefahr ja="Ja, entfernen"
                                    frage={`Einsatz von ${e.person_name} entfernen?`} />
                                </form>
                              </div>
                            </details>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="px-5 pt-2 text-sm text-ink-soft">Noch niemand eingeteilt.</p>}
                    <details className="mt-2 border-t border-line px-5 py-4">
                      <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">+ Einsatz eintragen</summary>
                      <form action={einsatzAnlegen} className="mt-3 grid grid-cols-2 gap-3">
                        <input type="hidden" name="tag" value={tag.id} />
                        <div className="col-span-2"><label htmlFor="person_name" className="etikett">Name</label><input id="person_name" name="person_name" required maxLength={200} className="feld" /></div>
                        <div className="col-span-2"><label htmlFor="task" className="etikett">Aufgabe</label><input id="task" name="task" required maxLength={300} className="feld" placeholder="z. B. Einlass, Technik, Gäste" /></div>
                        <div className="col-span-2"><label htmlFor="phone" className="etikett">Telefon</label><input id="phone" name="phone" type="tel" maxLength={40} className="feld" /></div>
                        <div><label htmlFor="e-von" className="etikett">von</label><input id="e-von" name="von" type="time" className="feld" /></div>
                        <div><label htmlFor="e-bis" className="etikett">bis</label><input id="e-bis" name="bis" type="time" className="feld" /></div>
                        <p className="col-span-2 -mt-1 text-xs text-ink-soft">Ohne Uhrzeit gilt der Einsatz für den ganzen Tag.</p>
                        <label className="col-span-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="is_lead" className="h-4 w-4 accent-ink" /> Entscheidet bei Problemen vor Ort</label>
                        <div className="col-span-2"><button type="submit" className="knopf">Eintragen</button></div>
                      </form>
                      {andereTage.length > 0 && (
                        <form action={einsaetzeUebernehmen} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
                          <input type="hidden" name="tag" value={tag.id} />
                          <div className="min-w-0 flex-1">
                            <label htmlFor="von_tag" className="etikett">oder alle Einsätze kopieren von</label>
                            <select id="von_tag" name="von_tag" className="feld">
                              {andereTage.map((t) => <option key={t.id} value={t.id}>{tagBezeichnung(t, t.module.title)}</option>)}
                            </select>
                          </div>
                          <button type="submit" className="knopf-hell">Übernehmen</button>
                        </form>
                      )}
                    </details>
                  </section>
                </aside>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

/** Ist eine PDF festgelegt, steht die Programmliste (mit Zeitplan verschieben, Punkte eintragen) aufklappbar darunter. */
function ProgrammHuelle({ eingeklappt, anzahl, children }: { eingeklappt: boolean; anzahl: number; children: React.ReactNode }) {
  if (!eingeklappt) return <>{children}</>;
  return (
    <details className="mt-4 rounded-3xl bg-weiss p-4 ring-1 ring-line">
      <summary className="cursor-pointer font-semibold">Programmliste und Zeitplan ({anzahl} Punkte)</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Hinweis } from "@/components/team/Hinweis";
import { Ergebnis, kontaktHinweise, wann } from "@/components/team/Kontakt";
import { Rueckfrage } from "@/components/team/Rueckfrage";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Leer, Rueckmeldung, Titel } from "@/components/team/Ui";
import { MailHinweis } from "@/components/team/MailHinweis";
import { AuswahlKnoepfe } from "@/components/team/AuswahlKnoepfe";
import { RundmailFormular } from "@/components/team/RundmailFormular";
import { darf, requireStaff } from "@/lib/auth";
import { mentorSpeichern, willkommenAnAlle } from "@/lib/aktionen/teilnehmende";
import { createClient } from "@/lib/supabase/server";
import { mailBereit } from "@/lib/mail";
import { filterBeschreibung, herkunft, kontakte, ladeListe, leseFilter, punkt, termine, uebernachtungen, zusagen } from "@/lib/teilnehmende-liste";
import { telLink } from "@/lib/telefon";
import { nachtName } from "@/lib/uebernachtung";

export const metadata: Metadata = { title: "Teilnehmende | SES Academy" };

/**
 * Teilnehmende und Anrufliste in einem (ab Orga-Team): alle Filter, je Person Zusage und Anwesenheit pro Modul,
 * Telefon und der letzte Anruf bzw. die letzte Notiz. Ein Klick auf den Namen öffnet Verlauf, Notizen und Zusagen.
 * E-Mail-Adressen, Hausaufgaben und die Verantwortlichen-Pflege nur für Admin/Vorstand.
 */
export default async function Teilnehmende({ searchParams }: PageProps<"/team/teilnehmende">) {
  const staff = await requireStaff("orga");
  const alles = darf.alles(staff.role);
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const supabase = await createClient();
  const filter = leseFilter(sp);
  const { jahrgang, modulListe, modul, jetzt, alle, grundmenge, liste, zusage, kontakt, ueb, gruppe } = await ladeListe(filter, alles);
  const [{ data: aufgaben }, { data: abgaben }, { data: mentoren }, { data: vorlagen }] = await Promise.all([
    alles ? supabase.from("assignments").select("id,number").eq("cohort_id", jahrgang?.id ?? "").order("number") : Promise.resolve({ data: [] }),
    alles ? supabase.from("submission_participants").select("participant_id, submissions(assignment_id)") : Promise.resolve({ data: [] }),
    alles ? supabase.from("mentors").select("id,name,email,user_id").order("name") : Promise.resolve({ data: [] }),
    alles ? supabase.from("message_templates").select("id, name, subject_de, body_de, subject_tr, body_tr").order("name") : Promise.resolve({ data: [] }),
  ]);
  const haVon = new Map<string, Set<string>>();
  for (const a of (abgaben ?? []) as { participant_id: string; submissions: { assignment_id: string } | null }[]) {
    if (a.submissions) haVon.set(a.participant_id, (haVon.get(a.participant_id) ?? new Set()).add(a.submissions.assignment_id));
  }

  let ohneLogin = 0;
  if (alles) {
    const [{ data: ohneKonto }, { data: begruesst }] = await Promise.all([
      supabase.from("participants").select("id").eq("affiliation_status", "academy_student").eq("active", true).not("email", "is", null).is("user_id", null),
      supabase.from("email_log").select("participant_id").eq("kind", "willkommen").eq("status", "sent"),
    ]);
    const schon = new Set((begruesst ?? []).map((z) => z.participant_id));
    ohneLogin = (ohneKonto ?? []).filter((p) => !schon.has(p.id)).length;
  }

  const mitZusagen = new Set(alle.flatMap((p) => p.modules.filter((r) => r.r).map((r) => r.m)));
  const auswahl = (werte: (string | null)[]) => {
    const z = new Map<string, number>();
    for (const w of werte) z.set(w ?? "-", (z.get(w ?? "-") ?? 0) + 1);
    return [...z.entries()].sort((a, b) => (a[0] === "-" ? 1 : b[0] === "-" ? -1 : a[0].localeCompare(b[0], "de")));
  };
  const regionen = auswahl(alle.map((p) => p.region));
  const sorumlus = auswahl(alle.map((p) => p.mentor_name));

  const adresse = (aenderung: Record<string, string>, pfad = "/team/teilnehmende/") => {
    const q = new URLSearchParams();
    for (const k of ["modul", "q", "region", "verantwortlich", "gt", "filter", "gruppe", "zusage", "kontakt", "uebernachtung"]) if (s(k)) q.set(k, s(k));
    if (modul && !q.has("modul")) q.set("modul", modul.id);
    for (const [k, v] of Object.entries(aenderung)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    return `${pfad}?${q}`;
  };
  const personLink = (id: string) => `/team/teilnehmende/${id}/${modul ? `?modul=${modul.id}` : ""}`;
  const code = typeof sp.hinweis === "string" ? sp.hinweis : undefined;

  return (
    <>
      <TeamKopf staff={staff} aktiv="teilnehmende" breit />
      <main className="mx-auto max-w-[96rem] px-4 py-10">
        <Titel kicker={`${jahrgang?.name ?? "Kein aktueller Jahrgang"} · ${liste.length} von ${alle.length}`}>Teilnehmende</Titel>
        {gruppe === "jahrgang" && alle.some((p) => herkunft(p) && p.affiliation_status !== "academy_student") && (
          <p className="-mt-5 mb-6 text-sm text-ink-soft">
            {alle.filter((p) => herkunft(p) && p.affiliation_status !== "academy_student").length} Gäste und Walk-ins sind ausgeblendet.{" "}
            <Link href={adresse({ gruppe: "gaeste" })} className="link">Anzeigen</Link>
          </p>
        )}
        {code && code in kontaktHinweise ? <Hinweis code={code} texte={kontaktHinweise} /> : <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />}
        {alles && ohneLogin > 0 && (
          <form action={willkommenAnAlle} className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-line">
            <p className="mr-auto text-sm">{ohneLogin} Teilnehmende mit E-Mail haben sich noch nie angemeldet und noch keine Willkommensmail bekommen. Sie enthält Ticket und Anleitung zum Login.</p>
            <Rueckfrage knopf="Willkommensmail senden" knopfKlasse="knopf" ja={`Ja, an ${ohneLogin} senden`}
              frage={`Willkommensmail jetzt an ${ohneLogin} Teilnehmende senden? Jede Person bekommt sie nur einmal.`} />
            <MailHinweis knapp className="w-full" />
          </form>
        )}
        {alles && (
          <div className="mb-6 flex gap-2">
            <Link href="?" className={`rounded-full px-4 py-1.5 text-sm font-semibold ${s("ansicht") !== "verantwortliche" ? "bg-ink text-paper" : "bg-weiss ring-1 ring-line"}`}>Liste</Link>
            <Link href="?ansicht=verantwortliche" className={`rounded-full px-4 py-1.5 text-sm font-semibold ${s("ansicht") === "verantwortliche" ? "bg-ink text-paper" : "bg-weiss ring-1 ring-line"}`}>Verantwortliche ({mentoren?.length ?? 0})</Link>
          </div>
        )}

        {alles && s("ansicht") === "verantwortliche" ? (
          <section className="karte">
            <p className="mb-4 max-w-3xl text-sm text-ink-soft">
              Verantwortliche (Sorumlu) betreuen eine Gruppe. Mit eingetragener E-Mail können sie sich später anmelden. Wer im Team-Bereich mitarbeiten soll, braucht zusätzlich eine Team-Rolle (Admin legt sie unter „Team“ an).
            </p>
            {mentoren?.map((m) => (
              <form key={m.id} action={mentorSpeichern} className="grid items-center gap-2 border-b border-line py-3 sm:grid-cols-[1.2fr_1.5fr_auto]">
                <input type="hidden" name="id" value={m.id} />
                <div>
                  <input name="name" defaultValue={m.name} required className="feld" aria-label="Name" />
                  <p className="mt-1 text-xs text-ink-soft">
                    <Link href={`?verantwortlich=${encodeURIComponent(m.name)}`} className="underline">{alle.filter((p) => p.mentor_name === m.name).length} Teilnehmende</Link>
                    {m.user_id ? " · hat sich angemeldet" : ""}
                  </p>
                </div>
                <input name="email" type="email" defaultValue={m.email ?? ""} placeholder="E-Mail" className="feld" aria-label="E-Mail" />
                <button className="knopf-hell">Speichern</button>
              </form>
            ))}
            <form action={mentorSpeichern} className="mt-4 grid items-center gap-2 sm:grid-cols-[1.2fr_1.5fr_auto]">
              <input name="name" required placeholder="Neue verantwortliche Person" className="feld" />
              <input name="email" type="email" placeholder="E-Mail (optional)" className="feld" />
              <button className="knopf">Hinzufügen</button>
            </form>
          </section>
        ) : (
          <>
            <form key={JSON.stringify(sp)} className="mb-4 grid gap-3 rounded-3xl bg-weiss p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-5" action="/team/teilnehmende/">
              <select name="modul" defaultValue={modul?.id} className="feld lg:col-span-2" aria-label="Modul">
                {modulListe.map((m) => <option key={m.id} value={m.id}>{m.title} · {termine(m.tage)}{m.cancelled_at ? " (abgesagt)" : ""}</option>)}
              </select>
              <input name="q" defaultValue={s("q")} placeholder={alles ? "Name, E-Mail oder Telefon" : "Name oder Telefon"} className="feld lg:col-span-3" />
              <select name="region" defaultValue={s("region")} className="feld" aria-label="Region">
                <option value="">Alle Regionen</option>
                {regionen.map(([w, n]) => <option key={w} value={w}>{w === "-" ? "ohne Region" : w} ({n})</option>)}
              </select>
              <select name="verantwortlich" defaultValue={s("verantwortlich")} className="feld" aria-label="Sorumlu">
                <option value="">Alle Sorumlu</option>
                {sorumlus.map(([w, n]) => <option key={w} value={w}>{w === "-" ? "ohne Sorumlu" : w} ({n})</option>)}
              </select>
              <select name="uebernachtung" defaultValue={ueb} className="feld" aria-label="Übernachtung">
                {(Object.keys(uebernachtungen) as (keyof typeof uebernachtungen)[]).map((u) => <option key={u} value={u}>{uebernachtungen[u].name}</option>)}
              </select>
              <select name="kontakt" defaultValue={kontakt} className="feld" aria-label="Kontakt">
                {(Object.keys(kontakte) as (keyof typeof kontakte)[]).map((k) => <option key={k} value={k}>{kontakte[k].name}</option>)}
              </select>
              <select name="gt" defaultValue={s("gt")} className="feld" aria-label="GT/KGT">
                <option value="">GT und KGT</option>
                <option>GT</option>
                <option>KGT</option>
              </select>
              <select name="filter" defaultValue={s("filter")} className="feld" aria-label="Status">
                <option value="">Alle Aktiven</option>
                {alles && <option value="ohne-mail">Ohne E-Mail</option>}
                <option value="ohne-telefon">Ohne Telefon</option>
                <option value="inaktiv">Ausgeschieden</option>
              </select>
              <select name="gruppe" defaultValue={gruppe} className="feld" aria-label="Wer">
                <option value="jahrgang">Nur Jahrgang</option>
                <option value="alle">Mit Gästen und Walk-ins</option>
                <option value="gaeste">Nur Gäste und Walk-ins ({alle.filter((p) => herkunft(p)).length})</option>
              </select>
              {zusage && <input type="hidden" name="zusage" value={zusage} />}
              <div className="flex gap-2 lg:col-span-2">
                <button className="knopf">Filtern</button>
                <Link href="/team/teilnehmende/" className="knopf-hell">Zurücksetzen</Link>
              </div>
            </form>

            {modul && (
              <nav aria-label="Zusage" className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{modul.title}:</span>
                {(Object.keys(zusagen) as (keyof typeof zusagen)[]).map((z) => (
                  <Link key={z} href={adresse({ zusage: z })} aria-current={z === zusage ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${z === zusage ? "bg-ink text-paper ring-ink" : "bg-weiss ring-line hover:ring-ink"}`}>
                    {zusagen[z].name} <span className="opacity-70">{grundmenge.filter(zusagen[z].passt).length}</span>
                  </Link>
                ))}
              </nav>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="mr-auto text-sm text-ink-soft">{liste.length} {liste.length === 1 ? "Person" : "Personen"} in dieser Auswahl{alles ? "" : " (ohne E-Mail-Adressen)"}</p>
              {liste.length > 0 && <a href={adresse({}, "/team/teilnehmende/export/")} className="knopf-hell" download>Als Excel herunterladen</a>}
            </div>
            {alles && liste.length > 0 && (
              <details id="rundmail" className="karte mb-4">
                <summary className="cursor-pointer font-display text-lg font-bold">Rundmail an diese Auswahl</summary>
                <p className="mt-2 max-w-3xl text-sm text-ink-soft">
                  Geht an alle angehakten Personen der Liste unten (anfangs alle {liste.length}). Einzelne lassen sich in der ersten Spalte abwählen.
                  Wie jede Nachricht an viele gibt sie eine zweite Person unter „Freigaben“ frei.
                </p>
                <div className="mt-4">
                  <RundmailFormular vorlagen={vorlagen ?? []} mailBereit={mailBereit()} email={staff.email}
                    auswahl={{ beschreibung: filterBeschreibung(filter, modul?.title ?? null) || (gruppe === "jahrgang" ? "ganzer Jahrgang" : "") }} />
                </div>
              </details>
            )}

            {liste.length === 0 ? (
              <Leer>Niemand in dieser Auswahl.</Leer>
            ) : (
              <div className="overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
                <table className="tabelle">
                  <thead>
                    <tr>
                      {alles && <th className="whitespace-nowrap"><span className="sr-only">Für die Rundmail ausgewählt</span><AuswahlKnoepfe /></th>}
                      <th>Name</th><th>Telefon</th><th>Region</th><th>Sorumlu</th>
                      {modul && <th>Übernachtung</th>}
                      {modulListe.map((m) => (
                        <th key={m.id} title={m.title} className={`text-center whitespace-nowrap ${m.id === modul?.id ? "bg-gelb-hell/60" : m.tage[m.tage.length - 1].ends_at < jetzt ? "opacity-60" : ""}`}>{termine(m.tage)}</th>
                      ))}
                      {alles && <th>E-Mail</th>}
                      {alles && aufgaben?.map((a) => <th key={a.id} className="text-center">HA{a.number}</th>)}
                      <th>Letzter Kontakt / Notiz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map((p) => (
                      <tr key={p.participant_id}>
                        {alles && (
                          <td>
                            <input type="checkbox" data-rundmail value={p.participant_id} defaultChecked aria-label={`${p.name} für die Rundmail auswählen`} className="h-4 w-4 accent-ink" />
                          </td>
                        )}
                        <td className="whitespace-nowrap">
                          <Link href={personLink(p.participant_id)} className="font-semibold hover:underline">{p.name}</Link>
                          {herkunft(p) && <span className="chip ml-1.5 bg-paper-deep align-middle">{herkunft(p)}</span>}
                        </td>
                        <td className="whitespace-nowrap">
                          {p.phone ? <a href={telLink(p.phone)} className="inline-flex items-center gap-1 text-sm hover:underline" aria-label={`${p.name} anrufen`}><Phone aria-hidden className="h-3.5 w-3.5" />{p.phone}</a> : <span className="text-sm text-ink-soft">–</span>}
                        </td>
                        <td className="whitespace-nowrap">{p.region ?? <span className="text-rot">fehlt</span>}</td>
                        <td className="whitespace-nowrap">{p.mentor_name ?? "–"}</td>
                        {modul && <td className="text-sm whitespace-nowrap">{!p.registration_status ? "–" : !p.stay_answered ? <span className="text-ink-soft">keine Angabe</span> : p.nights?.length ? p.nights.map(nachtName).join(", ") : "nein"}</td>}
                        {modulListe.map((m) => {
                          const pk = punkt(p.modules.find((r) => r.m === m.id), m.tage.length, m.tage[m.tage.length - 1].ends_at < jetzt, mitZusagen.has(m.id));
                          return (
                            <td key={m.id} className={`text-center ${m.id === modul?.id ? "bg-gelb-hell/30" : ""}`}>
                              {pk ? <span title={`${m.title}: ${pk.text}`} className={`inline-block h-3 w-3 rounded-full ${pk.farbe}`} /> : <span className="text-ink-soft/40">·</span>}
                            </td>
                          );
                        })}
                        {alles && <td>{p.email ? <span title={p.email}>✓</span> : <span className="chip bg-gelb-hell">fehlt</span>}</td>}
                        {alles && aufgaben?.map((a) => <td key={a.id} className="text-center">{haVon.get(p.participant_id)?.has(a.id) ? "✓" : <span className="text-ink-soft/40">–</span>}</td>)}
                        <td className="min-w-64 text-sm">
                          {p.last_at && p.last_channel ? (
                            <Link href={`${personLink(p.participant_id)}#p-${p.participant_id}`} className="flex flex-wrap items-center gap-1.5 hover:underline">
                              <Ergebnis outcome={p.last_outcome} />
                              <span className="text-ink-soft">{wann(p.last_at)}{p.last_by ? ` · ${p.last_by}` : ""}</span>
                              {p.last_note && <span className="line-clamp-1 max-w-80 text-ink">„{p.last_note}“</span>}
                            </Link>
                          ) : <span className="text-ink-soft">noch nichts</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 flex flex-wrap gap-4 text-xs text-ink-soft">
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-mint" />da (Einlass)</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-orange-400" />teilweise da</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-yellow-300" />zugesagt</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rot" />noch keine Zusage / nicht gekommen</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-zinc-300" />abgesagt / entschuldigt</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-paper-deep ring-1 ring-line" />angemeldet, Zusagen noch nicht abgefragt</span>
              <span>Name anklicken: Anrufe, Notizen und Zusagen der Person</span>
            </p>
          </>
        )}
      </main>
    </>
  );
}

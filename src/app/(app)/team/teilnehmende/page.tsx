import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Hinweis } from "@/components/team/Hinweis";
import { Ergebnis, kontaktHinweise, wann } from "@/components/team/Kontakt";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Leer, Rueckmeldung, Titel } from "@/components/team/Ui";
import { darf, requireStaff } from "@/lib/auth";
import { mentorSpeichern, willkommenAnAlle } from "@/lib/aktionen/teilnehmende";
import { istToken } from "@/lib/codes";
import { faltName } from "@/lib/import/namen";
import { createClient } from "@/lib/supabase/server";
import { telLink } from "@/lib/telefon";
import { nachtName } from "@/lib/uebernachtung";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Teilnehmende | SES Academy" };

const tagZahl = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: "Europe/Berlin" });
const monat = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" });
/** Spaltenkopf eines Moduls: seine Termine statt eines Kürzels, z. B. „14./15. Nov.“ */
function termine(tage: { starts_at: string }[]) {
  const d = tage.map((t) => new Date(t.starts_at));
  const monate = [...new Set(d.map((x) => monat.format(x)))];
  return monate.length === 1 ? `${d.map((x) => tagZahl.format(x)).join("./")}. ${monate[0]}` : d.map((x) => `${tagZahl.format(x)}. ${monat.format(x)}`).join(" / ");
}

type ModulStand = { m: string; s: string; r: string | null; d: number };
type Person = {
  participant_id: string; name: string; email: string | null; phone: string | null; region: string | null; mentor_name: string | null;
  branch: string | null; active: boolean; affiliation_status: string; gender: string | null; modules: ModulStand[];
  registration_status: string | null; rsvp: string | null; stay_answered: boolean; nights: string[] | null; module_contacts: number;
  last_at: string | null; last_channel: string | null; last_outcome: string | null; last_note: string | null; last_by: string | null;
};

/** Punkt je Modul: da (grün), teilweise (orange), zugesagt (gelb), keine Zusage bzw. nicht gekommen (rot), abgesagt (grau). */
function punkt(reg: ModulStand | undefined, tage: number, vorbei: boolean) {
  if (!reg) return null;
  if (reg.d >= tage) return { farbe: "bg-mint", text: "alle Tage da" };
  if (reg.d > 0) return { farbe: "bg-orange-400", text: `${reg.d} von ${tage} Tagen da` };
  if (reg.s === "excused" || reg.s === "cancelled" || reg.r === "abgesagt") return { farbe: "bg-zinc-300", text: "abgesagt oder entschuldigt" };
  if (vorbei) return { farbe: "bg-rot", text: "nicht da" };
  if (reg.s === "waitlist") return { farbe: "bg-paper-deep ring-1 ring-line", text: "Warteliste" };
  return reg.r === "zugesagt" ? { farbe: "bg-yellow-300", text: "zugesagt" } : { farbe: "bg-rot", text: "noch keine Zusage" };
}

// Filter für das gewählte Modul (wie früher in der Anrufliste)
const zusagen = {
  "": { name: "Alle", passt: () => true },
  offen: { name: "Noch keine Zusage", passt: (p: Person) => p.registration_status === "confirmed" && !p.rsvp },
  zugesagt: { name: "Zugesagt", passt: (p: Person) => p.rsvp === "zugesagt" },
  abgesagt: { name: "Abgesagt", passt: (p: Person) => p.rsvp === "abgesagt" || p.registration_status === "excused" || p.registration_status === "cancelled" },
} as const;
const kontakte = {
  "": { name: "Kontakt: alle", passt: () => true },
  offen: { name: "Noch nicht kontaktiert", passt: (p: Person) => p.module_contacts === 0 },
  nachfassen: { name: "Nicht erreicht / Rückruf", passt: (p: Person) => p.last_outcome === "nicht_erreicht" || p.last_outcome === "rueckruf" },
  erreicht: { name: "Erreicht", passt: (p: Person) => p.last_outcome === "erreicht" },
} as const;
const uebernachtungen = {
  "": { name: "Übernachtung: alle", passt: () => true },
  offen: { name: "Übernachtung: keine Angabe", passt: (p: Person) => !p.stay_answered },
  ja: { name: "übernachtet", passt: (p: Person) => (p.nights?.length ?? 0) > 0 },
  nein: { name: "übernachtet nicht", passt: (p: Person) => p.stay_answered && !p.nights?.length },
} as const;
const wahl = <T extends object>(liste: T, wert: string) => (wert in liste ? wert : "") as keyof T;

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
  const { data: jahrgang } = await supabase.from("cohorts").select("id,name").eq("is_current", true).maybeSingle();
  let modulAbfrage = supabase.from("modules").select("id,title,cancelled_at,module_days(id,starts_at,ends_at)").neq("status", "draft");
  if (jahrgang) modulAbfrage = modulAbfrage.eq("cohort_id", jahrgang.id);
  const { data: module } = await modulAbfrage;
  const jetzt = new Date(jetztMs()).toISOString();
  const modulListe = (module ?? [])
    .map((m) => ({ ...m, tage: [...m.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .filter((m) => m.tage.length)
    .sort((a, b) => a.tage[0].starts_at.localeCompare(b.tage[0].starts_at));
  // Vorschlag: das nächste Modul, das noch nicht vorbei ist
  const modul = modulListe.find((m) => m.id === s("modul") && istToken(s("modul")))
    ?? modulListe.find((m) => !m.cancelled_at && m.tage[m.tage.length - 1].ends_at > jetzt) ?? modulListe.at(-1);

  const [{ data: personen }, { data: aufgaben }, { data: abgaben }, { data: mentoren }] = await Promise.all([
    supabase.rpc("get_people", { p_module_id: modul?.id }),
    alles ? supabase.from("assignments").select("id,number").eq("cohort_id", jahrgang?.id ?? "").order("number") : Promise.resolve({ data: [] }),
    alles ? supabase.from("submission_participants").select("participant_id, submissions(assignment_id)") : Promise.resolve({ data: [] }),
    alles ? supabase.from("mentors").select("id,name,email,user_id").order("name") : Promise.resolve({ data: [] }),
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

  const alle = (personen ?? []) as unknown as Person[];
  const zusage = wahl(zusagen, s("zusage"));
  const kontakt = wahl(kontakte, s("kontakt"));
  const ueb = wahl(uebernachtungen, s("uebernachtung"));
  const gruppe = s("gruppe") === "alle" ? "alle" : "jahrgang";
  const qf = faltName(s("q"));
  // Grundmenge: alles außer dem Zusage-Filter; die Zusage-Knöpfe zählen darin
  const grundmenge = alle.filter((p) => {
    if (gruppe === "jahrgang" && p.affiliation_status !== "academy_student") return false;
    if (qf && !faltName(`${p.name} ${p.email ?? ""} ${p.phone ?? ""}`).includes(qf)) return false;
    if (s("region") && (p.region ?? "-") !== s("region")) return false;
    if (s("verantwortlich") && (p.mentor_name ?? "-") !== s("verantwortlich")) return false;
    if (s("gt") && p.branch !== s("gt")) return false;
    if (s("filter") === "ohne-mail" && (!alles || p.email)) return false;
    if (s("filter") === "ohne-telefon" && p.phone) return false;
    if (!kontakte[kontakt].passt(p) || !uebernachtungen[ueb].passt(p)) return false;
    return s("filter") === "inaktiv" ? !p.active : p.active;
  });
  const liste = grundmenge.filter(zusagen[zusage].passt);
  const auswahl = (werte: (string | null)[]) => {
    const z = new Map<string, number>();
    for (const w of werte) z.set(w ?? "-", (z.get(w ?? "-") ?? 0) + 1);
    return [...z.entries()].sort((a, b) => (a[0] === "-" ? 1 : b[0] === "-" ? -1 : a[0].localeCompare(b[0], "de")));
  };
  const regionen = auswahl(alle.map((p) => p.region));
  const sorumlus = auswahl(alle.map((p) => p.mentor_name));

  const adresse = (aenderung: Record<string, string>) => {
    const q = new URLSearchParams();
    for (const k of ["modul", "q", "region", "verantwortlich", "gt", "filter", "gruppe", "zusage", "kontakt", "uebernachtung"]) if (s(k)) q.set(k, s(k));
    if (modul && !q.has("modul")) q.set("modul", modul.id);
    for (const [k, v] of Object.entries(aenderung)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    return `/team/teilnehmende/?${q}`;
  };
  const personLink = (id: string) => `/team/teilnehmende/${id}/${modul ? `?modul=${modul.id}` : ""}`;
  const code = typeof sp.hinweis === "string" ? sp.hinweis : undefined;

  return (
    <>
      <TeamKopf staff={staff} aktiv="teilnehmende" breit />
      <main className="mx-auto max-w-[96rem] px-4 py-10">
        <Titel kicker={`${jahrgang?.name ?? "Kein aktueller Jahrgang"} · ${liste.length} von ${alle.length}`}>Teilnehmende</Titel>
        {code && code in kontaktHinweise ? <Hinweis code={code} texte={kontaktHinweise} /> : <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />}
        {alles && ohneLogin > 0 && (
          <form action={willkommenAnAlle} className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-line">
            <p className="mr-auto text-sm">{ohneLogin} Teilnehmende mit E-Mail haben sich noch nie angemeldet und noch keine Willkommensmail bekommen. Sie enthält Ticket und Anleitung zum Login.</p>
            <button type="submit" className="knopf">Willkommensmail senden</button>
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
            <form className="mb-4 grid gap-3 rounded-3xl bg-weiss p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-5" action="/team/teilnehmende/">
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

            {liste.length === 0 ? (
              <Leer>Niemand in dieser Auswahl.</Leer>
            ) : (
              <div className="overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
                <table className="tabelle">
                  <thead>
                    <tr>
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
                        <td className="whitespace-nowrap"><Link href={personLink(p.participant_id)} className="font-semibold hover:underline">{p.name}</Link></td>
                        <td className="whitespace-nowrap">
                          {p.phone ? <a href={telLink(p.phone)} className="inline-flex items-center gap-1 text-sm hover:underline" aria-label={`${p.name} anrufen`}><Phone aria-hidden className="h-3.5 w-3.5" />{p.phone}</a> : <span className="text-sm text-ink-soft">–</span>}
                        </td>
                        <td className="whitespace-nowrap">{p.region ?? <span className="text-rot">fehlt</span>}</td>
                        <td className="whitespace-nowrap">{p.mentor_name ?? "–"}</td>
                        {modul && <td className="text-sm whitespace-nowrap">{!p.registration_status ? "–" : !p.stay_answered ? <span className="text-ink-soft">keine Angabe</span> : p.nights?.length ? p.nights.map(nachtName).join(", ") : "nein"}</td>}
                        {modulListe.map((m) => {
                          const pk = punkt(p.modules.find((r) => r.m === m.id), m.tage.length, m.tage[m.tage.length - 1].ends_at < jetzt);
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
              <span>Name anklicken: Anrufe, Notizen und Zusagen der Person</span>
            </p>
          </>
        )}
      </main>
    </>
  );
}

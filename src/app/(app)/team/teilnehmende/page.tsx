import type { Metadata } from "next";
import Link from "next/link";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Leer, Rueckmeldung, Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { mentorSpeichern, willkommenAnAlle } from "@/lib/aktionen/teilnehmende";
import { faltName } from "@/lib/import/namen";
import { createClient } from "@/lib/supabase/server";
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

/** Punkt je Modul: da (grün), teilweise (orange), zugesagt (gelb), keine Zusage bzw. nicht gekommen (rot), abgesagt (grau). */
function punkt(reg: { status: string; rsvp: string | null } | undefined, da: number, tage: number, vorbei: boolean) {
  if (!reg) return null;
  if (da >= tage) return { farbe: "bg-mint", text: "alle Tage da" };
  if (da > 0) return { farbe: "bg-orange-400", text: `${da} von ${tage} Tagen da` };
  if (reg.status === "excused" || reg.status === "cancelled" || reg.rsvp === "abgesagt") return { farbe: "bg-zinc-300", text: "abgesagt oder entschuldigt" };
  if (vorbei) return { farbe: "bg-rot", text: "nicht da" };
  if (reg.status === "waitlist") return { farbe: "bg-paper-deep ring-1 ring-line", text: "Warteliste" };
  return reg.rsvp === "zugesagt" ? { farbe: "bg-yellow-300", text: "zugesagt" } : { farbe: "bg-rot", text: "noch keine Zusage" };
}

type Zeile = {
  id: string; first_name: string; last_name: string; email: string | null; branch: string | null; active: boolean;
  regions: { name: string } | null; mentors: { name: string } | null;
  registrations: { module_id: string; status: string; rsvp: string | null; attendances: { module_day_id: string }[] }[];
  submission_participants: { submissions: { assignment_id: string } | null }[];
};

export default async function Teilnehmende({ searchParams }: PageProps<"/team/teilnehmende">) {
  const staff = await requireStaff("alles");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const supabase = await createClient();
  const { data: jahrgang } = await supabase.from("cohorts").select("id,name").eq("is_current", true).maybeSingle();
  const [{ data: personen }, { data: regionen }, { data: mentoren }, { data: module }, { data: aufgaben }] = await Promise.all([
    supabase
      .from("participants")
      .select("id,first_name,last_name,email,branch,active,regions(name),mentors(name),registrations(module_id,status,rsvp,attendances(module_day_id)),submission_participants(submissions(assignment_id))")
      .eq("affiliation_status", "academy_student")
      .order("first_name"),
    supabase.from("regions").select("id,name").order("name"),
    supabase.from("mentors").select("id,name,email,user_id").order("name"),
    supabase.from("modules").select("id,slug,title,module_days(id,starts_at,ends_at)").eq("cohort_id", jahrgang?.id ?? "").neq("status", "draft"),
    supabase.from("assignments").select("id,number").eq("cohort_id", jahrgang?.id ?? "").order("number"),
  ]);
  // noch nie angemeldet und noch ohne Willkommensmail
  const [{ data: ohneKonto }, { data: begruesst }] = await Promise.all([
    supabase.from("participants").select("id").eq("affiliation_status", "academy_student").eq("active", true).not("email", "is", null).is("user_id", null),
    supabase.from("email_log").select("participant_id").eq("kind", "willkommen").eq("status", "sent"),
  ]);
  const schonBegruesst = new Set((begruesst ?? []).map((z) => z.participant_id));
  const ohneLogin = (ohneKonto ?? []).filter((p) => !schonBegruesst.has(p.id)).length;
  const modulListe = (module ?? [])
    .map((m) => ({ ...m, tage: [...m.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .filter((m) => m.tage.length)
    .sort((a, b) => a.tage[0].starts_at.localeCompare(b.tage[0].starts_at));
  const jetzt = new Date(jetztMs()).toISOString();

  const qf = faltName(s("q"));
  const alle = (personen ?? []) as unknown as Zeile[];
  const liste = alle.filter((p) => {
    if (qf && !faltName(`${p.first_name} ${p.last_name} ${p.email ?? ""}`).includes(qf)) return false;
    if (s("region") && p.regions?.name !== s("region")) return false;
    if (s("verantwortlich") && p.mentors?.name !== s("verantwortlich")) return false;
    if (s("gt") && p.branch !== s("gt")) return false;
    if (s("filter") === "ohne-mail" && p.email) return false;
    return s("filter") === "inaktiv" ? !p.active : p.active;
  });
  const anzahl = new Map<string, number>();
  alle.forEach((p) => p.mentors && anzahl.set(p.mentors.name, (anzahl.get(p.mentors.name) ?? 0) + 1));

  return (
    <>
      <TeamKopf staff={staff} aktiv="teilnehmende" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Titel kicker={`${jahrgang?.name ?? "Kein aktueller Jahrgang"} · ${liste.length} von ${alle.length}`}>Teilnehmende</Titel>
        <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />
        {ohneLogin > 0 && (
          <form action={willkommenAnAlle} className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-line">
            <p className="mr-auto text-sm">{ohneLogin} Teilnehmende mit E-Mail haben sich noch nie angemeldet und noch keine Willkommensmail bekommen. Sie enthält Ticket und Anleitung zum Login.</p>
            <button type="submit" className="knopf">Willkommensmail senden</button>
          </form>
        )}
        <div className="mb-6 flex gap-2">
          <Link href="?" className={`rounded-full px-4 py-1.5 text-sm font-semibold ${s("ansicht") !== "verantwortliche" ? "bg-ink text-paper" : "bg-weiss ring-1 ring-line"}`}>Liste</Link>
          <Link href="?ansicht=verantwortliche" className={`rounded-full px-4 py-1.5 text-sm font-semibold ${s("ansicht") === "verantwortliche" ? "bg-ink text-paper" : "bg-weiss ring-1 ring-line"}`}>Verantwortliche ({mentoren?.length ?? 0})</Link>
        </div>

        {s("ansicht") === "verantwortliche" ? (
          <section className="karte">
            <p className="mb-4 max-w-3xl text-sm text-ink-soft">
              Verantwortliche (Sorumlu) betreuen eine Gruppe. Mit eingetragener E-Mail können sie sich später anmelden. Wer im Team-Bereich mitarbeiten soll, braucht zusätzlich eine Team-Rolle (Admin legt sie in Supabase an, siehe README).
            </p>
            {mentoren?.map((m) => (
              <form key={m.id} action={mentorSpeichern} className="grid items-center gap-2 border-b border-line py-3 sm:grid-cols-[1.2fr_1.5fr_auto]">
                <input type="hidden" name="id" value={m.id} />
                <div>
                  <input name="name" defaultValue={m.name} required className="feld" aria-label="Name" />
                  <p className="mt-1 text-xs text-ink-soft">
                    <Link href={`?verantwortlich=${encodeURIComponent(m.name)}`} className="underline">{anzahl.get(m.name) ?? 0} Teilnehmende</Link>
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
            <form className="mb-6 grid gap-3 rounded-3xl bg-weiss p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-6">
              <input name="q" defaultValue={s("q")} placeholder="Name oder E-Mail suchen" className="feld lg:col-span-2" />
              <select name="region" defaultValue={s("region")} className="feld" aria-label="Region">
                <option value="">Alle Regionen</option>
                {regionen?.map((r) => <option key={r.id}>{r.name}</option>)}
              </select>
              <select name="verantwortlich" defaultValue={s("verantwortlich")} className="feld" aria-label="Verantwortlich">
                <option value="">Alle Verantwortlichen</option>
                {mentoren?.map((m) => <option key={m.id}>{m.name}</option>)}
              </select>
              <select name="gt" defaultValue={s("gt")} className="feld" aria-label="GT/KGT">
                <option value="">GT und KGT</option>
                <option>GT</option>
                <option>KGT</option>
              </select>
              <select name="filter" defaultValue={s("filter")} className="feld" aria-label="Filter">
                <option value="">Alle Aktiven</option>
                <option value="ohne-mail">Ohne E-Mail</option>
                <option value="inaktiv">Ausgeschieden</option>
              </select>
              <div className="flex gap-2 lg:col-span-6">
                <button className="knopf">Filtern</button>
                <Link href="/team/teilnehmende/" className="knopf-hell">Zurücksetzen</Link>
              </div>
            </form>

            {liste.length === 0 ? (
              <Leer>Keine Teilnehmenden für diese Auswahl. Neue Personen kommen über „Bewerbungen“ oder den Import.</Leer>
            ) : (
              <div className="overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
                <table className="tabelle">
                  <thead>
                    <tr>
                      <th>Name</th><th>Region</th><th>GT/KGT</th><th>Verantwortlich</th><th>E-Mail</th>
                      {modulListe.map((m) => <th key={m.id} title={m.title} className={`text-center whitespace-nowrap ${m.tage[m.tage.length - 1].ends_at < jetzt ? "opacity-60" : ""}`}>{termine(m.tage)}</th>)}
                      {aufgaben?.map((a) => <th key={a.id} className="text-center">HA{a.number}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map((p) => {
                      const ha = new Set(p.submission_participants.map((x) => x.submissions?.assignment_id));
                      return (
                        <tr key={p.id}>
                          <td><Link href={`/team/teilnehmende/${p.id}/`} className="font-semibold hover:underline">{p.first_name} {p.last_name}</Link></td>
                          <td className="whitespace-nowrap">{p.regions?.name ?? <span className="text-rot">fehlt</span>}</td>
                          <td>{p.branch ?? <span className="text-rot">?</span>}</td>
                          <td className="whitespace-nowrap">{p.mentors?.name ?? "–"}</td>
                          <td>{p.email ? <span title={p.email}>✓</span> : <span className="chip bg-gelb-hell">fehlt</span>}</td>
                          {modulListe.map((m) => {
                            const reg = p.registrations.find((r) => r.module_id === m.id);
                            const da = reg?.attendances.length ?? 0;
                            const vorbei = m.tage[m.tage.length - 1].ends_at < jetzt;
                            const pk = punkt(reg, da, m.tage.length, vorbei);
                            return (
                              <td key={m.id} className="text-center">
                                {pk ? <span title={`${m.title}: ${pk.text}`} className={`inline-block h-3 w-3 rounded-full ${pk.farbe}`} /> : <span className="text-ink-soft/40">·</span>}
                              </td>
                            );
                          })}
                          {aufgaben?.map((a) => <td key={a.id} className="text-center">{ha.has(a.id) ? "✓" : <span className="text-ink-soft/40">–</span>}</td>)}
                        </tr>
                      );
                    })}
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
            </p>
          </>
        )}
      </main>
    </>
  );
}

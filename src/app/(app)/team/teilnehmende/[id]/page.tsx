import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Rueckmeldung, Titel, laender } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { anwesenheitSetzen, beitragEntfernen, beitragHinzufuegen, personSpeichern, ticketSenden } from "@/lib/aktionen/teilnehmende";
import { zusammenfassen } from "@/lib/bewertung";
import { kurzcodeAnzeige } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Teilnehmer:in | SES Academy" };

const typen = { kommentar: "Kommentar", video: "Video", grafik: "Grafik", podcast: "Podcast", rede: "Rede", artikel: "Artikel" } as const;
const tagFormat = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Berlin" });
const datum = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

type Reg = { id: string; status: string; modules: { id: string; title: string; module_days: { id: string; starts_at: string }[] }; attendances: { id: string; module_day_id: string; method: string }[] };
type Abg = { submissions: { id: string; label: string; file_name: string | null; assignments: { number: number; title: string } | null; reviews: Record<string, number | null>[] } | null };

export default async function Person({ params, searchParams }: PageProps<"/team/teilnehmende/[id]">) {
  const staff = await requireStaff("alles");
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: p }, { data: regionen }, { data: mentoren }, { data: regs }, { data: abg }, { data: beitraege }] = await Promise.all([
    supabase.from("participants").select("*").eq("id", id).maybeSingle(),
    supabase.from("regions").select("id,name").order("name"),
    supabase.from("mentors").select("id,name").order("name"),
    supabase.from("registrations").select("id,status,modules(id,title,module_days(id,starts_at)),attendances(id,module_day_id,method)").eq("participant_id", id),
    supabase.from("submission_participants").select("submissions(id,label,file_name,assignments(number,title),reviews(*))").eq("participant_id", id),
    supabase.from("contributions").select("*").eq("participant_id", id).order("published_on", { ascending: false }),
  ]);
  if (!p) notFound();
  const anmeldungen = ((regs ?? []) as unknown as Reg[])
    .map((r) => ({ ...r, tage: [...r.modules.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .sort((a, b) => (a.tage[0]?.starts_at ?? "").localeCompare(b.tage[0]?.starts_at ?? ""));
  const abgaben = ((abg ?? []) as unknown as Abg[]).map((a) => a.submissions!).filter(Boolean);

  return (
    <>
      <TeamKopf staff={staff} aktiv="teilnehmende" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Link href="/team/teilnehmende/" className="text-sm font-semibold text-ink-soft hover:text-ink">← Alle Teilnehmenden</Link>
        <Titel kicker={p.active ? `Kurzcode ${kurzcodeAnzeige(p.short_code ?? "")}` : "Ausgeschieden"}
          aktion={
            <div className="flex flex-wrap gap-2">
              <a href={`/ticket/${p.checkin_token}/`} target="_blank" rel="noopener noreferrer" className="knopf-hell">QR-Code ansehen</a>
              <form action={ticketSenden}><input type="hidden" name="id" value={p.id} /><button className="knopf" disabled={!p.email}>QR-Code per Mail schicken</button></form>
            </div>
          }>
          {p.first_name} {p.last_name}
        </Titel>
        <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />
        {!p.email && <p className="mb-6 rounded-2xl bg-gelb-hell p-4 text-sm font-semibold">Keine E-Mail-Adresse – diese Person bekommt keinen QR-Code per Mail und kann sich nicht anmelden.</p>}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="karte">
            <h2 className="font-display mb-4 text-2xl font-bold">Stammdaten</h2>
            <form action={personSpeichern} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={p.id} />
              <div><label className="etikett" htmlFor="first_name">Vorname(n)</label><input id="first_name" name="first_name" required defaultValue={p.first_name} className="feld" /></div>
              <div><label className="etikett" htmlFor="last_name">Nachname</label><input id="last_name" name="last_name" defaultValue={p.last_name} className="feld" /></div>
              <div><label className="etikett" htmlFor="email">E-Mail</label><input id="email" name="email" type="email" defaultValue={p.email ?? ""} className="feld" /></div>
              <div><label className="etikett" htmlFor="phone">Telefon</label><input id="phone" name="phone" defaultValue={p.phone ?? ""} className="feld" /></div>
              <div>
                <label className="etikett" htmlFor="region_id">Region</label>
                <select id="region_id" name="region_id" defaultValue={p.region_id ?? ""} className="feld">
                  <option value="">– bitte wählen –</option>
                  {regionen?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="etikett" htmlFor="country">Land</label>
                <select id="country" name="country" defaultValue={p.country ?? ""} className="feld">
                  <option value="">aus Region übernehmen</option>
                  {Object.entries(laender).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="etikett" htmlFor="branch">GT / KGT</label>
                <select id="branch" name="branch" defaultValue={p.branch ?? ""} className="feld">
                  <option value="">– bitte wählen –</option><option>GT</option><option>KGT</option>
                </select>
              </div>
              <div>
                <label className="etikett" htmlFor="mentor_id">Verantwortliche Person</label>
                <select id="mentor_id" name="mentor_id" defaultValue={p.mentor_id ?? ""} className="feld">
                  <option value="">– keine –</option>
                  {mentoren?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className="etikett" htmlFor="notes">Notiz (nur Team)</label><textarea id="notes" name="notes" rows={2} defaultValue={p.notes} className="feld" /></div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-ink" /> Nimmt aktiv teil</label>
              <div className="sm:col-span-2"><button className="knopf">Speichern</button></div>
            </form>
            <p className="mt-4 text-xs text-ink-soft">{p.user_id ? "Hat sich schon angemeldet." : "Hat sich noch nicht angemeldet."}{p.privacy_consent_at ? "" : " Datenschutz-Einwilligung im System nicht erfasst."}</p>
          </section>

          <div className="space-y-6">
            <section className="karte">
              <h2 className="font-display mb-1 text-2xl font-bold">Anwesenheit</h2>
              <p className="mb-4 text-sm text-ink-soft">Pro Tag. Tippen zum Nachtragen bzw. Zurücknehmen (wird protokolliert).</p>
              <ul className="divide-y divide-line">
                {anmeldungen.map((r) => (
                  <li key={r.id} className="py-3">
                    <p className="font-semibold">{r.modules.title} {r.status !== "confirmed" && <span className="chip ml-1 bg-gelb-hell">{r.status}</span>}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.tage.map((t) => {
                        const a = r.attendances.find((x) => x.module_day_id === t.id);
                        return (
                          <form key={t.id} action={anwesenheitSetzen}>
                            <input type="hidden" name="participant_id" value={p.id} />
                            <input type="hidden" name="module_day_id" value={t.id} />
                            {a && <input type="hidden" name="attendance_id" value={a.id} />}
                            <button className={`chip px-3 py-1.5 text-sm ${a ? "bg-gruen-hell" : "bg-paper ring-1 ring-line"}`} title={a ? `eingecheckt (${a.method}) – zum Zurücknehmen tippen` : "nicht eingecheckt – zum Nachtragen tippen"}>
                              {a ? "✓" : "○"} {tagFormat.format(new Date(t.starts_at))}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  </li>
                ))}
                {!anmeldungen.length && <li className="py-3 text-ink-soft">Für kein Modul angemeldet.</li>}
              </ul>
            </section>

            <section className="karte">
              <h2 className="font-display mb-4 text-2xl font-bold">Hausaufgaben</h2>
              {abgaben.length ? (
                <ul className="divide-y divide-line">
                  {abgaben.map((a) => {
                    const e = zusammenfassen(a.reviews);
                    return (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                        <Link href={`/team/abgaben/${a.id}/`} className="font-semibold hover:underline">HA {a.assignments?.number}: {a.label}</Link>
                        {e.durchschnitt != null ? <span className="chip bg-gruen-hell">{e.durchschnitt} · {e.urteil}</span> : <span className="chip bg-paper-deep">nicht bewertet</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-ink-soft">Noch keine Abgabe erfasst.</p>}
            </section>

            <section className="karte">
              <h2 className="font-display mb-4 text-2xl font-bold">Stimmen-Beiträge</h2>
              {beitraege?.length ? (
                <ul className="mb-5 divide-y divide-line">
                  {beitraege.map((b) => (
                    <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold">{b.title}</p>
                        <p className="text-xs text-ink-soft">
                          {typen[b.kind as keyof typeof typen]}{b.outlet ? ` · ${b.outlet}` : ""}{b.published_on ? ` · ${datum(b.published_on)}` : ""}
                          {b.url && <> · <a href={b.url} target="_blank" rel="noopener noreferrer" className="link">Link</a></>}
                          {b.website_slug && <> · <a href={`/stimmen/${b.website_slug}/`} className="link">auf der Website</a></>}
                        </p>
                      </div>
                      <form action={beitragEntfernen}>
                        <input type="hidden" name="id" value={b.id} /><input type="hidden" name="participant_id" value={p.id} />
                        <button className="text-xs text-rot hover:underline">Entfernen</button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : <p className="mb-5 text-ink-soft">Noch keine Beiträge verknüpft.</p>}
              <details>
                <summary className="cursor-pointer text-sm font-semibold">Beitrag verknüpfen</summary>
                <form action={beitragHinzufuegen} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="participant_id" value={p.id} />
                  <select name="kind" className="feld" defaultValue="artikel" aria-label="Art">{Object.entries(typen).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <input name="published_on" type="date" className="feld" aria-label="Datum" />
                  <input name="title" required placeholder="Titel" className="feld sm:col-span-2" />
                  <input name="url" type="url" placeholder="Link (Zeitung, YouTube …)" className="feld sm:col-span-2" />
                  <input name="outlet" placeholder="Medium, z. B. Perspektif" className="feld" />
                  <input name="website_slug" placeholder="Slug auf der Website (optional)" className="feld" />
                  <button className="knopf sm:col-span-2 sm:justify-self-start">Verknüpfen</button>
                </form>
              </details>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

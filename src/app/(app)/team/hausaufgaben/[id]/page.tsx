import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Rueckmeldung, Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { abgabeAnlegen, hausaufgabeSpeichern } from "@/lib/aktionen/hausaufgaben";
import { zusammenfassen } from "@/lib/bewertung";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hausaufgabe | SES Academy" };

type A = { id: string; label: string; file_name: string | null; note: string | null; submission_participants: { participant_id: string }[]; reviews: Record<string, number | null>[] };

export default async function Hausaufgabe({ params, searchParams }: PageProps<"/team/hausaufgaben/[id]">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const sp = await searchParams;
  const zeige = typeof sp.zeige === "string" ? sp.zeige : "abgaben";
  const supabase = await createClient();
  const [{ data: h }, { data: roh }, { data: verzeichnis }] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", id).maybeSingle(),
    supabase.from("submissions").select("id,label,file_name,note,submission_participants(participant_id),reviews(*)").eq("assignment_id", id).order("label"),
    supabase.rpc("get_participant_directory"),
  ]);
  if (!h) notFound();
  const namen = new Map((verzeichnis ?? []).map((p) => [p.id, p]));
  const abgaben = (roh ?? []) as unknown as A[];
  const abgegeben = new Set(abgaben.flatMap((a) => a.submission_participants.map((p) => p.participant_id)));
  const fehlt = (verzeichnis ?? []).filter((p) => p.active && !abgegeben.has(p.id));
  const zeilen = abgaben.map((a) => ({ a, e: zusammenfassen(a.reviews) }));
  if (sp.sort === "punkte") zeilen.sort((x, y) => (y.e.durchschnitt ?? -1) - (x.e.durchschnitt ?? -1));
  const tab = (k: string, t: string) => <Link href={`?zeige=${k}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${zeige === k ? "bg-ink text-paper" : "bg-weiss ring-1 ring-line"}`}>{t}</Link>;

  return (
    <>
      <TeamKopf staff={staff} aktiv="hausaufgaben" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Link href="/team/hausaufgaben/" className="text-sm font-semibold text-ink-soft hover:text-ink">← Alle Hausaufgaben</Link>
        <Titel kicker={`Hausaufgabe ${h.number}`}>{h.title}</Titel>
        <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />
        <div className="mb-4 flex flex-wrap gap-2">
          {tab("abgaben", `Abgaben (${abgaben.length})`)}
          {tab("fehlt", `Nicht abgegeben (${fehlt.length})`)}
          {tab("bearbeiten", "Aufgabe bearbeiten")}
        </div>

        {zeige === "abgaben" && (
          <div className="overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
            <table className="tabelle">
              <thead><tr><th>Abgabe</th><th>Personen</th><th><Link href="?zeige=abgaben&sort=punkte">Ø Punkte ↓</Link></th><th>Bewertung</th></tr></thead>
              <tbody>
                {zeilen.map(({ a, e }) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/team/abgaben/${a.id}/`} className="font-semibold hover:underline">{a.label}</Link>
                      {a.file_name && a.file_name !== a.label && <p className="text-xs text-ink-soft">{a.file_name}</p>}
                      {a.note && <p className="text-xs text-ink-soft">{a.note}</p>}
                    </td>
                    <td>{a.submission_participants.length ? a.submission_participants.map((p) => namen.get(p.participant_id)?.display_name ?? "?").join(", ") : <span className="chip bg-gelb-hell">nicht zugeordnet</span>}</td>
                    <td className="font-display text-lg font-bold">{e.durchschnitt ?? "–"}</td>
                    <td>{e.urteil ? <span className="chip bg-gruen-hell">{e.urteil}{e.anzahl > 1 ? ` (${e.anzahl})` : ""}</span> : <Link href={`/team/abgaben/${a.id}/`} className="chip bg-paper-deep hover:bg-signal">bewerten</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {zeige === "fehlt" && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
              <table className="tabelle">
                <thead><tr><th>Name</th><th>Region</th><th>Verantwortlich</th></tr></thead>
                <tbody>{fehlt.map((p) => <tr key={p.id}><td className="font-semibold">{p.display_name}</td><td>{p.region ?? "–"}</td><td>{p.mentor ?? "–"}</td></tr>)}</tbody>
              </table>
            </div>
            <section className="karte self-start">
              <h2 className="font-display mb-4 text-xl font-bold">Abgabe nachtragen</h2>
              <form action={abgabeAnlegen} className="space-y-3">
                <input type="hidden" name="assignment_id" value={id} />
                <select name="participant_id" required defaultValue="" className="feld" aria-label="Person">
                  <option value="" disabled>Person wählen …</option>
                  {fehlt.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
                <input name="label" placeholder="Bezeichnung (optional)" className="feld" />
                <input name="link" type="url" placeholder="Link zum Video / Text (optional)" className="feld" />
                <button className="knopf">Nachtragen und bewerten</button>
              </form>
            </section>
          </div>
        )}

        {zeige === "bearbeiten" && (
          <section className="karte max-w-2xl">
            <form action={hausaufgabeSpeichern} className="space-y-3">
              <input type="hidden" name="id" value={h.id} /><input type="hidden" name="cohort_id" value={h.cohort_id} />
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <div><label className="etikett" htmlFor="number">Nr.</label><input id="number" name="number" type="number" min={1} defaultValue={h.number} required className="feld" /></div>
                <div><label className="etikett" htmlFor="title">Titel</label><input id="title" name="title" required defaultValue={h.title} className="feld" /></div>
              </div>
              <div><label className="etikett" htmlFor="due_date">Frist</label><input id="due_date" name="due_date" type="date" defaultValue={h.due_date ?? ""} className="feld" /></div>
              <div><label className="etikett" htmlFor="description">Aufgabe</label><textarea id="description" name="description" rows={4} defaultValue={h.description} className="feld" /></div>
              <button className="knopf">Speichern</button>
            </form>
          </section>
        )}
      </main>
    </>
  );
}

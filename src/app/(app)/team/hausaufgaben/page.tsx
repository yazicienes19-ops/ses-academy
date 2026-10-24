import type { Metadata } from "next";
import Link from "next/link";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Leer, Rueckmeldung, Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { hausaufgabeSpeichern } from "@/lib/aktionen/hausaufgaben";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hausaufgaben | SES Academy" };

export default async function Hausaufgaben({ searchParams }: PageProps<"/team/hausaufgaben">) {
  const staff = await requireStaff("orga");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: jahrgang } = await supabase.from("cohorts").select("id,name").eq("is_current", true).maybeSingle();
  const [{ data: aufgaben }, { data: verzeichnis }, { data: offen }] = await Promise.all([
    supabase.from("assignments").select("id,number,title,due_date,submissions(id,submission_participants(participant_id),reviews(id))").eq("cohort_id", jahrgang?.id ?? "").order("number"),
    supabase.rpc("get_participant_directory"),
    supabase.from("submissions").select("id,label,assignments(number),submission_participants(participant_id)"),
  ]);
  const aktiv = (verzeichnis ?? []).filter((p) => p.active).length;
  const ohnePerson = (offen ?? []).filter((a) => !a.submission_participants.length);
  const naechste = Math.max(0, ...(aufgaben ?? []).map((a) => a.number)) + 1;

  return (
    <>
      <TeamKopf staff={staff} aktiv="hausaufgaben" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Titel kicker={`${jahrgang?.name ?? ""} · Abgaben und Bewertung`}>Hausaufgaben</Titel>
        <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />

        {ohnePerson.length > 0 && (
          <section className="mb-8 rounded-3xl bg-gelb-hell p-6 ring-1 ring-line">
            <h2 className="font-display text-xl font-bold">{ohnePerson.length} Abgaben ohne zugeordnete Person</h2>
            <p className="mt-1 text-sm">Der Name im Video bzw. Dateinamen war unklar. Bitte öffnen und die richtige Person auswählen.</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {ohnePerson.map((a) => (
                <li key={a.id}><Link href={`/team/abgaben/${a.id}/`} className="chip bg-weiss px-3 py-1.5 text-sm ring-1 ring-line hover:bg-paper">HA{(a.assignments as { number: number } | null)?.number}: {a.label}</Link></li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {aufgaben?.length ? (
            <ul className="space-y-3">
              {aufgaben.map((h) => {
                const personen = new Set(h.submissions.flatMap((a) => a.submission_participants.map((p) => p.participant_id)));
                const bewertet = h.submissions.filter((a) => a.reviews.length).length;
                return (
                  <li key={h.id}>
                    <Link href={`/team/hausaufgaben/${h.id}/`} className="block rounded-3xl bg-weiss p-5 ring-1 ring-line transition hover:ring-ink">
                      <p className="font-display text-xl font-bold">Hausaufgabe {h.number}: {h.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">{personen.size} von {aktiv} haben abgegeben · {h.submissions.length} Abgaben · {bewertet} bewertet</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep"><div className="h-full bg-mint" style={{ width: `${aktiv ? (personen.size / aktiv) * 100 : 0}%` }} /></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Leer>Noch keine Hausaufgaben. Rechts anlegen oder die Hausaufgabenliste importieren.</Leer>
          )}
          <section className="karte self-start">
            <h2 className="font-display mb-4 text-2xl font-bold">Neue Hausaufgabe</h2>
            <form action={hausaufgabeSpeichern} className="space-y-3">
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <div><label className="etikett" htmlFor="number">Nr.</label><input id="number" name="number" type="number" min={1} defaultValue={naechste} required className="feld" /></div>
                <div><label className="etikett" htmlFor="title">Titel</label><input id="title" name="title" required className="feld" placeholder="z. B. Rhetorik-Video" /></div>
              </div>
              <div><label className="etikett" htmlFor="due_date">Frist</label><input id="due_date" name="due_date" type="date" className="feld" /></div>
              <div><label className="etikett" htmlFor="description">Aufgabe (sehen die Teilnehmenden)</label><textarea id="description" name="description" rows={3} className="feld" /></div>
              <button className="knopf">Anlegen</button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}

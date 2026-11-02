import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModulReiter } from "@/components/team/ModulReiter";
import { TeamKopf } from "@/components/team/TeamKopf";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { uhrzeit } from "@/lib/einlass";
import { programmStatus, tagBezeichnung } from "@/lib/eventtag";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Programm | SES Academy" };

/** Programm aller Modultage auf einen Blick; gepflegt wird es im Regieplan des jeweiligen Tages. */
export default async function Programm({ params }: PageProps<"/team/module/[id]/programm">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const { data: modul } = await supabase
    .from("modules")
    .select("id, title, module_days(id, day, starts_at, ends_at, label, program_items(id, starts_at, ends_at, title, room, responsible, status))")
    .eq("id", id)
    .maybeSingle();
  if (!modul) notFound();
  const tage = [...modul.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" breit />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ModulReiter id={id} titel={modul.title} aktiv="programm/" />
        {tage.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <p className="mr-auto text-sm text-ink-soft">Die Tagesordnung für Teilnehmende entsteht aus diesem Programm und den Kurzprofilen der Referenten.</p>
            <Link href={`/team/module/${id}/tagesordnung/`} target="_blank" className="knopf">Tagesordnung drucken / als PDF</Link>
          </div>
        )}
        {tage.length === 0 && <p className="karte">Noch keine Termine. Termine trägt man in der Übersicht ein.</p>}
        <div className="space-y-6">
          {tage.map((t) => {
            const punkte = [...t.program_items].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
            return (
              <section key={t.id} className="karte">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display mr-auto text-xl font-bold">{tagBezeichnung(t, modul.title)}</h2>
                  <Link href={`/team/regieplan/?tag=${t.id}`} className="knopf-hell">Im Regieplan bearbeiten</Link>
                </div>
                {punkte.length === 0 ? <p className="mt-3 text-ink-soft">Noch kein Programm.</p> : (
                  <table className="tabelle mt-3">
                    <thead><tr><th>Zeit</th><th>Programmpunkt</th><th>Raum</th><th>Verantwortlich</th><th>Status</th></tr></thead>
                    <tbody>
                      {punkte.map((p) => (
                        <tr key={p.id}>
                          <td className="font-mono whitespace-nowrap">{uhrzeit(p.starts_at, false)}{p.ends_at ? `–${uhrzeit(p.ends_at, false)}` : ""}</td>
                          <td className={p.status === "entfaellt" ? "line-through" : "font-semibold"}>{p.title}</td>
                          <td>{p.room}</td><td>{p.responsible}</td><td>{programmStatus[p.status].name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}

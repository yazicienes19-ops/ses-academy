import type { Metadata } from "next";
import { TeamKopf } from "@/components/team/TeamKopf";
import { MaterialUpload } from "@/components/team/MaterialUpload";
import { Leer, Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { materialFreigabe, materialLoeschen } from "@/lib/aktionen/material";
import { groesse } from "@/lib/formate";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Material | SES Academy" };

export default async function Material() {
  const staff = await requireStaff("orga");
  const supabase = await createClient();
  const { data: jahrgang } = await supabase.from("cohorts").select("id,name").eq("is_current", true).maybeSingle();
  const [{ data: liste }, { data: module }] = await Promise.all([
    supabase.from("resources").select("id,title,description,file_name,size_bytes,published,created_at,modules(title)").eq("cohort_id", jahrgang?.id ?? "").order("created_at", { ascending: false }),
    supabase.from("modules").select("id,title").eq("cohort_id", jahrgang?.id ?? "").order("title"),
  ]);
  const frei = (liste ?? []).filter((r) => r.published).length;

  return (
    <>
      <TeamKopf staff={staff} aktiv="material" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Titel kicker={jahrgang?.name ?? "Kein aktueller Jahrgang"}>Material für Teilnehmende</Titel>
        <p className="-mt-4 mb-8 text-ink-soft">{liste?.length ?? 0} Dateien, davon {frei} freigeschaltet. Teilnehmende sehen nur freigeschaltete Dateien ihres Jahrgangs.</p>
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
            {liste?.length ? (
              <table className="tabelle">
                <thead><tr><th>Datei</th><th>Modul</th><th>Sichtbar</th><th /></tr></thead>
                <tbody>
                  {liste.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <a href={`/team/datei/?material=${r.id}`} className="font-semibold hover:underline">{r.title}</a>
                        <p className="text-xs text-ink-soft">{r.file_name} · {groesse(r.size_bytes)}</p>
                        {r.description && <p className="text-xs text-ink-soft">{r.description}</p>}
                      </td>
                      <td>{(r.modules as { title: string } | null)?.title ?? "–"}</td>
                      <td>
                        <form action={materialFreigabe}>
                          <input type="hidden" name="id" value={r.id} /><input type="hidden" name="published" value={String(!r.published)} />
                          <button className={`chip ${r.published ? "bg-gruen-hell" : "bg-paper-deep"} hover:ring-1 hover:ring-ink`} title="Umschalten">
                            {r.published ? "✓ freigeschaltet" : "verborgen"}
                          </button>
                        </form>
                      </td>
                      <td>
                        <form action={materialLoeschen}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-rot underline">Löschen</button></form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="p-6"><Leer>Noch kein Material hochgeladen.</Leer></div>}
          </div>
          <section className="karte self-start">
            <h2 className="font-display mb-4 text-xl font-bold">Datei hochladen</h2>
            {jahrgang ? <MaterialUpload cohortId={jahrgang.id} module={module ?? []} /> : <p className="text-ink-soft">Bitte zuerst einen aktuellen Jahrgang anlegen.</p>}
          </section>
        </div>
      </main>
    </>
  );
}

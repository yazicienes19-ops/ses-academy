import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulReiter } from "@/components/team/ModulReiter";
import { Rueckfrage } from "@/components/team/Rueckfrage";
import { TeamKopf } from "@/components/team/TeamKopf";
import { aufgabeEntfernen, aufgabeSpeichern, aufgabeUmschalten, checklisteAnlegen } from "@/lib/aktionen/modulwerkzeuge";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Checkliste | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  aufgabe: { text: "Gespeichert.", gut: true },
  "aufgabe-entfernt": { text: "Aufgabe entfernt.", gut: true },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};
const datum = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Checkliste eines Moduls: Aufgaben aus der Vorlage mit Fristen und Zuständigen, dazu eigene Aufgaben. */
export default async function Checkliste({ params, searchParams }: PageProps<"/team/module/[id]/checkliste">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const { hinweis } = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: aufgaben }, { data: team }] = await Promise.all([
    supabase.from("modules").select("id, title, module_days(day)").eq("id", id).maybeSingle(),
    supabase.from("tasks").select("*").eq("module_id", id).order("due_date", { nullsFirst: false }).order("created_at"),
    supabase.rpc("get_team_members"),
  ]);
  if (!modul) notFound();
  const angelegt = typeof hinweis === "string" && hinweis.startsWith("angelegt-") ? Number(hinweis.split("-")[1]) : null;
  const heute = new Date(jetztMs()).toISOString().slice(0, 10);
  const liste = aufgaben ?? [];
  const offen = liste.filter((a) => !a.done_at);
  const ueberfaellig = offen.filter((a) => a.due_date && a.due_date < heute);
  const namen = new Map((team ?? []).map((t) => [t.user_id, t.display_name]));

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" breit />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ModulReiter id={id} titel={modul.title} aktiv="checkliste/" />
        <Hinweis code={angelegt !== null ? undefined : hinweis} texte={hinweise} />
        {angelegt !== null && <p role="status" className="mt-4 rounded-2xl bg-emerald-100 p-4 text-emerald-950">{angelegt} Aufgaben aus der Vorlage angelegt.</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="mr-auto text-ink-soft">{liste.length - offen.length} von {liste.length} erledigt{ueberfaellig.length ? ` · ${ueberfaellig.length} überfällig` : ""}</p>
          {modul.module_days.length > 0 && (
            <form action={checklisteAnlegen}>
              <input type="hidden" name="module_id" value={id} />
              <button type="submit" className={liste.length ? "knopf-hell" : "knopf"}>{liste.length ? "Fehlende Aufgaben aus der Vorlage ergänzen" : "Checkliste aus der Vorlage anlegen"}</button>
            </form>
          )}
        </div>
        {modul.module_days.length === 0 && <p className="karte mt-4">Zuerst Termine eintragen; die Fristen richten sich nach dem ersten und letzten Modultag.</p>}

        <ul className="mt-6 space-y-2">
          {liste.map((a) => {
            const zuSpaet = !a.done_at && a.due_date && a.due_date < heute;
            return (
              <li key={a.id} className={`rounded-2xl px-4 py-3 ring-1 ring-line ${a.done_at ? "bg-paper-deep/60" : zuSpaet ? "bg-rot-hell" : "bg-weiss"}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <form action={aufgabeUmschalten}>
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="erledigt" value={a.done_at ? "0" : "1"} />
                    <input type="hidden" name="zurueck" value={`/team/module/${id}/checkliste/`} />
                    <button type="submit" aria-label={a.done_at ? `„${a.title}“ wieder öffnen` : `„${a.title}“ erledigt`} className={`flex h-7 w-7 items-center justify-center rounded-full ring-2 ${a.done_at ? "bg-ink text-paper ring-ink" : "ring-line"}`}>{a.done_at ? "✓" : ""}</button>
                  </form>
                  <span className={`mr-auto font-semibold ${a.done_at ? "line-through text-ink-soft" : ""}`}>{a.title}</span>
                  {a.commission && <span className="chip bg-paper-deep">{a.commission}</span>}
                  <span className="text-sm text-ink-soft">{a.assignee_user ? namen.get(a.assignee_user) : a.assignee_name}</span>
                  {a.due_date && <span className={`text-sm ${zuSpaet ? "font-semibold text-rot" : "text-ink-soft"}`}>{datum.format(new Date(`${a.due_date}T12:00:00Z`))}</span>}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-ink-soft">bearbeiten</summary>
                  <form action={aufgabeSpeichern} className="mt-2 grid gap-2 sm:grid-cols-4">
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="module_id" value={id} />
                    <input name="title" defaultValue={a.title} required className="feld sm:col-span-2" aria-label="Aufgabe" />
                    <input name="due_date" type="date" defaultValue={a.due_date ?? ""} className="feld" aria-label="Frist" />
                    <select name="assignee_user" defaultValue={a.assignee_user ?? ""} className="feld" aria-label="Zuständig">
                      <option value="">zuständig: niemand</option>{(team ?? []).map((t) => <option key={t.user_id} value={t.user_id}>{t.display_name}</option>)}
                    </select>
                    <input name="commission" defaultValue={a.commission ?? ""} placeholder="Kommission" className="feld" aria-label="Kommission" />
                    <input name="assignee_name" defaultValue={a.assignee_name ?? ""} placeholder="oder Name ohne Konto" className="feld" aria-label="Zuständig ohne Konto" />
                    <input name="notes" defaultValue={a.notes} placeholder="Notiz" className="feld sm:col-span-2" aria-label="Notiz" />
                    <div className="flex gap-3 sm:col-span-4"><button type="submit" className="knopf-hell">Speichern</button></div>
                  </form>
                  <form action={aufgabeEntfernen} className="mt-1 flex flex-wrap">
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="module_id" value={id} />
                    <Rueckfrage knopf="entfernen" knopfKlasse="text-xs font-semibold text-ink-soft underline" gefahr ja="Ja, entfernen" frage={`Aufgabe „${a.title}“ entfernen?`} />
                  </form>
                </details>
              </li>
            );
          })}
        </ul>

        <section className="karte mt-8">
          <h2 className="font-display text-xl font-bold">Eigene Aufgabe</h2>
          <form action={aufgabeSpeichern} className="mt-3 grid gap-2 sm:grid-cols-4">
            <input type="hidden" name="module_id" value={id} />
            <input name="title" required placeholder="Was ist zu tun?" className="feld sm:col-span-2" aria-label="Aufgabe" />
            <input name="due_date" type="date" className="feld" aria-label="Frist" />
            <select name="assignee_user" defaultValue="" className="feld" aria-label="Zuständig">
              <option value="">zuständig: niemand</option>{(team ?? []).map((t) => <option key={t.user_id} value={t.user_id}>{t.display_name}</option>)}
            </select>
            <div className="sm:col-span-4"><button type="submit" className="knopf">Hinzufügen</button></div>
          </form>
        </section>
      </main>
    </>
  );
}

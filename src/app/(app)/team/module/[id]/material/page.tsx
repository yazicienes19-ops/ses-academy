import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DokumentFormular, DokumentListe, TagesordnungKnoepfe } from "@/components/team/Dokumente";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulReiter } from "@/components/team/ModulReiter";
import { Rueckfrage } from "@/components/team/Rueckfrage";
import { TeamKopf } from "@/components/team/TeamKopf";
import { materialAbhaken, materialEntfernen, materialSpeichern, materialUebernehmen } from "@/lib/aktionen/logistik";
import { darf, requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Material | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  gespeichert: { text: "Abgelegt.", gut: true },
  "zu-gross": { text: "Die Datei ist größer als 100 MB. Bitte als Link ablegen.", gut: false },
  eingabe: { text: "Bitte die Angaben prüfen (Titel bzw. Bezeichnung fehlt).", gut: false },
  material: { text: "Materialliste gespeichert.", gut: true },
  "material-erledigt": { text: "Abgehakt.", gut: true },
  "material-offen": { text: "Wieder offen.", gut: true },
  "material-entfernt": { text: "Aus der Materialliste entfernt.", gut: true },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

/**
 * Reiter „Material“: Materialliste zum Abhaken (was mitgebracht oder besorgt werden muss), Unterlagen fürs Modul
 * (Folien, Reader) und Medien (Fotos, Videos, Presse).
 */
export default async function Material({ params, searchParams }: PageProps<"/team/module/[id]/material">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const { hinweis } = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: dokumente }, { data: materialliste }, { data: andere }] = await Promise.all([
    supabase.from("modules").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("documents").select("id, title, kind, status, commission, tags, link, current_version, updated_at").eq("module_id", id).order("updated_at", { ascending: false }),
    supabase.from("module_materials").select("*").eq("module_id", id).order("created_at"),
    supabase.from("module_materials").select("module_id, modules(title)").neq("module_id", id),
  ]);
  if (!modul) notFound();
  const material = (dokumente ?? []).filter((d) => d.kind !== "medien");
  const medien = (dokumente ?? []).filter((d) => d.kind === "medien");
  const zurueck = `/team/module/${id}/material/`;
  const hinweisText = typeof hinweis === "string" && hinweis.startsWith("material-uebernommen-") ? `${hinweis.split("-").at(-1)} Einträge übernommen.` : null;
  const liste = materialliste ?? [];
  const offen = liste.filter((m) => !m.done_at).length;
  const quellen = [...new Map((andere ?? []).map((a) => [a.module_id, a.modules?.title ?? "?"])).entries()];
  return (
    <>
      <TeamKopf staff={staff} aktiv={darf.alles(staff.role) ? "module" : "logistik"} breit />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ModulReiter id={id} titel={modul.title} aktiv="material/" />
        <Hinweis code={hinweis} texte={hinweise} />
        {hinweisText && <p role="status" className="mt-4 rounded-2xl bg-emerald-100 p-4 text-emerald-950">{hinweisText}</p>}

        <section id="materialliste" className="karte mt-6 mb-10 scroll-mt-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display mr-auto text-xl font-bold">Materialliste</h2>
            {liste.length > 0 && <span className="text-sm text-ink-soft">{offen === 0 ? "alles erledigt" : `${offen} von ${liste.length} offen`}</span>}
          </div>
          {liste.length === 0 && <p className="mt-2 text-sm text-ink-soft">Was mitgebracht oder besorgt werden muss (Beamer, Namensschilder, Verlängerungskabel …), mit Menge und wer sich kümmert.</p>}
          <ul className="mt-3 divide-y divide-line">
            {liste.map((m) => (
              <li key={m.id} id={`m-${m.id}`} className="flex scroll-mt-4 items-start gap-3 py-2.5">
                <form action={materialAbhaken}>
                  <input type="hidden" name="module_id" value={id} /><input type="hidden" name="id" value={m.id} /><input type="hidden" name="erledigt" value={m.done_at ? "0" : "1"} />
                  <button type="submit" aria-label={m.done_at ? `„${m.label}“ wieder öffnen` : `„${m.label}“ abhaken`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full ring-2 ${m.done_at ? "bg-ink text-paper ring-ink" : "ring-line"}`}>{m.done_at ? "✓" : ""}</button>
                </form>
                <details className="min-w-0 flex-1">
                  <summary className="cursor-pointer list-none">
                    <span className={`font-semibold ${m.done_at ? "text-ink-soft line-through" : ""}`}>{m.label}</span>
                    {m.quantity && <span className="ml-1.5 text-sm text-ink-soft">· {m.quantity}</span>}
                    {m.responsible && <span className="chip ml-1.5 bg-paper-deep">{m.responsible}</span>}
                    {m.note && <span className="block text-sm text-ink-soft">{m.note}</span>}
                  </summary>
                  <form action={materialSpeichern} className="mt-2 grid gap-2 sm:grid-cols-4">
                    <input type="hidden" name="module_id" value={id} /><input type="hidden" name="id" value={m.id} />
                    <input name="label" defaultValue={m.label} required maxLength={200} className="feld sm:col-span-2" aria-label="Bezeichnung" />
                    <input name="quantity" defaultValue={m.quantity} maxLength={50} className="feld" aria-label="Menge" placeholder="Menge" />
                    <input name="responsible" defaultValue={m.responsible} maxLength={100} className="feld" aria-label="Wer kümmert sich" placeholder="Wer kümmert sich" />
                    <input name="note" defaultValue={m.note} maxLength={500} className="feld sm:col-span-3" aria-label="Notiz" placeholder="Notiz" />
                    <button type="submit" className="knopf-hell">Speichern</button>
                  </form>
                  <form action={materialEntfernen} className="mt-1 flex flex-wrap">
                    <input type="hidden" name="module_id" value={id} /><input type="hidden" name="id" value={m.id} />
                    <Rueckfrage knopf="entfernen" knopfKlasse="text-xs font-semibold text-ink-soft underline" gefahr ja="Ja, entfernen" frage={`„${m.label}“ aus der Materialliste entfernen?`} />
                  </form>
                </details>
              </li>
            ))}
          </ul>
          <form action={materialSpeichern} className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <input type="hidden" name="module_id" value={id} />
            <input name="label" required maxLength={200} className="feld" aria-label="Neues Material" placeholder="z. B. Beamer mit HDMI-Kabel" />
            <input name="quantity" maxLength={50} className="feld" aria-label="Menge" placeholder="Menge" />
            <input name="responsible" maxLength={100} className="feld" aria-label="Wer kümmert sich" placeholder="Wer kümmert sich" />
            <button type="submit" className="knopf">Hinzufügen</button>
          </form>
          {quellen.length > 0 && (
            <form action={materialUebernehmen} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="module_id" value={id} />
              <label htmlFor="von" className="text-ink-soft">Liste übernehmen aus</label>
              <select id="von" name="von" className="feld !w-auto !py-1.5">{quellen.map(([mid, titel]) => <option key={mid} value={mid}>{titel}</option>)}</select>
              <button type="submit" className="knopf-hell !py-1.5">Übernehmen</button>
              <span className="w-full text-xs text-ink-soft">Ohne Haken; was es hier schon gibt, kommt nicht doppelt.</span>
            </form>
          )}
        </section>
        <TagesordnungKnoepfe dokumente={material} />
        <h2 className="font-display mt-2 mb-3 text-xl font-bold">Unterlagen</h2>
        <DokumentListe dokumente={material} ohneModul />
        <h2 className="font-display mt-8 mb-3 text-xl font-bold">Medien</h2>
        <DokumentListe dokumente={medien} ohneModul />
        <h2 className="font-display mt-10 mb-3 text-xl font-bold">Ablegen</h2>
        <DokumentFormular zurueck={zurueck} modulId={id} art="material" />
      </main>
    </>
  );
}

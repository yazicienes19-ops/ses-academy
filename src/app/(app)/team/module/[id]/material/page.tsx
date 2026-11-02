import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DokumentFormular, DokumentListe, TagesordnungKnoepfe } from "@/components/team/Dokumente";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulReiter } from "@/components/team/ModulReiter";
import { TeamKopf } from "@/components/team/TeamKopf";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Material und Medien | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  gespeichert: { text: "Abgelegt.", gut: true },
  "zu-gross": { text: "Die Datei ist größer als 100 MB. Bitte als Link ablegen.", gut: false },
  eingabe: { text: "Bitte Titel und eine Datei oder einen Link angeben.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

/** Reiter „Material und Medien“: Unterlagen fürs Modul (Folien, Reader) und Medien (Fotos, Videos, Presse). */
export default async function Material({ params, searchParams }: PageProps<"/team/module/[id]/material">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const { hinweis } = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: dokumente }] = await Promise.all([
    supabase.from("modules").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("documents").select("id, title, kind, status, commission, tags, link, current_version, updated_at").eq("module_id", id).order("updated_at", { ascending: false }),
  ]);
  if (!modul) notFound();
  const material = (dokumente ?? []).filter((d) => d.kind !== "medien");
  const medien = (dokumente ?? []).filter((d) => d.kind === "medien");
  const zurueck = `/team/module/${id}/material/`;
  return (
    <>
      <TeamKopf staff={staff} aktiv="module" breit />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ModulReiter id={id} titel={modul.title} aktiv="material/" />
        <Hinweis code={hinweis} texte={hinweise} />
        <TagesordnungKnoepfe dokumente={material} />
        <h2 className="font-display mt-2 mb-3 text-xl font-bold">Material</h2>
        <DokumentListe dokumente={material} ohneModul />
        <h2 className="font-display mt-8 mb-3 text-xl font-bold">Medien</h2>
        <DokumentListe dokumente={medien} ohneModul />
        <h2 className="font-display mt-10 mb-3 text-xl font-bold">Ablegen</h2>
        <DokumentFormular zurueck={zurueck} modulId={id} art="material" />
      </main>
    </>
  );
}

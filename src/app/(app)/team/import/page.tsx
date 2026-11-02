import type { Metadata } from "next";
import { ImportFormular } from "@/components/team/ImportFormular";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Import | SES Academy" };

export default async function Import() {
  const staff = await requireStaff("alles");
  // Für Zusagen: veröffentlichte Module, kommende zuerst
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("id, title, module_days(starts_at)").eq("status", "published").is("cancelled_at", null);
  const jetzt = new Date().toISOString();
  const beginn = (m: { module_days: { starts_at: string }[] }) => m.module_days.map((t) => t.starts_at).sort()[0] ?? "";
  const modulWahl = (data ?? []).filter((m) => m.module_days.length)
    .sort((a, b) => Number(beginn(a) < jetzt) - Number(beginn(b) < jetzt) || beginn(a).localeCompare(beginn(b)))
    .map((m) => ({ id: m.id, titel: `${m.title} · ${new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(beginn(m)))}` }));
  return (
    <>
      <TeamKopf staff={staff} aktiv="import" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Titel kicker="Excel und CSV">Daten importieren</Titel>
        <ImportFormular module={modulWahl} />
      </main>
    </>
  );
}

import type { Metadata } from "next";
import { ImportFormular } from "@/components/team/ImportFormular";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Import | SES Academy" };

export default async function Import() {
  const staff = await requireStaff("alles");
  return (
    <>
      <TeamKopf staff={staff} aktiv="import" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Titel kicker="Excel und CSV">Daten importieren</Titel>
        <ImportFormular />
      </main>
    </>
  );
}

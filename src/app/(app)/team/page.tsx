import type { Metadata } from "next";
import Link from "next/link";
import { TeamKopf } from "@/components/team/TeamKopf";
import { darf, requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Team | SES Academy" };

export default async function TeamStart({ searchParams }: PageProps<"/team">) {
  const staff = await requireStaff();
  const { fehler } = await searchParams;
  const kachel = "block rounded-3xl bg-white/80 p-6 ring-1 ring-line transition hover:ring-ink";
  return (
    <>
      <TeamKopf staff={staff} />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Hallo {staff.name}</h1>
        {fehler === "rechte" && (
          <p role="alert" className="mt-4 rounded-2xl bg-amber-100 p-4 text-amber-900">Für diesen Bereich fehlt deiner Rolle die Berechtigung.</p>
        )}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/team/einlass/" className={kachel}>
            <p className="font-display text-xl font-bold">Einlass</p>
            <p className="mt-1 text-ink-soft">QR-Codes scannen, Kurzcodes eingeben, Anwesenheit sehen.</p>
          </Link>
          {darf.alles(staff.role) && (
            <Link href="/team/bewerbungen/" className={kachel}>
              <p className="font-display text-xl font-bold">Bewerbungen</p>
              <p className="mt-1 text-ink-soft">Bewerbungen prüfen, annehmen und Tickets verschicken.</p>
            </Link>
          )}
        </div>
      </main>
    </>
  );
}

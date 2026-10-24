import type { Metadata } from "next";
import { TeamKopf } from "@/components/team/TeamKopf";
import { requireStaff } from "@/lib/auth";
import { PasswortFormular } from "./PasswortFormular";

export const metadata: Metadata = { title: "Passwort | SES Academy" };

export default async function PasswortSeite() {
  const staff = await requireStaff("einlass");
  return (
    <>
      <TeamKopf staff={staff} />
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Passwort ändern</h1>
        <PasswortFormular />
      </main>
    </>
  );
}

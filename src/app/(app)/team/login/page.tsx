import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRolle } from "@/lib/auth";
import { LoginFormular } from "./LoginFormular";

export const metadata: Metadata = { title: "Team-Login | SES Academy" };

export default async function LoginPage() {
  const rolle = await getRolle();
  if (rolle === "kommission") redirect("/team/");
  if (rolle === "teilnehmer") redirect("/mein-bereich/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <img src="/brand/ses-logo.png" alt="SES Academy" className="mb-8 h-12 w-auto self-start" />
      <h1 className="font-display text-3xl font-bold">Team-Bereich</h1>
      <p className="mt-2 text-ink-soft">Für Vorstand, Orga-Team und Einlass.</p>
      <LoginFormular />
    </main>
  );
}

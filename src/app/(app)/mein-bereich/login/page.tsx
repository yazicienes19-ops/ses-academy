import type { Metadata } from "next";
import { LoginFormular } from "./LoginFormular";

export const metadata: Metadata = { title: "Anmelden | SES Academy" };

export default async function Login({ searchParams }: PageProps<"/mein-bereich/login">) {
  const { fehler } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <img src="/brand/ses-logo.png" alt="SES Academy" className="h-10 w-auto self-start" />
      <h1 className="font-display mt-10 text-4xl leading-none font-extrabold">Mein Bereich</h1>
      <p className="mt-3 text-ink-soft">Dein QR-Code, deine Anwesenheit, deine Hausaufgaben und Beiträge. Ohne Passwort – wir schicken dir einen Link per E-Mail.</p>
      {fehler && <p role="alert" className="mt-6 rounded-2xl bg-rot-hell p-4 text-sm font-semibold text-rot">Der Anmeldelink ist abgelaufen oder wurde schon benutzt. Bitte fordere einen neuen an.</p>}
      <div className="karte mt-8"><LoginFormular /></div>
    </main>
  );
}

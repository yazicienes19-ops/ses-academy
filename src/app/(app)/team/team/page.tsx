import type { Metadata } from "next";
import { Hinweis } from "@/components/team/Hinweis";
import { TeamKopf } from "@/components/team/TeamKopf";
import { mitgliedAnlegen, mitgliedEntfernen, rolleAendern } from "@/lib/aktionen/teamverwaltung";
import { requireStaff, rollenName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Team | SES Academy" };

const hinweise = {
  angelegt: { text: "Konto angelegt. Gib E-Mail und Startpasswort persönlich weiter.", gut: true },
  gespeichert: { text: "Rolle gespeichert.", gut: true },
  entfernt: { text: "Konto entfernt.", gut: true },
  existiert: { text: "Zu dieser E-Mail gibt es schon ein Konto.", gut: false },
  eingabe: { text: "Bitte E-Mail, Name, Rolle und ein Passwort mit mindestens 10 Zeichen angeben.", gut: false },
  "letzter-admin": { text: "Du bist der letzte Admin. Mach zuerst jemand anderen zum Admin.", gut: false },
  selbst: { text: "Das eigene Konto kann man nicht entfernen.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const rechte: Record<keyof typeof rollenName, string> = {
  admin: "Alles, auch Team verwalten",
  vorstand: "Bewerbungen, Module, Einlass mit Liste",
  orga_team: "Einlass mit Anwesenheitsliste, abhaken",
  checkin_helper: "Nur Scanner und Kurzcode, keine Kontaktdaten",
};

export default async function TeamVerwaltung({ searchParams }: PageProps<"/team/team">) {
  const staff = await requireStaff("admin");
  const { hinweis } = await searchParams;
  const supabase = await createClient();
  const { data: mitglieder } = await supabase.from("staff_members").select("user_id, role, display_name, created_at").order("display_name");
  const feld = "rounded-2xl bg-white px-4 py-3 ring-1 ring-line";
  const rollenAuswahl = (name: string, wert?: string) => (
    <select name={name} defaultValue={wert ?? "checkin_helper"} className={feld}>
      {Object.entries(rollenName).map(([w, n]) => <option key={w} value={w}>{n}</option>)}
    </select>
  );

  return (
    <>
      <TeamKopf staff={staff} aktiv="team" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Team</h1>
        <Hinweis code={hinweis} texte={hinweise} />
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(rechte).map(([r, text]) => (
            <div key={r}><dt className="inline font-semibold">{rollenName[r as keyof typeof rollenName]}: </dt><dd className="inline text-ink-soft">{text}</dd></div>
          ))}
        </dl>
        <ul className="mt-6 divide-y divide-line rounded-3xl bg-white/80 px-5 ring-1 ring-line">
          {(mitglieder ?? []).map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-4">
              <p className="mr-auto font-semibold">{m.display_name}{m.user_id === staff.userId ? " (du)" : ""}</p>
              <form action={rolleAendern} className="flex gap-2">
                <input type="hidden" name="user_id" value={m.user_id} />
                {rollenAuswahl("rolle", m.role)}
                <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line">Speichern</button>
              </form>
              {m.user_id !== staff.userId && (
                <form action={mitgliedEntfernen}>
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button type="submit" className="text-sm font-semibold text-red-900 underline">entfernen</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Konto anlegen</h2>
          <form action={mitgliedAnlegen} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Name" className={feld} />
            <input name="email" type="email" required placeholder="E-Mail" className={feld} />
            {rollenAuswahl("rolle")}
            <input name="passwort" type="text" required minLength={10} placeholder="Startpasswort (mind. 10 Zeichen)" autoComplete="off" className={feld} />
            <button type="submit" className="justify-self-start rounded-full bg-ink px-6 py-3 font-semibold text-paper">Anlegen</button>
          </form>
        </section>
      </main>
    </>
  );
}

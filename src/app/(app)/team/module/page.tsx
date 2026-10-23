import type { Metadata } from "next";
import Link from "next/link";
import { Hinweis } from "@/components/team/Hinweis";
import { artName, ModulFormular, statusName } from "@/components/team/ModulFormular";
import { TeamKopf } from "@/components/team/TeamKopf";
import { modulAnlegen } from "@/lib/aktionen/module";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Module | SES Academy" };

const hinweise = {
  eingabe: { text: "Bitte Titel, Kurzname (nur Kleinbuchstaben, Zahlen, Bindestriche) und Art prüfen.", gut: false },
  "slug-vergeben": { text: "Diesen Kurznamen gibt es schon.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const datum = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" });

export default async function ModulSeite({ searchParams }: PageProps<"/team/module">) {
  const staff = await requireStaff("alles");
  const { hinweis } = await searchParams;
  const supabase = await createClient();
  const { data: module } = await supabase
    .from("modules")
    .select("id, title, slug, kind, status, cancelled_at, open_registration, ticket_required, module_days(starts_at), registrations(status)")
    .order("created_at");

  const liste = (module ?? [])
    .map((m) => ({ ...m, beginn: m.module_days.map((d) => d.starts_at).sort()[0] ?? null }))
    .sort((a, b) => (a.beginn ?? "9").localeCompare(b.beginn ?? "9"));

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Module</h1>
        <Hinweis code={hinweis} texte={hinweise} />
        <ul className="mt-6 grid gap-3">
          {liste.map((m) => {
            const angemeldet = m.registrations.filter((r) => r.status === "confirmed").length;
            const warteliste = m.registrations.filter((r) => r.status === "waitlist").length;
            return (
              <li key={m.id}>
                <Link href={`/team/module/${m.id}/`} className="flex flex-wrap items-center gap-3 rounded-3xl bg-white/80 p-5 ring-1 ring-line hover:ring-ink">
                  <div className="mr-auto">
                    <p className="font-display text-lg font-bold">{m.title}</p>
                    <p className="text-sm text-ink-soft">
                      {artName[m.kind]} · {m.beginn ? datum.format(new Date(m.beginn)) : "noch kein Termin"} · {m.module_days.length} {m.module_days.length === 1 ? "Tag" : "Tage"}
                      {" · "}{angemeldet} angemeldet{warteliste ? `, ${warteliste} Warteliste` : ""}
                    </p>
                  </div>
                  {m.open_registration && <span className="rounded-full bg-signal px-3 py-1 text-xs font-semibold">offen für Gäste</span>}
                  {!m.ticket_required && <span className="rounded-full bg-paper-deep px-3 py-1 text-xs font-semibold">ohne Ticket</span>}
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.cancelled_at ? "bg-red-100 text-red-950" : "bg-paper-deep"}`}>
                    {m.cancelled_at ? "Abgesagt" : statusName[m.status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <section className="mt-10 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Neues Modul</h2>
          <p className="mb-4 mt-1 text-sm text-ink-soft">Termine trägst du danach auf der Modulseite ein.</p>
          <ModulFormular aktion={modulAnlegen} knopf="Modul anlegen" />
        </section>
      </main>
    </>
  );
}

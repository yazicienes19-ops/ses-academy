import type { Metadata } from "next";
import Link from "next/link";
import { TeamKopf } from "@/components/team/TeamKopf";
import { annehmen, statusSetzen, ticketErneutSenden } from "@/lib/aktionen/bewerbungen";
import { requireStaff } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bewerbungen | SES Academy" };

type Status = Database["public"]["Enums"]["application_status"];

const statusName: Record<Status, string> = {
  eingegangen: "Eingegangen",
  in_pruefung: "In Prüfung",
  angenommen: "Angenommen",
  warteliste: "Warteliste",
  abgelehnt: "Abgelehnt",
  zurueckgezogen: "Zurückgezogen",
};

const hinweise: Record<string, { text: string; gut: boolean }> = {
  angenommen: { text: "Angenommen. Die Person ist für alle kommenden Module angemeldet, das Ticket ist verschickt.", gut: true },
  "angenommen-ohne-mail": { text: "Angenommen, aber die Ticket-Mail konnte nicht gesendet werden. Bitte „Ticket erneut senden“ versuchen.", gut: false },
  "annahme-fehler": { text: "Die Annahme hat nicht geklappt. Bitte erneut versuchen.", gut: false },
  gespeichert: { text: "Status gespeichert.", gut: true },
  "ticket-gesendet": { text: "Ticket-Mail erneut gesendet.", gut: true },
  "mail-fehler": { text: "Die Mail konnte nicht gesendet werden. Stimmen die SMTP-Einstellungen?", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const filterListe: (Status | "offen")[] = ["offen", "angenommen", "warteliste", "abgelehnt"];

export default async function BewerbungenSeite({ searchParams }: PageProps<"/team/bewerbungen">) {
  const staff = await requireStaff("alles");
  const { status: filterRoh, hinweis } = await searchParams;
  const filter = (filterListe as string[]).includes(String(filterRoh)) ? (filterRoh as Status | "offen") : "offen";
  const supabase = await createClient();

  const { data: jahrgang } = await supabase.from("cohorts").select("id, name").eq("is_current", true).maybeSingle();
  let query = supabase.from("applications").select("*").order("created_at", { ascending: true });
  if (jahrgang) query = query.eq("cohort_id", jahrgang.id);
  query = filter === "offen" ? query.in("status", ["eingegangen", "in_pruefung"]) : query.eq("status", filter);
  const { data: bewerbungen } = await query;
  const h = hinweis ? hinweise[String(hinweis)] : null;

  const knopf = "rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line bg-white hover:bg-paper-deep";

  return (
    <>
      <TeamKopf staff={staff} aktiv="bewerbungen" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Bewerbungen</h1>
        <p className="mt-1 text-ink-soft">{jahrgang?.name ?? "Kein aktueller Jahrgang angelegt"}</p>

        {h && <p role="status" className={`mt-4 rounded-2xl p-4 ${h.gut ? "bg-emerald-100 text-emerald-950" : "bg-amber-100 text-amber-950"}`}>{h.text}</p>}

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filter">
          {filterListe.map((f) => (
            <Link key={f} href={`/team/bewerbungen/?status=${f}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${f === filter ? "bg-ink text-paper" : "bg-white ring-1 ring-line"}`}>
              {f === "offen" ? "Offen" : statusName[f]}
            </Link>
          ))}
        </nav>

        <ul className="mt-6 grid gap-4">
          {(bewerbungen ?? []).map((b) => (
            <li key={b.id} className="rounded-3xl bg-white/80 p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold">{b.first_name} {b.last_name}</p>
                  <p className="text-sm text-ink-soft">
                    {b.email}{b.phone ? ` · ${b.phone}` : ""} · {b.city}, {b.country} · Jahrgang {b.birth_year}
                  </p>
                  <p className="text-sm text-ink-soft">
                    Sprachen: {b.languages.join(", ") || "keine Angabe"} · eingegangen am {new Date(b.created_at).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}
                    {b.source ? ` · über ${b.source}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-paper-deep px-3 py-1 text-sm font-semibold">{statusName[b.status]}</span>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold">Motivation lesen</summary>
                <p className="mt-2 whitespace-pre-line">{b.motivation}</p>
              </details>
              <div className="mt-4 flex flex-wrap gap-2">
                {b.status !== "angenommen" ? (
                  <>
                    <form action={annehmen}>
                      <input type="hidden" name="id" value={b.id} /><input type="hidden" name="filter" value={filter} />
                      <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-forest">Annehmen und Ticket senden</button>
                    </form>
                    {(["in_pruefung", "warteliste", "abgelehnt"] as const).filter((s) => s !== b.status).map((s) => (
                      <form key={s} action={statusSetzen}>
                        <input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value={s} /><input type="hidden" name="filter" value={filter} />
                        <button type="submit" className={knopf}>{statusName[s]}</button>
                      </form>
                    ))}
                  </>
                ) : b.participant_id ? (
                  <form action={ticketErneutSenden}>
                    <input type="hidden" name="participant_id" value={b.participant_id} /><input type="hidden" name="filter" value={filter} />
                    <button type="submit" className={knopf}>Ticket erneut senden</button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {(bewerbungen ?? []).length === 0 && <p className="mt-6 text-ink-soft">Keine Bewerbungen in dieser Ansicht.</p>}
      </main>
    </>
  );
}

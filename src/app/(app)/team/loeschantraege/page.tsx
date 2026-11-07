import type { Metadata } from "next";
import Link from "next/link";
import { Hinweis } from "@/components/team/Hinweis";
import { Rueckfrage } from "@/components/team/Rueckfrage";
import { TeamKopf } from "@/components/team/TeamKopf";
import { loeschungAblehnen, loeschungAusfuehren } from "@/lib/aktionen/datenschutz";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Löschanträge | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  geloescht: { text: "Erledigt: Konto und Kontaktdaten gelöscht, Anwesenheiten und Hausaufgaben ohne Namen erhalten.", gut: true },
  abgelehnt: { text: "Abgelehnt. Die Person sieht die Notiz in „Mein Bereich“.", gut: true },
  "notiz-fehlt": { text: "Zum Ablehnen bitte eine Notiz für die Person schreiben (Grund).", gut: false },
  "schon-erledigt": { text: "Dieser Antrag ist schon erledigt.", gut: false },
  bestaetigen: { text: "Bitte die Rückfrage bestätigen. Es wurde nichts gelöscht.", gut: false },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

type Zahlen = Record<string, number | boolean>;
const geloescht: [string, string][] = [
  ["kontakte", "Anrufe und Kontakt-Notizen"], ["notizen", "Notizen des Teams"], ["uebernachtung", "Angaben zur Übernachtung (mit Hinweisen ans Team)"],
  ["zimmer", "Zimmer-Zuteilungen"], ["zimmerwuensche", "Zimmerwunsch-Zuordnungen"], ["beitraege", "verknüpfte Beiträge"],
  ["engagements", "Engagements"], ["bewerbungen", "Bewerbungen (mit Motivation)"], ["mails", "Mail-Protokoll: Adresse wird entfernt"],
];
const anonymisiert: [string, string][] = [
  ["anmeldungen", "Anmeldungen zu Modulen"], ["anwesenheiten", "Anwesenheiten (Check-ins)"], ["abgaben", "Hausaufgaben-Abgaben mit Bewertungen und Dateien"],
  ["entschuldigungen", "Entschuldigungen für Hausaufgaben"], ["feedback", "Feedback-Antworten"], ["gruppen", "Gruppen-Zuordnungen"], ["mitgliedschaften", "Mitgliedschaften (Generation)"],
];
const zeit = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const statusName: Record<string, string> = { offen: "offen", erledigt: "erledigt", abgelehnt: "abgelehnt", zurueckgezogen: "zurückgezogen" };

/**
 * Löschanträge aus „Mein Bereich“ (nur Admin): Was gelöscht und was ohne Namen für die Auswertung behalten wird,
 * bestätigen oder mit Notiz ablehnen. Keine Selbstlöschung: Anwesenheiten und Hausaufgaben gehören zur Auswertung.
 */
export default async function Loeschantraege({ searchParams }: PageProps<"/team/loeschantraege">) {
  const staff = await requireStaff("admin");
  const { hinweis } = await searchParams;
  const supabase = await createClient();
  const { data: antraege } = await supabase.from("deletion_requests").select("*").order("requested_at", { ascending: false }).limit(100);
  const offen = (antraege ?? []).filter((a) => a.status === "offen");
  const rest = (antraege ?? []).filter((a) => a.status !== "offen");
  const vorschau = new Map(await Promise.all(offen.map(async (a) => {
    const { data } = await supabase.rpc("deletion_preview", { p_request_id: a.id });
    return [a.id, data as { name: string; email: string | null; zahlen: Zahlen } | null] as const;
  })));

  return (
    <>
      <TeamKopf staff={staff} aktiv="loeschantraege" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Löschanträge</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Teilnehmende beantragen in „Mein Bereich“ die Löschung ihres Kontos. Gelöscht werden Login, Kontaktdaten, Foto, Notizen und
          Übernachtungsangaben; Anwesenheiten und Hausaufgaben bleiben ohne Namen für die Auswertung.
        </p>
        <Hinweis code={hinweis} texte={hinweise} />

        <section className="mt-6">
          <h2 className="font-display text-xl font-bold">Offen ({offen.length})</h2>
          {offen.length === 0 && <p className="mt-2 text-ink-soft">Nichts offen.</p>}
          <ul className="mt-3 space-y-4">
            {offen.map((a) => {
              const v = vorschau.get(a.id);
              const z = v?.zahlen ?? {};
              return (
                <li key={a.id} className="karte">
                  <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">beantragt am {zeit.format(new Date(a.requested_at))}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {a.participant_id ? <Link href={`/team/teilnehmende/${a.participant_id}/`} className="hover:underline">{v?.name ?? "?"}</Link> : v?.name ?? "?"}
                    {v?.email && <span className="ml-2 text-sm font-normal text-ink-soft">{v.email}</span>}
                  </p>
                  {a.reason && <p className="mt-2 rounded-2xl bg-paper p-3 text-sm">„{a.reason}“</p>}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="font-semibold text-rot">Wird gelöscht</p>
                      <ul className="mt-1 space-y-0.5 text-sm">
                        <li>Name, E-Mail, Telefon, Geschlecht, Foto{z.foto ? " (vorhanden)" : ""}; Ticket und Links werden ungültig</li>
                        <li>{z.team_konto ? "Login-Konto: bleibt, weil es zugleich ein Team-Konto ist (unter „Team“ entfernen)" : z.konto ? "Login-Konto für „Mein Bereich“" : "kein Login-Konto vorhanden"}</li>
                        {geloescht.filter(([k]) => Number(z[k] ?? 0) > 0).map(([k, n]) => <li key={k}>{n}: {String(z[k])}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Bleibt ohne Namen („Gelöschte Person“) für die Auswertung</p>
                      <ul className="mt-1 space-y-0.5 text-sm">
                        {anonymisiert.filter(([k]) => Number(z[k] ?? 0) > 0).map(([k, n]) => <li key={k}>{n}: {String(z[k])}</li>)}
                        <li className="text-ink-soft">Region, Generation, GT/KGT und Sorumlu bleiben für die Statistik.</li>
                      </ul>
                    </div>
                  </div>
                  <form action={loeschungAusfuehren} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
                    <input type="hidden" name="id" value={a.id} />
                    <input name="notiz" placeholder="Notiz (optional)" aria-label="Notiz zur Löschung" className="feld !w-64" />
                    <Rueckfrage knopf="Löschen bestätigen" knopfKlasse="rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white" gefahr ja="Ja, endgültig löschen"
                      frage={`${v?.name ?? "Diese Person"} jetzt endgültig löschen und anonymisieren? Das lässt sich nicht rückgängig machen.`} />
                  </form>
                  <form action={loeschungAblehnen} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <input name="notiz" placeholder="Grund für die Person" aria-label="Grund für die Ablehnung" className="feld !w-64" />
                    <button type="submit" className="knopf-hell">Ablehnen</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>

        {rest.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">Verlauf</h2>
            <div className="mt-3 overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
              <table className="tabelle min-w-[32rem]">
                <thead><tr><th>Beantragt</th><th>Status</th><th>Entschieden</th><th>Notiz</th></tr></thead>
                <tbody>
                  {rest.map((a) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap">{zeit.format(new Date(a.requested_at))}</td>
                      <td>{statusName[a.status] ?? a.status}</td>
                      <td className="whitespace-nowrap">{a.decided_at ? zeit.format(new Date(a.decided_at)) : "–"}</td>
                      <td>{a.decision_note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

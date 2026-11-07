import type { Metadata } from "next";
import Link from "next/link";
import { Hinweis } from "@/components/team/Hinweis";
import { Rueckfrage } from "@/components/team/Rueckfrage";
import { TeamKopf } from "@/components/team/TeamKopf";
import { LoeschVorschau } from "@/components/team/LoeschVorschau";
import { loeschungAblehnen, loeschungAusfuehren, loeschungVorlegen } from "@/lib/aktionen/datenschutz";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Löschanträge | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  vorgelegt: { text: "Zur Freigabe vorgelegt. Eine zweite Person (Admin oder Vorstand) gibt unter „Freigaben“ frei, danach kannst du hier löschen.", gut: true },
  "schon-vorgelegt": { text: "Diese Löschung liegt schon zur Freigabe vor.", gut: false },
  abgelaufen: { text: "Die Freigabe ist älter als 24 Stunden. Bitte neu vorlegen.", gut: false },
  geloescht: { text: "Erledigt: Konto und Kontaktdaten gelöscht, Anwesenheiten und Hausaufgaben ohne Namen erhalten.", gut: true },
  abgelehnt: { text: "Abgelehnt. Die Person sieht die Notiz in „Mein Bereich“.", gut: true },
  "notiz-fehlt": { text: "Zum Ablehnen bitte eine Notiz für die Person schreiben (Grund).", gut: false },
  "schon-erledigt": { text: "Dieser Antrag ist schon erledigt.", gut: false },
  bestaetigen: { text: "Bitte die Rückfrage bestätigen. Es wurde nichts gelöscht.", gut: false },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

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
  const [{ data: antraege }, { data: freigaben }, { data: team }] = await Promise.all([
    supabase.from("deletion_requests").select("*").order("requested_at", { ascending: false }).limit(100),
    supabase.from("approvals").select("id, status, requested_by, decided_by, decided_at, decision_note, payload").eq("action", "person_loeschen").order("requested_at", { ascending: false }),
    supabase.rpc("get_team_members"),
  ]);
  const name = new Map((team ?? []).map((t) => [t.user_id, t.display_name]));
  const jetzt = jetztMs();
  // Jüngste Vorlage je Antrag (Vier-Augen-Prinzip)
  const vorlage = (antragId: string) => (freigaben ?? []).find((f) => (f.payload as { antrag?: string }).antrag === antragId);
  const offen = (antraege ?? []).filter((a) => a.status === "offen");
  const rest = (antraege ?? []).filter((a) => a.status !== "offen");
  const vorschau = new Map(await Promise.all(offen.map(async (a) => {
    const { data } = await supabase.rpc("deletion_preview", { p_request_id: a.id });
    return [a.id, data as { name: string; email: string | null; zahlen: Record<string, number | boolean> } | null] as const;
  })));

  return (
    <>
      <TeamKopf staff={staff} aktiv="loeschantraege" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Löschanträge</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Teilnehmende beantragen in „Mein Bereich“ die Löschung ihres Kontos. Gelöscht werden Login, Kontaktdaten, Foto, Notizen und
          Übernachtungsangaben; Anwesenheiten und Hausaufgaben bleiben ohne Namen für die Auswertung. Gelöscht wird nach dem
          Vier-Augen-Prinzip: Ein Admin legt vor, eine zweite Person (Admin oder Vorstand) gibt unter „Freigaben“ frei, dann löscht die vorlegende Person.
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
                  <LoeschVorschau zahlen={z} />
                  {(() => {
                    const f = vorlage(a.id);
                    const gueltig = f?.status === "freigegeben" && f.decided_at && Date.parse(f.decided_at) > jetzt - 86_400_000;
                    if (f?.status === "offen") return <p className="mt-4 rounded-2xl bg-gelb-hell p-3 text-sm font-semibold">Liegt zur Freigabe vor (von {name.get(f.requested_by) ?? "?"}). Eine zweite Person gibt unter „Freigaben“ frei.</p>;
                    if (gueltig && f.requested_by === staff.userId) return (
                      <form action={loeschungAusfuehren} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
                        <input type="hidden" name="freigabe" value={f.id} />
                        <p className="basis-full text-sm font-semibold text-emerald-900">Freigegeben von {name.get(f.decided_by ?? "") ?? "?"}{f.decision_note ? `: „${f.decision_note}“` : ""}. Ausführen innerhalb von 24 Stunden.</p>
                        <input name="notiz" placeholder="Notiz (optional)" aria-label="Notiz zur Löschung" className="feld !w-64" />
                        <Rueckfrage knopf="Jetzt löschen" knopfKlasse="rounded-full bg-red-800 px-4 py-2 text-sm font-semibold text-white" gefahr ja="Ja, endgültig löschen"
                          frage={`${v?.name ?? "Diese Person"} jetzt endgültig löschen und anonymisieren? Das lässt sich nicht rückgängig machen.`} />
                      </form>
                    );
                    if (gueltig) return <p className="mt-4 rounded-2xl bg-paper-deep p-3 text-sm">Freigegeben. Löschen kann {name.get(f.requested_by) ?? "die vorlegende Person"}, die es vorgelegt hat.</p>;
                    return (
                      <form action={loeschungVorlegen} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
                        <input type="hidden" name="id" value={a.id} />
                        {f?.status === "abgelehnt" && <p className="basis-full text-sm text-rot">Letzte Vorlage abgelehnt{f.decision_note ? `: „${f.decision_note}“` : ""}.</p>}
                        {f?.status === "freigegeben" && <p className="basis-full text-sm text-ink-soft">Die letzte Freigabe ist abgelaufen.</p>}
                        <Rueckfrage knopf="Zur Freigabe vorlegen" knopfKlasse="knopf" ja="Ja, vorlegen"
                          frage={`Löschung von ${v?.name ?? "dieser Person"} zur Freigabe vorlegen? Eine zweite Person sieht diese Übersicht und gibt frei; danach löschst du hier.`} />
                      </form>
                    );
                  })()}
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

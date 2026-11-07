import type { Metadata } from "next";
import Link from "next/link";
import { Hinweis } from "@/components/team/Hinweis";
import { LoeschVorschau } from "@/components/team/LoeschVorschau";
import { TeamKopf } from "@/components/team/TeamKopf";
import { freigabeEntscheiden } from "@/lib/aktionen/freigaben";
import { requireStaff, rollenName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Freigaben | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  approved: { text: "Freigegeben. Die anfragende Person kann die Aktion jetzt 24 Stunden lang ausführen.", gut: true },
  rejected: { text: "Abgelehnt.", gut: true },
  own_request: { text: "Den eigenen Antrag muss eine andere Person freigeben.", gut: false },
  admin_required: { text: "Team-Zugänge gibt nur ein Admin frei.", gut: false },
  already_decided: { text: "Darüber wurde schon entschieden.", gut: false },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const aktionName: Record<string, string> = { nachricht: "Nachricht an alle", export: "Export aller Daten", team_zugang: "Team-Zugang", person_loeschen: "Person löschen" };
const ausfuehren: Record<string, string> = { nachricht: "/team/nachrichten/", export: "/team/auswertung/", team_zugang: "/team/team/", person_loeschen: "/team/loeschantraege/" };
const statusName: Record<string, string> = { offen: "wartet auf Freigabe", freigegeben: "freigegeben", abgelehnt: "abgelehnt", ausgefuehrt: "ausgeführt" };
const zeit = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

/** Vier-Augen-Prinzip: Anträge anderer freigeben oder ablehnen, eigene Anträge verfolgen. */
export default async function Freigaben({ searchParams }: PageProps<"/team/freigaben">) {
  const staff = await requireStaff("alles");
  const { hinweis } = await searchParams;
  const supabase = await createClient();
  const [{ data: antraege }, { data: team }] = await Promise.all([
    supabase.from("approvals").select("*").order("requested_at", { ascending: false }).limit(100),
    supabase.rpc("get_team_members"),
  ]);
  const name = new Map((team ?? []).map((t) => [t.user_id, t.display_name]));
  const offenFremd = (antraege ?? []).filter((a) => a.status === "offen" && a.requested_by !== staff.userId);
  const rest = (antraege ?? []).filter((a) => !(a.status === "offen" && a.requested_by !== staff.userId));
  const jetzt = jetztMs();

  return (
    <>
      <TeamKopf staff={staff} aktiv="freigaben" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Freigaben</h1>
        <p className="mt-1 text-ink-soft">Nachrichten an alle, Exporte aller Daten, neue Team-Zugänge und das Löschen von Personen bestätigt eine zweite Person (Entscheidung vom 25.10.2026).</p>
        <Hinweis code={hinweis} texte={hinweise} />

        <section className="mt-6">
          <h2 className="font-display text-xl font-bold">Warten auf dich ({offenFremd.length})</h2>
          {offenFremd.length === 0 && <p className="mt-2 text-ink-soft">Nichts offen.</p>}
          <ul className="mt-3 space-y-3">
            {offenFremd.map((a) => {
              const p = a.payload as { betreff?: string; text?: string; betreff_tr?: string; text_tr?: string; anzahl?: number; email?: string; name?: string; rolle?: string; art?: string; filter?: Record<string, string> };
              return (
                <li key={a.id} className="karte">
                  <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{aktionName[a.action]} · beantragt von {name.get(a.requested_by) ?? "?"} · {zeit.format(new Date(a.requested_at))}</p>
                  <p className="mt-1 font-semibold">{a.summary}</p>
                  {p.text && <pre className="mt-3 max-h-64 overflow-auto rounded-2xl bg-paper p-3 font-sans text-sm whitespace-pre-wrap">{p.text_tr ? <span className="mb-1 block text-xs font-semibold text-ink-soft">Deutsch · Betreff: {p.betreff}</span> : null}{p.text}</pre>}
                  {p.text_tr && <pre lang="tr" className="mt-3 max-h-64 overflow-auto rounded-2xl bg-paper p-3 font-sans text-sm whitespace-pre-wrap"><span className="mb-1 block text-xs font-semibold text-ink-soft">Türkisch · Betreff: {p.betreff_tr}</span>{p.text_tr}</pre>}
                  {a.action === "person_loeschen" && (() => {
                    const l = a.payload as { email?: string | null; grund?: string; zahlen?: Record<string, number | boolean> };
                    return (
                      <div className="mt-2 text-sm">
                        {l.email && <p className="text-ink-soft">{l.email}</p>}
                        {l.grund && <p className="mt-2 rounded-2xl bg-paper p-3">Grund der Person: „{l.grund}“</p>}
                        {l.zahlen && <LoeschVorschau zahlen={l.zahlen} />}
                      </div>
                    );
                  })()}
                  {a.action === "team_zugang" && (
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                      {p.email && <><dt className="text-ink-soft">E-Mail</dt><dd>{p.email}</dd></>}
                      {p.rolle && <><dt className="text-ink-soft">Rolle</dt><dd className="font-semibold">{rollenName[p.rolle as keyof typeof rollenName] ?? p.rolle}</dd></>}
                    </dl>
                  )}
                  <form action={freigabeEntscheiden} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <input name="notiz" placeholder="Notiz (optional)" className="feld !w-64" aria-label="Notiz" />
                    <button type="submit" name="entscheidung" value="ja" className="knopf">Freigeben</button>
                    <button type="submit" name="entscheidung" value="nein" className="knopf-hell">Ablehnen</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Verlauf</h2>
          {/* Am Handy seitlich scrollbar statt abgeschnitten */}
          <div className="mt-3 overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
          <table className="tabelle min-w-[36rem]">
            <thead><tr><th>Wann</th><th>Was</th><th>Von</th><th>Status</th></tr></thead>
            <tbody>
              {rest.map((a) => {
                const abgelaufen = a.status === "freigegeben" && a.decided_at && Date.parse(a.decided_at) < jetzt - 86_400_000;
                const r = a.result as { gesendet?: number; fehler?: number } | null;
                return (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">{zeit.format(new Date(a.requested_at))}</td>
                    <td>{a.summary}</td>
                    <td>{name.get(a.requested_by) ?? "?"}{a.decided_by ? ` · entschieden von ${name.get(a.decided_by) ?? "?"}` : ""}</td>
                    <td>
                      {a.status === "freigegeben" && !abgelaufen && a.requested_by === staff.userId && ausfuehren[a.action]
                        ? <Link href={ausfuehren[a.action]} className="link">freigegeben, jetzt ausführen</Link>
                        : abgelaufen ? "Freigabe abgelaufen" : statusName[a.status] ?? a.status}
                      {r?.gesendet !== undefined && ` (${r.gesendet} verschickt${r.fehler ? `, ${r.fehler} fehlgeschlagen` : ""})`}
                      {a.decision_note && <span className={`mt-1 block text-sm ${a.status === "abgelehnt" ? "font-semibold text-rot" : "text-ink-soft"}`}>Notiz: „{a.decision_note}“</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </section>
      </main>
    </>
  );
}

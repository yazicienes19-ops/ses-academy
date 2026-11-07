import type { Metadata } from "next";
import { Hinweis } from "@/components/team/Hinweis";
import { TeamKopf } from "@/components/team/TeamKopf";
import { MailHinweis } from "@/components/team/MailHinweis";
import { RundmailFormular } from "@/components/team/RundmailFormular";
import { nachrichtSenden } from "@/lib/aktionen/freigaben";
import { requireStaff } from "@/lib/auth";
import { mailBereit, seitenUrl } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Nachrichten | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  beantragt: { text: "Zur Freigabe vorgelegt. Eine zweite Person gibt sie unter „Freigaben“ frei, danach kannst du hier senden.", gut: true },
  "keine-empfaenger": { text: "Mit diesen Filtern gibt es keine Empfänger mit E-Mail-Adresse.", gut: false },
  expired: { text: "Die Freigabe ist älter als 24 Stunden. Bitte neu beantragen.", gut: false },
  ausgefuehrt: { text: "Diese Nachricht wurde schon verschickt.", gut: false },
  offen: { text: "Noch nicht freigegeben.", gut: false },
  eingabe: { text: "Bitte Betreff und Text angeben.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

/**
 * Nachrichten an alle (Phase 3): an eine Generation, Region, Sorumlu-Gruppe, die Angemeldeten eines Moduls oder eine Gruppe.
 * Versand per Mail erst nach Freigabe durch eine zweite Person. Für die WhatsApp-Gruppe gibt es den Text zum Kopieren
 * (Entscheidung 25.10.2026: WhatsApp bleibt für schnelle Mitteilungen, Persönliches per Mail, das Portal liefert die Texte).
 */
export default async function Nachrichten({ searchParams }: PageProps<"/team/nachrichten">) {
  const staff = await requireStaff("alles");
  const { hinweis } = await searchParams;
  const supabase = await createClient();
  const [{ data: generationen }, { data: regionen }, { data: sorumlu }, { data: module }, { data: gruppen }, { data: meine }, { data: vorlagen }] = await Promise.all([
    supabase.from("cohorts").select("id, name").order("year", { ascending: false }),
    supabase.from("regions").select("id, name").order("name"),
    supabase.from("mentors").select("id, name").order("name"),
    supabase.from("modules").select("id, title").eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("module_groups").select("id, name, module:modules(title)").order("name"),
    supabase.from("approvals").select("*").eq("action", "nachricht").eq("requested_by", staff.userId).order("requested_at", { ascending: false }).limit(20),
    supabase.from("message_templates").select("id, name, subject_de, body_de, subject_tr, body_tr").order("name"),
  ]);
  const gesendet = typeof hinweis === "string" && hinweis.startsWith("gesendet-") ? hinweis.split("-").slice(1).map(Number) : null;
  const jetzt = jetztMs();

  return (
    <>
      <TeamKopf staff={staff} aktiv="nachrichten" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Nachrichten an alle</h1>
        <Hinweis code={gesendet ? undefined : hinweis} texte={hinweise} />
        {gesendet && <p role="status" className={`mt-4 rounded-2xl p-4 ${gesendet[1] ? "bg-amber-100" : "bg-emerald-100"}`}>{gesendet[0]} Mails verschickt{gesendet[1] ? `, ${gesendet[1]} fehlgeschlagen` : ""}.</p>}

        {(meine ?? []).length > 0 && (
          <section className="mt-6 space-y-3">
            {(meine ?? []).map((a) => {
              const p = a.payload as { betreff: string; text: string; betreff_tr?: string; text_tr?: string; sprache?: string; anzahl: number };
              const titel = p.sprache === "tr" ? p.betreff_tr : p.betreff;
              const sendbar = a.status === "freigegeben" && a.decided_at && Date.parse(a.decided_at) > jetzt - 86_400_000;
              const whatsapp = [
                ...(p.sprache !== "tr" ? [`*${p.betreff}*\n\n${p.text}`] : []),
                ...(p.sprache && p.sprache !== "de" ? [`*${p.betreff_tr}*\n\n${p.text_tr}`] : []),
              ].join("\n\n———\n\n") + `\n\nMein Bereich: ${seitenUrl("/mein-bereich/")}`;
              const r = a.result as { gesendet?: number; fehler?: number } | null;
              return (
                <details key={a.id} className="karte" open={!!sendbar}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                    <span className="mr-auto font-semibold">{titel}</span>
                    <span className={`chip ${sendbar ? "bg-gruen-hell" : a.status === "ausgefuehrt" ? "bg-paper-deep" : a.status === "abgelehnt" ? "bg-rot-hell text-rot" : "bg-gelb-hell"}`}>
                      {a.status === "ausgefuehrt" ? `verschickt${r?.gesendet !== undefined ? ` (${r.gesendet})` : ""}` : sendbar ? "freigegeben" : a.status === "freigegeben" ? "Freigabe abgelaufen" : a.status === "offen" ? "wartet auf Freigabe" : a.status}
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-ink-soft">{a.summary}</p>
                  {a.decision_note && (
                    <p className={`mt-2 rounded-2xl p-3 text-sm ${a.status === "abgelehnt" ? "bg-rot-hell text-rot" : "bg-paper-deep"}`}>
                      <span className="font-semibold">{a.status === "abgelehnt" ? "Abgelehnt mit Notiz:" : "Notiz zur Freigabe:"}</span> {a.decision_note}
                    </p>
                  )}
                  {sendbar && (
                    <form action={nachrichtSenden} className="mt-3">
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="knopf">Jetzt an {p.anzahl} Personen senden</button>
                      <MailHinweis knapp className="mt-3" />
                    </form>
                  )}
                  <label className="etikett mt-4" htmlFor={`wa-${a.id}`}>Text für die WhatsApp-Gruppe (markieren und kopieren)</label>
                  <textarea id={`wa-${a.id}`} readOnly rows={6} defaultValue={whatsapp} className="feld font-mono text-sm" />
                </details>
              );
            })}
          </section>
        )}

        <section className="karte mt-8">
          <h2 className="font-display text-xl font-bold">Neue Nachricht</h2>
          <div className="mt-4">
            <RundmailFormular vorlagen={vorlagen ?? []} mailBereit={mailBereit()} email={staff.email} filterOptionen={{
              generationen: generationen ?? [], regionen: regionen ?? [], sorumlu: sorumlu ?? [],
              module: (module ?? []).map((m) => ({ id: m.id, name: m.title })),
              gruppen: (gruppen ?? []).map((g) => ({ id: g.id, name: `${g.name}${g.module ? ` (${g.module.title})` : ""}` })),
            }} />
          </div>
        </section>
      </main>
    </>
  );
}

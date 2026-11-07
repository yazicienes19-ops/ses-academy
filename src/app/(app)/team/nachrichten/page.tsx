import type { Metadata } from "next";
import { Hinweis } from "@/components/team/Hinweis";
import { TeamKopf } from "@/components/team/TeamKopf";
import { MailHinweis } from "@/components/team/MailHinweis";
import { nachrichtBeantragen, nachrichtSenden } from "@/lib/aktionen/freigaben";
import { requireStaff } from "@/lib/auth";
import { seitenUrl } from "@/lib/mail";
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
  const [{ data: generationen }, { data: regionen }, { data: sorumlu }, { data: module }, { data: gruppen }, { data: meine }] = await Promise.all([
    supabase.from("cohorts").select("id, name").order("year", { ascending: false }),
    supabase.from("regions").select("id, name").order("name"),
    supabase.from("mentors").select("id, name").order("name"),
    supabase.from("modules").select("id, title").eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("module_groups").select("id, name, module:modules(title)").order("name"),
    supabase.from("approvals").select("*").eq("action", "nachricht").eq("requested_by", staff.userId).order("requested_at", { ascending: false }).limit(20),
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
              const p = a.payload as { betreff: string; text: string; anzahl: number };
              const sendbar = a.status === "freigegeben" && a.decided_at && Date.parse(a.decided_at) > jetzt - 86_400_000;
              const whatsapp = `*${p.betreff}*\n\n${p.text}\n\nMehr in „Mein Bereich“: ${seitenUrl("/mein-bereich/")}`;
              const r = a.result as { gesendet?: number; fehler?: number } | null;
              return (
                <details key={a.id} className="karte" open={!!sendbar}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                    <span className="mr-auto font-semibold">{p.betreff}</span>
                    <span className={`chip ${sendbar ? "bg-gruen-hell" : a.status === "ausgefuehrt" ? "bg-paper-deep" : "bg-gelb-hell"}`}>
                      {a.status === "ausgefuehrt" ? `verschickt${r?.gesendet !== undefined ? ` (${r.gesendet})` : ""}` : sendbar ? "freigegeben" : a.status === "freigegeben" ? "Freigabe abgelaufen" : a.status}
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-ink-soft">{a.summary}</p>
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
          <form action={nachrichtBeantragen} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="etikett" htmlFor="betreff">Betreff</label><input id="betreff" name="betreff" required maxLength={200} className="feld" /></div>
            <div className="sm:col-span-2"><label className="etikett" htmlFor="text">Text</label><textarea id="text" name="text" required rows={8} maxLength={10000} className="feld" placeholder="Die Anrede „Hallo Vorname,“ und der Gruß kommen automatisch dazu." /></div>
            <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
              <legend className="etikett">An wen? (leer = alle aktiven mit E-Mail)</legend>
              <select name="cohort_id" className="feld" aria-label="Generation"><option value="">alle Generationen</option>{(generationen ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
              <select name="region_id" className="feld" aria-label="Region"><option value="">alle Regionen</option>{(regionen ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              <select name="mentor_id" className="feld" aria-label="Sorumlu"><option value="">alle Sorumlu-Gruppen</option>{(sorumlu ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <select name="module_id" className="feld" aria-label="Modul"><option value="">unabhängig von Modulen</option>{(module ?? []).map((m) => <option key={m.id} value={m.id}>angemeldet: {m.title}</option>)}</select>
              <select name="group_id" className="feld" aria-label="Gruppe"><option value="">alle Gruppen</option>{(gruppen ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}{g.module ? ` (${g.module.title})` : ""}</option>)}</select>
            </fieldset>
            <div className="sm:col-span-2"><button type="submit" className="knopf">Zur Freigabe vorlegen</button></div>
          </form>
        </section>
      </main>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulFormular } from "@/components/team/ModulFormular";
import { TeamKopf } from "@/components/team/TeamKopf";
import { absageZuruecknehmen, modulAbsagen, modulSpeichern, tagEntfernen, tagHinzufuegen } from "@/lib/aktionen/module";
import { requireStaff } from "@/lib/auth";
import { anmeldestatus } from "@/lib/einlass";
import { createClient } from "@/lib/supabase/server";
import { istToken } from "@/lib/codes";

export const metadata: Metadata = { title: "Modul | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  angelegt: { text: "Modul angelegt. Jetzt Termine eintragen und veröffentlichen.", gut: true },
  gespeichert: { text: "Gespeichert.", gut: true },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  "slug-vergeben": { text: "Diesen Kurznamen gibt es schon.", gut: false },
  "tag-eingabe": { text: "Bitte Datum und Uhrzeiten prüfen (Ende nach Beginn).", gut: false },
  "tag-doppelt": { text: "Für diesen Tag gibt es schon einen Termin.", gut: false },
  "tag-angelegt": { text: "Termin eingetragen.", gut: true },
  "tag-entfernt": { text: "Termin entfernt.", gut: true },
  "tag-hat-checkins": { text: "An diesem Tag wurde schon eingecheckt. Der Termin bleibt deshalb bestehen.", gut: false },
  abgesagt: { text: "Modul abgesagt. Der Einlass ist gesperrt, Tickets gelten für dieses Modul nicht mehr.", gut: true },
  reaktiviert: { text: "Absage zurückgenommen.", gut: true },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const tagFormat = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
const zeitFormat = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export default async function ModulDetail({ params, searchParams }: PageProps<"/team/module/[id]">) {
  const staff = await requireStaff("alles");
  const { id } = await params;
  const { hinweis } = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("modules")
    .select("*, module_days(id, day, starts_at, ends_at, label, attendances(count)), registrations(status)")
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();

  const code = typeof hinweis === "string" && hinweis.startsWith("gespeichert-") ? "gespeichert" : hinweis;
  const neuAngemeldet = typeof hinweis === "string" && hinweis.startsWith("gespeichert-") ? Number(hinweis.split("-")[1]) : 0;
  const tage = [...m.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const zaehlung = Object.entries(anmeldestatus)
    .map(([s, name]) => ({ name, anzahl: m.registrations.filter((r) => r.status === s).length }))
    .filter((z) => z.anzahl > 0);
  const feld = "rounded-2xl bg-white px-4 py-3 ring-1 ring-line";

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/team/module/" className="text-sm font-semibold text-ink-soft hover:text-ink">← Alle Module</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">{m.title}</h1>
        {m.cancelled_at && <p className="mt-2 font-semibold text-red-900">Abgesagt{m.cancellation_reason ? `: ${m.cancellation_reason}` : ""}</p>}
        <Hinweis code={code} texte={hinweise} />
        {neuAngemeldet > 0 && <p role="status" className="mt-2 rounded-2xl bg-emerald-100 p-4 text-emerald-950">{neuAngemeldet} angenommene Teilnehmende wurden automatisch angemeldet.</p>}

        <p className="mt-4 text-ink-soft">
          Anmeldungen: {zaehlung.length ? zaehlung.map((z) => `${z.anzahl} ${z.name.toLowerCase()}`).join(" · ") : "noch keine"}
        </p>

        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Termine</h2>
          <p className="mt-1 text-sm text-ink-soft">Eingecheckt wird pro Termin. Einlass ist 4 Stunden vor Beginn bis 6 Stunden nach Ende möglich.</p>
          <ul className="mt-4 divide-y divide-line">
            {tage.map((t) => {
              const checkins = t.attendances[0]?.count ?? 0;
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="mr-auto">
                    <p className="font-semibold">{tagFormat.format(new Date(t.starts_at))}{t.label ? ` · ${t.label}` : ""}</p>
                    <p className="text-sm text-ink-soft">{zeitFormat.format(new Date(t.starts_at))} bis {zeitFormat.format(new Date(t.ends_at))} Uhr · {checkins} eingecheckt</p>
                  </div>
                  <Link href={`/team/einlass/?tag=${t.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line">Einlass</Link>
                  {checkins === 0 && (
                    <form action={tagEntfernen}>
                      <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="day_id" value={t.id} />
                      <button type="submit" className="text-sm font-semibold text-ink-soft underline">entfernen</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {tage.length === 0 && <p className="mt-3 text-ink-soft">Noch keine Termine.</p>}
          <form action={tagHinzufuegen} className="mt-5 flex flex-wrap items-end gap-2">
            <input type="hidden" name="module_id" value={m.id} />
            <div><label htmlFor="day" className="mb-1 block text-sm font-semibold">Datum</label><input id="day" name="day" type="date" required className={feld} /></div>
            <div><label htmlFor="von" className="mb-1 block text-sm font-semibold">Beginn</label><input id="von" name="von" type="time" required defaultValue="10:00" className={feld} /></div>
            <div><label htmlFor="bis" className="mb-1 block text-sm font-semibold">Ende</label><input id="bis" name="bis" type="time" required defaultValue="18:00" className={feld} /></div>
            <div className="min-w-40 flex-1"><label htmlFor="label" className="mb-1 block text-sm font-semibold">Bezeichnung (optional)</label><input id="label" name="label" placeholder="z. B. Tag 1" className={`${feld} w-full`} /></div>
            <button type="submit" className="rounded-full bg-ink px-5 py-3 font-semibold text-paper">Termin eintragen</button>
          </form>
        </section>

        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="mb-4 font-display text-xl font-bold">Einstellungen</h2>
          <ModulFormular modul={m} aktion={modulSpeichern} knopf="Speichern" />
        </section>

        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">{m.cancelled_at ? "Absage" : "Modul absagen"}</h2>
          {m.cancelled_at ? (
            <form action={absageZuruecknehmen} className="mt-3">
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" className="rounded-full bg-white px-5 py-3 font-semibold ring-1 ring-line">Absage zurücknehmen</button>
            </form>
          ) : (
            <form action={modulAbsagen} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={m.id} />
              <div className="min-w-60 flex-1"><label htmlFor="grund" className="mb-1 block text-sm font-semibold">Grund (intern)</label><input id="grund" name="grund" className={`${feld} w-full`} /></div>
              <button type="submit" className="rounded-full bg-red-800 px-5 py-3 font-semibold text-white">Absagen</button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}

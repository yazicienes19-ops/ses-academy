import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, ClipboardList, Euro, Hotel, IdCard, Siren } from "lucide-react";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Leer, Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Logistik | SES Academy" };

const datum = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });

/**
 * Logistik auf einen Blick (ab Orga-Team, wie Hotel und Zimmerplan): je kommendes Modul Hotels und Betten, Stand des
 * Zimmerplans, offene Materialliste, Stornofrist; Wege zu Logistik, Zimmerplan, Material, Kosten, Namensschildern und
 * Notfall-Liste. Vergangene Module über „Frühere Module“.
 */
export default async function Logistik({ searchParams }: PageProps<"/team/logistik">) {
  const staff = await requireStaff("orga");
  const { alle } = await searchParams;
  const supabase = await createClient();
  const { data: module } = await supabase.from("modules")
    .select("id, title, location, cancelled_at, status, module_days(day, ends_at), hotels(id, name, cancellation_deadline, rooms(capacity, room_assignments(participant_id))), module_materials(done_at)")
    .neq("status", "draft");
  const jetzt = new Date(jetztMs()).toISOString();
  const liste = (module ?? [])
    .map((m) => ({ ...m, tage: [...m.module_days].sort((a, b) => a.day.localeCompare(b.day)) }))
    .filter((m) => m.tage.length)
    .sort((a, b) => a.tage[0].day.localeCompare(b.tage[0].day));
  const kommend = liste.filter((m) => !m.cancelled_at && m.tage.some((t) => t.ends_at >= jetzt));
  const frueher = liste.filter((m) => !kommend.includes(m)).reverse();
  const zeigen = alle === "1" ? [...kommend, ...frueher] : kommend;
  // Übernachtende und Eingeteilte je Modul (gleiche Zahlen wie im Zimmerplan)
  const planung = new Map(await Promise.all(zeigen.slice(0, 8).map(async (m) => {
    const { data } = await supabase.rpc("get_room_planning", { p_module_id: m.id });
    return [m.id, data ?? []] as const;
  })));

  return (
    <>
      <TeamKopf staff={staff} aktiv="logistik" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Titel kicker="Hotel, Zimmer, Material, Kosten">Logistik</Titel>
        {zeigen.length === 0 && <Leer>Kein kommendes Modul.</Leer>}
        <div className="grid gap-5">
          {zeigen.map((m) => {
            const p = planung.get(m.id) ?? [];
            const uebernachten = p.filter((x) => x.registration_status === "confirmed" && x.nights.length > 0);
            const ohneZimmer = uebernachten.filter((x) => !x.room_id).length;
            const betten = m.hotels.reduce((s, h) => s + h.rooms.reduce((t, z) => t + z.capacity, 0), 0);
            const offen = m.module_materials.filter((x) => !x.done_at).length;
            const frist = m.hotels.map((h) => h.cancellation_deadline).filter(Boolean).sort()[0];
            const vorbei = !kommend.includes(m);
            const link = (pfad: string) => `/team/module/${m.id}/${pfad}`;
            return (
              <section key={m.id} className={`karte ${vorbei ? "opacity-80" : ""}`}>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="font-display mr-auto text-2xl font-bold">{m.title}{m.cancelled_at && <span className="chip ml-2 bg-rot-hell align-middle text-rot">abgesagt</span>}</h2>
                  <p className="text-sm text-ink-soft">{datum.format(new Date(`${m.tage[0].day}T12:00:00Z`))}{m.location ? ` · ${m.location}` : ""}</p>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl bg-paper p-3">
                    <dt className="text-xs text-ink-soft">{m.hotels.length === 1 ? "Hotel" : `${m.hotels.length} Hotels`}</dt>
                    <dd className="font-semibold">{m.hotels.length ? m.hotels.map((h) => h.name).join(", ") : <span className="text-amber-900">noch keins</span>}</dd>
                  </div>
                  <div className={`rounded-2xl p-3 ${betten < uebernachten.length ? "bg-gelb-hell" : "bg-paper"}`}>
                    <dt className="text-xs text-ink-soft">Betten / übernachten</dt>
                    <dd className="font-semibold">{betten} / {uebernachten.length}</dd>
                  </div>
                  <div className={`rounded-2xl p-3 ${ohneZimmer ? "bg-gelb-hell" : "bg-paper"}`}>
                    <dt className="text-xs text-ink-soft">Zimmerplan</dt>
                    <dd className="font-semibold">{uebernachten.length === 0 ? "noch keine Angaben" : ohneZimmer ? `${ohneZimmer} noch ohne Zimmer` : "alle eingeteilt"}</dd>
                  </div>
                  <div className={`rounded-2xl p-3 ${offen ? "bg-gelb-hell" : "bg-paper"}`}>
                    <dt className="text-xs text-ink-soft">Materialliste</dt>
                    <dd className="font-semibold">{m.module_materials.length === 0 ? "leer" : offen ? `${offen} von ${m.module_materials.length} offen` : "alles erledigt"}</dd>
                  </div>
                </dl>
                {frist && !vorbei && <p className="mt-3 text-sm">Stornofrist Hotel: <span className="font-semibold">{datum.format(new Date(`${frist}T12:00:00Z`))}</span></p>}
                <nav aria-label={`Logistik ${m.title}`} className="mt-4 flex flex-wrap gap-2">
                  <Link href={link("hotel/")} className="knopf"><Hotel aria-hidden className="h-4 w-4" /> Hotel und Zimmer</Link>
                  <Link href={link("zimmerplan/")} className="knopf-hell"><BedDouble aria-hidden className="h-4 w-4" /> Zimmerplan</Link>
                  <Link href={link("material/")} className="knopf-hell"><ClipboardList aria-hidden className="h-4 w-4" /> Material</Link>
                  <Link href={link("kosten/")} className="knopf-hell"><Euro aria-hidden className="h-4 w-4" /> Kosten</Link>
                  <Link href={link("namensschilder/")} className="knopf-hell"><IdCard aria-hidden className="h-4 w-4" /> Namensschilder</Link>
                  <a href={link("notfall/")} className="knopf-hell"><Siren aria-hidden className="h-4 w-4" /> Notfall-Liste</a>
                </nav>
              </section>
            );
          })}
        </div>
        {frueher.length > 0 && (
          <p className="mt-6 text-sm">
            {alle === "1" ? <Link href="/team/logistik/" className="link">Nur kommende Module</Link> : <Link href="/team/logistik/?alle=1" className="link">Frühere Module ({frueher.length}) anzeigen</Link>}
          </p>
        )}
      </main>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Hinweis } from "@/components/team/Hinweis";
import { KontaktFormular, KontaktKnoepfe, KontaktVerlauf, LetzterKontakt, kontaktHinweise, type Kontakt } from "@/components/team/Kontakt";
import { TeamKopf } from "@/components/team/TeamKopf";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { nachtName } from "@/lib/uebernachtung";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Anrufliste | SES Academy" };

type Person = {
  participant_id: string; name: string; phone: string | null; region: string | null; mentor_name: string | null;
  registration_status: string; stay_answered: boolean; nights: string[] | null; contacts: number;
  last_at: string | null; last_channel: string | null; last_outcome: string | null; last_note: string | null; last_by: string | null;
};

const filter = {
  alle: { name: "Alle", passt: () => true },
  offen: { name: "Noch nicht kontaktiert", passt: (p: Person) => p.contacts === 0 },
  nachfassen: { name: "Nicht erreicht / Rückruf", passt: (p: Person) => p.last_outcome === "nicht_erreicht" || p.last_outcome === "rueckruf" },
  erreicht: { name: "Erreicht", passt: (p: Person) => p.last_outcome === "erreicht" },
  uebernachtung: { name: "Ohne Übernachtungsangabe", passt: (p: Person) => !p.stay_answered },
} as const;
type Filter = keyof typeof filter;

function uebernachtung(p: Person) {
  if (!p.stay_answered) return "Übernachtung: keine Angabe";
  if (!p.nights?.length) return "keine Übernachtung";
  return `Übernachtung ${p.nights.map(nachtName).join(", ")}`;
}

/**
 * Anrufliste eines Moduls: wer wurde wann von wem kontaktiert, mit welchem Ergebnis. Filter für Telefonaktionen
 * (noch nicht kontaktiert, nachfassen, ohne Übernachtungsangabe). Gilt ab Orga-Team.
 */
export default async function Anrufe({ searchParams }: PageProps<"/team/anrufe">) {
  const staff = await requireStaff("orga");
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: module } = await supabase.from("modules").select("id, title, cancelled_at, module_days(starts_at, ends_at)")
    .eq("status", "published").is("cancelled_at", null);
  const jetzt = jetztMs();
  const liste = (module ?? [])
    .map((m) => ({ id: m.id, title: m.title, beginn: m.module_days.map((d) => d.starts_at).sort()[0] ?? "", ende: m.module_days.map((d) => d.ends_at).sort().at(-1) ?? "" }))
    .filter((m) => m.beginn)
    .sort((a, b) => a.beginn.localeCompare(b.beginn));
  // Vorschlag: das nächste Modul, das noch nicht vorbei ist
  const gewaehlt = typeof sp.modul === "string" && istToken(sp.modul) ? sp.modul : undefined;
  const modul = liste.find((m) => m.id === gewaehlt) ?? liste.find((m) => Date.parse(m.ende) > jetzt) ?? liste.at(-1);

  const aktiv: Filter = typeof sp.filter === "string" && sp.filter in filter ? (sp.filter as Filter) : "alle";
  const suche = typeof sp.suche === "string" ? sp.suche.trim().toLowerCase() : "";

  const [{ data: personen }, { data: verlauf }] = modul
    ? await Promise.all([supabase.rpc("get_call_list", { p_module_id: modul.id }), supabase.rpc("get_contacts", { p_module_id: modul.id })])
    : [{ data: [] }, { data: [] }];
  const alle = (personen ?? []) as Person[];
  const jePerson = new Map<string, Kontakt[]>();
  for (const k of (verlauf ?? []) as Kontakt[]) jePerson.set(k.participant_id, [...(jePerson.get(k.participant_id) ?? []), k]);
  const gezeigt = alle.filter((p) => filter[aktiv].passt(p) && (!suche || p.name.toLowerCase().includes(suche)));

  const adresse = (f: Filter) => `/team/anrufe/?modul=${modul?.id ?? ""}${f === "alle" ? "" : `&filter=${f}`}${suche ? `&suche=${encodeURIComponent(suche)}` : ""}`;
  const zurueck = adresse(aktiv);

  return (
    <>
      <TeamKopf staff={staff} aktiv="anrufe" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-4xl font-extrabold">Anrufliste</h1>
        <p className="mt-1 text-ink-soft">Nach jedem Anruf kurz eintragen, ob die Person erreicht wurde. So sieht das ganze Team, wer schon dran war.</p>
        <Hinweis code={sp.hinweis} texte={kontaktHinweise} />

        {!modul ? <p className="karte mt-6">Es gibt noch keine veröffentlichten Module.</p> : (
          <>
            <form className="mt-6 grid gap-2 sm:grid-cols-[14rem_1fr_auto]" action="/team/anrufe/">
              <label className="sr-only" htmlFor="modul">Modul</label>
              <select id="modul" name="modul" defaultValue={modul.id} className="feld">
                {liste.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              {aktiv !== "alle" && <input type="hidden" name="filter" value={aktiv} />}
              <label className="sr-only" htmlFor="suche">Name suchen</label>
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input id="suche" name="suche" defaultValue={suche} placeholder="Name suchen" className="feld !pl-10" />
              </div>
              <button className="knopf">Anzeigen</button>
            </form>

            <nav aria-label="Filter" className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(filter) as Filter[]).map((f) => (
                <Link key={f} href={adresse(f)} aria-current={f === aktiv ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${f === aktiv ? "bg-ink text-paper ring-ink" : "bg-weiss ring-line hover:ring-ink"}`}>
                  {filter[f].name} <span className="opacity-70">{alle.filter(filter[f].passt).length}</span>
                </Link>
              ))}
            </nav>

            <ul className="mt-6 space-y-3">
              {gezeigt.map((p) => {
                const eintraege = jePerson.get(p.participant_id) ?? [];
                return (
                  <li key={p.participant_id} id={`p-${p.participant_id}`} className="karte scroll-mt-4 !p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="mr-auto min-w-0">
                        <p className="font-display text-lg font-bold">{p.name}</p>
                        <p className="text-sm text-ink-soft">
                          {[p.region, p.mentor_name && `Sorumlu ${p.mentor_name}`, p.registration_status === "waitlist" && "Warteliste", uebernachtung(p)].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <KontaktKnoepfe name={p.name} phone={p.phone} />
                    </div>
                    <div className="mt-3">
                      {p.last_at && p.last_outcome && p.last_channel
                        ? <LetzterKontakt at={p.last_at} outcome={p.last_outcome} channel={p.last_channel} by={p.last_by} note={p.last_note ?? ""} />
                        : <p className="text-sm text-ink-soft">Noch nicht kontaktiert.</p>}
                    </div>
                    <div className="mt-3"><KontaktFormular participantId={p.participant_id} moduleId={modul.id} zurueck={zurueck} /></div>
                    {eintraege.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold">Verlauf ({eintraege.length})</summary>
                        <div className="mt-1"><KontaktVerlauf eintraege={eintraege} zurueck={zurueck} /></div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
            {gezeigt.length === 0 && <p className="mt-6 rounded-3xl border-2 border-dashed border-line p-8 text-center text-ink-soft">Niemand in dieser Auswahl.</p>}
          </>
        )}
      </main>
    </>
  );
}

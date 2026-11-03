import type { Metadata } from "next";
import Link from "next/link";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Leer, Rueckmeldung, Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { punktLoeschen, punktSpeichern, tagVeroeffentlichen } from "@/lib/aktionen/regieplan";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Regieplan | SES Academy" };

type Punkt = { id: string; module_day_id: string; starts_at: string; ends_at: string | null; title: string; location: string | null; description: string; published: boolean; agenda_item_internal: { responsible: string; note: string } | null };

const tagName = (d: string) => new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" }).format(new Date(`${d}T12:00:00Z`));
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

function PunktFormular({ modul, tagId, p }: { modul: string; tagId: string; p?: Punkt }) {
  const i = p?.agenda_item_internal;
  return (
    <form action={punktSpeichern} className={`grid gap-2 border-t border-line p-3 md:grid-cols-[6.75rem_6.75rem_1.4fr_7rem_1fr_1fr_13.5rem] md:items-start ${p && !p.published ? "bg-paper/60" : ""}`}>
      <input type="hidden" name="modul" value={modul} /><input type="hidden" name="module_day_id" value={tagId} />
      {p && <input type="hidden" name="id" value={p.id} />}
      <input name="starts_at" type="time" required defaultValue={hhmm(p?.starts_at ?? null)} aria-label="Beginn" className="feld px-2" />
      <input name="ends_at" type="time" defaultValue={hhmm(p?.ends_at ?? null)} aria-label="Ende" className="feld px-2" />
      <div className="space-y-2">
        <input name="title" required defaultValue={p?.title} placeholder="Programmpunkt" aria-label="Titel" className="feld font-semibold" />
        <input name="description" defaultValue={p?.description} placeholder="Info für Teilnehmende (optional)" aria-label="Beschreibung" className="feld text-sm" />
      </div>
      <input name="location" defaultValue={p?.location ?? ""} placeholder="Raum" aria-label="Raum" className="feld" />
      <input name="responsible" defaultValue={i?.responsible} placeholder="Verantwortlich (intern)" aria-label="Verantwortlich, intern" className="feld bg-gelb-hell/60" />
      <textarea name="note" defaultValue={i?.note} rows={1} placeholder="Orga-Notiz (intern)" aria-label="Orga-Notiz, intern" className="feld bg-gelb-hell/60" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" name="published" defaultChecked={p ? p.published : true} /> sichtbar</label>
        <button className="knopf px-3 py-2">{p ? "Speichern" : "Hinzufügen"}</button>
        {p && <button formAction={punktLoeschen} formNoValidate className="text-xs text-rot underline">Löschen</button>}
      </div>
    </form>
  );
}

export default async function Regieplan({ searchParams }: PageProps<"/team/regieplan">) {
  const staff = await requireStaff("orga");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: jahrgang } = await supabase.from("cohorts").select("id").eq("is_current", true).maybeSingle();
  const { data: module } = await supabase.from("modules").select("id,title,module_days(id,day,starts_at)").eq("cohort_id", jahrgang?.id ?? "");
  const sortiert = (module ?? [])
    .map((m) => ({ ...m, tage: [...m.module_days].sort((a, b) => a.day.localeCompare(b.day)) }))
    .sort((a, b) => (a.tage[0]?.day ?? "9").localeCompare(b.tage[0]?.day ?? "9"));
  const heute = new Date().toISOString().slice(0, 10);
  const modulId = typeof sp.modul === "string" ? sp.modul : (sortiert.find((m) => m.tage.some((t) => t.day >= heute)) ?? sortiert[0])?.id;
  const modul = sortiert.find((m) => m.id === modulId);
  const { data: roh } = modul
    ? await supabase.from("agenda_items").select("*,agenda_item_internal(responsible,note)").in("module_day_id", modul.tage.map((t) => t.id)).order("starts_at")
    : { data: [] };
  const punkte = (roh ?? []) as unknown as Punkt[];

  return (
    <>
      <TeamKopf staff={staff} aktiv="regieplan" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Titel kicker="Regieplan">{modul?.title ?? "Kein Modul"}</Titel>
        <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Modul wählen">
          {sortiert.map((m) => (
            <Link key={m.id} href={`?modul=${m.id}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${m.id === modulId ? "bg-ink text-paper" : "bg-weiss ring-1 ring-line"}`}>{m.title.split(/[–:]/)[0].trim()}</Link>
          ))}
        </nav>
        <p className="mb-6 text-sm text-ink-soft">Gelbe Felder sind intern und erscheinen nie in der Tagesordnung der Teilnehmenden. Teilnehmende sehen nur Punkte mit „sichtbar“, und nur für Module, für die sie angemeldet sind.</p>
        {!modul?.tage.length && <Leer>Für dieses Modul sind noch keine Tage angelegt (Module → Tage).</Leer>}
        <div className="space-y-8">
          {modul?.tage.map((tag) => {
            const liste = punkte.filter((p) => p.module_day_id === tag.id);
            const alleSichtbar = liste.length > 0 && liste.every((p) => p.published);
            return (
              <section key={tag.id} className="overflow-hidden rounded-3xl bg-weiss ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <h2 className="font-display text-xl font-bold">{tagName(tag.day)}</h2>
                  {liste.length > 0 && (
                    <form action={tagVeroeffentlichen} className="flex items-center gap-3 text-sm">
                      <input type="hidden" name="modul" value={modul.id} /><input type="hidden" name="module_day_id" value={tag.id} />
                      <input type="hidden" name="published" value={String(!alleSichtbar)} />
                      <span className="text-ink-soft">{liste.filter((p) => p.published).length}/{liste.length} sichtbar</span>
                      <button className="knopf-hell px-3 py-1.5">{alleSichtbar ? "Alle verbergen" : "Alle sichtbar schalten"}</button>
                    </form>
                  )}
                </div>
                {liste.map((p) => <PunktFormular key={p.id} modul={modul.id} tagId={tag.id} p={p} />)}
                <div className="bg-paper/50"><PunktFormular modul={modul.id} tagId={tag.id} /></div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}

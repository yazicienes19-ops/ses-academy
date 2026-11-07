import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulReiter } from "@/components/team/ModulReiter";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Rueckfrage } from "@/components/team/Rueckfrage";
import { abfrageUmschalten, hotelEntfernen, hotelSpeichern, zimmerAnlegen, zimmerEntfernen, zimmerSichtbarUmschalten, zimmerZuteilen } from "@/lib/aktionen/hotel";
import { darf, requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { naechte, nachtName } from "@/lib/uebernachtung";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hotel und Zimmer | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  abfrage: { text: "Gespeichert.", gut: true },
  hotel: { text: "Hotel gespeichert.", gut: true },
  zimmer: { text: "Zimmer angelegt.", gut: true },
  "zimmer-entfernt": { text: "Zimmer entfernt.", gut: true },
  zugeteilt: { text: "Zuteilung gespeichert.", gut: true },
  "zimmer-voll": { text: "Das Zimmer ist schon voll. Die bisherige Zuteilung bleibt.", gut: false },
  "hotel-entfernt": { text: "Hotel entfernt.", gut: true },
  "hotel-belegt": { text: "In diesem Hotel sind noch Personen eingeteilt. Bitte erst umsetzen, dann entfernen.", gut: false },
  "zimmer-sichtbar": { text: "Die Zimmer stehen jetzt bei den Teilnehmenden in „Mein Bereich“.", gut: true },
  "zimmer-verborgen": { text: "Die Zimmer sind in „Mein Bereich“ verborgen.", gut: true },
  eingabe: { text: "Bitte die Angaben prüfen: Name, Preis als Zahl (z. B. 89,50), Kontingent als Zahl, Stornofrist als Datum.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const anreiseName: Record<string, string> = { bahn: "Bahn", auto: "Auto", flug: "Flug", bus: "Bus", andere: "anders" };
const zeit = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export default async function HotelSeite({ params, searchParams }: PageProps<"/team/module/[id]/hotel">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const { hinweis, hotel: hotelWahl } = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: hotels }, { data: personen }] = await Promise.all([
    supabase.from("modules").select("id, title, stay_form_open, module_days(day)").eq("id", id).maybeSingle(),
    supabase.from("hotels").select("*, rooms(id, label, capacity, section, room_assignments(participant_id))").eq("module_id", id).order("created_at"),
    supabase.rpc("get_stay_overview", { p_module_id: id }),
  ]);
  if (!modul) notFound();
  const alleNaechte = naechte(modul.module_days.map((d) => d.day));
  const liste = personen ?? [];
  const geantwortet = liste.filter((p) => p.answered);
  const proNacht = alleNaechte.map((n) => ({ nacht: n, anzahl: geantwortet.filter((p) => p.nights.includes(n)).length,
    w: geantwortet.filter((p) => p.nights.includes(n) && p.gender === "w").length, m: geantwortet.filter((p) => p.nights.includes(n) && p.gender === "m").length }));
  // Mehrere Hotels je Modul: eines ist gewählt (?hotel=), „neu“ zeigt ein leeres Formular für ein weiteres
  const alleHotels = hotels ?? [];
  const neu = hotelWahl === "neu";
  const hotel = neu ? undefined : alleHotels.find((h) => h.id === hotelWahl) ?? alleHotels[0];
  const sortiert = <T extends { label: string }>(z: T[]) => [...z].sort((a, b) => a.label.localeCompare(b.label, "de", { numeric: true }));
  const zimmer = sortiert(hotel?.rooms ?? []);
  const hotelName = new Map(alleHotels.map((h) => [h.id, h.name]));
  const alleZimmer = alleHotels.flatMap((h) => sortiert(h.rooms).map((z) => ({ ...z, hotel: h.name })));
  const belegt = zimmer.reduce((s, z) => s + z.room_assignments.length, 0);
  const betten = zimmer.reduce((s, z) => s + z.capacity, 0);

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" breit />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <ModulReiter id={id} titel={modul.title} aktiv="hotel/" />
        <Hinweis code={hinweis} texte={hinweise} />

        <nav aria-label="Hotels" className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{alleHotels.length > 1 ? "Hotels:" : "Hotel:"}</span>
          {alleHotels.map((h) => {
            const belegt = h.rooms.reduce((n, z) => n + z.room_assignments.length, 0);
            return (
              <Link key={h.id} href={`/team/module/${id}/hotel/?hotel=${h.id}`} aria-current={h.id === hotel?.id ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${h.id === hotel?.id ? "bg-ink text-paper ring-ink" : "bg-weiss ring-line hover:ring-ink"}`}>
                {h.name} <span className="opacity-70">{belegt}/{h.rooms.reduce((n, z) => n + z.capacity, 0)}</span>
              </Link>
            );
          })}
          {alleHotels.length > 0 && (
            <Link href={`/team/module/${id}/hotel/?hotel=neu`} aria-current={neu ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${neu ? "bg-ink text-paper ring-ink" : "bg-weiss ring-line hover:ring-ink"}`}>+ Weiteres Hotel</Link>
          )}
          <Link href={`/team/module/${id}/kosten/`} className="ml-auto text-sm font-semibold underline">Kostenübersicht</Link>
        </nav>

        <section className="karte mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mr-auto">
              <span className="font-semibold">Abfrage in „Mein Bereich“:</span> {modul.stay_form_open ? "offen" : "geschlossen"} ·{" "}
              {geantwortet.length} von {liste.length} haben geantwortet
            </p>
            {darf.alles(staff.role) && (
              <form action={abfrageUmschalten}>
                <input type="hidden" name="module_id" value={id} /><input type="hidden" name="offen" value={modul.stay_form_open ? "0" : "1"} />
                <button type="submit" className={modul.stay_form_open ? "knopf-hell" : "knopf"}>{modul.stay_form_open ? "Abfrage schließen" : "Abfrage öffnen"}</button>
              </form>
            )}
          </div>
          {hotel && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <p className="mr-auto">
                <span className="font-semibold">Zimmer in „Mein Bereich“{alleHotels.length > 1 ? ` (${hotel.name})` : ""}:</span>{" "}
                {hotel.rooms_visible ? "sichtbar, alle Zugeteilten sehen ihr Zimmer" : "verborgen, erst nach Prüfung des Zimmerplans freigeben"}
                {hotel.name === "Hotel (Name folgt)" && <span className="mt-1 block text-sm text-amber-900">Vor dem Freigeben bitte oben den Hotelnamen und die Adresse eintragen.</span>}
              </p>
              <form action={zimmerSichtbarUmschalten}>
                <input type="hidden" name="module_id" value={id} /><input type="hidden" name="hotel_id" value={hotel.id} />
                <input type="hidden" name="sichtbar" value={hotel.rooms_visible ? "0" : "1"} />
                <button type="submit" className={hotel.rooms_visible ? "knopf-hell" : "knopf"}>{hotel.rooms_visible ? "Zimmer verbergen" : "Zimmer freigeben"}</button>
              </form>
            </div>
          )}
          {proNacht.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Übernachtungen je Nacht">
              {proNacht.map((n) => <li key={n.nacht} className="chip bg-paper-deep px-3 py-1.5 text-sm">{nachtName(n.nacht)}: {n.anzahl}{n.anzahl ? ` (${n.w} w · ${n.m} m)` : ""}</li>)}
            </ul>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <section className="karte">
            <h2 className="font-display text-xl font-bold">{neu ? "Weiteres Hotel anlegen" : alleHotels.length > 1 ? hotel?.name : "Hotel"}</h2>
            <form action={hotelSpeichern} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="module_id" value={id} />
              {hotel && <input type="hidden" name="id" value={hotel.id} />}
              <div className="sm:col-span-2"><label className="etikett" htmlFor="name">Name</label><input id="name" name="name" required defaultValue={hotel?.name} className="feld" /></div>
              <div className="sm:col-span-2"><label className="etikett" htmlFor="address">Adresse</label><input id="address" name="address" defaultValue={hotel?.address ?? ""} className="feld" /></div>
              <div className="sm:col-span-2"><label className="etikett" htmlFor="contact">Ansprechperson im Hotel</label><input id="contact" name="contact" defaultValue={hotel?.contact ?? ""} className="feld" placeholder="Name, Telefon, Mail" /></div>
              <div><label className="etikett" htmlFor="quota_rooms">Kontingent (Zimmer)</label><input id="quota_rooms" name="quota_rooms" inputMode="numeric" defaultValue={hotel?.quota_rooms ?? ""} className="feld" /></div>
              <div><label className="etikett" htmlFor="price_per_night">Preis je Zimmer und Nacht (€)</label><input id="price_per_night" name="price_per_night" inputMode="decimal" defaultValue={hotel?.price_per_night ?? ""} className="feld" /></div>
              <div><label className="etikett" htmlFor="cancellation_deadline">Kostenlos stornierbar bis</label><input id="cancellation_deadline" name="cancellation_deadline" type="date" defaultValue={hotel?.cancellation_deadline ?? ""} className="feld" /></div>
              <div className="sm:col-span-2"><label className="etikett" htmlFor="notes">Notizen</label><textarea id="notes" name="notes" rows={2} defaultValue={hotel?.notes ?? ""} className="feld" /></div>
              <div className="sm:col-span-2"><button type="submit" className="knopf">{hotel ? "Speichern" : "Hotel anlegen"}</button></div>
            </form>
            {hotel && alleHotels.length > 1 && hotel.rooms.every((z) => z.room_assignments.length === 0) && (
              <form action={hotelEntfernen} className="mt-3 flex flex-wrap">
                <input type="hidden" name="module_id" value={id} /><input type="hidden" name="hotel_id" value={hotel.id} />
                <Rueckfrage knopf="Dieses Hotel entfernen" knopfKlasse="text-sm font-semibold text-ink-soft underline" gefahr ja="Ja, Hotel entfernen"
                  frage={`„${hotel.name}“ mit ${hotel.rooms.length} Zimmern entfernen? Eingeteilt ist dort niemand.`} />
              </form>
            )}
            {hotel?.cancellation_deadline && <p className="mt-3 rounded-2xl bg-gelb-hell p-3 text-sm">Stornofrist: {new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(hotel.cancellation_deadline))}. Bis dahin die Zimmerliste mit dem Hotel abgleichen.</p>}
          </section>

          <section className="karte">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display mr-auto text-xl font-bold">Zimmer</h2>
              {hotel && <span className="text-sm text-ink-soft">{zimmer.length} Zimmer · {belegt} von {betten} Betten belegt{hotel.quota_rooms ? ` · Kontingent ${hotel.quota_rooms}` : ""}</span>}
              {hotel && <Link href={`/team/module/${id}/zimmerliste/?hotel=${hotel.id}`} target="_blank" className="knopf-hell">Zimmerliste als PDF</Link>}
              {hotel && <a href={`/team/module/${id}/zimmerplan/liste/?hotel=${hotel.id}`} className="knopf-hell">als Excel</a>}
            </div>
            {!hotel ? <p className="mt-3 text-ink-soft">{neu ? "Zuerst das Hotel anlegen, dann seine Zimmer." : "Zuerst das Hotel anlegen."}</p> : (
              <>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {zimmer.map((z) => (
                    <li key={z.id} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-line">
                      <span className="mr-auto font-semibold">{z.label}{z.section ? <span className="ml-1 font-normal text-ink-soft">· {z.section}</span> : null}</span>
                      <span className={`chip ${z.room_assignments.length >= z.capacity ? "bg-gruen-hell" : "bg-paper-deep"}`}>{z.room_assignments.length}/{z.capacity}</span>
                      {z.room_assignments.length === 0 && (
                        <form action={zimmerEntfernen}>
                          <input type="hidden" name="module_id" value={id} /><input type="hidden" name="id" value={z.id} /><input type="hidden" name="hotel_id" value={hotel.id} />
                          <button type="submit" className="text-xs font-semibold text-ink-soft underline" aria-label={`Zimmer ${z.label} entfernen`}>entfernen</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
                <form action={zimmerAnlegen} className="mt-4 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="module_id" value={id} /><input type="hidden" name="hotel_id" value={hotel.id} />
                  <div className="min-w-40 flex-1"><label className="etikett" htmlFor="labels">Zimmer</label><input id="labels" name="labels" required className="feld" placeholder="101-110 oder 101, 102, 205" /></div>
                  <div><label className="etikett" htmlFor="capacity">Betten</label><input id="capacity" name="capacity" type="number" min={1} max={12} defaultValue={2} className="feld !w-24" /></div>
                  <div><label className="etikett" htmlFor="section">Bereich</label><input id="section" name="section" className="feld !w-40" placeholder="z. B. 1. Stock" /></div>
                  <button type="submit" className="knopf-hell">Anlegen</button>
                </form>
              </>
            )}
          </section>
        </div>

        <section className="karte relative mt-6 overflow-x-auto">
          <h2 className="font-display text-xl font-bold">Angemeldete</h2>
          <table className="tabelle mt-4">
            <thead><tr><th>Name</th>{alleNaechte.map((n) => <th key={n}>{nachtName(n)}</th>)}<th>Anreise</th><th>Abreise</th><th>Zimmerwunsch / Hinweis</th>{alleZimmer.length > 0 && <th>Zimmer</th>}</tr></thead>
            <tbody>
              {liste.map((p) => (
                <tr key={p.participant_id} className={p.answered ? "" : "text-ink-soft"}>
                  <td className="font-semibold">{p.name}{p.gender && <span className={`chip ml-1 ${p.gender === "w" ? "bg-rose-100" : "bg-sky-100"}`} title={p.gender === "w" ? "weiblich" : "männlich"}>{p.gender}</span>}{p.registration_status === "waitlist" && <span className="chip ml-1 bg-gelb-hell">Warteliste</span>}{!p.answered && <span className="block text-xs font-normal">noch keine Angaben</span>}</td>
                  {alleNaechte.map((n) => <td key={n} className="text-center">{p.nights.includes(n) ? "●" : ""}</td>)}
                  <td className="whitespace-nowrap">{p.arrival_at ? zeit.format(new Date(p.arrival_at)) : ""}{p.arrival_by ? ` · ${anreiseName[p.arrival_by]}` : ""}</td>
                  <td className="whitespace-nowrap">{p.departure_at ? zeit.format(new Date(p.departure_at)) : ""}</td>
                  <td className="max-w-64">{[p.room_wish, p.notes].filter(Boolean).join(" · ")}</td>
                  {alleZimmer.length > 0 && (
                    <td>
                      <form action={zimmerZuteilen} className="flex gap-1">
                        <input type="hidden" name="module_id" value={id} />{hotel && <input type="hidden" name="hotel_id" value={hotel.id} />}<input type="hidden" name="participant_id" value={p.participant_id} />
                        <label className="sr-only" htmlFor={`z-${p.participant_id}`}>Zimmer für {p.name}</label>
                        <select id={`z-${p.participant_id}`} name="room_id" defaultValue={p.room_id ?? ""} className={`feld !py-1.5 ${alleHotels.length > 1 ? "!w-44" : "!w-28"}`}>
                          <option value="">–</option>
                          {alleHotels.map((h) => {
                            const optionen = sortiert(h.rooms).map((z) => <option key={z.id} value={z.id} disabled={z.room_assignments.length >= z.capacity && z.id !== p.room_id}>{z.label} ({z.room_assignments.length}/{z.capacity})</option>);
                            return alleHotels.length > 1 ? <optgroup key={h.id} label={h.name}>{optionen}</optgroup> : optionen;
                          })}
                        </select>
                        <button type="submit" className="knopf-hell !px-3 !py-1.5">OK</button>
                      </form>
                      {alleHotels.length > 1 && p.hotel_id && <span className="mt-0.5 block text-xs text-ink-soft">{hotelName.get(p.hotel_id)}</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {liste.length === 0 && <p className="mt-3 text-ink-soft">Noch keine Anmeldungen.</p>}
        </section>
      </main>
    </>
  );
}

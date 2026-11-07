import "server-only";

import { createClient } from "@/lib/supabase/server";
import { planen, wunschAufloesen, wuenschtEinzelzimmer, type PlanPerson, type Teil } from "@/lib/zimmerplan";

/**
 * Alles für den Zimmerplan eines Moduls: Angemeldete mit Wünschen (aufgelöst), Hotel mit Zimmern, Verlauf aus anderen
 * Modulen. Seite und „Vorschlag übernehmen“ rechnen damit dasselbe.
 * Mehrere Hotels: geplant wird für ein Hotel (hotelId, sonst das erste); wer schon in einem anderen Hotel des Moduls
 * ein Zimmer hat, bleibt dort und wird hier nicht eingeplant.
 */
export async function ladeZimmerplan(modulId: string, hotelId?: string | null) {
  const supabase = await createClient();
  const [{ data: modul }, { data: hotels }, { data: zeilen }, { data: verlauf }, { data: korrekturen }] = await Promise.all([
    supabase.from("modules").select("id, title, location").eq("id", modulId).maybeSingle(),
    supabase.from("hotels").select("id, name, address, rooms_visible, rooms(id, label, capacity, section)").eq("module_id", modulId).order("created_at"),
    supabase.rpc("get_room_planning", { p_module_id: modulId }),
    supabase.rpc("get_room_history", { p_module_id: modulId }),
    supabase.from("room_wish_overrides").select("participant_id, token, wished_id").eq("module_id", modulId),
  ]);
  const alleHotels = hotels ?? [];
  const hotel = alleHotels.find((h) => h.id === hotelId) ?? alleHotels[0] ?? null;
  const zimmer = [...(hotel?.rooms ?? [])].sort((a, b) => a.label.localeCompare(b.label, "de", { numeric: true }));
  const personen = zeilen ?? [];
  const namen = personen.map((p) => ({ id: p.participant_id, name: p.name }));
  const teile = new Map<string, Teil[]>(personen.map((p) => [p.participant_id, wunschAufloesen({ id: p.participant_id, room_wish: p.room_wish }, namen, korrekturen ?? [])]));
  const paare = new Set((verlauf ?? []).flatMap((v) => [`${v.participant_id}|${v.mate_id}`, `${v.mate_id}|${v.participant_id}`]));
  // Warteliste bekommt kein Bett: geplant wird nur, wer bestätigt angemeldet ist
  const anderesHotel = (p: { hotel_id: string | null }) => Boolean(p.hotel_id && p.hotel_id !== hotel?.id);
  const planPersonen: PlanPerson[] = personen.filter((p) => p.registration_status === "confirmed" && !anderesHotel(p)).map((p) => ({
    id: p.participant_id, name: p.name, gender: p.gender, region: p.region, nights: p.nights,
    zimmerId: p.room_id, quelle: p.source,
    wuensche: (teile.get(p.participant_id) ?? []).flatMap((t) => (t.ziel ? [t.ziel.id] : [])),
    einzelzimmer: wuenschtEinzelzimmer(p.room_wish),
  }));
  // Personen dieses Hotels (für Zimmerliste und Kacheln); die anderen sind in einem anderen Hotel des Moduls
  const imHotel = personen.filter((p) => p.hotel_id && p.hotel_id === hotel?.id);
  const inAnderenHotels = personen.filter(anderesHotel);
  return { modul, hotels: alleHotels, hotel, zimmer, personen, imHotel, inAnderenHotels, teile, verlauf: verlauf ?? [], paare, planPersonen };
}

export type Zimmerplan = Awaited<ReturnType<typeof ladeZimmerplan>>;

/** Vorschlag aus den geladenen Daten. */
export function vorschlag(d: Zimmerplan) {
  return planen(d.planPersonen, d.zimmer.map((z) => ({ id: z.id, label: z.label, capacity: z.capacity, vorgabe: vorgabeAus(z.section) })), d.paare);
}

/** „Frauen“/„Männer“ als Bereich eines Zimmers heißt: nur dieses Geschlecht. */
export function vorgabeAus(bereich: string | null): "w" | "m" | null {
  return bereich === "Frauen" ? "w" : bereich === "Männer" ? "m" : null;
}

export const zimmerArt: Record<2 | 3, string> = { 2: "Doppelzimmer", 3: "Dreibettzimmer" };

/**
 * Einteilung ohne angelegte Zimmer: so viele gleich große Zimmer wie nötig (2er oder 3er), Frauen und Männer getrennt,
 * Wünsche wie beim Vorschlag. Die Zimmer heißen „2er 01“ usw.; die echten Nummern vergibt das Hotel.
 */
export function probeplan(d: Zimmerplan, groesse: 2 | 3) {
  const personen = d.planPersonen.map((p) => ({ ...p, zimmerId: null, quelle: null }));
  const anzahl = personen.filter((p) => p.nights.length > 0).length;
  const leer = Array.from({ length: anzahl }, (_, i) => ({ id: `probe-${i}`, label: String(i).padStart(4, "0"), capacity: groesse }));
  const e = planen(personen, leer, d.paare);
  const geschlecht = new Map(personen.map((p) => [p.id, p.gender]));
  const naechteVon = new Map(personen.map((p) => [p.id, [...p.nights].sort()]));
  const reihe = (g: string | null) => (g === "w" ? 0 : g === "m" ? 1 : 2);
  // Frauen vor Männern, innerhalb nach Anreise (früheste zuerst); alle im Zimmer haben dieselben Nächte
  const zimmer = e.zimmer.filter((z) => z.belegung.length > 0)
    .map((z) => ({ ...z, gender: geschlecht.get(z.belegung[0].id) ?? null, naechte: [...new Set(z.belegung.flatMap((b) => naechteVon.get(b.id) ?? []))].sort() }))
    .sort((a, b) => reihe(a.gender) - reihe(b.gender) || a.naechte.join().localeCompare(b.naechte.join()))
    .map((z, i) => ({
      id: `probe-${i + 1}`, label: `${groesse}er ${String(i + 1).padStart(2, "0")}`, capacity: groesse, belegung: z.belegung, naechte: z.naechte,
      bereich: z.gender === "w" ? "Frauen" : z.gender === "m" ? "Männer" : "ohne Angabe",
    }));
  return { zimmer, hinweise: e.hinweise };
}

const datumKurz = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const tagNach = (iso: string, plus = 0) => datumKurz.format(new Date(Date.parse(`${iso}T12:00:00Z`) + plus * 86_400_000));

/**
 * Zimmerliste fürs Hotel als Tabelle (Excel und Mail ans Hotel): nur Namen und Zimmer, keine Kontaktdaten. Sind im Hotel
 * Zimmer angelegt, die echte Zuteilung; sonst die automatische Einteilung. Jedes Zimmer wird einmal gebucht (erste bis
 * letzte Nacht seiner Gäste); wer später dazukommt, hat eine eigene Anreise.
 */
export function zimmerlisteTabelle(d: Zimmerplan, groesse: 2 | 3) {
  const personen = new Map(d.personen.map((p) => [p.participant_id, p]));
  const art = (kap: number) => (kap === 2 || kap === 3 ? zimmerArt[kap] : `${kap}-Bett-Zimmer`);
  const liste = d.zimmer.length
    ? d.zimmer.map((z) => ({ label: z.label, art: art(z.capacity), bereich: z.section ?? "", ids: d.personen.filter((p) => p.room_id === z.id).map((p) => p.participant_id) }))
    : probeplan(d, groesse).zimmer.map((z) => ({ label: z.label, art: zimmerArt[groesse], bereich: z.bereich, ids: z.belegung.map((b) => b.id) }));
  const hotelName = d.hotel && d.hotel.name !== "Hotel (Name folgt)" ? d.hotel.name : "";
  const zeilen: string[][] = [["Hotel", "Zimmer", "Zimmerart", "Bereich", "Zimmer ab", "Zimmer bis", "Nächte", "Name", "Anreise der Person"]];
  let zimmer = 0;
  for (const z of liste) {
    if (z.ids.length) zimmer++;
    const n = [...new Set(z.ids.flatMap((id) => personen.get(id)?.nights ?? []))].sort();
    const an = n[0] ? tagNach(n[0]) : "", ab = n.length ? tagNach(n.at(-1)!, 1) : "";
    for (const id of z.ids) {
      const eigene = [...(personen.get(id)?.nights ?? [])].sort();
      zeilen.push([hotelName, z.label, z.art, z.bereich, an, ab, String(n.length), personen.get(id)?.name ?? "", eigene[0] && eigene[0] !== n[0] ? tagNach(eigene[0]) : an]);
    }
  }
  const datei = `Zimmerliste ${d.modul?.title ?? ""}${d.hotels.length > 1 && hotelName ? ` ${hotelName}` : ""}${d.zimmer.length ? "" : ` ${groesse}er-Zimmer`}.csv`;
  return { zeilen, datei, hotelName, zimmer, gaeste: zeilen.length - 1 };
}

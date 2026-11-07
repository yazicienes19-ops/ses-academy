import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulReiter } from "@/components/team/ModulReiter";
import { Rueckfrage } from "@/components/team/Rueckfrage";
import { TeamKopf } from "@/components/team/TeamKopf";
import { kostenEntfernen, kostenSpeichern } from "@/lib/aktionen/logistik";
import { requireStaff } from "@/lib/auth";
import { euro } from "@/lib/betrag";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { naechte } from "@/lib/uebernachtung";

export const metadata: Metadata = { title: "Kosten | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  kosten: { text: "Posten gespeichert.", gut: true },
  "kosten-entfernt": { text: "Posten entfernt.", gut: true },
  eingabe: { text: "Bitte Bezeichnung und Betrag angeben, z. B. 1.250,50.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const kategorieName: Record<string, string> = { verpflegung: "Verpflegung", raum: "Raum", technik: "Technik", reise: "Reise", material: "Material", sonstiges: "Sonstiges" };
const rolleName: Record<string, string> = { vortrag: "Vortrag", podium: "Podium", laendergruppe: "Ländergruppe", workshop: "Workshop", grusswort: "Grußwort", moderation: "Moderation", diskussion: "Diskussion" };

/**
 * Kostenübersicht eines Moduls (ab Orga-Team): Hotel (Zimmer × Nächte × Preis je Zimmer und Nacht, aus dem Zimmerplan),
 * Honorare und Reisekosten der zugesagten Referent:innen, sonstige Posten. Alles in Euro, ohne Gewähr auf Vollständigkeit:
 * nur was hier und unter Logistik/Referenten eingetragen ist.
 */
export default async function Kosten({ params, searchParams }: PageProps<"/team/module/[id]/kosten">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const { hinweis } = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: hotels }, { data: planung }, { data: referenten }, { data: posten }] = await Promise.all([
    supabase.from("modules").select("id, title, module_days(day)").eq("id", id).maybeSingle(),
    supabase.from("hotels").select("id, name, price_per_night, quota_rooms, rooms(id, label)").eq("module_id", id).order("created_at"),
    supabase.rpc("get_room_planning", { p_module_id: id }),
    supabase.from("module_speakers").select("id, role, status, fee, travel_costs, speakers(name)").eq("module_id", id).in("status", ["zugesagt", "bestaetigt"]),
    supabase.from("module_costs").select("*").eq("module_id", id).order("created_at"),
  ]);
  if (!modul) notFound();
  const modulNaechte = naechte(modul.module_days.map((d) => d.day)).length;

  // Hotel: jedes belegte Zimmer ist von der ersten bis zur letzten Nacht seiner Gäste gebucht (wie die Zimmerliste)
  const hotelZeilen = (hotels ?? []).map((h) => {
    const zimmerNaechte = h.rooms.reduce((summe, z) => {
      const gaeste = (planung ?? []).filter((p) => p.room_id === z.id);
      return summe + new Set(gaeste.flatMap((p) => p.nights)).size;
    }, 0);
    const belegt = h.rooms.filter((z) => (planung ?? []).some((p) => p.room_id === z.id)).length;
    const preis = h.price_per_night === null ? null : Number(h.price_per_night);
    const schaetzung = !zimmerNaechte && h.quota_rooms && preis !== null ? h.quota_rooms * modulNaechte * preis : null;
    return { ...h, belegt, zimmerNaechte, preis, summe: preis !== null ? zimmerNaechte * preis : null, schaetzung };
  });
  const hotelSumme = hotelZeilen.reduce((s, h) => s + (h.summe ?? h.schaetzung ?? 0), 0);
  const honorare = (referenten ?? []).map((r) => ({ ...r, fee: r.fee === null ? null : Number(r.fee), travel: r.travel_costs === null ? null : Number(r.travel_costs) }));
  const honorarSumme = honorare.reduce((s, r) => s + (r.fee ?? 0), 0);
  const reiseSumme = honorare.reduce((s, r) => s + (r.travel ?? 0), 0);
  const sonstiges = (posten ?? []).map((p) => ({ ...p, amount: Number(p.amount) }));
  const sonstigeSumme = sonstiges.reduce((s, p) => s + p.amount, 0);
  const gesamt = hotelSumme + honorarSumme + reiseSumme + sonstigeSumme;

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" breit />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ModulReiter id={id} titel={modul.title} aktiv="kosten/" />
        <Hinweis code={hinweis} texte={hinweise} />

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[["Hotel", hotelSumme], ["Honorare", honorarSumme], ["Reisekosten", reiseSumme], ["Sonstiges", sonstigeSumme], ["Gesamt", gesamt]].map(([n, w]) => (
            <div key={n} className={`rounded-3xl p-5 ring-1 ring-line ${n === "Gesamt" ? "bg-gelb-hell" : "bg-weiss"}`}>
              <span className="font-display block text-2xl font-extrabold">{euro(w as number)}</span>
              <span className="mt-1 block text-sm text-ink-soft">{n}</span>
            </div>
          ))}
        </section>

        <section className="karte relative mt-6 overflow-x-auto">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display mr-auto text-xl font-bold">Hotel</h2>
            <Link href={`/team/module/${id}/hotel/`} className="text-sm font-semibold underline">Hotels und Preise unter Logistik</Link>
          </div>
          {hotelZeilen.length === 0 ? <p className="mt-3 text-ink-soft">Noch kein Hotel angelegt.</p> : (
            <table className="tabelle mt-4 min-w-[34rem]">
              <thead><tr><th>Hotel</th><th className="text-right">Zimmer belegt</th><th className="text-right">Zimmernächte</th><th className="text-right">Preis je Zimmer und Nacht</th><th className="text-right">Summe</th></tr></thead>
              <tbody>
                {hotelZeilen.map((h) => (
                  <tr key={h.id}>
                    <td className="font-semibold">{h.name}</td>
                    <td className="text-right">{h.belegt} von {h.rooms.length}</td>
                    <td className="text-right">{h.zimmerNaechte}</td>
                    <td className="text-right">{h.preis === null ? <span className="chip bg-gelb-hell">Preis fehlt</span> : euro(h.preis)}</td>
                    <td className="text-right font-semibold">
                      {h.summe !== null && h.zimmerNaechte > 0 ? euro(h.summe)
                        : h.schaetzung !== null ? <span title="Noch niemand eingeteilt: Kontingent × Nächte × Preis">{euro(h.schaetzung)} <span className="block text-xs font-normal text-ink-soft">geschätzt: {h.quota_rooms} Zimmer × {modulNaechte} Nächte</span></span>
                        : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-ink-soft">Zimmernächte aus dem Zimmerplan: Jedes belegte Zimmer zählt von der ersten bis zur letzten Nacht seiner Gäste. Ohne Einteilung wird mit dem Kontingent geschätzt.</p>
        </section>

        <section className="karte relative mt-6 overflow-x-auto">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display mr-auto text-xl font-bold">Honorare und Reisekosten</h2>
            <Link href={`/team/module/${id}/referenten/`} className="text-sm font-semibold underline">Beträge unter Referenten</Link>
          </div>
          {honorare.length === 0 ? <p className="mt-3 text-ink-soft">Noch keine zugesagten Referent:innen.</p> : (
            <table className="tabelle mt-4 min-w-[30rem]">
              <thead><tr><th>Referent:in</th><th>Rolle</th><th className="text-right">Honorar</th><th className="text-right">Reisekosten</th></tr></thead>
              <tbody>
                {honorare.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.speakers?.name ?? "?"}</td>
                    <td>{rolleName[r.role] ?? r.role}</td>
                    <td className="text-right">{r.fee === null ? <span className="text-ink-soft">–</span> : euro(r.fee)}</td>
                    <td className="text-right">{r.travel === null ? <span className="text-ink-soft">–</span> : euro(r.travel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="karte mt-6">
          <h2 className="font-display text-xl font-bold">Sonstige Posten</h2>
          {sonstiges.length > 0 && (
            <ul className="mt-3 divide-y divide-line">
              {sonstiges.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="mr-auto"><span className="font-semibold">{p.label}</span> <span className="chip bg-paper-deep">{kategorieName[p.category] ?? p.category}</span>{p.note && <span className="block text-sm text-ink-soft">{p.note}</span>}</span>
                  <span className="font-semibold">{euro(p.amount)}</span>
                  <form action={kostenEntfernen} className="flex flex-wrap">
                    <input type="hidden" name="module_id" value={id} /><input type="hidden" name="id" value={p.id} />
                    <Rueckfrage knopf="entfernen" knopfKlasse="text-xs font-semibold text-ink-soft underline" gefahr ja="Ja, entfernen" frage={`Posten „${p.label}“ entfernen?`} />
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={kostenSpeichern} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_2fr_auto] lg:items-end">
            <input type="hidden" name="module_id" value={id} />
            <div><label className="etikett" htmlFor="label">Bezeichnung</label><input id="label" name="label" required maxLength={200} className="feld" placeholder="z. B. Mittagessen Samstag" /></div>
            <div><label className="etikett" htmlFor="category">Art</label>
              <select id="category" name="category" className="feld">{Object.entries(kategorieName).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="etikett" htmlFor="amount">Betrag (€)</label><input id="amount" name="amount" required inputMode="decimal" className="feld" placeholder="1.250,50" /></div>
            <div><label className="etikett" htmlFor="note">Notiz</label><input id="note" name="note" maxLength={1000} className="feld" /></div>
            <button type="submit" className="knopf">Hinzufügen</button>
          </form>
        </section>
      </main>
    </>
  );
}

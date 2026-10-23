import type { Metadata } from "next";
import Link from "next/link";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Leer, Titel, Zahl } from "@/components/team/Ui";
import { Verlauf, type VerlaufPunkt } from "@/components/team/Verlauf";
import { requireStaff } from "@/lib/auth";
import { istGefaehrdet, ladeAuswertung, leseFilter, type PersonZeile } from "@/lib/auswertung";
import { zugehoerigkeit } from "@/lib/einlass";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Auswertung | SES Academy" };

const datum = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" });
const kurz = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", timeZone: "Europe/Berlin" });
const prozent = (v: number | null) => (v === null ? "–" : `${v.toLocaleString("de-DE")} %`);

function Personen({ titel, text, personen, leer }: { titel: string; text: string; personen: PersonZeile[]; leer: string }) {
  return (
    <section className="karte">
      <h2 className="font-display text-2xl font-bold">{titel}</h2>
      <p className="mb-4 text-sm text-ink-soft">{text}</p>
      {personen.length ? (
        <ul className="divide-y divide-line">
          {personen.map((p) => (
            <li key={p.participant_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <Link href={`/team/teilnehmende/${p.participant_id}/`} className="mr-auto font-semibold hover:underline">{p.vorname} {p.nachname}</Link>
              <span className="text-sm tabular-nums text-ink-soft">Quote {prozent(p.attendance_rate)}</span>
              <span className="chip bg-paper-deep tabular-nums">Serie {p.current_streak} · Rekord {p.longest_streak}</span>
              {p.trailing_misses > 0 && <span className="chip bg-gelb-hell tabular-nums">{p.trailing_misses} Tage verpasst</span>}
            </li>
          ))}
        </ul>
      ) : <p className="text-ink-soft">{leer}</p>}
    </section>
  );
}

export default async function Auswertung({ searchParams }: PageProps<"/team/auswertung">) {
  const staff = await requireStaff("alles");
  const sp = await searchParams;
  const filter = leseFilter(sp);
  const { module, tage, personen } = await ladeAuswertung(filter);
  const jetzt = jetztMs();

  const vergangen = tage.filter((t) => Date.parse(t.ends_at) < jetzt);
  const punkte: VerlaufPunkt[] = vergangen.map((t) => ({ id: t.day_id, modul: t.module_title, datum: kurz.format(new Date(t.starts_at)), erwartet: t.expected, da: t.checked_in }));
  const tageDa = module.reduce((s, m) => s + m.person_days_attended, 0);
  const tageMoeglich = module.reduce((s, m) => s + m.person_days_possible, 0);
  const quoteGesamt = tageMoeglich ? Math.round((tageDa / tageMoeglich) * 1000) / 10 : null;
  const noShows = module.reduce((s, m) => s + m.no_shows, 0);
  const walkIns = tage.reduce((s, t) => s + t.walk_ins, 0);

  const mitHistorie = personen.filter((p) => p.total_attended + p.total_no_shows > 0);
  const aktiv = [...mitHistorie]
    .filter((p) => p.current_streak > 0)
    .sort((a, b) => b.current_streak - a.current_streak || (b.attendance_rate ?? 0) - (a.attendance_rate ?? 0))
    .slice(0, 10);
  const gefaehrdet = mitHistorie.filter(istGefaehrdet)
    .sort((a, b) => b.trailing_misses - a.trailing_misses || (a.attendance_rate ?? 0) - (b.attendance_rate ?? 0));
  const exportParams = new URLSearchParams(Object.entries({ von: filter.von, bis: filter.bis, gruppe: filter.gruppe }).filter(([, v]) => v));

  return (
    <>
      <TeamKopf staff={staff} aktiv="auswertung" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Titel kicker="Teilnahme über alle Module" aktion={<a href={`/team/auswertung/export/?${exportParams}`} className="knopf-hell">CSV exportieren</a>}>Auswertung</Titel>

        <form className="mb-8 flex flex-wrap items-end gap-3" action="/team/auswertung/">
          <div><label htmlFor="von" className="etikett">Von</label><input id="von" name="von" type="date" defaultValue={filter.von} className="feld" /></div>
          <div><label htmlFor="bis" className="etikett">Bis</label><input id="bis" name="bis" type="date" defaultValue={filter.bis} className="feld" /></div>
          <div>
            <label htmlFor="gruppe" className="etikett">Personen</label>
            <select id="gruppe" name="gruppe" defaultValue={filter.gruppe} className="feld">
              <option value="alle">Alle</option>
              {Object.entries(zugehoerigkeit).map(([w, n]) => <option key={w} value={w}>{n}</option>)}
            </select>
          </div>
          <button className="knopf">Anzeigen</button>
          {(filter.von || filter.bis || filter.gruppe !== "academy_student") && <Link href="/team/auswertung/" className="link text-sm">zurücksetzen</Link>}
        </form>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Zahl wert={personen.length} text="Teilnehmende mit Anmeldung" />
          <Zahl wert={prozent(quoteGesamt)} text="Anwesenheit über alle vergangenen Modultage" ton={quoteGesamt !== null && quoteGesamt < 70 ? "warnung" : "neutral"} />
          <Zahl wert={noShows} text="No-Shows (angemeldet, an keinem Tag da)" ton={noShows ? "warnung" : "neutral"} />
          <Zahl wert={gefaehrdet.length} text="gefährdet (siehe unten)" ton={gefaehrdet.length ? "warnung" : "gut"} />
        </div>

        <section className="karte mb-8">
          <h2 className="font-display text-2xl font-bold">Anwesenheit pro Modultag</h2>
          <p className="mb-6 text-sm text-ink-soft">Anteil der bestätigten Anmeldungen, die eingecheckt wurden.{walkIns ? ` Darin enthalten: ${walkIns} Walk-ins.` : ""}</p>
          <Verlauf punkte={punkte} />
        </section>

        <section className="karte mb-8 overflow-x-auto">
          <h2 className="font-display mb-4 text-2xl font-bold">Veranstaltungen im Vergleich</h2>
          {module.length ? (
            <table className="tabelle">
              <thead><tr><th>Modul</th><th>Beginn</th><th className="text-right">Angemeldet</th><th className="text-right">Mind. 1 Tag da</th><th className="text-right">No-Shows</th><th className="text-right">Abgemeldet</th><th className="text-right">Anwesenheit</th></tr></thead>
              <tbody>
                {module.map((m) => (
                  <tr key={m.module_id}>
                    <td className="font-semibold"><Link href={`/team/module/${m.module_id}/`} className="hover:underline">{m.title}</Link></td>
                    <td>{datum.format(new Date(m.first_day))}{m.days_past < m.days_total ? (m.days_past ? " (läuft)" : " (kommt)") : ""}</td>
                    <td className="text-right tabular-nums">{m.registered}</td>
                    <td className="text-right tabular-nums">{m.days_past ? m.attended_people : "–"}</td>
                    <td className="text-right tabular-nums">{m.days_past === m.days_total ? m.no_shows : "–"}</td>
                    <td className="text-right tabular-nums">{m.cancelled_or_excused}</td>
                    <td className="text-right tabular-nums font-semibold">{prozent(m.attendance_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Leer>Keine Module im Zeitraum.</Leer>}
        </section>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <Personen titel="Besonders aktiv" text="Längste laufende Serie, dann höchste Quote (Top 10)." personen={aktiv} leer="Noch niemand mit laufender Serie." />
          <Personen titel="Gefährdet" text="Zuletzt mindestens 2 Modultage in Folge verpasst, oder Quote unter 50 % (ab 4 möglichen Tagen). Entschuldigte Tage zählen nicht." personen={gefaehrdet} leer="Niemand gefährdet." />
        </div>

        <section className="karte overflow-x-auto">
          <h2 className="font-display mb-4 text-2xl font-bold">Alle Teilnehmenden</h2>
          {personen.length ? (
            <table className="tabelle">
              <thead><tr><th>Name</th><th>Region</th><th className="text-right">Module</th><th className="text-right">Tage da</th><th className="text-right">Verpasst</th><th className="text-right">Entsch.</th><th className="text-right">Quote</th><th className="text-right">Serie</th><th className="text-right">Rekord</th><th>Zuletzt da</th></tr></thead>
              <tbody>
                {[...personen].sort((a, b) => a.vorname.localeCompare(b.vorname, "de")).map((p) => (
                  <tr key={p.participant_id}>
                    <td className="font-semibold"><Link href={`/team/teilnehmende/${p.participant_id}/`} className="hover:underline">{p.vorname} {p.nachname}</Link></td>
                    <td>{p.region ?? "–"}</td>
                    <td className="text-right tabular-nums">{p.total_registered}</td>
                    <td className="text-right tabular-nums">{p.total_attended}</td>
                    <td className="text-right tabular-nums">{p.total_no_shows}</td>
                    <td className="text-right tabular-nums">{p.total_cancelled_or_excused}</td>
                    <td className="text-right tabular-nums">{prozent(p.attendance_rate)}</td>
                    <td className="text-right tabular-nums">{p.current_streak}</td>
                    <td className="text-right tabular-nums">{p.longest_streak}</td>
                    <td>{p.last_attended_at ? `${datum.format(new Date(p.last_attended_at))} · ${p.last_attended_title}` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Leer>Keine Teilnehmenden im Zeitraum.</Leer>}
          <p className="mt-4 text-xs text-ink-soft">Gezählt wird pro Modultag. Serie: aufeinanderfolgende besuchte Tage von Modulen, die für Serien zählen; entschuldigte oder abgemeldete Tage unterbrechen sie nicht.</p>
        </section>
      </main>
    </>
  );
}

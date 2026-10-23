import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Rueckmeldung, Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { abgabeLoeschen, abgabeSpeichern, bewertungSpeichern, personEntfernen, personZuordnen } from "@/lib/aktionen/hausaufgaben";
import { auswerten, kriterien, skala, zusammenfassen, type KriteriumFeld } from "@/lib/bewertung";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Abgabe bewerten | SES Academy" };

type R = Partial<Record<KriteriumFeld, number | null>> & { id: string; reviewer_id: string | null; reviewer_name: string | null; strengths: string | null; improvements: string | null; tip: string | null; reviewed_on: string | null };

export default async function Abgabe({ params, searchParams }: PageProps<"/team/abgaben/[id]">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: a }, { data: verzeichnis }] = await Promise.all([
    supabase.from("submissions").select("*, assignments(id,number,title), submission_participants(participant_id), reviews(*)").eq("id", id).maybeSingle(),
    supabase.rpc("get_participant_directory"),
  ]);
  if (!a) notFound();
  const h = a.assignments as { id: string; number: number; title: string };
  const namen = new Map((verzeichnis ?? []).map((p) => [p.id, p]));
  const zugeordnet = (a.submission_participants as { participant_id: string }[]).map((x) => ({ id: x.participant_id, ...namen.get(x.participant_id) }));
  const reviews = a.reviews as R[];
  // Eigene Bewertung; ein importierter Bogen ohne Bewerter:in kann übernommen werden
  const meine = reviews.find((r) => r.reviewer_id === staff.userId) ?? (reviews.length === 1 && !reviews[0].reviewer_id ? reviews[0] : undefined);
  const andere = reviews.filter((r) => r !== meine);
  const gesamt = zusammenfassen(reviews);

  return (
    <>
      <TeamKopf staff={staff} aktiv="hausaufgaben" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Link href={`/team/hausaufgaben/${h.id}/`} className="text-sm font-semibold text-ink-soft hover:text-ink">← Hausaufgabe {h.number}: {h.title}</Link>
        <Titel kicker={`Hausaufgabe ${h.number}`} aktion={gesamt.durchschnitt != null && <span className="chip bg-gruen-hell px-4 py-2 text-base">Ø {gesamt.durchschnitt} · {gesamt.urteil}</span>}>{a.label}</Titel>
        <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="karte">
            <h2 className="font-display text-2xl font-bold">{meine?.reviewer_id === staff.userId ? "Deine Bewertung" : meine ? "Bewertung aus dem Bogen übernehmen" : "Bewerten"}</h2>
            <p className="mt-1 mb-5 text-sm text-ink-soft">Pro Kriterium 1–5 Punkte: {Object.entries(skala).reverse().map(([k, v]) => `${k} = ${v}`).join(" · ")}</p>
            <form action={bewertungSpeichern} className="space-y-1">
              <input type="hidden" name="submission_id" value={id} />
              {meine && !meine.reviewer_id && <input type="hidden" name="review_id" value={meine.id} />}
              {kriterien.map((k) => (
                <fieldset key={k.feld} className="grid items-center gap-2 border-b border-line py-3 sm:grid-cols-[1fr_auto]">
                  <legend className="sr-only">{k.name}</legend>
                  <div><p className="font-semibold">{k.name}</p><p className="text-xs text-ink-soft">{k.hinweis}</p></div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="cursor-pointer">
                        <input type="radio" name={k.feld} value={n} defaultChecked={meine?.[k.feld] === n} className="peer sr-only" />
                        <span title={skala[n]} className="flex h-10 w-10 items-center justify-center rounded-full bg-paper font-display font-bold ring-1 ring-line transition peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-signal hover:bg-paper-deep">{n}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="grid gap-3 pt-4">
                <div><label className="etikett" htmlFor="strengths">Das war besonders gut</label><textarea id="strengths" name="strengths" rows={2} defaultValue={meine?.strengths ?? ""} className="feld" /></div>
                <div><label className="etikett" htmlFor="improvements">Das könnte verbessert werden</label><textarea id="improvements" name="improvements" rows={2} defaultValue={meine?.improvements ?? ""} className="feld" /></div>
                <div><label className="etikett" htmlFor="tip">Konkreter Tipp für das nächste Video</label><textarea id="tip" name="tip" rows={2} defaultValue={meine?.tip ?? ""} className="feld" /></div>
                <p className="text-xs text-ink-soft">Punkte und Feedback sehen die zugeordneten Teilnehmenden in „Mein Bereich“.</p>
                <button className="knopf justify-self-start px-8 py-3">Bewertung speichern</button>
              </div>
            </form>
          </section>

          <div className="space-y-6">
            <section className="karte">
              <h2 className="font-display mb-3 text-xl font-bold">Personen</h2>
              {zugeordnet.length ? (
                <ul className="mb-4 space-y-2">
                  {zugeordnet.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{p.display_name ?? "?"}<span className="font-normal text-ink-soft">{p.region ? ` · ${p.region}` : ""}</span></span>
                      <form action={personEntfernen}>
                        <input type="hidden" name="submission_id" value={id} /><input type="hidden" name="participant_id" value={p.id} />
                        <button className="text-xs text-rot hover:underline">entfernen</button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : <p className="mb-4 rounded-xl bg-gelb-hell p-3 text-sm font-semibold">Noch niemand zugeordnet.</p>}
              <form action={personZuordnen} className="flex gap-2">
                <input type="hidden" name="submission_id" value={id} />
                <select name="participant_id" required defaultValue="" className="feld" aria-label="Person zuordnen">
                  <option value="" disabled>Person hinzufügen …</option>
                  {(verzeichnis ?? []).filter((p) => p.active && !zugeordnet.some((z) => z.id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
                <button className="knopf" aria-label="Zuordnen">+</button>
              </form>
            </section>

            {andere.length > 0 && (
              <section className="karte">
                <h2 className="font-display mb-3 text-xl font-bold">Weitere Bewertungen</h2>
                <ul className="space-y-3 text-sm">
                  {andere.map((r) => {
                    const e = auswerten(r);
                    return (
                      <li key={r.id} className="rounded-2xl bg-paper p-3">
                        <p className="font-semibold">{r.reviewer_name ?? "Import"} · Ø {e.durchschnitt ?? "–"} ({e.punkte ?? 0}/45)</p>
                        {r.strengths && <p className="mt-1"><strong>Gut:</strong> {r.strengths}</p>}
                        {r.improvements && <p><strong>Verbessern:</strong> {r.improvements}</p>}
                        {r.tip && <p><strong>Tipp:</strong> {r.tip}</p>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="karte">
              <h2 className="font-display mb-3 text-xl font-bold">Angaben</h2>
              <form action={abgabeSpeichern} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                <div><label className="etikett" htmlFor="label">Bezeichnung</label><input id="label" name="label" defaultValue={a.label} className="feld" /></div>
                <div><label className="etikett" htmlFor="link">Link zum Video / Text</label><input id="link" name="link" type="url" defaultValue={a.link ?? ""} className="feld" placeholder="z. B. Google-Drive-Link" /></div>
                <div><label className="etikett" htmlFor="file_name">Dateiname</label><input id="file_name" name="file_name" defaultValue={a.file_name ?? ""} className="feld" /></div>
                <div><label className="etikett" htmlFor="note">Hinweis</label><input id="note" name="note" defaultValue={a.note ?? ""} className="feld" /></div>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="knopf-hell">Speichern</button>
                  {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="link text-sm">Video öffnen ↗</a>}
                </div>
              </form>
              <form action={abgabeLoeschen} className="mt-4 border-t border-line pt-4">
                <input type="hidden" name="id" value={id} />
                <button className="text-sm text-rot hover:underline">Abgabe löschen</button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

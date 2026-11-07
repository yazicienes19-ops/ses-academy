import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulReiter } from "@/components/team/ModulReiter";
import { TeamKopf } from "@/components/team/TeamKopf";
import { SendeKnopf } from "@/components/team/SendeKnopf";
import { planUebernehmen, probeUebernehmen, vorschlagZuruecksetzen, wunschKorrigieren, zuteilungFestlegen } from "@/lib/aktionen/zimmerplan";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { nachtName } from "@/lib/uebernachtung";
import { wuenschtEinzelzimmer, type Grund, type Teil } from "@/lib/zimmerplan";
import { ladeZimmerplan, probeplan, vorschlag, zimmerArt } from "@/lib/zimmerplan-daten";

export const metadata: Metadata = { title: "Zimmerplan | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  wunsch: { text: "Zuordnung gespeichert.", gut: true },
  zurueckgesetzt: { text: "Vorschlag zurückgesetzt. Handzuteilungen sind geblieben.", gut: true },
  festgelegt: { text: "Bleibt jetzt fest in diesem Zimmer, auch bei neuen Vorschlägen.", gut: true },
  freigegeben: { text: "Freigegeben: Ein neuer Vorschlag darf die Person umsetzen.", gut: true },
  "kein-hotel": { text: "Zuerst unter Logistik das Hotel und die Zimmer anlegen.", gut: false },
  "schon-uebernommen": { text: "Die Einteilung ist schon übernommen. Unten steht der aktuelle Zimmerplan zum Anpassen.", gut: true },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  fehler: { text: "Das hat nicht geklappt. Ist ein Zimmer schon voll? Dann bleibt alles beim alten Stand.", gut: false },
};

const gruende: Record<Grund, { text: string; klasse: string }> = {
  fest: { text: "fest", klasse: "bg-ink text-paper" },
  wunsch_gegenseitig: { text: "Wunsch ✓", klasse: "bg-gruen-hell" },
  wunsch: { text: "Wunsch", klasse: "bg-mint/40" },
  gemischt: { text: "gemischt", klasse: "bg-paper-deep" },
  einzelzimmer: { text: "Einzelzimmer", klasse: "bg-paper-deep" },
};

const teilArt: Record<Teil["art"], { text: string; klasse: string }> = {
  sicher: { text: "", klasse: "bg-gruen-hell" },
  korrigiert: { text: "zugeordnet", klasse: "bg-gruen-hell" },
  aehnlich: { text: "ähnlich, bitte prüfen", klasse: "bg-gelb-hell" },
  mehrdeutig: { text: "mehrere möglich", klasse: "bg-rot-hell text-rot" },
  unbekannt: { text: "nicht gefunden", klasse: "bg-rot-hell text-rot" },
  ignoriert: { text: "ignoriert", klasse: "bg-paper-deep line-through" },
};

const naechteKurz = (n: string[]) => (n.length ? n.map(nachtName).join(", ") : "keine Nacht");
const datum = new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric", timeZone: "Europe/Berlin" });

/**
 * Zimmerplan eines Moduls: Zimmerwünsche verstehen (und korrigieren), Vorschlag mit Durchmischung berechnen und
 * übernehmen, aktueller Plan, Verlauf „wer war schon mit wem im Zimmer“. Hotel und Zimmer werden unter Logistik angelegt.
 */
export default async function ZimmerplanSeite({ params, searchParams }: PageProps<"/team/module/[id]/zimmerplan">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const sp = await searchParams;
  if (!istToken(id)) notFound();
  const d = await ladeZimmerplan(id, typeof sp.hotel === "string" ? sp.hotel : null);
  if (!d.modul) notFound();
  // Adressen innerhalb der Seite behalten das gewählte Hotel
  const mitHotel = (extra: Record<string, string> = {}, pfad = `/team/module/${id}/zimmerplan/`) => {
    const q = new URLSearchParams({ ...(d.hotel ? { hotel: d.hotel.id } : {}), ...extra });
    return `${pfad}${q.size ? `?${q}` : ""}`;
  };
  const hotelFeld = d.hotel ? <input type="hidden" name="hotel_id" value={d.hotel.id} /> : null;

  const plan = vorschlag(d);
  // Noch keine Zimmer: automatische Einteilung mit 2er- oder 3er-Zimmern zeigen (Hinweise dann auch von dort)
  const ohneZimmerAngelegt = d.zimmer.length === 0;
  const groesse = sp.groesse === "3" ? 3 : 2;
  const varianten = ohneZimmerAngelegt ? { 2: probeplan(d, 2), 3: probeplan(d, 3) } : null;
  const probe = varianten?.[groesse] ?? null;
  const zeigeVorschlag = sp.vorschlag === "1";
  const korrigieren = typeof sp.korrigieren === "string" ? sp.korrigieren : "";
  const plancode = typeof sp.hinweis === "string" && sp.hinweis.startsWith("plan-") ? Number(sp.hinweis.slice(5)) : null;

  const byId = new Map(d.personen.map((p) => [p.participant_id, p]));
  const name = (pid: string) => byId.get(pid)?.name ?? "?";
  const uebernachten = d.personen.filter((p) => p.nights.length > 0);
  const betten = d.zimmer.reduce((s, z) => s + z.capacity, 0);
  const eingeteilt = d.imHotel;
  const ohneZimmer = uebernachten.filter((p) => !p.room_id);
  const mehrereHotels = d.hotels.length > 1;
  const hinweiseJePerson = new Map<string, string[]>();
  for (const h of probe?.hinweise ?? plan.hinweise) hinweiseJePerson.set(h.personId, [...(hinweiseJePerson.get(h.personId) ?? []), h.text]);
  const mitWunsch = d.personen.filter((p) => p.room_wish.trim())
    .map((p) => ({ p, teile: d.teile.get(p.participant_id) ?? [], probleme: hinweiseJePerson.get(p.participant_id) ?? [] }))
    .map((x) => ({ ...x, offen: x.teile.some((t) => t.art === "unbekannt" || t.art === "mehrdeutig" || t.art === "aehnlich") || x.probleme.length > 0 }))
    .sort((a, b) => Number(b.offen) - Number(a.offen) || a.p.name.localeCompare(b.p.name, "de"));
  const wuenscheVon = (pid: string) => new Set((d.teile.get(pid) ?? []).flatMap((t) => (t.ziel ? [t.ziel.id] : [])));
  const gegenseitig = (a: string, b: string) => wuenscheVon(a).has(b) && wuenscheVon(b).has(a);
  const alleSortiert = [...d.personen].sort((a, b) => a.name.localeCompare(b.name, "de"));

  // aktueller Plan je Zimmer, mit Paaren, die schon einmal zusammen waren
  const belegung = d.zimmer.map((z) => ({ ...z, leute: d.personen.filter((p) => p.room_id === z.id) }));
  const schonZusammen = (a: string, b: string) => d.paare.has(`${a}|${b}`);
  const verlaufJePerson = new Map<string, typeof d.verlauf>();
  for (const v of d.verlauf) verlaufJePerson.set(v.participant_id, [...(verlaufJePerson.get(v.participant_id) ?? []), v]);

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" breit />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <ModulReiter id={id} titel={d.modul.title} aktiv="zimmerplan/" />
        <Hinweis code={sp.hinweis} texte={hinweise} />
        {plancode !== null && <p role="status" className="mt-4 rounded-2xl bg-emerald-100 p-4 text-emerald-950">Vorschlag übernommen: {plancode} Personen eingeteilt. Handzuteilungen sind geblieben.</p>}

        {mehrereHotels && (
          <nav aria-label="Hotel" className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Hotel:</span>
            {d.hotels.map((h) => (
              <Link key={h.id} href={`/team/module/${id}/zimmerplan/?hotel=${h.id}`} aria-current={h.id === d.hotel?.id ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${h.id === d.hotel?.id ? "bg-ink text-paper ring-ink" : "bg-weiss ring-line hover:ring-ink"}`}>
                {h.name} <span className="opacity-70">{d.personen.filter((p) => p.hotel_id === h.id).length}</span>
              </Link>
            ))}
            {d.inAnderenHotels.length > 0 && <span className="text-sm text-ink-soft">Geplant wird hier nur für dieses Hotel; {d.inAnderenHotels.length} sind in einem anderen Hotel eingeteilt.</span>}
          </nav>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kachel wert={uebernachten.length} text={`übernachten (${uebernachten.filter((p) => p.gender === "w").length} w · ${uebernachten.filter((p) => p.gender === "m").length} m)`} />
          <Kachel wert={betten} text={`Betten in ${d.zimmer.length} Zimmern`} ton={betten < uebernachten.length ? "warnung" : "neutral"} />
          <Kachel wert={eingeteilt.length} text={mehrereHotels ? `in diesem Hotel eingeteilt (${d.inAnderenHotels.length} in anderen)` : "eingeteilt"} ton={eingeteilt.length && !ohneZimmer.length ? "gut" : "neutral"} />
          <Kachel wert={ohneZimmer.length} text="übernachten, noch ohne Zimmer" ton={ohneZimmer.length ? "warnung" : "neutral"} />
        </section>

        {(!d.hotel || d.zimmer.length === 0) && uebernachten.length === 0 ? (
          <p className="karte mt-6">Noch hat niemand eine Übernachtung angegeben. Die automatische Einteilung erscheint, sobald Angaben da sind (Übernachtungs-Abfrage unter Logistik oder Import).</p>
        ) : !d.hotel || d.zimmer.length === 0 ? (
          <section id="einteilung" className="karte mt-6 scroll-mt-4">
            <h2 className="font-display text-2xl font-bold">Automatische Einteilung</h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-soft">
              {mehrereHotels ? `In „${d.hotel?.name}“ sind noch keine Zimmer angelegt. So verteilen sich die ${d.planPersonen.filter((p) => p.nights.length > 0).length} Übernachtenden, die noch in keinem anderen Hotel sind:` : `Noch sind keine Zimmer angelegt. So verteilen sich die ${uebernachten.length} Übernachtenden:`} Frauen und Männer getrennt,
              gegenseitige Wünsche zusammen, sonst gemischt nach Region und ohne frühere Zimmerpartner. Die Liste könnt ihr so ans Hotel
              schicken, die Zimmernummern vergibt das Hotel.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {([2, 3] as const).map((g) => {
                const v = varianten![g];
                const zahl = (b: string) => v.zimmer.filter((z) => z.bereich === b).length;
                const aktiv = g === groesse;
                return (
                  <Link key={g} href={`${mitHotel({ groesse: String(g) })}#einteilung`} aria-current={aktiv ? "true" : undefined}
                    className={`rounded-3xl p-5 ring-1 transition ${aktiv ? "bg-ink text-paper ring-ink" : "bg-white ring-line hover:ring-ink"}`}>
                    <span className="block font-semibold">mit {zimmerArt[g]}n ({g} Betten)</span>
                    <span className="font-display mt-1 block text-3xl font-extrabold">{v.zimmer.length} Zimmer</span>
                    <span className={`mt-1 block text-sm ${aktiv ? "text-paper/75" : "text-ink-soft"}`}>
                      {zahl("Frauen")} für Frauen · {zahl("Männer")} für Männer{zahl("ohne Angabe") ? ` · ${zahl("ohne Angabe")} ohne Angabe zum Geschlecht` : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a href={mitHotel({ groesse: String(groesse) }, `/team/module/${id}/zimmerliste/`)} target="_blank" className="knopf">Zimmerliste als PDF (fürs Hotel)</a>
              <a href={mitHotel({ groesse: String(groesse) }, `/team/module/${id}/zimmerplan/liste/`)} className="knopf-hell">Excel-Liste herunterladen</a>
              <form action={probeUebernehmen}>
                <input type="hidden" name="module_id" value={id} /><input type="hidden" name="groesse" value={groesse} />{hotelFeld}
                <SendeKnopf className="knopf-hell" laeuft="Wird übernommen …">So übernehmen und von Hand anpassen</SendeKnopf>
              </form>
            </div>
            <p className="mt-2 max-w-3xl text-xs text-ink-soft">
              „Übernehmen“ legt die {probe!.zimmer.length} Zimmer unter Logistik an (dort den Hotelnamen eintragen) und teilt alle ein. Danach lässt sich
              jede Person einzeln umsetzen, und es gibt die Zimmerliste auch zum Drucken. Teilnehmende sehen ihr Zimmer erst nach der Freigabe unter Logistik.
            </p>
            {probe!.hinweise.length > 0 && (
              <details className="mt-4 rounded-2xl bg-gelb-hell p-4" open={probe!.hinweise.length <= 8}>
                <summary className="cursor-pointer font-semibold">{probe!.hinweise.length} Hinweise</summary>
                <ul className="mt-2 space-y-1 text-sm">{probe!.hinweise.map((h, i) => <li key={i}><span className="font-semibold">{name(h.personId)}</span> {h.text}</li>)}</ul>
              </details>
            )}
            {(["Frauen", "Männer", "ohne Angabe"] as const).map((b) => {
              const teil = probe!.zimmer.filter((z) => z.bereich === b);
              return teil.length > 0 && (
                <div key={b} className="mt-6">
                  <h3 className="font-display text-xl font-bold">{b} · {teil.length} Zimmer, {teil.reduce((n, z) => n + z.belegung.length, 0)} Personen</h3>
                  <ZimmerRaster zimmer={teil.map((z) => ({ ...z, leute: z.belegung.map((x) => ({ pid: x.id, grund: x.grund })) }))} personen={byId} schonZusammen={schonZusammen} zusammenfassung={false} />
                </div>
              );
            })}
          </section>
        ) : (
          <>
            {/* Vorschlag */}
            <section className="karte mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                  <h2 className="font-display text-2xl font-bold">Vorschlag</h2>
                  <p className="text-sm text-ink-soft">Gegenseitige Wünsche zuerst, Zimmer nur Frauen oder nur Männer, sonst gemischt nach Region und ohne frühere Zimmerpartner. Von Hand Zugeteiltes bleibt.</p>
                  <p className="mt-1 text-sm">
                    {d.hotel.rooms_visible
                      ? <><span className="font-semibold">Achtung:</span> Die Zimmer sind in „Mein Bereich“ freigegeben, Übernommenes sehen die Teilnehmenden sofort.</>
                      : <>Teilnehmende sehen ihr Zimmer erst, wenn es unter <Link href={mitHotel({}, `/team/module/${id}/hotel/`)} className="link font-semibold">Logistik</Link> freigegeben ist.</>}
                  </p>
                </div>
                {zeigeVorschlag ? (
                  <>
                    <Link href={mitHotel()} className="knopf-hell">Verwerfen</Link>
                    <form action={planUebernehmen}><input type="hidden" name="module_id" value={id} />{hotelFeld}<button className="knopf">Vorschlag übernehmen</button></form>
                  </>
                ) : <Link href={mitHotel({ vorschlag: "1" })} className="knopf">Vorschlag berechnen</Link>}
              </div>
              {zeigeVorschlag && (
                <>
                  {plan.hinweise.length > 0 && (
                    <details className="mt-4 rounded-2xl bg-gelb-hell p-4" open={plan.hinweise.length <= 8}>
                      <summary className="cursor-pointer font-semibold">{plan.hinweise.length} Hinweise</summary>
                      <ul className="mt-2 space-y-1 text-sm">{plan.hinweise.map((h, i) => <li key={i}><span className="font-semibold">{name(h.personId)}</span> {h.text}</li>)}</ul>
                    </details>
                  )}
                  <ZimmerRaster zimmer={plan.zimmer.map((z) => ({ ...z, leute: z.belegung.map((b) => ({ pid: b.id, grund: b.grund })) }))} personen={byId} schonZusammen={schonZusammen} />
                  {plan.ohneZimmer.length > 0 && <p className="mt-4 rounded-2xl bg-rot-hell p-3 text-sm text-rot">Ohne Bett: {plan.ohneZimmer.map(name).join(", ")}</p>}
                </>
              )}
            </section>

            {/* aktueller Plan */}
            <section className="karte mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display mr-auto text-2xl font-bold">Aktueller Zimmerplan</h2>
                <Link href={mitHotel({}, `/team/module/${id}/hotel/`)} className="knopf-hell">Einzeln umsetzen (Logistik)</Link>
                <Link href={mitHotel({}, `/team/module/${id}/zimmerliste/`)} target="_blank" className="knopf-hell">Zimmerliste als PDF (fürs Hotel)</Link>
                <a href={mitHotel({}, `/team/module/${id}/zimmerplan/liste/`)} className="knopf-hell">Zimmerliste als Excel</a>
                {eingeteilt.some((p) => p.source === "auto") && (
                  <form action={vorschlagZuruecksetzen}>
                    <input type="hidden" name="module_id" value={id} /><input type="hidden" name="hotel_id" value={d.hotel.id} />
                    <button className="text-sm font-semibold text-ink-soft underline">Vorschlag zurücksetzen</button>
                  </form>
                )}
              </div>
              {eingeteilt.length === 0 ? <p className="mt-3 text-ink-soft">Noch niemand eingeteilt.</p> : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {belegung.filter((z) => z.leute.length > 0).map((z) => (
                    <li key={z.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                      <p className="flex items-center gap-2 font-semibold">{z.label}{z.section && <span className="font-normal text-ink-soft">· {z.section}</span>}<span className="chip ml-auto bg-paper-deep">{z.leute.length}/{z.capacity}</span></p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {z.leute.map((p) => (
                          <li key={p.participant_id} id={`z-${p.participant_id}`} className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold">{p.name}</span>
                            <span className={`chip ${p.source === "manual" ? "bg-ink text-paper" : "bg-paper-deep"}`}>{p.source === "manual" ? "fest" : "Vorschlag"}</span>
                            <form action={zuteilungFestlegen} className="ml-auto">
                              <input type="hidden" name="module_id" value={id} /><input type="hidden" name="hotel_id" value={d.hotel!.id} />
                              <input type="hidden" name="participant_id" value={p.participant_id} /><input type="hidden" name="fest" value={p.source === "manual" ? "0" : "1"} />
                              <button className="text-xs font-semibold text-ink-soft underline">{p.source === "manual" ? "freigeben" : "festhalten"}</button>
                            </form>
                          </li>
                        ))}
                      </ul>
                      {z.leute.flatMap((a, i) => z.leute.slice(i + 1).filter((b) => schonZusammen(a.participant_id, b.participant_id)).map((b) => (
                        <p key={a.participant_id + b.participant_id} className="mt-2 rounded-xl bg-gelb-hell px-2 py-1 text-xs">{a.name} und {b.name} waren schon zusammen im Zimmer{gegenseitig(a.participant_id, b.participant_id) ? " (gewünscht)" : ""}</p>
                      )))}
                    </li>
                  ))}
                </ul>
              )}
              {ohneZimmer.length > 0 && eingeteilt.length > 0 && <p className="mt-4 text-sm text-ink-soft"><span className="font-semibold text-ink">Noch ohne Zimmer:</span> {ohneZimmer.map((p) => p.name).join(", ")}</p>}
            </section>
          </>
        )}

        {/* Zimmerwünsche */}
        <section className="karte mt-6">
          <h2 className="font-display text-2xl font-bold">Zimmerwünsche</h2>
          <p className="text-sm text-ink-soft">
            {mitWunsch.length} Personen haben einen Wunsch angegeben, {mitWunsch.filter((x) => x.offen).length} davon brauchen einen Blick (oben).
            Nicht erkannte Namen hier zuordnen; die Zuordnung gilt für den Vorschlag.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {mitWunsch.map(({ p, teile, probleme }) => (
              <li key={p.participant_id} id={`w-${p.participant_id}`} className="scroll-mt-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{p.name}</span>
                  {p.gender && <span className={`chip ${p.gender === "w" ? "bg-rose-100" : "bg-sky-100"}`}>{p.gender}</span>}
                  <span className="text-sm text-ink-soft">{naechteKurz(p.nights)} · „{p.room_wish}“</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                  {teile.length === 0 && <span className="text-ink-soft">{wuenschtEinzelzimmer(p.room_wish) ? "Einzelzimmer-Wunsch" : "kein bestimmter Wunsch"}</span>}
                  {teile.map((t) => {
                    const art = teilArt[t.art];
                    const gegen = t.ziel && gegenseitig(p.participant_id, t.ziel.id);
                    const auswahl = t.art !== "sicher" || korrigieren === p.participant_id;
                    return (
                      <span key={t.schluessel} className="inline-flex flex-wrap items-center gap-1.5">
                        <span className={`chip ${art.klasse}`}>
                          {t.ziel ? `${gegen ? "⇄" : "→"} ${t.ziel.name}` : t.text}{art.text && ` · ${art.text}`}{t.ziel && t.text !== t.ziel.name && t.art !== "sicher" ? ` (${t.text})` : ""}
                        </span>
                        {auswahl ? (
                          <form action={wunschKorrigieren} className="inline-flex gap-1">
                            <input type="hidden" name="module_id" value={id} /><input type="hidden" name="participant_id" value={p.participant_id} /><input type="hidden" name="token" value={t.schluessel} />{hotelFeld}
                            <label className="sr-only" htmlFor={`k-${p.participant_id}-${t.schluessel}`}>Wer ist mit „{t.text}“ gemeint?</label>
                            <select id={`k-${p.participant_id}-${t.schluessel}`} name="wished_id" defaultValue={t.art === "korrigiert" ? t.ziel?.id : t.art === "ignoriert" ? "-" : t.kandidaten?.[0]?.id ?? t.ziel?.id ?? "auto"} className="feld !w-56 !py-1 text-sm">
                              <option value="auto">automatisch erkennen</option>
                              <option value="-">ignorieren</option>
                              {(t.kandidaten ?? []).map((k) => <option key={`k${k.id}`} value={k.id}>{k.name} (vorgeschlagen)</option>)}
                              {alleSortiert.filter((x) => x.participant_id !== p.participant_id).map((x) => <option key={x.participant_id} value={x.participant_id}>{x.name}</option>)}
                            </select>
                            <button className="knopf-hell !px-3 !py-1">OK</button>
                          </form>
                        ) : null}
                      </span>
                    );
                  })}
                  {teile.some((t) => t.art === "sicher") && korrigieren !== p.participant_id && (
                    <Link href={`${mitHotel({ korrigieren: p.participant_id })}#w-${p.participant_id}`} className="text-xs font-semibold text-ink-soft underline">ändern</Link>
                  )}
                </div>
                {probleme.length > 0 && <ul className="mt-1.5 space-y-0.5 text-sm text-amber-900">{probleme.map((t, i) => <li key={i}>⚠ {t}</li>)}</ul>}
              </li>
            ))}
          </ul>
          {mitWunsch.length === 0 && <p className="mt-3 text-ink-soft">Noch keine Zimmerwünsche.</p>}
        </section>

        {/* Verlauf */}
        <section className="karte mt-6">
          <h2 className="font-display text-2xl font-bold">Wer war schon mit wem im Zimmer</h2>
          {d.verlauf.length === 0 ? (
            <p className="mt-2 text-ink-soft">Aus früheren Modulen ist noch kein Zimmerplan gespeichert. Der Verlauf beginnt mit dem ersten übernommenen Plan und wird beim nächsten Modul berücksichtigt.</p>
          ) : (
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {[...verlaufJePerson.entries()].sort((a, b) => name(a[0]).localeCompare(name(b[0]), "de")).map(([pid, vs]) => (
                <li key={pid}><span className="font-semibold">{name(pid)}</span>: {vs.map((v) => `${v.mate_name} (${v.module_title}${v.module_start ? `, ${datum.format(new Date(v.module_start))}` : ""})`).join(", ")}</li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Kachel({ wert, text, ton = "neutral" }: { wert: number; text: string; ton?: "neutral" | "warnung" | "gut" }) {
  const farbe = ton === "warnung" ? "bg-gelb-hell" : ton === "gut" ? "bg-gruen-hell" : "bg-weiss";
  return <div className={`rounded-3xl p-5 ring-1 ring-line ${farbe}`}><span className="font-display block text-3xl font-extrabold">{wert}</span><span className="mt-1 block text-sm text-ink-soft">{text}</span></div>;
}

type Zeile = { name: string; gender: string | null; region: string | null; nights: string[] };

function ZimmerRaster({ zimmer, personen, schonZusammen, zusammenfassung = true }: {
  zimmer: { id: string; label: string; capacity: number; leute: { pid: string; grund: Grund }[] }[];
  personen: Map<string, Zeile>;
  schonZusammen: (a: string, b: string) => boolean;
  zusammenfassung?: boolean;
}) {
  const belegt = zimmer.filter((z) => z.leute.length > 0);
  return (
    <>
      {zusammenfassung && <p className="mt-4 text-sm text-ink-soft">{belegt.length} von {zimmer.length} Zimmern belegt, {zimmer.length - belegt.length} bleiben frei.</p>}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {belegt.map((z) => {
          // Gebucht ab der frühesten Nacht der Gäste; wer später dazukommt, wird markiert
          const gebucht = [...new Set(z.leute.flatMap((l) => personen.get(l.pid)?.nights ?? []))].sort();
          return (
            <li key={z.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <p className="flex items-center gap-2 font-semibold">{z.label}<span className="text-xs font-normal text-ink-soft">{gebucht.length ? `${naechteKurz([gebucht[0]]).split("/")[0]}–${naechteKurz([gebucht.at(-1)!]).split("/")[1]}` : ""}</span><span className="chip ml-auto bg-paper-deep">{z.leute.length}/{z.capacity}</span></p>
              <ul className="mt-2 space-y-1 text-sm">
                {z.leute.map((l) => {
                  const p = personen.get(l.pid);
                  return (
                    <li key={l.pid} className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{p?.name}</span>
                      <span className={`chip ${gruende[l.grund].klasse}`}>{gruende[l.grund].text}</span>
                      {p?.region && <span className="text-xs text-ink-soft">{p.region}</span>}
                      {p && gebucht[0] && [...p.nights].sort()[0] !== gebucht[0] && <span className="chip bg-gelb-hell text-xs">kommt {naechteKurz([[...p.nights].sort()[0]]).split("/")[0]} dazu</span>}
                    </li>
                  );
                })}
              </ul>
              {z.leute.flatMap((a, i) => z.leute.slice(i + 1).filter((b) => schonZusammen(a.pid, b.pid)).map((b) => (
                <p key={a.pid + b.pid} className="mt-2 rounded-xl bg-gelb-hell px-2 py-1 text-xs">{personen.get(a.pid)?.name} und {personen.get(b.pid)?.name} waren schon zusammen</p>
              )))}
            </li>
          );
        })}
      </ul>
    </>
  );
}

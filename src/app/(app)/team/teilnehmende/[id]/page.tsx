import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, QrCode, Send } from "lucide-react";
import { Hinweis as Meldung } from "@/components/team/Hinweis";
import { KontaktFormular, KontaktKnoepfe, KontaktVerlauf, NotizFormular, ZusageKnoepfe, kontaktHinweise, type Kontakt } from "@/components/team/Kontakt";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Rueckmeldung, laender } from "@/components/team/Ui";
import { MailHinweis } from "@/components/team/MailHinweis";
import { darf, requireStaff, type Staff } from "@/lib/auth";
import { anwesenheitSetzen, beitragEntfernen, beitragHinzufuegen, personSpeichern, ticketSenden } from "@/lib/aktionen/teilnehmende";
import { auswerten, zusammenfassen } from "@/lib/bewertung";
import { istToken, kurzcodeAnzeige } from "@/lib/codes";
import { mailBereit } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";
import { telLink } from "@/lib/telefon";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Teilnehmer:in | SES Academy" };

const typen = { kommentar: "Kommentar", video: "Video", grafik: "Grafik", podcast: "Podcast", rede: "Rede", artikel: "Artikel" } as const;
const tagFormat = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Berlin" });
const datum = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(d));
const kurzDatum = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(d));

type Reg = {
  id: string; status: string; rsvp: string | null;
  modules: { id: string; title: string; cancelled_at: string | null; module_days: { id: string; starts_at: string; ends_at: string }[] };
  attendances: { id: string; module_day_id: string; method: string }[];
};
type Abg = { submissions: { id: string; label: string; assignments: { number: number; title: string } | null; reviews: Record<string, number | null>[] } | null };

/** Status eines Moduls aus Sicht der Person. */
function status(r: Reg, tage: Reg["modules"]["module_days"], jetzt: number) {
  const vorbei = tage.filter((t) => Date.parse(t.ends_at) < jetzt).length;
  const da = r.attendances.length;
  if (r.modules.cancelled_at) return { text: "Modul abgesagt", klasse: "bg-paper-deep" };
  if (r.status === "excused") return { text: "Entschuldigt", klasse: "bg-paper-deep" };
  if (r.status === "cancelled") return { text: "Storniert", klasse: "bg-paper-deep" };
  if (r.status === "waitlist") return { text: "Warteliste", klasse: "bg-gelb-hell" };
  if (r.status !== "confirmed") return { text: "Nicht bestätigt", klasse: "bg-gelb-hell" };
  if (vorbei === 0) return { text: "Angemeldet", klasse: "bg-weiss ring-1 ring-line" };
  if (da === 0) return { text: vorbei < tage.length ? "Läuft · noch nicht da" : "Nicht gekommen", klasse: "bg-rot-hell text-rot" };
  return { text: `Teilgenommen · ${da}/${tage.length} ${tage.length === 1 ? "Tag" : "Tage"}`, klasse: "bg-gruen-hell" };
}

function Hinweis({ ton, children }: { ton: "gut" | "warnung" | "neutral"; children: React.ReactNode }) {
  const farbe = ton === "gut" ? "bg-gruen-hell" : ton === "warnung" ? "bg-gelb-hell" : "bg-paper-deep";
  return <span className={`chip ${farbe} py-1`}>{children}</span>;
}

export default async function Person({ params, searchParams }: PageProps<"/team/teilnehmende/[id]">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const sp = await searchParams;
  if (!istToken(id)) notFound();
  const modulAusLink = typeof sp.modul === "string" && istToken(sp.modul) ? sp.modul : null;
  if (!darf.alles(staff.role)) return <OrgaKarte staff={staff} id={id} modulId={modulAusLink} hinweis={sp.hinweis} />;
  const supabase = await createClient();
  const [{ data: p }, { data: regionen }, { data: mentoren }, { data: regs }, { data: abg }, { data: beitraege }, { data: kennzahlen }, { data: kontakte }, { data: zimmer }] = await Promise.all([
    supabase.from("participants").select("*").eq("id", id).maybeSingle(),
    supabase.from("regions").select("id,name").order("name"),
    supabase.from("mentors").select("id,name").order("name"),
    supabase.from("registrations").select("id,status,rsvp,modules(id,title,cancelled_at,module_days(id,starts_at,ends_at)),attendances(id,module_day_id,method)").eq("participant_id", id),
    supabase.from("submission_participants").select("submissions(id,label,assignments(number,title),reviews(*))").eq("participant_id", id),
    supabase.from("contributions").select("*").eq("participant_id", id).order("published_on", { ascending: false }),
    supabase.rpc("get_participant_analytics"),
    supabase.rpc("get_contacts", { p_participant_id: id }),
    supabase.rpc("get_person_rooms", { p_participant_id: id }),
  ]);
  if (!p) notFound();
  const jetzt = jetztMs();
  const k = (kennzahlen ?? []).find((a) => a.participant_id === id);
  const anmeldungen = ((regs ?? []) as unknown as Reg[])
    .map((r) => ({ ...r, tage: [...r.modules.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .sort((a, b) => (a.tage[0]?.starts_at ?? "9").localeCompare(b.tage[0]?.starts_at ?? "9"));
  const abgaben = ((abg ?? []) as unknown as Abg[]).map((a) => a.submissions!).filter(Boolean)
    .sort((a, b) => (a.assignments?.number ?? 0) - (b.assignments?.number ?? 0));
  const name = `${p.first_name} ${p.last_name}`.trim();
  const region = regionen?.find((r) => r.id === p.region_id)?.name;
  const mentor = mentoren?.find((m) => m.id === p.mentor_id)?.name;
  const mailAn = mailBereit();
  const besucht = k?.total_attended ?? 0;
  const faellig = besucht + (k?.total_no_shows ?? 0);
  const noten = abgaben.map((a) => zusammenfassen(a.reviews).durchschnitt).filter((d): d is number => d != null);
  const notenSchnitt = noten.length ? Math.round((noten.reduce((x, y) => x + y, 0) / noten.length) * 10) / 10 : null;

  return (
    <>
      <TeamKopf staff={staff} aktiv="teilnehmende" breit />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link href={`/team/teilnehmende/${modulAusLink ? `?modul=${modulAusLink}` : ""}`} className="text-sm font-semibold text-ink-soft hover:text-ink">← Alle Teilnehmenden</Link>

        {/* Kopf: wer ist das, wie erreiche ich die Person, was ist offen */}
        <header className="karte mt-3 mb-6">
          <div className="flex flex-wrap items-start gap-5">
            {p.photo_path
              ? <img src={`/portal/foto/${p.id}/`} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-line" />
              : <span aria-hidden className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-forest font-display text-2xl font-bold text-paper">
                  {(p.first_name[0] ?? "") + (p.last_name[0] ?? "")}
                </span>}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl leading-tight font-extrabold sm:text-4xl">{name}</h1>
              <p className="mt-1 text-ink-soft">
                {[region, p.country && p.country !== "other" ? laender[p.country] : null, p.branch, p.gender === "w" ? "weiblich" : p.gender === "m" ? "männlich" : null].filter(Boolean).join(" · ") || "Keine Region eingetragen"}
                {mentor && <> · verantwortlich: <span className="font-semibold text-ink">{mentor}</span></>}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                {p.email
                  ? <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 font-semibold hover:underline"><Mail aria-hidden className="h-4 w-4 text-ink-soft" />{p.email}</a>
                  : <span className="inline-flex items-center gap-1.5 text-rot"><Mail aria-hidden className="h-4 w-4" />keine E-Mail-Adresse</span>}
                {p.phone && <a href={telLink(p.phone)} className="inline-flex items-center gap-1.5 font-semibold hover:underline"><Phone aria-hidden className="h-4 w-4 text-ink-soft" />{p.phone}</a>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.active ? <Hinweis ton="gut">Aktiv</Hinweis> : <Hinweis ton="neutral">Ausgeschieden</Hinweis>}
                {p.user_id ? <Hinweis ton="gut">Im Portal angemeldet</Hinweis> : <Hinweis ton="neutral">Noch nie im Portal</Hinweis>}
                {!p.privacy_consent_at && <Hinweis ton="warnung">Datenschutz-Einwilligung fehlt</Hinweis>}
                {p.short_code && <Hinweis ton="neutral">Kurzcode {kurzcodeAnzeige(p.short_code)}</Hinweis>}
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-col">
              <a href={`/ticket/${p.checkin_token}/`} target="_blank" rel="noopener noreferrer" className="knopf-hell"><QrCode aria-hidden className="h-4 w-4" />QR-Code ansehen</a>
              <form action={ticketSenden}>
                <input type="hidden" name="id" value={p.id} />
                <button className="knopf w-full" disabled={!p.email || !mailAn}><Send aria-hidden className="h-4 w-4" />QR-Code per Mail</button>
              </form>
              <MailHinweis knapp className="max-w-56" />
            </div>
          </div>

          {/* Kurzbilanz statt vieler Kästen */}
          <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Anwesenheit</dt>
              <dd className="mt-1">
                <span className="font-display text-2xl font-extrabold">{faellig ? `${besucht} von ${faellig}` : "–"}</span>
                <span className="text-sm text-ink-soft"> {faellig ? "Tagen da" : "noch keine Modultage vorbei"}</span>
                {faellig > 0 && (
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-paper-deep">
                    <span className={`block h-full rounded-full ${besucht / faellig >= 0.75 ? "bg-forest" : "bg-signal"}`} style={{ width: `${Math.round((besucht / faellig) * 100)}%` }} />
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Zuletzt da</dt>
              <dd className="mt-1">
                {k?.last_attended_at
                  ? <><span className="font-display text-2xl font-extrabold">{kurzDatum(k.last_attended_at)}</span><span className="block text-sm text-ink-soft">{k.last_attended_title}</span></>
                  : <span className="text-ink-soft">noch nie</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Hausaufgaben</dt>
              <dd className="mt-1">
                <span className="font-display text-2xl font-extrabold">{abgaben.length}</span>
                <span className="text-sm text-ink-soft"> abgegeben{notenSchnitt != null && <> · Ø <span className="font-semibold text-ink">{notenSchnitt.toLocaleString("de-DE")}</span> von 5</>}</span>
              </dd>
            </div>
          </dl>
          {k && k.trailing_misses >= 2 && (
            <p className="mt-4 rounded-2xl bg-gelb-hell p-3 text-sm font-semibold">Zuletzt {k.trailing_misses} Modultage in Folge verpasst. Vielleicht kurz nachfragen?</p>
          )}
        </header>

        <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />
        <Meldung code={sp.hinweis} texte={kontaktHinweise} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="karte">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-bold">Module und Anwesenheit</h2>
                <Link href="/team/auswertung/" className="link text-sm">zur Auswertung</Link>
              </div>
              <p className="mb-3 text-sm text-ink-soft">Einen Tag antippen, um die Anwesenheit nachzutragen oder zurückzunehmen. Jede Änderung wird protokolliert.</p>
              <ul className="divide-y divide-line">
                {anmeldungen.map((r) => {
                  const s = status(r, r.tage, jetzt);
                  return (
                    <li key={r.id} className="py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p><span className="font-semibold">{r.modules.title}</span>{r.tage[0] && <span className="text-sm text-ink-soft"> · {datum(r.tage[0].starts_at)}</span>}</p>
                        <span className={`chip ${s.klasse}`}>{s.text}</span>
                      </div>
                      {r.status === "confirmed" && !r.modules.cancelled_at && r.tage.some((t) => Date.parse(t.ends_at) > jetzt) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-ink-soft">Zusage:</span>
                          <ZusageKnoepfe participantId={p.id} moduleId={r.modules.id} rsvp={r.rsvp} zurueck={`/team/teilnehmende/${p.id}/`} />
                        </div>
                      )}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {r.tage.map((t) => {
                          const a = r.attendances.find((x) => x.module_day_id === t.id);
                          const kommt = Date.parse(t.starts_at) > jetzt;
                          return (
                            <form key={t.id} action={anwesenheitSetzen}>
                              <input type="hidden" name="participant_id" value={p.id} />
                              <input type="hidden" name="module_day_id" value={t.id} />
                              {a && <input type="hidden" name="attendance_id" value={a.id} />}
                              <button
                                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${a ? "bg-forest text-paper hover:bg-ink" : kommt ? "text-ink-soft ring-1 ring-line ring-inset hover:ring-ink/30" : "bg-paper text-ink-soft ring-1 ring-line ring-inset hover:ring-ink/30"}`}
                                title={a ? `eingecheckt (${a.method}), zum Zurücknehmen tippen` : "nicht eingecheckt, zum Nachtragen tippen"}>
                                {a ? "✓ " : ""}{tagFormat.format(new Date(t.starts_at))}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
                {!anmeldungen.length && <li className="py-3 text-ink-soft">Für kein Modul angemeldet.</li>}
              </ul>
            </section>

            <Verlauf id={p.id} name={name} phone={p.phone} modulId={modulAusLink ?? anmeldungen.find((r) => !r.modules.cancelled_at && r.tage.some((t) => Date.parse(t.ends_at) > jetzt))?.modules.id ?? null} kontakte={(kontakte ?? []) as Kontakt[]} />

            {(zimmer ?? []).length > 0 && (
              <section className="karte">
                <h2 className="font-display mb-3 text-2xl font-bold">Zimmer</h2>
                <ul className="divide-y divide-line text-sm">
                  {(zimmer ?? []).map((z) => (
                    <li key={z.module_id} className="py-2">
                      <span className="font-semibold">{z.module_title}</span>{z.module_start && <span className="text-ink-soft"> · {kurzDatum(z.module_start)}</span>} · Zimmer {z.room_label}
                      <span className="block text-ink-soft">{z.mates.length ? `mit ${z.mates.join(", ")}` : "allein"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="karte">
              <h2 className="font-display mb-3 text-2xl font-bold">Hausaufgaben</h2>
              {abgaben.length ? (
                <ul className="divide-y divide-line">
                  {abgaben.map((a) => {
                    const e = zusammenfassen(a.reviews);
                    const punkte = a.reviews.map(auswerten).find((x) => x.durchschnitt != null);
                    return (
                      <li key={a.id} className="py-3">
                        <Link href={`/team/abgaben/${a.id}/`} className="group flex flex-wrap items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block font-semibold group-hover:underline">Hausaufgabe {a.assignments?.number}{a.assignments?.title && !/^hausaufgabe \d+$/i.test(a.assignments.title) ? `: ${a.assignments.title}` : ""}</span>
                            {a.label.trim() !== name && <span className="block text-sm text-ink-soft">Video: {a.label}</span>}
                          </span>
                          {e.durchschnitt != null
                            ? <span className="flex items-center gap-2">
                                {punkte?.anzahl === 9 && <span className="text-sm text-ink-soft">{punkte.punkte} / 45 Punkte</span>}
                                <span className="chip bg-gruen-hell py-1">{e.durchschnitt.toLocaleString("de-DE")} · {e.urteil}</span>
                              </span>
                            : <span className="chip bg-paper-deep py-1">noch nicht bewertet</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-ink-soft">Noch keine Abgabe erfasst.</p>}
            </section>

            <section className="karte">
              <h2 className="font-display mb-3 text-2xl font-bold">Stimmen-Beiträge</h2>
              {beitraege?.length ? (
                <ul className="mb-4 divide-y divide-line">
                  {beitraege.map((b) => (
                    <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold">{b.title}</p>
                        <p className="text-xs text-ink-soft">
                          {typen[b.kind as keyof typeof typen]}{b.outlet ? ` · ${b.outlet}` : ""}{b.published_on ? ` · ${datum(b.published_on)}` : ""}
                          {b.url && <> · <a href={b.url} target="_blank" rel="noopener noreferrer" className="link">Link</a></>}
                          {b.website_slug && <> · <a href={`/stimmen/${b.website_slug}/`} className="link">auf der Website</a></>}
                        </p>
                      </div>
                      <form action={beitragEntfernen}>
                        <input type="hidden" name="id" value={b.id} /><input type="hidden" name="participant_id" value={p.id} />
                        <button className="text-xs text-rot hover:underline">Entfernen</button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : <p className="mb-4 text-ink-soft">Noch keine Beiträge verknüpft.</p>}
              <details>
                <summary className="cursor-pointer text-sm font-semibold">+ Beitrag verknüpfen</summary>
                <form action={beitragHinzufuegen} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="participant_id" value={p.id} />
                  <select name="kind" className="feld" defaultValue="artikel" aria-label="Art">{Object.entries(typen).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <input name="published_on" type="date" className="feld" aria-label="Datum" />
                  <input name="title" required placeholder="Titel" className="feld sm:col-span-2" />
                  <input name="url" type="url" placeholder="Link (Zeitung, YouTube …)" className="feld sm:col-span-2" />
                  <input name="outlet" placeholder="Medium, z. B. Perspektif" className="feld" />
                  <input name="website_slug" placeholder="Slug auf der Website (optional)" className="feld" />
                  <button className="knopf sm:col-span-2 sm:justify-self-start">Verknüpfen</button>
                </form>
              </details>
            </section>
          </div>

          <section className="karte lg:sticky lg:top-6">
            <h2 className="font-display mb-4 text-2xl font-bold">Stammdaten</h2>
            <form action={personSpeichern} className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={p.id} />
              <div><label className="etikett" htmlFor="first_name">Vorname(n)</label><input id="first_name" name="first_name" required defaultValue={p.first_name} className="feld" /></div>
              <div><label className="etikett" htmlFor="last_name">Nachname</label><input id="last_name" name="last_name" defaultValue={p.last_name} className="feld" /></div>
              <div className="sm:col-span-2"><label className="etikett" htmlFor="email">E-Mail</label><input id="email" name="email" type="email" defaultValue={p.email ?? ""} className="feld" /></div>
              <div className="sm:col-span-2"><label className="etikett" htmlFor="phone">Telefon</label><input id="phone" name="phone" defaultValue={p.phone ?? ""} className="feld" /></div>
              <div>
                <label className="etikett" htmlFor="region_id">Region</label>
                <select id="region_id" name="region_id" defaultValue={p.region_id ?? ""} className="feld">
                  <option value="">bitte wählen</option>
                  {regionen?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="etikett" htmlFor="country">Land</label>
                <select id="country" name="country" defaultValue={p.country ?? ""} className="feld">
                  <option value="">aus Region übernehmen</option>
                  {Object.entries(laender).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="etikett" htmlFor="branch">GT / KGT</label>
                <select id="branch" name="branch" defaultValue={p.branch ?? ""} className="feld">
                  <option value="">bitte wählen</option><option>GT</option><option>KGT</option>
                </select>
              </div>
              <div>
                <label className="etikett" htmlFor="gender">Geschlecht</label>
                <select id="gender" name="gender" defaultValue={p.gender ?? ""} className="feld">
                  <option value="">keine Angabe</option><option value="w">weiblich</option><option value="m">männlich</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="etikett" htmlFor="mentor_id">Verantwortliche Person</label>
                <select id="mentor_id" name="mentor_id" defaultValue={p.mentor_id ?? ""} className="feld">
                  <option value="">keine</option>
                  {mentoren?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-ink" /> Nimmt aktiv teil</label>
                <button className="knopf">Speichern</button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}

/** Anrufe und Notizen zur Person, neueste zuerst; darüber Notiz schreiben und Anruf eintragen. */
function Verlauf({ id, name, phone, modulId, kontakte }: { id: string; name: string; phone: string | null; modulId: string | null; kontakte: Kontakt[] }) {
  const zurueck = `/team/teilnehmende/${id}/${modulId ? `?modul=${modulId}` : ""}`;
  return (
    <section className="karte scroll-mt-4" id={`p-${id}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-bold">Anrufe und Notizen</h2>
        <KontaktKnoepfe name={name} phone={phone} />
      </div>
      <NotizFormular participantId={id} moduleId={modulId} zurueck={zurueck} />
      <div className="mt-3 rounded-2xl bg-paper p-3">
        <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Anruf eintragen</p>
        <KontaktFormular participantId={id} moduleId={modulId} zurueck={zurueck} />
      </div>
      <div className="mt-4"><KontaktVerlauf eintraege={kontakte} zurueck={zurueck} mitModul /></div>
    </section>
  );
}

type OrgaPerson = { name: string; phone: string | null; region: string | null; mentor_name: string | null; branch: string | null; active: boolean; modules: { m: string; s: string; r: string | null; d: number }[] };

/**
 * Ansicht für das Orga-Team: Telefon, Sorumlu, Zusagen je Modul, Anrufe und Notizen. Ohne E-Mail, Stammdaten,
 * Hausaufgaben und Beiträge (die sieht nur Admin/Vorstand).
 */
async function OrgaKarte({ staff, id, modulId, hinweis }: { staff: Staff; id: string; modulId: string | null; hinweis?: string | string[] }) {
  const supabase = await createClient();
  const [{ data: zeilen }, { data: kontakte }, { data: module }] = await Promise.all([
    supabase.rpc("get_people", { p_participant_id: id }),
    supabase.rpc("get_contacts", { p_participant_id: id }),
    supabase.from("modules").select("id, title, cancelled_at, module_days(starts_at, ends_at)").neq("status", "draft"),
  ]);
  const p = (zeilen ?? [])[0] as unknown as OrgaPerson | undefined;
  if (!p) notFound();
  const jetzt = jetztMs();
  const kommend = (module ?? [])
    .map((m) => ({ ...m, beginn: m.module_days.map((t) => t.starts_at).sort()[0] ?? "", ende: m.module_days.map((t) => t.ends_at).sort().at(-1) ?? "", reg: p.modules.find((r) => r.m === m.id) }))
    .filter((m) => m.reg && m.beginn && !m.cancelled_at)
    .sort((a, b) => a.beginn.localeCompare(b.beginn));
  return (
    <>
      <TeamKopf staff={staff} aktiv="teilnehmende" breit />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href={`/team/teilnehmende/${modulId ? `?modul=${modulId}` : ""}`} className="text-sm font-semibold text-ink-soft hover:text-ink">← Alle Teilnehmenden</Link>
        <header className="karte mt-3 mb-6">
          <h1 className="font-display text-3xl font-extrabold">{p.name}</h1>
          <p className="mt-1 text-ink-soft">
            {[p.region, p.branch, p.mentor_name && `Sorumlu ${p.mentor_name}`, !p.active && "ausgeschieden"].filter(Boolean).join(" · ") || "Keine Region eingetragen"}
          </p>
          {p.phone && <p className="mt-2 inline-flex items-center gap-1.5 font-semibold"><Phone aria-hidden className="h-4 w-4 text-ink-soft" />{p.phone}</p>}
        </header>
        <Meldung code={hinweis} texte={kontaktHinweise} />
        <section className="karte mb-6">
          <h2 className="font-display mb-3 text-2xl font-bold">Module und Zusagen</h2>
          <ul className="divide-y divide-line">
            {kommend.map((m) => {
              const vorbei = Date.parse(m.ende) < jetzt;
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <p><span className="font-semibold">{m.title}</span><span className="text-sm text-ink-soft"> · {datum(m.beginn)}</span></p>
                  {vorbei
                    ? <span className="chip bg-paper-deep">{m.reg!.d > 0 ? `da · ${m.reg!.d} ${m.reg!.d === 1 ? "Tag" : "Tage"}` : m.reg!.s === "confirmed" ? "nicht gekommen" : "entschuldigt"}</span>
                    : m.reg!.s === "confirmed"
                      ? <ZusageKnoepfe participantId={id} moduleId={m.id} rsvp={m.reg!.r} zurueck={`/team/teilnehmende/${id}/${modulId ? `?modul=${modulId}` : ""}`} />
                      : <span className="chip bg-paper-deep">{m.reg!.s === "waitlist" ? "Warteliste" : "abgemeldet"}</span>}
                </li>
              );
            })}
            {kommend.length === 0 && <li className="py-3 text-ink-soft">Für kein Modul angemeldet.</li>}
          </ul>
        </section>
        <Verlauf id={id} name={p.name} phone={p.phone} modulId={modulId ?? kommend.find((m) => Date.parse(m.ende) > jetzt)?.id ?? null} kontakte={(kontakte ?? []) as Kontakt[]} />
      </main>
    </>
  );
}

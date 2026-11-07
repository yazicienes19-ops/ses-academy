import { RechtlicheLinks } from "@/components/RechtlicheLinks";
import { rechtlicheTexte } from "@/lib/rechtliches";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { uebernachtungSpeichern } from "@/lib/aktionen/hotel";
import { emailAendern, portalAbmelden } from "@/lib/aktionen/portal";
import { meinAbmelden, meinZuruecknehmen } from "@/lib/aktionen/ticket";
import { naechte, nachtName } from "@/lib/uebernachtung";
import { kurzcodeAnzeige, qrSvg } from "@/lib/tickets";
import { createClient } from "@/lib/supabase/server";
import { bereichSprache, bereichTexte, datumsSprache, type BereichSprache } from "@/lib/bereich-texte";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Mein Bereich | SES Academy", robots: { index: false, follow: false } };

type Reg = { id: string; status: string; modules: { id: string; title: string; location: string | null; stay_form_open: boolean; cancelled_at: string | null; module_days: { id: string; day: string; starts_at: string; ends_at: string }[] }; attendances: { module_day_id: string }[] };
type Sub = { id: string; label: string; assignment_id: string; file_name: string | null; link: string | null; submitted_on: string | null; submitted_at: string | null };

/** Datum und Zeitraum in der Sprache der Person (z. B. „14. November 2026 – 15. November 2026“). */
function formate(l: BereichSprache, terminFolgt: string) {
  const f = new Intl.DateTimeFormat(datumsSprache[l], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  const datum = (d: string) => f.format(new Date(d));
  const zeitraum = (tage: { starts_at: string }[]) =>
    tage.length ? (tage.length === 1 ? datum(tage[0].starts_at) : f.formatRange(new Date(tage[0].starts_at), new Date(tage[tage.length - 1].starts_at))) : terminFolgt;
  return { datum, zeitraum };
}

const sprachen: Record<string, string> = { de: "Deutsch", tr: "Türkçe", en: "English", fr: "Français", nl: "Nederlands" };

export default async function MeinBereich({ searchParams }: PageProps<"/mein-bereich">) {
  const { abgabe, uebernachtung, profil, modul } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/mein-bereich/login/");
  // Zugriffsregeln: jede Abfrage liefert nur die eigenen Daten
  const { data: ich } = await supabase.from("participants").select("id,first_name,last_name,email,phone,preferred_language,share_contact,photo_consent_at,photo_path,checkin_token,link_token,short_code,cohort_id").eq("user_id", auth.user.id).maybeSingle();
  // Sprache: Profil der Person (Türkisch oder Deutsch), vor dem Laden des Profils die des Kontos
  const l = bereichSprache(ich?.preferred_language ?? (auth.user.user_metadata?.sprache as string | undefined));
  const t = bereichTexte[l];
  const { datum, zeitraum } = formate(l, t.terminFolgt);
  const hinweis = (tabelle: Record<string, { text: string; gut: boolean }>, code: unknown) => (typeof code === "string" ? tabelle[code] : undefined);
  const modulHinweis = hinweis(t.modulHinweise, modul);
  const profilHinweis = hinweis(t.profilHinweise, profil);
  const uebernachtungHinweis = hinweis(t.uebernachtungHinweise, uebernachtung);
  const abgabeHinweis = hinweis(t.abgabeHinweise, abgabe);
  if (!ich)
    return (
      <main lang={l} className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-4xl font-extrabold">{t.keinProfilTitel}</h1>
        <p className="mt-4 text-ink-soft">{t.keinProfilText}</p>
        <form action={portalAbmelden} className="mt-6"><button className="knopf-hell">{t.abmelden}</button></form>
        <RechtlicheLinks {...rechtlicheTexte(l)} className="mt-10 text-ink-soft" />
      </main>
    );

  const [{ data: regs }, { data: aufgaben }, { data: subs }, { data: beitraege }] = await Promise.all([
    supabase.from("registrations").select("id,status,modules(id,title,location,stay_form_open,cancelled_at,module_days(id,day,starts_at,ends_at)),attendances(module_day_id)"),
    supabase.from("assignments").select("id,number,title,description,due_date,due_at").order("number"),
    supabase.from("submissions").select("id,label,assignment_id,file_name,link,submitted_on,submitted_at"),
    supabase.from("contributions").select("*").order("published_on", { ascending: false }),
  ]);
  const jetzt = new Date(jetztMs()).toISOString();
  const meineModule = ((regs ?? []) as unknown as Reg[])
    .filter((r) => r.modules)
    .map((r) => ({ ...r, tage: [...r.modules.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .sort((a, b) => (a.tage[0]?.starts_at ?? "").localeCompare(b.tage[0]?.starts_at ?? ""));
  // Auch Warteliste zeigen (mit Vermerk), sonst heißt es fälschlich „für kein Modul angemeldet“
  const kommend = meineModule.filter((m) => !m.modules.cancelled_at && m.tage.some((t) => t.ends_at >= jetzt) && (m.status === "confirmed" || m.status === "waitlist"));
  // Vom Team abgesagt: nicht unter „Kommende Module“, aber als Hinweis sichtbar (bis zum ursprünglichen Termin)
  const vomTeamAbgesagt = meineModule.filter((m) => m.modules.cancelled_at && m.tage.some((t) => t.ends_at >= jetzt) && (m.status === "confirmed" || m.status === "waitlist"));
  // Selbst abgesagt, Modul noch nicht begonnen: mit „Doch teilnehmen“
  const abgesagtKommend = meineModule.filter((m) => !m.modules.cancelled_at && m.tage.length > 0 && m.tage[0].starts_at > jetzt && (m.status === "excused" || m.status === "cancelled"));
  const vorbei = meineModule.filter((m) => m.tage.length && m.tage.every((t) => t.ends_at < jetzt)).reverse();
  const abgaben = (subs ?? []) as unknown as Sub[];
  const mitAbfrage = meineModule.filter((m) => m.modules.stay_form_open && !m.modules.cancelled_at && (m.status === "confirmed" || m.status === "waitlist") && m.tage.some((t) => t.ends_at >= jetzt));
  const [{ data: angaben }, { data: zimmer }, { data: mitgliedschaften }] = await Promise.all([
    mitAbfrage.length ? supabase.from("stay_requests").select("*") : Promise.resolve({ data: [] }),
    supabase.rpc("get_my_rooms"),
    supabase.from("memberships").select("id, membership_badge").order("valid_from", { ascending: false }),
  ]);
  const svg = await qrSvg(ich.checkin_token);

  return (
    <div lang={l} className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <img src="/brand/ses-logo.png" alt="SES Academy" className="h-8 w-auto" />
          <form action={portalAbmelden}><button className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-paper-deep">{t.abmelden}</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm font-semibold tracking-wide text-sage uppercase">{t.kicker}</p>
        <h1 className="font-display mt-1 text-5xl leading-none font-extrabold">{t.salam(ich.first_name.split(" ")[0])}</h1>

        <section className="mt-10 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="overflow-hidden rounded-[2rem] bg-weiss text-center ring-1 ring-line">
            <div className="bg-forest p-5 text-paper"><p className="text-sm font-semibold tracking-wide text-signal uppercase">{t.einlassCode}</p><p className="mt-1 text-sm text-paper/80">{t.giltFuerAlle}</p></div>
            <div className="p-6">
              <div className="mx-auto w-full max-w-[240px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={t.qrLabel} />
              <p className="mt-3 font-mono text-2xl font-bold tracking-[0.15em]">{kurzcodeAnzeige(ich.short_code ?? "")}</p>
              <Link href={`/ticket/${ich.link_token}/`} className="link mt-3 inline-block text-sm">{t.ticketSeite}</Link>
            </div>
          </div>
          <div id="module">
            <h2 className="font-display mb-4 text-2xl font-bold">{t.kommendeModule}</h2>
            {modulHinweis && <p role="status" className={`mb-4 rounded-2xl p-4 font-semibold ${modulHinweis.gut ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{modulHinweis.text}</p>}
            {kommend.length ? (
              <ul className="space-y-3">
                {kommend.map((m) => (
                  <li key={m.modules.id} className="karte">
                    <p className="font-display text-xl font-bold">{m.modules.title}</p>
                    <p className="text-sm text-ink-soft">{zeitraum(m.tage)}{m.modules.location ? ` · ${m.modules.location}` : ""}</p>
                    {m.status === "waitlist" && <p className="mt-2 chip bg-gelb-hell">{t.warteliste}</p>}
                    {m.attendances.length > 0 && <p className="mt-2 chip bg-gruen-hell">{t.eingecheckt}</p>}
                    {m.tage[0].starts_at > jetzt && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold">{t.nichtTeilnehmen}</summary>
                        <form action={meinAbmelden} className="mt-3 grid gap-2">
                          <input type="hidden" name="module_id" value={m.modules.id} />
                          <label htmlFor={`grund-${m.modules.id}`} className="text-sm">{t.grund}</label>
                          <textarea id={`grund-${m.modules.id}`} name="grund" rows={2} maxLength={500} className="feld" />
                          <button type="submit" className="knopf justify-self-start">{t.abmeldungBestaetigen}</button>
                        </form>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="karte text-ink-soft">{t.keinModul}</p>}
            {vomTeamAbgesagt.length > 0 && (
              <ul className="mt-3 space-y-3">
                {vomTeamAbgesagt.map((m) => (
                  <li key={m.modules.id} className="karte bg-rot-hell/60">
                    <p className="font-display text-xl font-bold">{m.modules.title}</p>
                    <p className="text-sm text-ink-soft">{zeitraum(m.tage)}</p>
                    <p className="mt-2 font-semibold text-rot">{t.teamAbgesagt}</p>
                  </li>
                ))}
              </ul>
            )}
            {abgesagtKommend.length > 0 && (
              <ul className="mt-3 space-y-3">
                {abgesagtKommend.map((m) => (
                  <li key={m.modules.id} className="karte">
                    <p className="font-display text-xl font-bold">{m.modules.title}</p>
                    <p className="text-sm text-ink-soft">{zeitraum(m.tage)}{m.modules.location ? ` · ${m.modules.location}` : ""}</p>
                    <form action={meinZuruecknehmen} className="mt-3 flex flex-wrap items-center gap-3">
                      <input type="hidden" name="module_id" value={m.modules.id} />
                      <span className="text-sm text-ink-soft">{t.selbstAbgesagt}</span>
                      <button type="submit" className="knopf-hell">{t.dochTeilnehmen}</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {(mitAbfrage.length > 0 || (zimmer ?? []).length > 0 || uebernachtungHinweis) && (
          <section id="uebernachtung" className="mt-12">
            <h2 className="font-display mb-4 text-2xl font-bold">{t.uebernachtung}</h2>
            {uebernachtungHinweis && <p role="status" className={`mb-4 rounded-2xl p-4 font-semibold ${uebernachtungHinweis.gut ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{uebernachtungHinweis.text}</p>}
            <div className="space-y-4">
              {(zimmer ?? []).map((z) => {
                const m = meineModule.find((x) => x.modules.id === z.module_id);
                return (
                  <div key={z.module_id} className="karte bg-gruen-hell">
                    <p className="font-semibold">{t.zimmer(m?.modules.title ?? t.modul, z.room_label)}</p>
                    <p className="text-sm text-ink-soft">{z.hotel_name === "Hotel (Name folgt)" ? "" : z.hotel_name}{z.hotel_address ? ` · ${z.hotel_address}` : ""}</p>
                  </div>
                );
              })}
              {mitAbfrage.map((m) => {
                const a = (angaben ?? []).find((x) => x.registration_id === m.id);
                const tagVon = (iso: string | null) => (iso ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(iso)) : "");
                const uhrVon = (iso: string | null) => (iso ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso)) : "");
                return (
                  <form key={m.modules.id} action={uebernachtungSpeichern} className="karte grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="module_id" value={m.modules.id} />
                    <div className="sm:col-span-2">
                      <p className="font-display text-xl font-bold">{m.modules.title}</p>
                      <p className="text-sm text-ink-soft">{zeitraum(m.tage)}{a ? ` · ${t.angabenGespeichert}` : ` · ${t.bitteAusfuellen}`}</p>
                    </div>
                    <fieldset className="sm:col-span-2">
                      <legend className="etikett">{t.naechteFrage}</legend>
                      <div className="flex flex-wrap gap-2">
                        {naechte(m.tage.map((t) => t.day)).map((n) => (
                          <label key={n} className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-paper">
                            <input type="checkbox" name="nights" value={n} defaultChecked={a ? a.nights.includes(n) : false} className="sr-only" />
                            {nachtName(n)}
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">{t.keineNacht}</p>
                    </fieldset>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="etikett" htmlFor={`an-${m.id}`}>{t.ankunft}</label><input id={`an-${m.id}`} name="ankunft_tag" type="date" defaultValue={tagVon(a?.arrival_at ?? null)} className="feld" /></div>
                      <div><label className="etikett" htmlFor={`anz-${m.id}`}>{t.uhrzeit}</label><input id={`anz-${m.id}`} name="ankunft_zeit" type="time" defaultValue={uhrVon(a?.arrival_at ?? null)} className="feld" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="etikett" htmlFor={`ab-${m.id}`}>{t.abreise}</label><input id={`ab-${m.id}`} name="abreise_tag" type="date" defaultValue={tagVon(a?.departure_at ?? null)} className="feld" /></div>
                      <div><label className="etikett" htmlFor={`abz-${m.id}`}>{t.uhrzeit}</label><input id={`abz-${m.id}`} name="abreise_zeit" type="time" defaultValue={uhrVon(a?.departure_at ?? null)} className="feld" /></div>
                    </div>
                    <div>
                      <label className="etikett" htmlFor={`mit-${m.id}`}>{t.anreiseMit}</label>
                      <select id={`mit-${m.id}`} name="arrival_by" defaultValue={a?.arrival_by ?? ""} className="feld">
                        <option value="">{t.bitteWaehlen}</option>{Object.entries(t.anreise).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div><label className="etikett" htmlFor={`wunsch-${m.id}`}>{t.zimmerwunsch}</label><input id={`wunsch-${m.id}`} name="room_wish" maxLength={300} defaultValue={a?.room_wish ?? ""} className="feld" /></div>
                    <div className="sm:col-span-2"><label className="etikett" htmlFor={`hinweis-${m.id}`}>{t.hinweiseTeam}</label><textarea id={`hinweis-${m.id}`} name="notes" rows={2} maxLength={1000} defaultValue={a?.notes ?? ""} className="feld" /></div>
                    <div className="sm:col-span-2"><button type="submit" className="knopf">{t.speichern}</button></div>
                  </form>
                );
              })}
            </div>
          </section>
        )}

        <section id="hausaufgaben" className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-bold">{t.hausaufgaben}</h2>
          {abgabeHinweis && <p role="status" className={`mb-4 rounded-2xl p-4 font-semibold ${abgabeHinweis.gut ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{abgabeHinweis.text}</p>}
          <div className="space-y-4">
            {aufgaben?.map((h) => {
              const meine = abgaben.filter((a) => a.assignment_id === h.id).sort((x, y) => (y.submitted_at ?? y.submitted_on ?? "").localeCompare(x.submitted_at ?? x.submitted_on ?? ""));
              const letzte = meine[0];
              const fristVorbei = h.due_at ? h.due_at < jetzt : false;
              return (
                <details key={h.id} className="karte" open={!letzte && !fristVorbei}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                    <span>
                      <span className="font-display text-xl font-bold">{t.hausaufgabe(h.number, h.title)}</span>
                      {h.due_date && <span className="block text-sm text-ink-soft">{t.frist(datum(h.due_date))}</span>}
                    </span>
                    {letzte
                      ? <span className="chip bg-gruen-hell px-3 py-1 text-sm">{t.eingegangen(letzte.submitted_on ? datum(letzte.submitted_on) : null)}</span>
                      : <span className={`chip px-3 py-1 text-sm ${fristVorbei ? "bg-rot-hell text-rot" : "bg-gelb-hell"}`}>{t.nochNicht}</span>}
                  </summary>
                  {h.description && <p className="mt-4 whitespace-pre-line text-ink-soft">{h.description}</p>}
                  {meine.length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm">
                      {meine.map((a) => (
                        <li key={a.id} className="text-ink-soft">
                          ✓ {a.file_name ?? (a.link ? t.link : a.label)}{a.submitted_on ? ` · ${datum(a.submitted_on)}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action="/mein-bereich/abgabe/" method="post" encType="multipart/form-data" className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                    <input type="hidden" name="assignment_id" value={h.id} />
                    <div><label className="etikett" htmlFor={`datei-${h.id}`}>{t.datei}</label><input id={`datei-${h.id}`} name="datei" type="file" className="feld" /></div>
                    <div><label className="etikett" htmlFor={`link-${h.id}`}>{t.oderLink}</label><input id={`link-${h.id}`} name="link" type="url" placeholder="https://" className="feld" /></div>
                    <div className="sm:col-span-2"><button type="submit" className="knopf">{letzte ? t.neueVersion : t.abgeben}</button></div>
                  </form>
                </details>
              );
            })}
            {!aufgaben?.length && <p className="karte text-ink-soft">{t.keineHausaufgaben}</p>}
          </div>
        </section>


        <section id="profil" className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">{t.profil}</h2>
            <Link href="/mein-bereich/verzeichnis/" className="knopf-hell">{t.verzeichnis}</Link>
          </div>
          {profilHinweis && <p role="status" className={`mb-4 rounded-2xl p-4 font-semibold ${profilHinweis.gut ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{profilHinweis.text}</p>}
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="text-center">
              {ich.photo_path
                ? <img src={`/portal/foto/${ich.id}/`} alt={t.fotoAlt} className="mx-auto h-32 w-32 rounded-full object-cover ring-1 ring-line" />
                : <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-paper-deep font-display text-4xl font-bold" aria-hidden>{ich.first_name[0]}</div>}
              <ul className="mt-3 flex max-w-48 flex-wrap justify-center gap-1">
                {(mitgliedschaften ?? []).map((m) => <li key={m.id} className="chip bg-gruen-hell">{m.membership_badge}</li>)}
              </ul>
            </div>
            <div className="space-y-4">
              <form action="/mein-bereich/profil/" method="post" encType="multipart/form-data" className="karte grid gap-3 sm:grid-cols-2">
                <p className="sm:col-span-2 font-semibold">{ich.first_name} {ich.last_name}<span className="block text-sm font-normal text-ink-soft">{t.stammdaten}</span></p>
                <div><label className="etikett" htmlFor="phone">{t.telefon}</label><input id="phone" name="phone" type="tel" maxLength={40} defaultValue={ich.phone ?? ""} className="feld" /></div>
                <div><label className="etikett" htmlFor="sprache">{t.sprache}</label>
                  <select id="sprache" name="sprache" defaultValue={ich.preferred_language} className="feld">{Object.entries(sprachen).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="sm:col-span-2"><label className="etikett" htmlFor="foto">{t.foto}</label><input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="feld" /></div>
                <label className="flex gap-3 sm:col-span-2"><input type="checkbox" name="share_contact" defaultChecked={ich.share_contact} className="mt-1 h-5 w-5 shrink-0" /><span><span className="font-semibold">{t.kontaktFrei}</span><span className="block text-sm text-ink-soft">{t.kontaktFreiHilfe}</span></span></label>
                <label className="flex gap-3 sm:col-span-2"><input type="checkbox" name="photo_consent" defaultChecked={!!ich.photo_consent_at} className="mt-1 h-5 w-5 shrink-0" /><span><span className="font-semibold">{t.fotoErlaubt}</span><span className="block text-sm text-ink-soft">{t.fotoErlaubtHilfe}</span></span></label>
                <div className="sm:col-span-2"><button type="submit" className="knopf">{t.profilSpeichern}</button></div>
              </form>
              <form action={emailAendern} className="karte flex flex-wrap items-end gap-2">
                <div className="min-w-60 flex-1"><label className="etikett" htmlFor="email">{t.emailAdresse}</label><input id="email" name="email" type="email" required defaultValue={ich.email ?? ""} className="feld" /></div>
                <button type="submit" className="knopf-hell">{t.adresseAendern}</button>
              </form>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display mb-4 text-2xl font-bold">{t.anwesenheit}</h2>
            <ul className="karte divide-y divide-line py-2">
              {vorbei.map((m) => (
                <li key={m.modules.id} className="flex items-center justify-between gap-3 py-3">
                  <span><span className="font-semibold">{m.modules.title}</span><span className="block text-xs text-ink-soft">{zeitraum(m.tage)}</span></span>
                  <span className={`chip ${m.attendances.length >= m.tage.length ? "bg-gruen-hell" : m.attendances.length ? "bg-gelb-hell" : m.status === "excused" ? "bg-gelb-hell" : "bg-rot-hell text-rot"}`}>
                    {m.status === "excused" ? t.entschuldigt : t.tage(m.attendances.length, m.tage.length)}
                  </span>
                </li>
              ))}
              {!vorbei.length && <li className="py-3 text-ink-soft">{t.keineVergangenen}</li>}
            </ul>
          </div>
          <div>
            <h2 className="font-display mb-4 text-2xl font-bold">{t.beitraege}</h2>
            <ul className="karte divide-y divide-line py-2">
              {beitraege?.map((b) => (
                <li key={b.id} className="py-3">
                  {b.website_slug ? <Link href={`/stimmen/${b.website_slug}/`} className="font-semibold hover:underline">{b.title}</Link>
                    : b.url ? <a href={b.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{b.title} ↗</a>
                    : <span className="font-semibold">{b.title}</span>}
                  <span className="block text-xs text-ink-soft">{t.beitragTypen[b.kind]}{b.outlet ? ` · ${b.outlet}` : ""}{b.published_on ? ` · ${datum(b.published_on)}` : ""}</span>
                </li>
              ))}
              {!beitraege?.length && <li className="py-3 text-ink-soft">{t.keineBeitraege}</li>}
            </ul>
          </div>
        </section>
        <RechtlicheLinks {...rechtlicheTexte(l)} className="mt-16 border-t border-line pt-6 text-ink-soft" />
      </main>
    </div>
  );
}

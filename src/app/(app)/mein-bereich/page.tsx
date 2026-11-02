import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { uebernachtungSpeichern } from "@/lib/aktionen/hotel";
import { emailAendern, portalAbmelden } from "@/lib/aktionen/portal";
import { naechte, nachtName } from "@/lib/uebernachtung";
import { kurzcodeAnzeige, qrSvg } from "@/lib/tickets";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Mein Bereich | SES Academy", robots: { index: false, follow: false } };

type Reg = { id: string; status: string; modules: { id: string; title: string; location: string | null; stay_form_open: boolean; module_days: { id: string; day: string; starts_at: string; ends_at: string }[] }; attendances: { module_day_id: string }[] };
type Sub = { id: string; label: string; assignment_id: string; file_name: string | null; link: string | null; submitted_on: string | null; submitted_at: string | null };

const typen: Record<string, string> = { kommentar: "Kommentar", video: "Video", grafik: "Grafik", podcast: "Podcast", rede: "Rede", artikel: "Artikel" };
const datum = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(d));
const zeitraum = (tage: { starts_at: string }[]) => (tage.length ? (tage.length === 1 ? datum(tage[0].starts_at) : `${datum(tage[0].starts_at)} – ${datum(tage[tage.length - 1].starts_at)}`) : "Termin folgt");

const abgabeHinweise: Record<string, { text: string; gut: boolean }> = {
  puenktlich: { text: "Danke! Deine Abgabe ist eingegangen. Eine Bestätigung kommt per Mail.", gut: true },
  verspaetet: { text: "Deine Abgabe ist eingegangen, allerdings nach der Frist.", gut: true },
  leer: { text: "Bitte eine Datei auswählen oder einen Link eintragen.", gut: false },
  zu_gross: { text: "Die Datei ist größer als 100 MB. Bitte als Link (z. B. YouTube „nicht gelistet“ oder Drive) abgeben.", gut: false },
  link: { text: "Der Link muss mit https:// beginnen.", gut: false },
  fehler: { text: "Die Abgabe hat nicht geklappt. Bitte noch einmal versuchen oder an ses@islamrat.de schreiben.", gut: false },
};

const uebernachtungHinweise: Record<string, { text: string; gut: boolean }> = {
  saved: { text: "Danke! Deine Angaben zur Übernachtung sind gespeichert. Du kannst sie ändern, solange die Abfrage offen ist.", gut: true },
  closed: { text: "Die Abfrage zur Übernachtung ist geschlossen. Bitte melde dich bei ses@islamrat.de.", gut: false },
  not_registered: { text: "Für dieses Modul bist du nicht angemeldet.", gut: false },
  fehler: { text: "Das hat nicht geklappt. Bitte die Angaben prüfen.", gut: false },
};

const profilHinweise: Record<string, { text: string; gut: boolean }> = {
  gespeichert: { text: "Profil gespeichert.", gut: true },
  "foto-art": { text: "Bitte ein Foto als JPG, PNG oder WebP hochladen.", gut: false },
  "foto-gross": { text: "Das Foto ist größer als 5 MB.", gut: false },
  "email-gesendet": { text: "Wir haben an deine alte und deine neue Adresse je einen Bestätigungslink geschickt. Erst wenn beide bestätigt sind, gilt die neue Adresse.", gut: true },
  "email-bestaetigt": { text: "Bestätigt. Falls noch nicht geschehen, bestätige auch den Link in der anderen Mail.", gut: true },
  "email-ungueltig": { text: "Bitte eine gültige E-Mail-Adresse eingeben.", gut: false },
  "email-vergeben": { text: "Diese E-Mail-Adresse gehört schon zu einem anderen Konto.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const sprachen: Record<string, string> = { de: "Deutsch", tr: "Türkçe", en: "English", fr: "Français", nl: "Nederlands" };

export default async function MeinBereich({ searchParams }: PageProps<"/mein-bereich">) {
  const { abgabe, uebernachtung, profil } = await searchParams;
  const profilHinweis = typeof profil === "string" ? profilHinweise[profil] : undefined;
  const uebernachtungHinweis = typeof uebernachtung === "string" ? uebernachtungHinweise[uebernachtung] : undefined;
  const abgabeHinweis = typeof abgabe === "string" ? abgabeHinweise[abgabe] : undefined;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/mein-bereich/login/");
  // Zugriffsregeln: jede Abfrage liefert nur die eigenen Daten
  const { data: ich } = await supabase.from("participants").select("id,first_name,last_name,email,phone,preferred_language,share_contact,photo_consent_at,photo_path,checkin_token,short_code,cohort_id").eq("user_id", auth.user.id).maybeSingle();
  if (!ich)
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-4xl font-extrabold">Kein Profil gefunden</h1>
        <p className="mt-4 text-ink-soft">Zu deiner E-Mail-Adresse gibt es kein Teilnehmer-Profil. Bitte melde dich bei ses@islamrat.de.</p>
        <form action={portalAbmelden} className="mt-6"><button className="knopf-hell">Abmelden</button></form>
      </main>
    );

  const [{ data: regs }, { data: aufgaben }, { data: subs }, { data: beitraege }] = await Promise.all([
    supabase.from("registrations").select("id,status,modules(id,title,location,stay_form_open,module_days(id,day,starts_at,ends_at)),attendances(module_day_id)"),
    supabase.from("assignments").select("id,number,title,description,due_date,due_at").order("number"),
    supabase.from("submissions").select("id,label,assignment_id,file_name,link,submitted_on,submitted_at"),
    supabase.from("contributions").select("*").order("published_on", { ascending: false }),
  ]);
  const jetzt = new Date(jetztMs()).toISOString();
  const meineModule = ((regs ?? []) as unknown as Reg[])
    .filter((r) => r.modules)
    .map((r) => ({ ...r, tage: [...r.modules.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .sort((a, b) => (a.tage[0]?.starts_at ?? "").localeCompare(b.tage[0]?.starts_at ?? ""));
  const kommend = meineModule.filter((m) => m.tage.some((t) => t.ends_at >= jetzt) && m.status === "confirmed");
  const vorbei = meineModule.filter((m) => m.tage.length && m.tage.every((t) => t.ends_at < jetzt)).reverse();
  const abgaben = (subs ?? []) as unknown as Sub[];
  const mitAbfrage = meineModule.filter((m) => m.modules.stay_form_open && (m.status === "confirmed" || m.status === "waitlist") && m.tage.some((t) => t.ends_at >= jetzt));
  const [{ data: angaben }, { data: zimmer }, { data: mitgliedschaften }] = await Promise.all([
    mitAbfrage.length ? supabase.from("stay_requests").select("*") : Promise.resolve({ data: [] }),
    supabase.rpc("get_my_rooms"),
    supabase.from("memberships").select("id, membership_badge").order("valid_from", { ascending: false }),
  ]);
  const svg = await qrSvg(ich.checkin_token);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <img src="/brand/ses-logo.png" alt="SES Academy" className="h-8 w-auto" />
          <form action={portalAbmelden}><button className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-paper-deep">Abmelden</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm font-semibold tracking-wide text-sage uppercase">Mein Bereich</p>
        <h1 className="font-display mt-1 text-5xl leading-none font-extrabold">Salam, {ich.first_name.split(" ")[0]}!</h1>

        <section className="mt-10 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="overflow-hidden rounded-[2rem] bg-weiss text-center ring-1 ring-line">
            <div className="bg-forest p-5 text-paper"><p className="text-sm font-semibold tracking-wide text-signal uppercase">Dein Einlass-Code</p><p className="mt-1 text-sm text-paper/80">gilt für alle Module</p></div>
            <div className="p-6">
              <div className="mx-auto w-full max-w-[240px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label="Persönlicher QR-Code" />
              <p className="mt-3 font-mono text-2xl font-bold tracking-[0.15em]">{kurzcodeAnzeige(ich.short_code ?? "")}</p>
              <Link href={`/ticket/${ich.checkin_token}/`} className="link mt-3 inline-block text-sm">Ticket-Seite öffnen (auch zum Abmelden)</Link>
            </div>
          </div>
          <div>
            <h2 className="font-display mb-4 text-2xl font-bold">Kommende Module</h2>
            {kommend.length ? (
              <ul className="space-y-3">
                {kommend.map((m) => (
                  <li key={m.modules.id} className="karte">
                    <p className="font-display text-xl font-bold">{m.modules.title}</p>
                    <p className="text-sm text-ink-soft">{zeitraum(m.tage)}{m.modules.location ? ` · ${m.modules.location}` : ""}</p>
                    {m.attendances.length > 0 && <p className="mt-2 chip bg-gruen-hell">✓ eingecheckt</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="karte text-ink-soft">Gerade bist du für kein kommendes Modul angemeldet.</p>}
          </div>
        </section>

        {(mitAbfrage.length > 0 || (zimmer ?? []).length > 0 || uebernachtungHinweis) && (
          <section id="uebernachtung" className="mt-12">
            <h2 className="font-display mb-4 text-2xl font-bold">Übernachtung</h2>
            {uebernachtungHinweis && <p role="status" className={`mb-4 rounded-2xl p-4 font-semibold ${uebernachtungHinweis.gut ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{uebernachtungHinweis.text}</p>}
            <div className="space-y-4">
              {(zimmer ?? []).map((z) => {
                const m = meineModule.find((x) => x.modules.id === z.module_id);
                return (
                  <div key={z.module_id} className="karte bg-gruen-hell">
                    <p className="font-semibold">{m?.modules.title ?? "Modul"}: Zimmer {z.room_label}</p>
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
                      <p className="text-sm text-ink-soft">{zeitraum(m.tage)}{a ? " · Angaben gespeichert" : " · bitte ausfüllen"}</p>
                    </div>
                    <fieldset className="sm:col-span-2">
                      <legend className="etikett">In welchen Nächten brauchst du ein Bett?</legend>
                      <div className="flex flex-wrap gap-2">
                        {naechte(m.tage.map((t) => t.day)).map((n) => (
                          <label key={n} className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-paper">
                            <input type="checkbox" name="nights" value={n} defaultChecked={a ? a.nights.includes(n) : false} className="sr-only" />
                            {nachtName(n)}
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">Keine Nacht ausgewählt = keine Übernachtung.</p>
                    </fieldset>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="etikett" htmlFor={`an-${m.id}`}>Ankunft</label><input id={`an-${m.id}`} name="ankunft_tag" type="date" defaultValue={tagVon(a?.arrival_at ?? null)} className="feld" /></div>
                      <div><label className="etikett" htmlFor={`anz-${m.id}`}>Uhrzeit</label><input id={`anz-${m.id}`} name="ankunft_zeit" type="time" defaultValue={uhrVon(a?.arrival_at ?? null)} className="feld" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="etikett" htmlFor={`ab-${m.id}`}>Abreise</label><input id={`ab-${m.id}`} name="abreise_tag" type="date" defaultValue={tagVon(a?.departure_at ?? null)} className="feld" /></div>
                      <div><label className="etikett" htmlFor={`abz-${m.id}`}>Uhrzeit</label><input id={`abz-${m.id}`} name="abreise_zeit" type="time" defaultValue={uhrVon(a?.departure_at ?? null)} className="feld" /></div>
                    </div>
                    <div>
                      <label className="etikett" htmlFor={`mit-${m.id}`}>Anreise mit</label>
                      <select id={`mit-${m.id}`} name="arrival_by" defaultValue={a?.arrival_by ?? ""} className="feld">
                        <option value="">bitte wählen</option><option value="bahn">Bahn</option><option value="auto">Auto</option><option value="flug">Flugzeug</option><option value="bus">Fernbus</option><option value="andere">anders</option>
                      </select>
                    </div>
                    <div><label className="etikett" htmlFor={`wunsch-${m.id}`}>Zimmerwunsch (mit wem?)</label><input id={`wunsch-${m.id}`} name="room_wish" maxLength={300} defaultValue={a?.room_wish ?? ""} className="feld" /></div>
                    <div className="sm:col-span-2"><label className="etikett" htmlFor={`hinweis-${m.id}`}>Hinweise fürs Team (z. B. Ernährung, Gesundheit)</label><textarea id={`hinweis-${m.id}`} name="notes" rows={2} maxLength={1000} defaultValue={a?.notes ?? ""} className="feld" /></div>
                    <div className="sm:col-span-2"><button type="submit" className="knopf">Speichern</button></div>
                  </form>
                );
              })}
            </div>
          </section>
        )}

        <section id="hausaufgaben" className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-bold">Hausaufgaben</h2>
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
                      <span className="font-display text-xl font-bold">Hausaufgabe {h.number}: {h.title}</span>
                      {h.due_date && <span className="block text-sm text-ink-soft">Frist: {datum(h.due_date)}</span>}
                    </span>
                    {letzte
                      ? <span className="chip bg-gruen-hell px-3 py-1 text-sm">eingegangen{letzte.submitted_on ? ` am ${datum(letzte.submitted_on)}` : ""}</span>
                      : <span className={`chip px-3 py-1 text-sm ${fristVorbei ? "bg-rot-hell text-rot" : "bg-gelb-hell"}`}>noch nicht abgegeben</span>}
                  </summary>
                  {h.description && <p className="mt-4 whitespace-pre-line text-ink-soft">{h.description}</p>}
                  {meine.length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm">
                      {meine.map((a) => (
                        <li key={a.id} className="text-ink-soft">
                          ✓ {a.file_name ?? (a.link ? "Link" : a.label)}{a.submitted_on ? ` · ${datum(a.submitted_on)}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action="/mein-bereich/abgabe/" method="post" encType="multipart/form-data" className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                    <input type="hidden" name="assignment_id" value={h.id} />
                    <div><label className="etikett" htmlFor={`datei-${h.id}`}>Datei (bis 100 MB)</label><input id={`datei-${h.id}`} name="datei" type="file" className="feld" /></div>
                    <div><label className="etikett" htmlFor={`link-${h.id}`}>oder Link (z. B. YouTube, Drive)</label><input id={`link-${h.id}`} name="link" type="url" placeholder="https://" className="feld" /></div>
                    <div className="sm:col-span-2"><button type="submit" className="knopf">{letzte ? "Neue Version abgeben" : "Abgeben"}</button></div>
                  </form>
                </details>
              );
            })}
            {!aufgaben?.length && <p className="karte text-ink-soft">Noch keine Hausaufgaben.</p>}
          </div>
        </section>


        <section id="profil" className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">Mein Profil</h2>
            <Link href="/mein-bereich/verzeichnis/" className="knopf-hell">Mitgliederverzeichnis</Link>
          </div>
          {profilHinweis && <p role="status" className={`mb-4 rounded-2xl p-4 font-semibold ${profilHinweis.gut ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{profilHinweis.text}</p>}
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="text-center">
              {ich.photo_path
                ? <img src={`/portal/foto/${ich.id}/`} alt="Dein Profilfoto" className="mx-auto h-32 w-32 rounded-full object-cover ring-1 ring-line" />
                : <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-paper-deep font-display text-4xl font-bold" aria-hidden>{ich.first_name[0]}</div>}
              <ul className="mt-3 flex max-w-48 flex-wrap justify-center gap-1">
                {(mitgliedschaften ?? []).map((m) => <li key={m.id} className="chip bg-gruen-hell">{m.membership_badge}</li>)}
              </ul>
            </div>
            <div className="space-y-4">
              <form action="/mein-bereich/profil/" method="post" encType="multipart/form-data" className="karte grid gap-3 sm:grid-cols-2">
                <p className="sm:col-span-2 font-semibold">{ich.first_name} {ich.last_name}<span className="block text-sm font-normal text-ink-soft">Name, Region und Generation pflegt das Team. Fehler bitte an ses@islamrat.de.</span></p>
                <div><label className="etikett" htmlFor="phone">Telefon</label><input id="phone" name="phone" type="tel" maxLength={40} defaultValue={ich.phone ?? ""} className="feld" /></div>
                <div><label className="etikett" htmlFor="sprache">Sprache für Mails</label>
                  <select id="sprache" name="sprache" defaultValue={ich.preferred_language} className="feld">{Object.entries(sprachen).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="sm:col-span-2"><label className="etikett" htmlFor="foto">Profilfoto (JPG, PNG oder WebP, bis 5 MB)</label><input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="feld" /></div>
                <label className="flex gap-3 sm:col-span-2"><input type="checkbox" name="share_contact" defaultChecked={ich.share_contact} className="mt-1 h-5 w-5 shrink-0" /><span><span className="font-semibold">E-Mail und Telefon für andere Mitglieder sichtbar</span><span className="block text-sm text-ink-soft">Ohne Häkchen sehen andere Mitglieder nur Name, Foto, Region und Abzeichen.</span></span></label>
                <label className="flex gap-3 sm:col-span-2"><input type="checkbox" name="photo_consent" defaultChecked={!!ich.photo_consent_at} className="mt-1 h-5 w-5 shrink-0" /><span><span className="font-semibold">Fotos von mir bei Modulen dürfen auf der Website und bei Instagram erscheinen</span><span className="block text-sm text-ink-soft">Du kannst die Einwilligung jederzeit hier zurücknehmen.</span></span></label>
                <div className="sm:col-span-2"><button type="submit" className="knopf">Profil speichern</button></div>
              </form>
              <form action={emailAendern} className="karte flex flex-wrap items-end gap-2">
                <div className="min-w-60 flex-1"><label className="etikett" htmlFor="email">E-Mail-Adresse</label><input id="email" name="email" type="email" required defaultValue={ich.email ?? ""} className="feld" /></div>
                <button type="submit" className="knopf-hell">Adresse ändern</button>
              </form>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display mb-4 text-2xl font-bold">Meine Anwesenheit</h2>
            <ul className="karte divide-y divide-line py-2">
              {vorbei.map((m) => (
                <li key={m.modules.id} className="flex items-center justify-between gap-3 py-3">
                  <span><span className="font-semibold">{m.modules.title}</span><span className="block text-xs text-ink-soft">{zeitraum(m.tage)}</span></span>
                  <span className={`chip ${m.attendances.length >= m.tage.length ? "bg-gruen-hell" : m.attendances.length ? "bg-gelb-hell" : m.status === "excused" ? "bg-gelb-hell" : "bg-rot-hell text-rot"}`}>
                    {m.status === "excused" ? "entschuldigt" : `${m.attendances.length}/${m.tage.length} Tage`}
                  </span>
                </li>
              ))}
              {!vorbei.length && <li className="py-3 text-ink-soft">Noch keine vergangenen Module.</li>}
            </ul>
          </div>
          <div>
            <h2 className="font-display mb-4 text-2xl font-bold">Meine Beiträge</h2>
            <ul className="karte divide-y divide-line py-2">
              {beitraege?.map((b) => (
                <li key={b.id} className="py-3">
                  {b.website_slug ? <Link href={`/stimmen/${b.website_slug}/`} className="font-semibold hover:underline">{b.title}</Link>
                    : b.url ? <a href={b.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{b.title} ↗</a>
                    : <span className="font-semibold">{b.title}</span>}
                  <span className="block text-xs text-ink-soft">{typen[b.kind]}{b.outlet ? ` · ${b.outlet}` : ""}{b.published_on ? ` · ${datum(b.published_on)}` : ""}</span>
                </li>
              ))}
              {!beitraege?.length && <li className="py-3 text-ink-soft">Hast du etwas veröffentlicht – einen Artikel, eine Rede, ein Video? Schick den Link an ses@islamrat.de, dann erscheint er hier und auf der Website.</li>}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

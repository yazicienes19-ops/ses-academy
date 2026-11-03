import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AbgabeFormular } from "@/components/portal/AbgabeFormular";
import { portalAbmelden } from "@/lib/aktionen/portal";
import { getStaff } from "@/lib/auth";
import { groesse } from "@/lib/formate";
import { auswerten, kriterien, zusammenfassen, type KriteriumFeld } from "@/lib/bewertung";
import { kurzcodeAnzeige, qrSvg } from "@/lib/tickets";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Mein Bereich | SES Academy", robots: { index: false, follow: false } };

type Reg = { status: string; modules: { id: string; title: string; location: string | null; module_days: { id: string; starts_at: string; ends_at: string }[] }; attendances: { module_day_id: string }[] };
type Rev = Partial<Record<KriteriumFeld, number | null>> & { strengths: string | null; improvements: string | null; tip: string | null };
type Sub = { id: string; label: string; assignment_id: string; source: string; content: string | null; link: string | null; upload_path: string | null; upload_name: string | null; submitted_at: string | null; reviews: Rev[] };
type Punkt = { id: string; module_day_id: string; starts_at: string; ends_at: string | null; title: string; location: string | null; description: string };
const tagName = (d: string) => new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" }).format(new Date(d));
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

const typen: Record<string, string> = { kommentar: "Kommentar", video: "Video", grafik: "Grafik", podcast: "Podcast", rede: "Rede", artikel: "Artikel" };
const datum = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(d));
const zeitraum = (tage: { starts_at: string }[]) => (tage.length ? (tage.length === 1 ? datum(tage[0].starts_at) : `${datum(tage[0].starts_at)} – ${datum(tage[tage.length - 1].starts_at)}`) : "Termin folgt");

export default async function MeinBereich() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/mein-bereich/login/");
  // Zugriffsregeln: jede Abfrage liefert nur die eigenen Daten
  const { data: ich } = await supabase.from("participants").select("id,first_name,checkin_token,short_code,cohort_id").eq("user_id", auth.user.id).maybeSingle();
  // Kommission ohne Teilnehmer-Profil gehört in den Team-Bereich
  if (!ich && (await getStaff())) redirect("/team/");
  if (!ich)
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-4xl font-extrabold">Kein Profil gefunden</h1>
        <p className="mt-4 text-ink-soft">Zu deiner E-Mail-Adresse gibt es kein Teilnehmer-Profil. Bitte melde dich bei ses@islamrat.de.</p>
        <form action={portalAbmelden} className="mt-6"><button className="knopf-hell">Abmelden</button></form>
      </main>
    );

  const [{ data: regs }, { data: aufgaben }, { data: subs }, { data: beitraege }, { data: material }, { data: zimmer }, { data: agenda }] = await Promise.all([
    supabase.from("registrations").select("status,modules(id,title,location,module_days(id,starts_at,ends_at)),attendances(module_day_id)"),
    supabase.from("assignments").select("id,number,title,description,due_date,allowed_formats").order("number"),
    supabase.from("submissions").select("id,label,assignment_id,source,content,link,upload_path,upload_name,submitted_at,reviews(*)"),
    supabase.from("contributions").select("*").order("published_on", { ascending: false }),
    // RLS: nur freigeschaltetes Material des eigenen Jahrgangs, nur freigegebene eigene Zimmer, nur veröffentlichte Punkte eigener Module
    supabase.from("resources").select("id,title,description,file_name,size_bytes,modules(title)").order("created_at", { ascending: false }),
    supabase.rpc("my_rooms"),
    supabase.from("agenda_items").select("id,module_day_id,starts_at,ends_at,title,location,description").order("starts_at"),
  ]);
  const punkte = (agenda ?? []) as Punkt[];
  const jetzt = new Date(jetztMs()).toISOString();
  const meineModule = ((regs ?? []) as unknown as Reg[])
    .filter((r) => r.modules)
    .map((r) => ({ ...r, tage: [...r.modules.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .sort((a, b) => (a.tage[0]?.starts_at ?? "").localeCompare(b.tage[0]?.starts_at ?? ""));
  const kommend = meineModule.filter((m) => m.tage.some((t) => t.ends_at >= jetzt) && m.status === "confirmed");
  const vorbei = meineModule.filter((m) => m.tage.length && m.tage.every((t) => t.ends_at < jetzt)).reverse();
  const abgaben = (subs ?? []) as unknown as Sub[];
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

        {zimmer?.map((z) => (
          <section key={z.module_id} className="mt-8 grid gap-4 rounded-[2rem] bg-forest p-6 text-paper sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div>
              <p className="text-sm font-semibold tracking-wide text-signal uppercase">Dein Zimmer · {z.module_title}</p>
              <p className="font-display mt-2 text-3xl font-extrabold">{z.hotel_name} · Zimmer {z.room_number}</p>
              {z.check_in_info && <p className="mt-2 text-paper/80">{z.check_in_info}</p>}
              {z.roommates.length > 0 && <p className="mt-2 text-sm text-paper/70">Du teilst das Zimmer mit {z.roommates.join(", ")}.</p>}
            </div>
            {z.room_pin_code && (
              <div className="rounded-3xl bg-signal px-6 py-4 text-center text-ink">
                <p className="text-xs font-semibold tracking-wide uppercase">Tür-Code</p>
                <p className="font-mono text-3xl font-bold tracking-[0.2em]">{z.room_pin_code}</p>
              </div>
            )}
          </section>
        ))}

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
                    {m.tage.some((t) => punkte.some((p) => p.module_day_id === t.id)) && (
                      <details className="mt-3 border-t border-line pt-3">
                        <summary className="cursor-pointer text-sm font-semibold">Tagesordnung ansehen</summary>
                        {m.tage.map((t) => {
                          const liste = punkte.filter((p) => p.module_day_id === t.id);
                          return liste.length ? (
                            <div key={t.id} className="mt-3">
                              <p className="text-xs font-semibold tracking-wide text-sage uppercase">{tagName(t.starts_at)}</p>
                              <ol className="mt-1 divide-y divide-line">
                                {liste.map((p) => (
                                  <li key={p.id} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 text-sm">
                                    <span className="font-mono whitespace-nowrap text-ink-soft">{hhmm(p.starts_at)}{p.ends_at ? `–${hhmm(p.ends_at)}` : ""}</span>
                                    <span><span className="font-semibold">{p.title}</span>{p.location && <span className="text-ink-soft"> · {p.location}</span>}{p.description && <span className="block text-ink-soft">{p.description}</span>}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ) : null;
                        })}
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="karte text-ink-soft">Gerade bist du für kein kommendes Modul angemeldet.</p>}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-bold">Hausaufgaben</h2>
          <div className="space-y-4">
            {aufgaben?.map((h) => {
              const meine = abgaben.filter((a) => a.assignment_id === h.id);
              const e = zusammenfassen(meine.flatMap((a) => a.reviews));
              const eigene = meine.find((a) => a.source === "participant") ?? null;
              const feedback = meine.some((a) => a.reviews.length > 0);
              return (
                <details key={h.id} className="karte" open={e.durchschnitt != null}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                    <span>
                      <span className="font-display text-xl font-bold">Hausaufgabe {h.number}: {h.title}</span>
                      {h.due_date && <span className="block text-sm text-ink-soft">Frist: {datum(h.due_date)}</span>}
                    </span>
                    {feedback ? (
                      <span className="chip bg-gruen-hell px-3 py-1 text-sm">Feedback erhalten{e.durchschnitt != null ? ` · Ø ${e.durchschnitt}` : ""}</span>
                    ) : meine.length ? <span className="chip bg-paper-deep px-3 py-1 text-sm">Eingereicht · Feedback folgt</span>
                      : <span className="chip bg-gelb-hell px-3 py-1 text-sm">Offen</span>}
                  </summary>
                  {h.description && <p className="mt-4 whitespace-pre-line text-ink-soft">{h.description}</p>}
                  {eigene && (
                    <div className="mt-4 rounded-2xl bg-paper p-4 text-sm">
                      <p className="font-semibold">Deine Abgabe{eigene.submitted_at ? ` vom ${new Date(eigene.submitted_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" })}` : ""}</p>
                      {eigene.upload_name && <a href={`/mein-bereich/datei/?abgabe=${eigene.id}`} className="link mt-1 inline-block">⬇ {eigene.upload_name}</a>}
                      {eigene.link && <a href={eigene.link} target="_blank" rel="noopener noreferrer" className="link mt-1 block">{eigene.link}</a>}
                      {eigene.content && <p className="mt-1 line-clamp-4 whitespace-pre-line text-ink-soft">{eigene.content}</p>}
                    </div>
                  )}
                  {!feedback && (
                    <AbgabeFormular aufgabeId={h.id} teilnehmerId={ich.id} formate={h.allowed_formats} vorher={eigene && { content: eigene.content, link: eigene.link, upload_path: eigene.upload_path, upload_name: eigene.upload_name }} />
                  )}
                  {meine.flatMap((a) =>
                    a.reviews.map((b, i) => {
                      const w = auswerten(b);
                      if (!w.anzahl && !b.strengths && !b.improvements && !b.tip) return null;
                      return (
                        <div key={`${a.id}-${i}`} className="mt-5 border-t border-line pt-5">
                          <p className="text-sm text-ink-soft">{a.label}{w.anzahl ? ` · ${w.punkte} von ${w.anzahl * 5} Punkten` : ""}</p>
                          {w.anzahl > 0 && (
                            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                              {kriterien.map((k) => (
                                <li key={k.feld} className="text-sm">
                                  <div className="flex justify-between"><span>{k.name}</span><span className="font-semibold">{b[k.feld] ?? "–"}</span></div>
                                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-deep"><div className="h-full bg-mint" style={{ width: `${((b[k.feld] ?? 0) / 5) * 100}%` }} /></div>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                            {b.strengths && <p className="rounded-2xl bg-gruen-hell p-3"><strong className="block">Besonders gut</strong>{b.strengths}</p>}
                            {b.improvements && <p className="rounded-2xl bg-gelb-hell p-3"><strong className="block">Verbessern</strong>{b.improvements}</p>}
                            {b.tip && <p className="rounded-2xl bg-paper p-3"><strong className="block">Tipp fürs nächste Mal</strong>{b.tip}</p>}
                          </div>
                        </div>
                      );
                    }),
                  )}
                </details>
              );
            })}
            {!aufgaben?.length && <p className="karte text-ink-soft">Noch keine Hausaufgaben.</p>}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-bold">Material</h2>
          {material?.length ? (
            <ul className="karte divide-y divide-line py-2">
              {material.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>
                    <span className="font-semibold">{d.title}</span>
                    <span className="block text-xs text-ink-soft">{(d.modules as { title: string } | null)?.title ? `${(d.modules as { title: string }).title} · ` : ""}{d.file_name} · {groesse(d.size_bytes)}</span>
                    {d.description && <span className="block text-sm text-ink-soft">{d.description}</span>}
                  </span>
                  <a href={`/mein-bereich/datei/?material=${d.id}`} className="knopf-hell">Herunterladen</a>
                </li>
              ))}
            </ul>
          ) : <p className="karte text-ink-soft">Sobald die Kommission Reader, Präsentationen oder Handouts freischaltet, findest du sie hier.</p>}
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

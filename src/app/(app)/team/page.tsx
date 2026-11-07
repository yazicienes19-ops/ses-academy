import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, ClipboardList, ScanLine, ShieldCheck, Ticket, Users } from "lucide-react";
import { MailHinweis } from "@/components/team/MailHinweis";
import { TeamKopf } from "@/components/team/TeamKopf";
import { aufgabeUmschalten } from "@/lib/aktionen/modulwerkzeuge";
import { darf, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Team | SES Academy" };

const datumLang = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" });
const datum = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const tageBis = (tag: string, heute: string) => Math.round((Date.parse(`${tag}T12:00:00Z`) - Date.parse(`${heute}T12:00:00Z`)) / 86_400_000);
const tagLabel = (n: number) => (n === 0 ? "heute" : n === 1 ? "morgen" : `in ${n} Tagen`);

function Kennzahl({ wert, text, icon: Icon, href }: { wert: string; text: string; icon: typeof Users; href: string }) {
  return (
    <Link href={href} className="rounded-2xl bg-white/8 p-4 transition hover:bg-white/14">
      <Icon aria-hidden className="h-5 w-5 text-paper/60" />
      <span className="mt-3 block font-display text-3xl font-bold leading-none">{wert}</span>
      <span className="mt-1 block text-sm text-paper/70">{text}</span>
    </Link>
  );
}

/** Übersicht: nächstes Modul mit Stand der Vorbereitung, meine Aufgaben, Fristen, offene Freigaben. */
export default async function TeamStart({ searchParams }: PageProps<"/team">) {
  const staff = await requireStaff();
  const { fehler } = await searchParams;
  const jetzt = jetztMs();
  const heute = new Date(jetzt).toISOString().slice(0, 10);
  const inZweiWochen = new Date(jetzt + 14 * 86_400_000).toISOString().slice(0, 10);
  const supabase = await createClient();
  const vorname = staff.name.split(" ")[0];

  // Einlass-Helfer und auf ein Modul begrenzte Zugänge: nur die Eventtag-Werkzeuge
  if (!darf.orga(staff.role) || staff.modulId) {
    const { data: modul } = staff.modulId ? await supabase.from("modules").select("title").eq("id", staff.modulId).maybeSingle() : { data: null };
    return (
      <>
        <TeamKopf staff={staff} />
        <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
          <p className="text-sm text-ink-soft">{datumLang.format(new Date(jetzt))}</p>
          <h1 className="font-display mt-1 text-3xl font-bold lg:text-4xl">Salam, {vorname}</h1>
          {fehler === "rechte" && <p role="alert" className="mt-4 rounded-2xl bg-amber-100 p-4 text-amber-900">Für diesen Bereich fehlt deiner Rolle die Berechtigung.</p>}
          {staff.modulId && (
            <p className="mt-4 rounded-2xl bg-gelb-hell p-4 text-sm">
              Dein Zugang gilt nur für <strong>{modul?.title ?? "ein Modul"}</strong>{staff.gueltigBis ? ` bis ${datumLang.format(new Date(staff.gueltigBis))}` : ""}: Einlass und Regieplan dieses Moduls.
            </p>
          )}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link href="/team/einlass/" className="rounded-3xl bg-forest p-6 text-paper">
              <ScanLine aria-hidden className="h-7 w-7 text-signal" />
              <p className="font-display mt-6 text-2xl font-bold">Einlass öffnen</p>
              <p className="mt-1 text-paper/70">QR-Codes scannen oder Kurzcode eingeben</p>
            </Link>
            <Link href="/team/regieplan/" className="karte">
              <CalendarClock aria-hidden className="h-7 w-7 text-sage" />
              <p className="font-display mt-6 text-2xl font-bold">Regieplan</p>
              <p className="mt-1 text-ink-soft">Was läuft gerade, was kommt als Nächstes</p>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const alles = darf.alles(staff.role);
  const [{ data: naechste }, { data: meine }, { data: fristen }, { data: hotels }, { data: hausaufgaben }, { count: offeneFreigaben }] = await Promise.all([
    supabase.from("module_days").select("id, day, module:modules!inner(id, title, location, status, cancelled_at, slug)").gte("day", heute).eq("module.status", "published").is("module.cancelled_at", null).not("module.slug", "like", "probe-%").order("day").limit(1),
    supabase.from("tasks").select("id, title, due_date, module:modules(id, title)").eq("assignee_user", staff.userId).is("done_at", null).order("due_date", { nullsFirst: false }).limit(8),
    supabase.from("tasks").select("id, title, due_date, module:modules(id, title)").is("done_at", null).lte("due_date", inZweiWochen).order("due_date").limit(8),
    supabase.from("hotels").select("name, cancellation_deadline, module:modules(id, title)").gte("cancellation_deadline", heute).lte("cancellation_deadline", inZweiWochen),
    supabase.from("assignments").select("number, title, due_date").gte("due_date", heute).lte("due_date", inZweiWochen),
    alles ? supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "offen").neq("requested_by", staff.userId) : Promise.resolve({ count: 0 }),
  ]);
  const naechstes = naechste?.[0];

  // Stand der Vorbereitung für das nächste Modul
  let angemeldet = 0, tickets = 0, aufgabenOffen = 0, aufgabenGesamt = 0, programm = 0;
  if (naechstes) {
    const m = naechstes.module.id;
    const [{ count: a }, { data: t }, { data: auf }, { count: p }] = await Promise.all([
      // Anmeldungen lesen darf nur Admin/Vorstand; das Orga-Team bekommt die Zahl über die Einlass-Zählung des Tages
      alles
        ? supabase.from("registrations").select("id", { count: "exact", head: true }).eq("module_id", m).eq("status", "confirmed")
        : supabase.rpc("get_day_counts", { p_module_day_id: naechstes.id }).then(({ data }) => ({ count: (data as { expected?: number } | null)?.expected ?? 0 })),
      alles ? supabase.rpc("get_info_status", { p_module_id: m }) : Promise.resolve({ data: [] }),
      supabase.from("tasks").select("done_at").eq("module_id", m),
      supabase.from("program_items").select("id, module_days!inner(module_id)", { count: "exact", head: true }).eq("module_days.module_id", m),
    ]);
    angemeldet = a ?? 0;
    tickets = (t ?? []).filter((z) => z.info_status === "gesendet").length;
    aufgabenGesamt = (auf ?? []).length;
    aufgabenOffen = (auf ?? []).filter((z) => !z.done_at).length;
    programm = p ?? 0;
  }
  const ueberfaellig = (fristen ?? []).filter((f) => f.due_date && f.due_date < heute).length;

  return (
    <>
      <TeamKopf staff={staff} />
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
        <p className="text-sm text-ink-soft">{datumLang.format(new Date(jetzt))}</p>
        <h1 className="font-display mt-1 text-3xl font-bold lg:text-4xl">Salam, {vorname}</h1>
        {fehler === "rechte" && <p role="alert" className="mt-4 rounded-2xl bg-amber-100 p-4 text-amber-900">Für diesen Bereich fehlt deiner Rolle die Berechtigung.</p>}
        <MailHinweis className="mt-6" />

        {(offeneFreigaben ?? 0) > 0 && (
          <Link href="/team/freigaben/" className="mt-6 flex items-center gap-3 rounded-2xl bg-signal px-5 py-3.5 font-semibold text-ink transition hover:brightness-95">
            <ShieldCheck aria-hidden className="h-5 w-5" />
            <span className="mr-auto">{offeneFreigaben} {offeneFreigaben === 1 ? "Antrag wartet" : "Anträge warten"} auf deine Freigabe</span>
            <ArrowRight aria-hidden className="h-5 w-5" />
          </Link>
        )}

        <section className="mt-6 overflow-hidden rounded-[2rem] bg-forest p-6 text-paper lg:p-8">
          {naechstes ? (
            <>
              <div className="flex flex-wrap items-start gap-4">
                <div className="mr-auto">
                  <p className="text-xs font-semibold tracking-[0.14em] text-signal uppercase">Nächstes Modul · {tagLabel(tageBis(naechstes.day, heute))}</p>
                  <h2 className="font-display mt-2 text-3xl font-bold lg:text-4xl">{naechstes.module.title}</h2>
                  <p className="mt-1 text-paper/70">{datum.format(new Date(`${naechstes.day}T12:00:00Z`))}{naechstes.module.location ? ` · ${naechstes.module.location}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/team/einlass/" className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink"><ScanLine aria-hidden className="h-4 w-4" /> Einlass</Link>
                  <Link href={`/team/module/${naechstes.module.id}/${alles ? "" : "programm/"}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/16">Modul öffnen <ArrowRight aria-hidden className="h-4 w-4" /></Link>
                  {!alles && (
                    <>
                      <Link href={`/team/module/${naechstes.module.id}/hotel/`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/16">Logistik</Link>
                      <Link href={`/team/module/${naechstes.module.id}/zimmerplan/`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/16">Zimmerplan</Link>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kennzahl icon={Users} wert={String(angemeldet)} text="angemeldet" href={alles ? `/team/module/${naechstes.module.id}/` : "/team/einlass/"} />
                {alles && <Kennzahl icon={Ticket} wert={`${tickets}/${angemeldet}`} text="Info-Mails verschickt" href={`/team/module/${naechstes.module.id}/infomail/`} />}
                <Kennzahl icon={ClipboardList} wert={aufgabenGesamt ? `${aufgabenGesamt - aufgabenOffen}/${aufgabenGesamt}` : "–"} text={aufgabenGesamt ? "Aufgaben erledigt" : "Checkliste anlegen"} href={`/team/module/${naechstes.module.id}/checkliste/`} />
                <Kennzahl icon={CalendarClock} wert={String(programm)} text="Programmpunkte" href={`/team/module/${naechstes.module.id}/programm/`} />
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-signal uppercase">Nächstes Modul</p>
              <p className="font-display mt-2 text-2xl font-bold">Noch kein Modul geplant</p>
              {alles && <Link href="/team/module/" className="mt-4 inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink">Modul anlegen <ArrowRight aria-hidden className="h-4 w-4" /></Link>}
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="karte">
            <h2 className="font-display text-lg font-bold">Meine Aufgaben</h2>
            {(meine ?? []).length === 0 ? <p className="mt-2 text-ink-soft">Nichts offen. Aufgaben weist man in der Checkliste eines Moduls oder in einer Sitzung zu.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {(meine ?? []).map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <form action={aufgabeUmschalten}>
                      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="erledigt" value="1" /><input type="hidden" name="zurueck" value="/team/" />
                      <button type="submit" aria-label={`„${a.title}“ erledigt`} className="mt-0.5 h-5 w-5 rounded-full ring-2 ring-ink/25 transition hover:bg-gruen-hell hover:ring-sage" />
                    </form>
                    <span className="min-w-0">
                      <span className="block font-medium">{a.title}</span>
                      <span className={`block text-xs ${a.due_date && a.due_date < heute ? "font-semibold text-rot" : "text-ink-soft"}`}>
                        {[a.module?.title, a.due_date && datum.format(new Date(`${a.due_date}T12:00:00Z`))].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="karte">
            <div className="flex items-center gap-2">
              <h2 className="font-display mr-auto text-lg font-bold">Fristen bis {datum.format(new Date(`${inZweiWochen}T12:00:00Z`))}</h2>
              {ueberfaellig > 0 && <span className="chip bg-rot-hell text-rot"><CircleAlert aria-hidden className="mr-1 h-3.5 w-3.5" />{ueberfaellig} überfällig</span>}
            </div>
            <ul className="mt-3 divide-y divide-line text-sm">
              {(hotels ?? []).map((h) => (
                <li key={h.name} className="flex gap-3 py-2.5 font-semibold text-rot">
                  <span className="w-20 shrink-0">{datum.format(new Date(`${h.cancellation_deadline}T12:00:00Z`))}</span><span>Stornofrist {h.name} ({h.module?.title})</span>
                </li>
              ))}
              {(hausaufgaben ?? []).map((h) => (
                <li key={h.number} className="flex gap-3 py-2.5">
                  <span className="w-20 shrink-0 text-ink-soft">{datum.format(new Date(`${h.due_date}T12:00:00Z`))}</span><span>Hausaufgabe {h.number}: {h.title}</span>
                </li>
              ))}
              {(fristen ?? []).map((a) => (
                <li key={a.id} className={`flex gap-3 py-2.5 ${a.due_date && a.due_date < heute ? "text-rot" : ""}`}>
                  <span className="w-20 shrink-0 text-ink-soft">{a.due_date && datum.format(new Date(`${a.due_date}T12:00:00Z`))}</span>
                  {a.module ? <Link href={`/team/module/${a.module.id}/checkliste/`} className="hover:underline">{a.title}</Link> : <span>{a.title}</span>}
                </li>
              ))}
              {!(hotels ?? []).length && !(hausaufgaben ?? []).length && !(fristen ?? []).length && <li className="py-2.5 text-ink-soft">Keine Fristen in den nächsten zwei Wochen.</li>}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}

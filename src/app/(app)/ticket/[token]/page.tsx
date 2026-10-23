import type { Metadata } from "next";
import { jetztMs } from "@/lib/zeit";
import { notFound } from "next/navigation";
import { locale } from "@/i18n/typ";
import { perTicketAbmelden } from "@/lib/aktionen/ticket";
import { portalTexte, sprachOder } from "@/lib/portal-texte";
import { ladeTicket, modulZeitraum } from "@/lib/teilnahme";
import { istToken, kurzcodeAnzeige, qrSvg } from "@/lib/tickets";

export const metadata: Metadata = { title: "Ticket | SES Academy", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function TicketSeite({ params, searchParams }: PageProps<"/ticket/[token]">) {
  const { token } = await params;
  const { hinweis } = await searchParams;
  if (!istToken(token)) notFound();
  const daten = await ladeTicket({ token: token.toLowerCase() });
  if (!daten) notFound();

  const p = daten.participant;
  const l = sprachOder(p.preferred_language);
  const t = portalTexte[l];
  const svg = await qrSvg(p.checkin_token);
  const jetzt = jetztMs();
  const meldung = hinweis === "abgemeldet" ? t.abgemeldet : hinweis === "zu-spaet" ? t.zuSpaet : hinweis === "fehler" ? t.unbekannt : null;

  return (
    <main lang={l} className="mx-auto max-w-lg px-4 py-10">
      <img src="/brand/ses-logo.png" alt="SES Academy" className="h-10 w-auto" />
      <h1 className="mt-8 font-display text-4xl font-bold">{t.ticketTitel}</h1>
      <p className="mt-1 text-lg">{p.first_name} {p.last_name}</p>
      <p className="mt-3 text-ink-soft">{t.ticketIntro}</p>

      {meldung && <p role="status" className="mt-6 rounded-2xl bg-white/80 p-4 ring-1 ring-line">{meldung}</p>}

      <section className="mt-6 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-line">
        <div className="mx-auto w-full max-w-[260px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-4 text-sm text-ink-soft">{t.kurzcode}</p>
        <p className="font-mono text-3xl font-bold tracking-[0.15em]">{kurzcodeAnzeige(p.short_code ?? "")}</p>
        <p className="mt-2 text-sm text-ink-soft">{t.kurzcodeHilfe}</p>
      </section>
      <p className="mt-3 text-center text-sm text-ink-soft">{t.lesezeichen}</p>

      <h2 className="mt-10 font-display text-2xl font-bold">{t.moduleTitel}</h2>
      <ul className="mt-4 grid gap-3">
        {daten.module.filter((m) => !m.abgesagt).map((m) => {
          const kommt = m.beginn !== null && Date.parse(m.beginn) > jetzt;
          const kannAbmelden = kommt && (m.status === "confirmed" || m.status === "waitlist" || m.status === "pending");
          const besuchteTage = m.tage.filter((d) => d.besucht).length;
          return (
            <li key={m.registrationId} className="rounded-3xl bg-white/80 p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-bold">{m.titel}</p>
                  <p className="text-sm text-ink-soft">{modulZeitraum(m, locale[l])} · {m.ort ?? t.ortOffen}</p>
                </div>
                <span className="rounded-full bg-paper-deep px-3 py-1 text-sm font-semibold">
                  {besuchteTage > 0 ? `${t.besucht} (${besuchteTage}/${m.tage.length})` : t.status[m.status]}
                </span>
              </div>
              {!m.ticketNoetig && <p className="mt-2 text-sm text-ink-soft">{t.ohneTicket}</p>}
              {kannAbmelden && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold">{t.abmelden}</summary>
                  <form action={perTicketAbmelden} className="mt-3 grid gap-2">
                    <input type="hidden" name="token" value={p.checkin_token} />
                    <input type="hidden" name="module_id" value={m.moduleId} />
                    <label htmlFor={`grund-${m.moduleId}`} className="text-sm">{t.grund}</label>
                    <textarea id={`grund-${m.moduleId}`} name="grund" rows={2} maxLength={500} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-line" />
                    <button type="submit" className="justify-self-start rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">{t.abmeldenBestaetigen}</button>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

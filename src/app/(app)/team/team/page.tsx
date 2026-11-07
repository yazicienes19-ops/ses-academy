import type { Metadata } from "next";
import Link from "next/link";
import { Hinweis } from "@/components/team/Hinweis";
import { MailHinweis } from "@/components/team/MailHinweis";
import { TeamKopf } from "@/components/team/TeamKopf";
import { zweiterFaktorPflicht } from "@/lib/aktionen/team";
import { faktorZuruecksetzen, mitgliedAnlegen, mitgliedEntfernen, rolleAendern, teamZugangAusfuehren, zugangZeitraum } from "@/lib/aktionen/teamverwaltung";
import { requireStaff, rollenName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

export const metadata: Metadata = { title: "Team | SES Academy" };

const hinweise = {
  angelegt: { text: "Konto angelegt. Die Person hat eine Willkommensmail mit der Anleitung zur Anmeldung bekommen.", gut: true },
  "angelegt-ohne-mail": { text: "Konto angelegt, aber die Willkommensmail ging nicht raus. Bitte der Person Bescheid geben: Anmeldung unter /mein-bereich/login/ mit E-Mail und Code.", gut: false },
  "angelegt-mail-aus": { text: "Konto angelegt. Der Mailversand ist noch nicht eingerichtet, die Willkommensmail ging deshalb nicht raus. Bitte der Person Bescheid geben: Anmeldung unter /mein-bereich/login/ mit E-Mail und Code.", gut: false },
  "zugang-gespeichert": { text: "Zugang gespeichert.", gut: true },
  unveraendert: { text: "Nichts geändert.", gut: true },
  "modul-rolle": { text: "Auf ein Modul begrenzen lassen sich nur Orga-Team und Einlass-Helfer. Vorstand und Admin haben immer Zugang zu allem.", gut: false },
  beantragt: { text: "Beantragt. Ein zweiter Admin gibt unter „Freigaben“ frei, danach hier ausführen.", gut: true },
  abgelaufen: { text: "Die Freigabe ist älter als 24 Stunden. Bitte neu beantragen.", gut: false },
  gespeichert: { text: "Rolle gespeichert.", gut: true },
  entfernt: { text: "Konto entfernt.", gut: true },
  existiert: { text: "Zu dieser E-Mail gibt es schon ein Konto.", gut: false },
  eingabe: { text: "Bitte E-Mail, Name und Rolle angeben.", gut: false },
  "letzter-admin": { text: "Du bist der letzte Admin. Mach zuerst jemand anderen zum Admin.", gut: false },
  selbst: { text: "Das eigene Konto kann man nicht entfernen.", gut: false },
  "modul-ohne-termin": { text: "Das Modul hat noch keine Termine.", gut: false },
  "faktor-an": { text: "Zweiter Faktor ist jetzt Pflicht. Alle Teamkonten richten ihn bei der nächsten Anmeldung ein.", gut: true },
  "faktor-aus": { text: "Zweiter Faktor ist keine Pflicht mehr.", gut: true },
  "erst-selbst": { text: "Bitte zuerst selbst den zweiten Faktor einrichten und damit anmelden (unten „Für mich einrichten“).", gut: false },
  "faktor-zurueckgesetzt": { text: "Zweiter Faktor zurückgesetzt und alle Sitzungen beendet.", gut: true },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const bis = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

const rechte: Record<keyof typeof rollenName, string> = {
  admin: "Alles, auch Team-Zugänge verwalten und freigeben",
  vorstand: "Alles außer Team-Zugängen: Module, Bewerbungen, Teilnehmende, Import, Auswertung, Nachrichten, Freigaben",
  orga_team: "Einlass mit Liste und Walk-in, Regieplan, Teilnehmende und Anrufe, Logistik und Zimmer, Hausaufgaben, Dokumente, Sitzungen",
  checkin_helper: "Nur Scanner und Kurzcode, Regieplan lesen, keine Kontaktdaten",
};

export default async function TeamVerwaltung({ searchParams }: PageProps<"/team/team">) {
  const staff = await requireStaff("admin");
  const { hinweis } = await searchParams;
  const supabase = await createClient();
  const [{ data: mitglieder }, { data: module }] = await Promise.all([
    supabase.from("staff_members").select("user_id, role, display_name, created_at, valid_from, valid_until, label, module_id, modul:modules(title)").order("display_name"),
    supabase.from("modules").select("id, title, module_days!inner(ends_at)").eq("status", "published").is("cancelled_at", null).gt("module_days.ends_at", new Date(jetztMs()).toISOString()),
  ]);
  const kommendeModule = [...new Map((module ?? []).map((m) => [m.id, m])).values()];
  // Auswahl zeigt den aktuellen Stand: das Modul, „unbefristet“ oder (ältere Zugänge) den bisherigen Zeitraum
  const modulAuswahl = (name: string, aktuell?: { module_id: string | null; valid_until: string | null; label: string | null; modulTitel?: string | null }) => {
    const bisher = aktuell && !aktuell.module_id && aktuell.valid_until;
    const fremd = aktuell?.module_id && !kommendeModule.some((m) => m.id === aktuell.module_id);
    return (
      <select name={name} defaultValue={aktuell?.module_id ?? (bisher ? "__bisher" : "")} className={feld} aria-label="Zugang">
        <option value="">alle Module, unbefristet</option>
        {bisher && <option value="__bisher">wie bisher: nur Zeitraum{aktuell.label ? ` (${aktuell.label})` : ""}</option>}
        {fremd && <option value={aktuell.module_id!}>nur {aktuell.modulTitel ?? "früheres Modul"}</option>}
        {kommendeModule.map((m) => <option key={m.id} value={m.id}>nur {m.title}</option>)}
      </select>
    );
  };
  const jetzt = jetztMs();
  const [{ data: pflicht }, { data: aal }, { data: freigegeben }] = await Promise.all([
    supabase.rpc("mfa_required"), supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.from("approvals").select("id, summary, decided_at").eq("action", "team_zugang").eq("status", "freigegeben").eq("requested_by", staff.userId),
  ]);
  const ausfuehrbar = (freigegeben ?? []).filter((f) => f.decided_at && Date.parse(f.decided_at) > jetzt - 86_400_000);
  const feld = "rounded-2xl bg-white px-4 py-3 ring-1 ring-line";
  const rollenAuswahl = (name: string, wert?: string) => (
    <select name={name} defaultValue={wert ?? "checkin_helper"} className={feld}>
      {Object.entries(rollenName).map(([w, n]) => <option key={w} value={w}>{n}</option>)}
    </select>
  );

  return (
    <>
      <TeamKopf staff={staff} aktiv="team" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Team</h1>
        <Hinweis code={hinweis} texte={hinweise} />
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(rechte).map(([r, text]) => (
            <div key={r}><dt className="inline font-semibold">{rollenName[r as keyof typeof rollenName]}: </dt><dd className="inline text-ink-soft">{text}</dd></div>
          ))}
        </dl>
        {ausfuehrbar.map((f) => (
          <form key={f.id} action={teamZugangAusfuehren} className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-gruen-hell p-4">
            <input type="hidden" name="id" value={f.id} />
            <p className="mr-auto text-sm font-semibold">Freigegeben: {f.summary}</p>
            <button type="submit" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-paper">Jetzt ausführen</button>
          </form>
        ))}
        <ul className="mt-6 divide-y divide-line rounded-3xl bg-white/80 px-5 ring-1 ring-line">
          {(mitglieder ?? []).map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-4">
              <p className="mr-auto font-semibold">
                {m.display_name}{m.user_id === staff.userId ? " (du)" : ""}
                <span className="block text-sm font-normal text-ink-soft">{rollenName[m.role]}{m.module_id ? ` · nur ${m.modul?.title ?? "ein Modul"} (Einlass und Regieplan)` : ""}</span>
                {m.valid_until && (
                  <span className={`block text-sm font-normal ${Date.parse(m.valid_until) <= jetzt ? "text-red-900" : "text-ink-soft"}`}>
                    {m.valid_from && Date.parse(m.valid_from) > jetzt ? `gültig ab ${bis.format(new Date(m.valid_from))} Uhr · ` : ""}
                    {Date.parse(m.valid_until) <= jetzt ? "abgelaufen" : `gültig bis ${bis.format(new Date(m.valid_until))} Uhr`}
                  </span>
                )}
              </p>
              {m.user_id !== staff.userId && (m.role === "orga_team" || m.role === "checkin_helper" || m.valid_until) && (
                <form action={zugangZeitraum} className="flex flex-wrap gap-2">
                  <input type="hidden" name="user_id" value={m.user_id} />
                  {modulAuswahl("modul", { module_id: m.module_id, valid_until: m.valid_until, label: m.label, modulTitel: m.modul?.title })}
                  <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line">Zugang speichern</button>
                </form>
              )}
              <form action={rolleAendern} className="flex flex-wrap gap-2">
                <input type="hidden" name="user_id" value={m.user_id} />
                {rollenAuswahl("rolle", m.role)}
                <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-line">Speichern</button>
              </form>
              {m.user_id !== staff.userId && (
                <form action={faktorZuruecksetzen}>
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button type="submit" className="text-sm font-semibold text-ink-soft underline">2. Faktor zurücksetzen</button>
                </form>
              )}
              {m.user_id !== staff.userId && (
                <form action={mitgliedEntfernen}>
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button type="submit" className="text-sm font-semibold text-red-900 underline">entfernen</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Zweiter Faktor</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {pflicht ? "Pflicht für alle Teamkonten: Teamrechte gelten nur nach Eingabe des Codes aus der Authenticator-App." : "Noch keine Pflicht. Einschalten, sobald alle Admins ihn eingerichtet haben."}
            {" "}Du selbst: {aal?.currentLevel === "aal2" ? "mit zweitem Faktor angemeldet." : "ohne zweiten Faktor angemeldet."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {aal?.currentLevel !== "aal2" && <Link href="/team/zweiter-faktor/" className="rounded-full bg-white px-5 py-2.5 font-semibold ring-1 ring-line">Für mich einrichten</Link>}
            <form action={zweiterFaktorPflicht}>
              <input type="hidden" name="an" value={pflicht ? "0" : "1"} />
              <button type="submit" className={`rounded-full px-5 py-2.5 font-semibold ${pflicht ? "bg-white ring-1 ring-line" : "bg-ink text-paper"}`}>{pflicht ? "Pflicht ausschalten" : "Pflicht einschalten"}</button>
            </form>
          </div>
        </section>
        <section className="mt-8 rounded-3xl bg-white/60 p-6 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Team-Zugang beantragen</h2>
          <form action={mitgliedAnlegen} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Name" className={feld} />
            <input name="email" type="email" required placeholder="E-Mail" className={feld} />
            {rollenAuswahl("rolle")}
            {modulAuswahl("modul")}
            <button type="submit" className="justify-self-start rounded-full bg-ink px-6 py-3 font-semibold text-paper">Zur Freigabe vorlegen</button>
            <p className="text-sm text-ink-soft sm:col-span-2">
              Ein zweiter Admin gibt den Zugang frei; danach bekommt die Person eine Willkommensmail. Ein Passwort ist nicht nötig: Anmeldung mit E-Mail und Code.
              „Nur &lt;Modul&gt;“ (für Orga-Team und Einlass-Helfer): Zugang nur zu Einlass und Regieplan dieses Moduls und nur vom Einlassbeginn am ersten bis 6 Stunden nach dem letzten Modultag.
            </p>
            <MailHinweis knapp className="sm:col-span-2" />
          </form>
        </section>
      </main>
    </>
  );
}

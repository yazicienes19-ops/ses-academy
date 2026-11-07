import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulReiter } from "@/components/team/ModulReiter";
import { TeamKopf } from "@/components/team/TeamKopf";
import { MailHinweis } from "@/components/team/MailHinweis";
import { infoMailAnAlle, infoMailTest } from "@/lib/aktionen/infomail";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { infoMailInhalt, ladeInfoMail } from "@/lib/infomail";
import { mailBereit, seitenUrl } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";
import { qrPng } from "@/lib/tickets";

export const metadata: Metadata = { title: "Info-Mail | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  bestaetigen: { text: "Bitte zuerst bestätigen, dass die Vorschau geprüft ist. Es wurde nichts verschickt.", gut: false },
  "test-gesendet": { text: "Testmail an deine eigene Adresse geschickt. Sie zählt nicht als versendet.", gut: true },
  "test-fehler": { text: "Die Testmail konnte nicht verschickt werden.", gut: false },
  "keine-eigene-mail": { text: "Für dein Konto ist keine E-Mail-Adresse hinterlegt.", gut: false },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  abgesagt: { text: "Das Modul ist abgesagt. Es wurde nichts verschickt.", gut: false },
};

/**
 * Info-Mail eines Moduls (Admin/Vorstand): Vorschau für jede angemeldete Person, Testmail an sich selbst,
 * Versand an alle mit Bestätigung. Eine Mail mit Ticket, Ort, Übernachtung und Tagesordnung.
 */
export default async function InfoMail({ params, searchParams }: PageProps<"/team/module/[id]/infomail">) {
  const staff = await requireStaff("alles");
  const { id } = await params;
  const sp = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: status }] = await Promise.all([
    supabase.from("modules").select("id, title, cancelled_at").eq("id", id).maybeSingle(),
    supabase.rpc("get_info_status", { p_module_id: id }),
  ]);
  if (!modul) notFound();
  const liste = status ?? [];
  const gewaehlt = typeof sp.person === "string" && istToken(sp.person) ? sp.person : undefined;
  const person = liste.find((z) => z.participant_id === gewaehlt) ?? liste.find((z) => z.rsvp === "zugesagt" && z.email) ?? liste.find((z) => z.email) ?? liste[0];
  const daten = person ? await ladeInfoMail(person.participant_id, id) : null;
  const inhalt = daten ? infoMailInhalt(daten, seitenUrl(`/ticket/${daten.p.link_token}/`)) : null;
  // In der Vorschau steckt der QR-Code direkt im HTML (in der echten Mail als Anhang)
  const vorschau = inhalt && daten ? inhalt.html.replace("cid:ticket-qr", `data:image/png;base64,${(await qrPng(daten.p.checkin_token)).toString("base64")}`) : null;

  const zahl = (s: string) => liste.filter((z) => z.info_status === s).length;
  const empfaenger = (nurZugesagt: boolean) => liste.filter((z) => (z.info_status === "offen" || z.info_status === "fehlgeschlagen") && z.rsvp !== "abgesagt" && (!nurZugesagt || z.rsvp === "zugesagt")).length;
  const versand = typeof sp.hinweis === "string" && sp.hinweis.startsWith("info-") ? sp.hinweis.split("-").slice(1).map(Number) : null;

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" breit />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <ModulReiter id={id} titel={modul.title} aktiv="" />
        <Hinweis code={sp.hinweis} texte={hinweise} />
        {versand && (
          <p role="status" className={`mt-4 rounded-2xl p-4 ${versand[1] ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-950"}`}>
            {versand[0]} Info-Mails verschickt{versand[1] ? `, ${versand[1]} fehlgeschlagen (unten in der Liste).` : "."}
          </p>
        )}

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="space-y-6">
            <section className="karte">
              <h2 className="font-display text-2xl font-bold">Info-Mail</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Eine Mail mit allem: Ticket (QR und Kurzcode), Termin und Ort, Übernachtung mit Hotel und Zimmer (das Zimmer nur, wenn es unter Logistik freigegeben ist) und die Tagesordnung.
                Deutsch oder Türkisch nach der Sprache im Profil.
              </p>
              <p className="mt-3">
                {zahl("gesendet")} von {liste.length} haben sie bekommen
                {zahl("fehlgeschlagen") > 0 && ` · ${zahl("fehlgeschlagen")} fehlgeschlagen`}
                {zahl("keine_mail") > 0 && ` · ${zahl("keine_mail")} ohne E-Mail-Adresse`}
              </p>
            </section>

            <section className="karte">
              <h3 className="font-display text-xl font-bold">An alle senden</h3>
              {modul.cancelled_at ? (
                <p className="mt-3 rounded-2xl bg-rot-hell p-3 text-sm font-semibold text-rot">Das Modul ist abgesagt. Info-Mails gehen dafür nicht mehr raus.</p>
              ) : !mailBereit() ? <MailHinweis knapp className="mt-3" /> : (
                <form action={infoMailAnAlle} className="mt-3 space-y-3">
                  <input type="hidden" name="module_id" value={id} />
                  <fieldset className="space-y-1.5 text-sm">
                    <label className="flex gap-2"><input type="radio" name="empfaenger" value="zugesagt" defaultChecked className="mt-0.5" /> Nur an Zugesagte ({empfaenger(true)} offen)</label>
                    <label className="flex gap-2"><input type="radio" name="empfaenger" value="alle" className="mt-0.5" /> An alle Angemeldeten ohne Absage ({empfaenger(false)} offen)</label>
                  </fieldset>
                  <label className="flex gap-2 rounded-2xl bg-gelb-hell p-3 text-sm">
                    <input type="checkbox" name="bestaetigt" value="ja" required className="mt-0.5" />
                    Ich habe die Vorschau geprüft. Die Mail geht jetzt wirklich raus; wer sie schon bekommen hat, bekommt sie nicht noch einmal.
                  </label>
                  <button className="knopf">Info-Mail jetzt senden</button>
                </form>
              )}
            </section>

            <section className="karte">
              <h3 className="font-display text-xl font-bold">Vorschau für</h3>
              <form className="mt-3 flex gap-2" action={`/team/module/${id}/infomail/`}>
                <select name="person" defaultValue={person?.participant_id} className="feld" aria-label="Person">
                  {liste.map((z) => <option key={z.participant_id} value={z.participant_id}>{z.name}{z.rsvp === "zugesagt" ? " · zugesagt" : z.rsvp === "abgesagt" ? " · abgesagt" : ""}{!z.email ? " · ohne E-Mail" : ""}</option>)}
                </select>
                <button className="knopf-hell">Anzeigen</button>
              </form>
              {person && mailBereit() && (
                <form action={infoMailTest} className="mt-3">
                  <input type="hidden" name="module_id" value={id} /><input type="hidden" name="participant_id" value={person.participant_id} />
                  <button className="text-sm font-semibold underline">Diese Mail als Test an mich schicken</button>
                </form>
              )}
            </section>

            {liste.some((z) => z.info_status === "fehlgeschlagen") && (
              <section className="karte">
                <h3 className="font-display text-xl font-bold">Fehlgeschlagen</h3>
                <ul className="mt-2 divide-y divide-line text-sm">
                  {liste.filter((z) => z.info_status === "fehlgeschlagen").map((z) => (
                    <li key={z.participant_id} className="py-2"><Link href={`/team/teilnehmende/${z.participant_id}/`} className="font-semibold underline">{z.name}</Link> · {z.last_error}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section className="karte !p-0 overflow-hidden">
            {inhalt && vorschau ? (
              <>
                <div className="border-b border-line px-5 py-4 text-sm">
                  <p><span className="text-ink-soft">An:</span> {person?.email ?? <span className="text-rot">keine E-Mail-Adresse</span>}</p>
                  <p><span className="text-ink-soft">Betreff:</span> <span className="font-semibold">{inhalt.betreff}</span></p>
                </div>
                <iframe title="Vorschau der Info-Mail" srcDoc={vorschau} sandbox="" className="h-[80vh] w-full bg-[#f3efe4]" />
                <details className="border-t border-line px-5 py-3 text-sm">
                  <summary className="cursor-pointer font-semibold">Textfassung (für Mailprogramme ohne HTML)</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans">{inhalt.text}</pre>
                </details>
              </>
            ) : <p className="p-6 text-ink-soft">Für dieses Modul ist noch niemand angemeldet.</p>}
          </section>
        </div>
      </main>
    </>
  );
}

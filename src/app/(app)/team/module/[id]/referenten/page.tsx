import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hinweis } from "@/components/team/Hinweis";
import { ModulReiter } from "@/components/team/ModulReiter";
import { TeamKopf } from "@/components/team/TeamKopf";
import { einladungEntfernen, gaesteblattSpeichern, referentAnlegen, referentEinladen } from "@/lib/aktionen/modulwerkzeuge";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { seitenUrl } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Referenten | SES Academy" };

const hinweise: Record<string, { text: string; gut: boolean }> = {
  betrag: { text: "Honorar oder Reisekosten bitte als Betrag eingeben, z. B. 1.250,50. Nichts gespeichert.", gut: false },
  "referent-angelegt": { text: "Im Pool angelegt und für dieses Modul vorgemerkt.", gut: true },
  eingeladen: { text: "Für dieses Modul vorgemerkt.", gut: true },
  "schon-eingeladen": { text: "Diese Person ist mit dieser Rolle schon dabei.", gut: false },
  gespeichert: { text: "Gästeblatt gespeichert.", gut: true },
  entfernt: { text: "Aus dem Modul entfernt (bleibt im Pool).", gut: true },
  eingabe: { text: "Bitte die Angaben prüfen.", gut: false },
  fehler: { text: "Das hat nicht geklappt.", gut: false },
};

const statusName = { idee: "Idee", angefragt: "angefragt", zugesagt: "zugesagt", abgesagt: "abgesagt", bestaetigt: "bestätigt" } as const;
const statusFarbe = { idee: "bg-paper-deep", angefragt: "bg-gelb-hell", zugesagt: "bg-gruen-hell", abgesagt: "bg-rot-hell", bestaetigt: "bg-emerald-200" } as const;
const rollen: Record<string, string> = { vortrag: "Vortrag", podium: "Podium", laendergruppe: "Ländergruppe", workshop: "Workshop", grusswort: "Grußwort", moderation: "Moderation", diskussion: "Diskussion" };
const tagVon = (iso: string | null) => (iso ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(iso)) : "");
const uhrVon = (iso: string | null) => (iso ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso)) : "");

/** Referenten eines Moduls mit Status und Gästeblatt; neue Personen kommen in den gemeinsamen Pool. */
export default async function Referenten({ params, searchParams }: PageProps<"/team/module/[id]/referenten">) {
  const staff = await requireStaff("orga");
  const { id } = await params;
  const { hinweis } = await searchParams;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: einladungen }, { data: pool }] = await Promise.all([
    supabase.from("modules").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("module_speakers").select("id, role, topic, status, host_name, arrival_at, arrival_info, departure_at, hotel_info, tech_needs, slides_received, bio_received, fee, travel_costs, notes, slides_path, photo_path, speaker:speakers(id, name, affiliation, email, phone, bio)").eq("module_id", id).order("created_at"),
    supabase.from("speakers").select("id, name, affiliation, topics").order("name"),
  ]);
  if (!modul) notFound();
  const liste = einladungen ?? [];
  // Gast-Links sind für Teamkonten nicht lesbar; nach der Rollenprüfung oben liest der Server sie
  const { data: links } = await createAdminClient().from("module_speakers").select("id, access_token").eq("module_id", id);
  const linkVon = new Map((links ?? []).map((l) => [l.id, seitenUrl(`/gast/${l.access_token}/`)]));
  const zaehlung = Object.keys(statusName).map((s) => ({ s, n: liste.filter((e) => e.status === s).length })).filter((z) => z.n > 0);
  const offen = liste.filter((e) => (e.status === "zugesagt" || e.status === "bestaetigt") && (!e.slides_received || !e.bio_received || !e.arrival_at));

  return (
    <>
      <TeamKopf staff={staff} aktiv="module" breit />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <ModulReiter id={id} titel={modul.title} aktiv="referenten/" />
        <Hinweis code={hinweis} texte={hinweise} />
        <p className="mt-2 text-ink-soft">
          {liste.length ? zaehlung.map((z) => `${z.n} ${statusName[z.s as keyof typeof statusName]}`).join(" · ") : "Noch niemand vorgemerkt."}
          {offen.length > 0 && ` · bei ${offen.length} fehlen noch Anreise, Folien oder Kurzprofil`}
        </p>

        <div className="mt-6 space-y-4">
          {liste.map((e) => (
            <details key={e.id} className="karte">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <span className="mr-auto">
                  <span className="font-display text-lg font-bold">{e.speaker.name}</span>
                  <span className="block text-sm text-ink-soft">{rollen[e.role]}{e.topic ? ` · ${e.topic}` : ""}{e.speaker.affiliation ? ` · ${e.speaker.affiliation}` : ""}</span>
                </span>
                <span className={`chip ${statusFarbe[e.status]}`}>{statusName[e.status]}</span>
                {(e.status === "zugesagt" || e.status === "bestaetigt") && (
                  <span className="text-xs text-ink-soft">{[e.arrival_at ? "Anreise ✓" : "Anreise fehlt", e.slides_received ? "Folien ✓" : "Folien fehlen", e.bio_received ? "Profil ✓" : "Profil fehlt"].join(" · ")}</span>
                )}
              </summary>
              <form action={gaesteblattSpeichern} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-4">
                <input type="hidden" name="module_id" value={id} /><input type="hidden" name="id" value={e.id} />
                <div><label className="etikett" htmlFor={`st-${e.id}`}>Status</label>
                  <select id={`st-${e.id}`} name="status" defaultValue={e.status} className="feld">{Object.entries(statusName).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="sm:col-span-2"><label className="etikett" htmlFor={`th-${e.id}`}>Thema</label><input id={`th-${e.id}`} name="topic" defaultValue={e.topic} className="feld" /></div>
                <div><label className="etikett" htmlFor={`ho-${e.id}`}>Betreuung aus dem Team</label><input id={`ho-${e.id}`} name="host_name" defaultValue={e.host_name ?? ""} className="feld" /></div>
                <div><label className="etikett" htmlFor={`at-${e.id}`}>Anreise</label><input id={`at-${e.id}`} name="arrival_tag" type="date" defaultValue={tagVon(e.arrival_at)} className="feld" /></div>
                <div><label className="etikett" htmlFor={`az-${e.id}`}>Uhrzeit</label><input id={`az-${e.id}`} name="arrival_zeit" type="time" defaultValue={uhrVon(e.arrival_at)} className="feld" /></div>
                <div className="sm:col-span-2"><label className="etikett" htmlFor={`ai-${e.id}`}>Anreise wie, Abholung</label><input id={`ai-${e.id}`} name="arrival_info" defaultValue={e.arrival_info} className="feld" placeholder="z. B. ICE 10:12 Köln Messe/Deutz, Abholung durch …" /></div>
                <div><label className="etikett" htmlFor={`dt-${e.id}`}>Abreise</label><input id={`dt-${e.id}`} name="departure_tag" type="date" defaultValue={tagVon(e.departure_at)} className="feld" /></div>
                <div><label className="etikett" htmlFor={`dz-${e.id}`}>Uhrzeit</label><input id={`dz-${e.id}`} name="departure_zeit" type="time" defaultValue={uhrVon(e.departure_at)} className="feld" /></div>
                <div className="sm:col-span-2"><label className="etikett" htmlFor={`hi-${e.id}`}>Hotel</label><input id={`hi-${e.id}`} name="hotel_info" defaultValue={e.hotel_info} className="feld" /></div>
                <div className="sm:col-span-2"><label className="etikett" htmlFor={`te-${e.id}`}>Technik</label><input id={`te-${e.id}`} name="tech_needs" defaultValue={e.tech_needs} className="feld" placeholder="Beamer, Mikrofon, Laptop, Übersetzung" /></div>
                <div><label className="etikett" htmlFor={`fe-${e.id}`}>Honorar (€)</label><input id={`fe-${e.id}`} name="fee" inputMode="decimal" defaultValue={e.fee ?? ""} className="feld" /></div>
                <div><label className="etikett" htmlFor={`tc-${e.id}`}>Reisekosten (€)</label><input id={`tc-${e.id}`} name="travel_costs" inputMode="decimal" defaultValue={e.travel_costs ?? ""} className="feld" /></div>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="slides_received" defaultChecked={e.slides_received} /> Folien erhalten</label>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="bio_received" defaultChecked={e.bio_received} /> Kurzprofil und Foto erhalten</label>
                <div className="sm:col-span-2"><label className="etikett" htmlFor={`no-${e.id}`}>Notizen</label><input id={`no-${e.id}`} name="notes" defaultValue={e.notes} className="feld" /></div>
                <p className="text-sm text-ink-soft sm:col-span-4">{[e.speaker.email, e.speaker.phone].filter(Boolean).join(" · ")}</p>
                {(e.status === "zugesagt" || e.status === "bestaetigt") && (
                  <p className="text-sm sm:col-span-4">
                    <span className="font-semibold">Link für den Gast</span> (Ablauf, Anreise, Hotel; Folien, Foto und Kurzprofil hochladen):{" "}
                    <span className="break-all font-mono text-xs">{linkVon.get(e.id)}</span>
                    {e.slides_path && <> · <a href={`/team/referenten/${e.id}/datei/?art=folien`} target="_blank" rel="noopener" className="link">Folien</a></>}
                    {e.photo_path && <> · <a href={`/team/referenten/${e.id}/datei/?art=foto`} target="_blank" rel="noopener" className="link">Foto</a></>}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 sm:col-span-4">
                  <button type="submit" className="knopf">Speichern</button>
                </div>
              </form>
              <form action={einladungEntfernen} className="mt-2">
                <input type="hidden" name="module_id" value={id} /><input type="hidden" name="id" value={e.id} />
                <button type="submit" className="text-sm font-semibold text-ink-soft underline">aus diesem Modul entfernen</button>
              </form>
            </details>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="karte">
            <h2 className="font-display text-xl font-bold">Aus dem Pool vormerken</h2>
            {(pool ?? []).length === 0 ? <p className="mt-2 text-ink-soft">Der Pool ist noch leer.</p> : (
              <form action={referentEinladen} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="module_id" value={id} />
                <div className="sm:col-span-2"><label className="etikett" htmlFor="speaker_id">Person</label>
                  <select id="speaker_id" name="speaker_id" className="feld">{(pool ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.affiliation ? ` · ${p.affiliation}` : ""}{p.topics.length ? ` (${p.topics.join(", ")})` : ""}</option>)}</select></div>
                <div><label className="etikett" htmlFor="role">Rolle</label><select id="role" name="role" className="feld">{Object.entries(rollen).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="etikett" htmlFor="topic">Thema</label><input id="topic" name="topic" className="feld" /></div>
                <div className="sm:col-span-2"><button type="submit" className="knopf-hell">Vormerken</button></div>
              </form>
            )}
          </section>
          <section className="karte">
            <h2 className="font-display text-xl font-bold">Neue Person</h2>
            <form action={referentAnlegen} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="module_id" value={id} />
              <div><label className="etikett" htmlFor="n-name">Name</label><input id="n-name" name="name" required className="feld" /></div>
              <div><label className="etikett" htmlFor="n-aff">Funktion</label><input id="n-aff" name="affiliation" className="feld" placeholder="z. B. Politikwissenschaftlerin, Uni Münster" /></div>
              <div><label className="etikett" htmlFor="n-mail">E-Mail</label><input id="n-mail" name="email" type="email" className="feld" /></div>
              <div><label className="etikett" htmlFor="n-tel">Telefon</label><input id="n-tel" name="phone" type="tel" className="feld" /></div>
              <div><label className="etikett" htmlFor="n-top">Themen (mit Komma)</label><input id="n-top" name="topics" className="feld" /></div>
              <div><label className="etikett" htmlFor="n-spr">Sprachen (mit Komma)</label><input id="n-spr" name="languages" className="feld" /></div>
              <div><label className="etikett" htmlFor="n-role">Rolle in diesem Modul</label><select id="n-role" name="role" className="feld">{Object.entries(rollen).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="etikett" htmlFor="n-topic">Thema</label><input id="n-topic" name="topic" className="feld" /></div>
              <div className="sm:col-span-2"><label className="etikett" htmlFor="n-bio">Kurzprofil</label><textarea id="n-bio" name="bio" rows={3} className="feld" /></div>
              <div className="sm:col-span-2"><button type="submit" className="knopf">Anlegen und vormerken</button></div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}

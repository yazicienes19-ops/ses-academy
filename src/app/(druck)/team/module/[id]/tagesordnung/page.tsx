import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { uhrzeit } from "@/lib/einlass";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tagesordnung | SES Academy" };

const gruen = "#3d7a61";   // wie das Deckblatt der Regieplan-PDF
const hellgruen = "#e6f0ea";
const tinte = "#173226";

const tagLang = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
const wochentag = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "Europe/Berlin" });
const stand = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
const tagMonat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
const nurTag = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: "Europe/Berlin" });

/** „14. – 15. November 2026“ bzw. „14. November 2026“ */
function zeitraum(tage: { starts_at: string }[]) {
  const erster = new Date(tage[0].starts_at);
  const letzter = new Date(tage[tage.length - 1].starts_at);
  return tage.length > 1 ? `${nurTag.format(erster)}. – ${tagMonat.format(letzter)}` : tagMonat.format(erster);
}

/** Essen, Pausen, Ankunft: normal gesetzt; alles Inhaltliche fett. Vorträge und Grußworte hervorgehoben. */
const NEBENSACHE = /(mittagessen|abendessen|frühstück|kaffeepause|pause|ankunft|registrierung|abreise)/i;
const HERVORGEHOBEN = /^(vortrag|grußwort|keynote|impuls)/i;

/** Rollen wie im Reiter Referenten; daraus die Gruppen der Referentenseite (wie in der gestalteten Tagesordnung). */
const rollen: Record<string, string> = { vortrag: "Vortrag", podium: "Podium", laendergruppe: "Ländergruppe", workshop: "Workshop", grusswort: "Grußwort", moderation: "Moderation", diskussion: "Diskussion" };
const gruppen = [
  { name: "Vorträge und Podium", rollen: ["grusswort", "vortrag", "podium", "moderation"] },
  { name: "Ländergruppen", rollen: ["laendergruppe"] },
  { name: "Workshops", rollen: ["workshop"] },
  { name: "Diskussion", rollen: ["diskussion"] },
];
const gruppeVon = (rolle: string) => Math.max(0, gruppen.findIndex((g) => g.rollen.includes(rolle)));

/** „Podiumsdiskussion: Thema“ → „Podiumsdiskussion · Thema“ */
const titel = (t: string) => t.replace(/^([^:·]{2,40}):\s+/, "$1 · ");

/** Hinweiszeilen: getrennt durch Zeilenumbruch oder „;“; „Deutschland: Name“ mit fettem Etikett. */
function Hinweis({ text }: { text: string }) {
  // Zeilen, die mit „intern:“ beginnen, sind nur fürs Team (Regieplan) und fehlen hier
  const zeilen = text.split(/\n|;\s*/).map((z) => z.trim()).filter((z) => z && !/^intern\s*:/i.test(z));
  return (
    <>
      {zeilen.map((z, i) => (
        <span key={i} className="hinweis">
          {z.split(" · ").map((teil, j) => {
            const m = teil.match(/^([A-ZÄÖÜa-zäöüßçğıİşé ]{2,20}):\s+(.+)$/);
            return (
              <span key={j}>{j > 0 && " · "}{m ? <><b>{m[1]}</b> {m[2]}</> : teil}</span>
            );
          })}
        </span>
      ))}
    </>
  );
}

/**
 * Tagesordnung für Teilnehmende und Gäste (ab Orga-Team): Deckblatt, je Tag das Programm, dann die Referentinnen und
 * Referenten mit Kurzprofil. Aus Programm (Regieplan) und Referenten des Moduls; interne Angaben wie Zuständige fehlen.
 */
export default async function Tagesordnung({ params }: PageProps<"/team/module/[id]/tagesordnung">) {
  await requireStaff("orga");
  const { id } = await params;
  if (!istToken(id)) notFound();
  const supabase = await createClient();
  const [{ data: modul }, { data: referenten }] = await Promise.all([
    supabase.from("modules").select("title, subtitle, location, module_days(id, starts_at, ends_at, program_items(id, starts_at, ends_at, title, note, status))").eq("id", id).maybeSingle(),
    supabase.from("module_speakers").select("role, topic, status, program_item_id, speakers(name, affiliation, bio)").eq("module_id", id).neq("status", "abgesagt"),
  ]);
  if (!modul || modul.module_days.length === 0) notFound();
  const tage = [...modul.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((t) => ({ ...t, punkte: t.program_items.filter((p) => p.status !== "entfaellt").sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }));
  const punktVon = new Map(tage.flatMap((t) => t.punkte.map((p) => [p.id, p])));
  const mitProfil = (referenten ?? [])
    .filter((r) => r.speakers?.bio.trim())
    .map((r) => ({ ...r, punkt: r.program_item_id ? punktVon.get(r.program_item_id) : undefined }))
    .sort((a, b) => gruppeVon(a.role) - gruppeVon(b.role) || (a.punkt?.starts_at ?? "9").localeCompare(b.punkt?.starts_at ?? "9") || a.speakers!.name.localeCompare(b.speakers!.name, "de"));
  const heute = stand.format(new Date());

  const kopf = (
    <div className="kopf">
      <img src="/brand/ses-logo.png" alt="SES Academy" />
      <span>Tagesordnung · Stand {heute}</span>
    </div>
  );

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print { .nur-bildschirm { display: none !important; } html, body { margin: 0; background: #fff; } .blatt { margin: 0 !important; box-shadow: none !important; } }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { background: #f1efe8; }
        .blatt { width: 210mm; min-height: 296.5mm; box-sizing: border-box; margin: 8mm auto; background: #fff; box-shadow: 0 1mm 6mm rgb(0 0 0 / .12);
          font-family: var(--font-inter), Arial, sans-serif; color: ${tinte}; font-size: 10.5pt; position: relative; break-after: page; }
        .blatt:last-of-type { break-after: auto; }
        .serif { font-family: var(--font-newsreader), Georgia, serif; }

        .deckblatt { display: flex; flex-direction: column; height: 296.5mm; overflow: hidden; padding: 0; }
        .deckblatt .oben { height: 66mm; display: grid; place-items: center; }
        .deckblatt .oben img { height: 42mm; }
        .deckblatt .gruen { flex: 1; background: ${gruen}; color: #fff; text-align: center; position: relative; display: flex; flex-direction: column; }
        .deckblatt .muster { position: absolute; inset: auto 0 0 0; height: 70mm; background: url(/brand/megafon-muster.png) center / 55mm auto repeat; opacity: .14; }
        .deckblatt .art { margin-top: 30mm; font-size: 10pt; font-weight: 700; letter-spacing: .5em; }
        .deckblatt h1 { margin: 12mm 12mm 0; font-size: 31pt; font-weight: 400; letter-spacing: .02em; text-transform: uppercase; line-height: 1.15; }
        .deckblatt .unter { margin: 7mm 12mm 0; font-size: 16pt; }
        .deckblatt .fuss { margin-top: auto; padding-bottom: 16mm; position: relative; font-size: 11.5pt; line-height: 1.7; }
        .deckblatt .fuss .stand { margin-top: 3mm; font-size: 7.5pt; letter-spacing: .4em; opacity: .8; }

        .inhalt { padding: 15mm 18mm 16mm; }
        .kopf { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10mm; }
        .kopf img { height: 11mm; }
        .kopf span { font-size: 7.5pt; letter-spacing: .22em; text-transform: uppercase; color: #6b7a71; }
        .band { background: ${gruen}; color: #fff; padding: 3.4mm 4.5mm; font-size: 15pt; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3mm 3mm; vertical-align: middle; border-bottom: 0.3mm solid ${gruen}; }
        td.zeit { width: 34mm; text-align: center; font-weight: 700; white-space: nowrap; }
        .punkt { font-weight: 700; }
        .punkt.neben { font-weight: 400; }
        tr.hervor td { background: ${hellgruen}; border-bottom-color: #bcd3c5; }
        tr.hervor td.zeit { box-shadow: inset 0.9mm 0 0 ${gruen}; }
        tr { break-inside: avoid; }
        .hinweis { display: block; margin-top: 0.6mm; font-size: 9pt; color: #5d6b63; }
        .hinweis b { color: ${tinte}; font-weight: 700; }

        .gruppe { margin: 6mm 0 0; font-size: 7.5pt; letter-spacing: .3em; font-weight: 700; text-transform: uppercase; color: ${gruen}; }
        .person { display: grid; grid-template-columns: 52mm 1fr; gap: 6mm; padding: 3.6mm 0; border-bottom: 0.3mm solid #e4e1d8; break-inside: avoid; font-size: 9.8pt; }
        .person .name { font-size: 12pt; font-weight: 700; }
        .person .rolle { margin-top: 1mm; font-size: 8.5pt; color: ${gruen}; }
        .person p { margin: 0; line-height: 1.5; }
      `}</style>

      <div className="nur-bildschirm sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-paper px-5 py-3 text-sm">
        <p className="mr-auto"><span className="font-semibold">Tagesordnung · {modul.title}</span> · {tage.length} {tage.length === 1 ? "Tag" : "Tage"}, {mitProfil.length} Referentinnen und Referenten mit Kurzprofil</p>
        <p className="text-ink-soft">Druckdialog: A4, 100 %, Kopf- und Fußzeilen aus, Ränder „Keine“. „Als PDF sichern“ für den Versand.</p>
        <button id="drucken" className="rounded-full bg-ink px-5 py-2 font-semibold text-paper">Drucken / als PDF sichern</button>
        <script dangerouslySetInnerHTML={{ __html: "document.getElementById('drucken').onclick=()=>window.print()" }} />
      </div>

      <section className="blatt deckblatt">
        <div className="oben"><img src="/brand/ses-logo.png" alt="SES Academy" /></div>
        <div className="gruen">
          <p className="art">TAGESORDNUNG</p>
          <h1 className="serif">{modul.title}</h1>
          {modul.subtitle && <p className="unter serif">{modul.subtitle}</p>}
          <div className="muster" aria-hidden />
          <div className="fuss">
            <p>{zeitraum(tage)}</p>
            {modul.location && <p>{modul.location}</p>}
            <p className="stand">STAND {heute}</p>
          </div>
        </div>
      </section>

      {tage.map((t) => (
        <section key={t.id} className="blatt inhalt">
          {kopf}
          <div className="band serif">{tagLang.format(new Date(t.starts_at))}</div>
          {t.punkte.length === 0 ? <p style={{ padding: "6mm 3mm" }}>Das Programm für diesen Tag folgt.</p> : (
            <table>
              <tbody>
                {t.punkte.map((p) => (
                  <tr key={p.id} className={HERVORGEHOBEN.test(p.title) ? "hervor" : undefined}>
                    <td className="zeit">{uhrzeit(p.starts_at, false)}{p.ends_at ? ` – ${uhrzeit(p.ends_at, false)}` : ""}</td>
                    <td>
                      <span className={`punkt ${NEBENSACHE.test(p.title) ? "neben" : ""}`}>{titel(p.title)}</span>
                      {p.note.trim() && <Hinweis text={p.note} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {mitProfil.length > 0 && (
        <section className="blatt inhalt">
          {kopf}
          <div className="band serif">Referentinnen und Referenten</div>
          {mitProfil.map((r, i) => (
            <div key={i}>
              {(i === 0 || gruppeVon(mitProfil[i - 1].role) !== gruppeVon(r.role)) && <p className="gruppe">{gruppen[gruppeVon(r.role)].name}</p>}
              <div className="person">
                <div>
                  <p className="name serif">{r.speakers!.name}</p>
                  <p className="rolle">{[r.topic || rollen[r.role] || r.role, r.punkt && `${wochentag.format(new Date(r.punkt.starts_at))} ${uhrzeit(r.punkt.starts_at, false)}`].filter(Boolean).join(" · ")}</p>
                </div>
                <p>{r.speakers!.bio}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

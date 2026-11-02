import Link from "next/link";
import { FileText, Files, Film, Presentation, ScrollText, type LucideIcon } from "lucide-react";

export const dokumentArt: Record<string, string> = { dokument: "Dokument", material: "Material", medien: "Medien", vorlage: "Vorlage", protokoll: "Protokoll" };
export const dokumentStatus: Record<string, { name: string; farbe: string }> = {
  entwurf: { name: "Entwurf", farbe: "bg-paper-deep" }, pruefung: { name: "in Prüfung", farbe: "bg-gelb-hell" },
  final: { name: "final", farbe: "bg-gruen-hell" }, archiv: { name: "Archiv", farbe: "bg-white" },
};

type Dok = { id: string; title: string; kind: string; status: string; commission: string | null; tags: string[]; link: string | null; current_version: number; updated_at: string; module?: { title: string } | null };

const artIcon: Record<string, LucideIcon> = { dokument: FileText, material: Presentation, medien: Film, vorlage: Files, protokoll: ScrollText };

/**
 * Fertige Tagesordnungen eines Moduls (Schlagwort „Tagesordnung“, mit Datei) als Knöpfe zum direkten Herunterladen;
 * die für Teilnehmende zuerst. Auf der Modulseite und im Reiter „Material“.
 */
export function TagesordnungKnoepfe({ dokumente }: { dokumente: { id: string; title: string; tags?: string[]; current_version?: number; status?: string }[] }) {
  const liste = dokumente
    .filter((d) => (d.tags ?? ["Tagesordnung"]).includes("Tagesordnung") && (d.current_version ?? 1) > 0 && d.status !== "archiv")
    .sort((a, b) => Number(/referent/i.test(a.title)) - Number(/referent/i.test(b.title)) || a.title.localeCompare(b.title, "de"));
  if (liste.length === 0) return null;
  return (
    <div className="mt-5 mb-8">
      <h3 className="font-semibold">Tagesordnungen herunterladen</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {liste.map((d) => (
          <li key={d.id}><a href={`/team/dokumente/${d.id}/datei/?laden=1`} className="inline-block rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200">↓ {d.title}</a></li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-soft">Neue Fassungen unter „Material“ als neue Version ablegen (Schlagwort „Tagesordnung“).</p>
    </div>
  );
}

/**
 * Liste der Dokumente: ein Klick öffnet die Datei bzw. den Link, „Details“ führt zu Versionen und Bearbeiten.
 * Gezeigt wird nur, was beim Suchen hilft: Art (als Symbol), Modul bzw. Kommission und ein Status, wenn er nicht „final“ ist.
 */
export function DokumentListe({ dokumente, ohneModul }: { dokumente: Dok[]; ohneModul?: boolean }) {
  if (dokumente.length === 0) return <p className="rounded-3xl border-2 border-dashed border-line p-8 text-center text-ink-soft">Keine Dokumente.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-weiss ring-1 ring-line">
      {dokumente.map((d) => {
        const Icon = artIcon[d.kind] ?? FileText;
        const ziel = d.current_version > 0 ? `/team/dokumente/${d.id}/datei/` : d.link;
        const zusatz = [ohneModul ? null : d.module?.title, d.commission].filter(Boolean).join(" · ");
        const status = d.status !== "final" ? dokumentStatus[d.status] : null;
        return (
          <li key={d.id} className="group relative flex items-center gap-3 px-4 py-3 transition hover:bg-paper/60">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-ink-soft" title={dokumentArt[d.kind]}><Icon className="h-[18px] w-[18px]" /></span>
            <div className="min-w-0 flex-1">
              {ziel
                ? <a href={ziel} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold after:absolute after:inset-0 group-hover:underline">{d.title}</a>
                : <Link href={`/team/dokumente/${d.id}/`} className="block truncate font-semibold after:absolute after:inset-0 group-hover:underline">{d.title}</Link>}
              {zusatz && <p className="truncate text-xs text-ink-soft">{zusatz}</p>}
            </div>
            {status && <span className={`chip ${status.farbe}`}>{status.name}</span>}
            {d.current_version > 1 && <span className="hidden text-xs text-ink-soft sm:inline">Version {d.current_version}</span>}
            <Link href={`/team/dokumente/${d.id}/`} className="relative z-10 rounded-full px-3 py-1 text-sm font-semibold text-ink-soft ring-1 ring-line hover:bg-weiss hover:text-ink">Details</Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Formular für ein neues Dokument (Datei oder Link). Mit module_id/kind vorbelegt im Modul-Reiter. */
export function DokumentFormular({ zurueck, modulId, art = "dokument", module }: { zurueck: string; modulId?: string; art?: string; module?: { id: string; title: string }[] }) {
  return (
    <form action="/team/dokumente/hochladen/" method="post" encType="multipart/form-data" className="karte grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="zurueck" value={zurueck} />
      {modulId && <input type="hidden" name="module_id" value={modulId} />}
      <div className="sm:col-span-2"><label className="etikett" htmlFor="d-title">Titel</label><input id="d-title" name="title" required maxLength={200} className="feld" /></div>
      <div><label className="etikett" htmlFor="d-kind">Art</label>
        <select id="d-kind" name="kind" defaultValue={art} className="feld">{Object.entries(dokumentArt).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div><label className="etikett" htmlFor="d-status">Status</label>
        <select id="d-status" name="status" defaultValue="entwurf" className="feld">{Object.entries(dokumentStatus).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></div>
      <div><label className="etikett" htmlFor="d-com">Kommission</label><input id="d-com" name="commission" className="feld" placeholder="z. B. PR" /></div>
      {!modulId && module && (
        <div><label className="etikett" htmlFor="d-mod">Modul</label>
          <select id="d-mod" name="module_id" defaultValue="" className="feld"><option value="">kein Modul</option>{module.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></div>
      )}
      <div className={modulId || !module ? "sm:col-span-3" : "sm:col-span-2"}><label className="etikett" htmlFor="d-tags">Schlagworte (mit Komma)</label><input id="d-tags" name="tags" className="feld" /></div>
      <div className="sm:col-span-2"><label className="etikett" htmlFor="d-datei">Datei (bis 100 MB)</label><input id="d-datei" name="datei" type="file" className="feld" /></div>
      <div className="sm:col-span-2"><label className="etikett" htmlFor="d-link">oder Link (Video, Drive, Website)</label><input id="d-link" name="link" type="url" placeholder="https://" className="feld" /></div>
      <div className="sm:col-span-4"><label className="etikett" htmlFor="d-desc">Beschreibung</label><input id="d-desc" name="description" maxLength={2000} className="feld" /></div>
      <div className="sm:col-span-4"><button type="submit" className="knopf">Ablegen</button></div>
    </form>
  );
}

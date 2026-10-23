import type { Database } from "@/lib/database.types";

type Modul = Partial<Database["public"]["Tables"]["modules"]["Row"]>;

export const artName: Record<Database["public"]["Enums"]["module_kind"], string> = {
  auftakt: "Auftakt", seminar: "Seminar", workshop: "Workshop", winterschool: "Winter School", sonstiges: "Sonstiges",
};

export const statusName: Record<Database["public"]["Enums"]["module_status"], string> = {
  draft: "Entwurf (unsichtbar)", published: "Veröffentlicht", archived: "Archiviert",
};

const feld = "w-full rounded-2xl bg-white px-4 py-3 ring-1 ring-line outline-none focus:ring-2 focus:ring-ink";
const label = "mb-1.5 block text-sm font-semibold";

/** Formularfelder für Anlegen und Bearbeiten eines Moduls. */
export function ModulFormular({ modul, aktion, knopf }: { modul?: Modul; aktion: (f: FormData) => Promise<void>; knopf: string }) {
  const schalter = (name: "ticket_required" | "counts_for_streak" | "open_registration", titel: string, text: string, standard: boolean) => (
    <label className="flex cursor-pointer gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-line">
      <input type="checkbox" name={name} defaultChecked={modul?.[name] ?? standard} className="mt-1 h-5 w-5 shrink-0" />
      <span><span className="font-semibold">{titel}</span><span className="block text-sm text-ink-soft">{text}</span></span>
    </label>
  );
  return (
    <form action={aktion} className="grid gap-4 sm:grid-cols-2">
      {modul?.id && <input type="hidden" name="id" value={modul.id} />}
      <div>
        <label htmlFor="title" className={label}>Titel</label>
        <input id="title" name="title" required defaultValue={modul?.title} className={feld} />
      </div>
      <div>
        <label htmlFor="slug" className={label}>Kurzname in der Adresse</label>
        <input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={modul?.slug} placeholder="z. B. demokratie" className={feld} />
        <p className="mt-1 text-xs text-ink-soft">Gleich wie auf der Website (/seminar/…/), dann erscheint dort das Anmeldeformular.</p>
      </div>
      <div>
        <label htmlFor="kind" className={label}>Art</label>
        <select id="kind" name="kind" defaultValue={modul?.kind ?? "seminar"} className={feld}>
          {Object.entries(artName).map(([w, n]) => <option key={w} value={w}>{n}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="status" className={label}>Status</label>
        <select id="status" name="status" defaultValue={modul?.status ?? "draft"} className={feld}>
          {Object.entries(statusName).map(([w, n]) => <option key={w} value={w}>{n}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="location" className={label}>Ort</label>
        <input id="location" name="location" defaultValue={modul?.location ?? ""} placeholder="leer = Ort folgt" className={feld} />
      </div>
      <div>
        <label htmlFor="capacity" className={label}>Plätze für Gäste insgesamt</label>
        <input id="capacity" name="capacity" inputMode="numeric" pattern="\d*" defaultValue={modul?.capacity ?? ""} placeholder="leer = unbegrenzt" className={feld} />
        <p className="mt-1 text-xs text-ink-soft">Zählt alle bestätigten Anmeldungen. Wer danach kommt, landet auf der Warteliste.</p>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="description" className={label}>Interne Beschreibung</label>
        <textarea id="description" name="description" rows={3} defaultValue={modul?.description} className={feld} />
      </div>
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
        {schalter("ticket_required", "Mit QR-Ticket", "Aus: Einlass nur durch Abhaken in der Liste.", true)}
        {schalter("counts_for_streak", "Zählt für Serien", "Reguläres Academy-Modul, fließt in Teilnahme-Serien ein.", true)}
        {schalter("open_registration", "Offene Anmeldung", "Auch Gäste ohne Bewerbung können sich auf der Website anmelden.", false)}
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="rounded-full bg-ink px-6 py-3 font-semibold text-paper hover:bg-forest">{knopf}</button>
      </div>
    </form>
  );
}

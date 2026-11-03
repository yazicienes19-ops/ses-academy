import { abgabeFormate } from "@/lib/formate";

/** Checkboxen „erlaubte Abgabeformate“ für das Hausaufgaben-Formular. */
export function FormatAuswahl({ werte }: { werte?: string[] }) {
  const aktiv = new Set(werte ?? abgabeFormate.map((f) => f.wert));
  return (
    <fieldset>
      <legend className="etikett">Erlaubte Abgabeformate</legend>
      <div className="flex flex-wrap gap-2">
        {abgabeFormate.map((f) => (
          <label key={f.wert} className="chip cursor-pointer gap-2 bg-weiss px-3 py-1.5 text-sm ring-1 ring-line has-[:checked]:bg-ink has-[:checked]:text-paper">
            <input type="checkbox" name="formate" value={f.wert} defaultChecked={aktiv.has(f.wert)} className="sr-only" />
            {f.name}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-soft">Dateien max. 20 MB. Videos bitte als Link (z. B. nicht gelistetes YouTube-Video).</p>
    </fieldset>
  );
}

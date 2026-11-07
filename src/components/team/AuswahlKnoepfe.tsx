"use client";

/** „Alle“ / „Keine“ für die Kästchen der Rundmail-Auswahl (data-rundmail) in einer Liste. */
export function AuswahlKnoepfe() {
  const setzen = (an: boolean) => {
    document.querySelectorAll<HTMLInputElement>("input[data-rundmail]").forEach((e) => { e.checked = an; });
    document.dispatchEvent(new Event("change"));
  };
  return (
    <span className="inline-flex gap-2 text-xs font-semibold">
      <button type="button" onClick={() => setzen(true)} className="underline">alle</button>
      <button type="button" onClick={() => setzen(false)} className="underline">keine</button>
    </span>
  );
}

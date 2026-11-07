"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function JaKnopf({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="bestaetigt" value="ja" disabled={pending} aria-busy={pending} className={className}>{pending ? "Einen Moment …" : children}</button>;
}

/**
 * Rückfrage vor einer folgenschweren Aktion, innerhalb eines <form> mit Server Action: Der erste Klick fragt nach
 * (mit Erklärung und ggf. weiteren Feldern als children), erst „Ja“ sendet ab, mit bestaetigt=ja. Die Server Action
 * prüft dieses Feld; ohne JavaScript geht also nichts aus Versehen durch.
 */
export function Rueckfrage({ knopf, knopfKlasse = "knopf-hell", frage, ja, gefahr = false, children }: {
  knopf: React.ReactNode; knopfKlasse?: string; frage: React.ReactNode; ja: React.ReactNode; gefahr?: boolean; children?: React.ReactNode;
}) {
  const [offen, setOffen] = useState(false);
  if (!offen) return <button type="button" onClick={() => setOffen(true)} className={knopfKlasse}>{knopf}</button>;
  return (
    <div role="group" aria-label="Rückfrage" className={`basis-full rounded-2xl p-4 text-sm ring-1 ${gefahr ? "bg-rot-hell ring-rot/30" : "bg-gelb-hell ring-line"}`}>
      <div className="font-semibold">{frage}</div>
      {children && <div className="mt-2 space-y-1.5">{children}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <JaKnopf className={gefahr ? "rounded-full bg-red-800 px-4 py-2 font-semibold text-white" : "knopf"}>{ja}</JaKnopf>
        <button type="button" onClick={() => setOffen(false)} className="knopf-hell">Abbrechen</button>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { abgabeEinreichen } from "@/lib/aktionen/portal";
import { dateiMime, endung, MAX_ABGABE_MB } from "@/lib/formate";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Vorher = { content: string | null; link: string | null; upload_path: string | null; upload_name: string | null } | null;

/** Abgabe einer Hausaufgabe: Felder nur für die erlaubten Formate. Datei → eigener Ordner im Bucket „abgaben“. */
export function AbgabeFormular({ aufgabeId, teilnehmerId, formate, vorher }: { aufgabeId: string; teilnehmerId: string; formate: string[]; vorher: Vorher }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const dateiErlaubt: string[] = formate.filter((f) => f === "pdf" || f === "docx");

  async function senden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const daten = new FormData(e.currentTarget);
    const datei = daten.get("datei") as File | null;
    let upload_path = vorher?.upload_path ?? null;
    let upload_name = vorher?.upload_name ?? null;
    setMeldung(null);
    if (datei && datei.size) {
      const ext = endung(datei.name);
      if (!dateiErlaubt.includes(ext)) return setMeldung({ ok: false, text: `Erlaubt: ${dateiErlaubt.map((f) => f.toUpperCase()).join(", ")}.` });
      if (datei.size > MAX_ABGABE_MB * 1024 * 1024) return setMeldung({ ok: false, text: `Die Datei ist größer als ${MAX_ABGABE_MB} MB.` });
      setLaeuft(true);
      upload_path = `${aufgabeId}/${teilnehmerId}/abgabe.${ext}`;
      upload_name = datei.name;
      const { error } = await createBrowserSupabase().storage.from("abgaben").upload(upload_path, datei, { upsert: true, contentType: dateiMime[ext] });
      if (error) {
        setLaeuft(false);
        return setMeldung({ ok: false, text: "Hochladen fehlgeschlagen. Bitte versuch es noch einmal." });
      }
    }
    if (daten.get("datei_entfernen") === "on") upload_path = upload_name = null;
    setLaeuft(true);
    const res = await abgabeEinreichen({
      assignment_id: aufgabeId,
      text: formate.includes("text") ? String(daten.get("text") ?? "") : null,
      link: formate.includes("link") ? String(daten.get("link") ?? "") : null,
      upload_path,
      upload_name,
    });
    setLaeuft(false);
    if (res.fehler) return setMeldung({ ok: false, text: res.fehler });
    setMeldung({ ok: true, text: vorher ? "Abgabe aktualisiert." : "Abgabe eingereicht. Danke!" });
    router.refresh();
  }

  return (
    <form onSubmit={senden} className="mt-5 space-y-3 border-t border-line pt-5">
      <p className="font-semibold">{vorher ? "Abgabe ändern" : "Abgeben"}</p>
      {formate.includes("text") && (
        <div><label className="etikett" htmlFor={`text-${aufgabeId}`}>Text</label><textarea id={`text-${aufgabeId}`} name="text" rows={5} defaultValue={vorher?.content ?? ""} className="feld" /></div>
      )}
      {formate.includes("link") && (
        <div><label className="etikett" htmlFor={`link-${aufgabeId}`}>Link (z. B. zu deinem Video)</label><input id={`link-${aufgabeId}`} name="link" type="url" placeholder="https://" defaultValue={vorher?.link ?? ""} className="feld" /></div>
      )}
      {dateiErlaubt.length > 0 && (
        <div>
          <label className="etikett" htmlFor={`datei-${aufgabeId}`}>Datei ({dateiErlaubt.map((f) => f.toUpperCase()).join(" oder ")}, max. {MAX_ABGABE_MB} MB)</label>
          <input id={`datei-${aufgabeId}`} name="datei" type="file" accept={dateiErlaubt.map((f) => `.${f}`).join(",")} className="feld" />
          {vorher?.upload_name && (
            <label className="mt-1 flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" name="datei_entfernen" /> Bisherige Datei „{vorher.upload_name}“ entfernen</label>
          )}
        </div>
      )}
      <button disabled={laeuft} className="knopf">{laeuft ? "Wird gesendet …" : vorher ? "Änderung abgeben" : "Abgeben"}</button>
      {meldung && <p role="status" className={`rounded-2xl p-3 text-sm font-semibold ${meldung.ok ? "bg-gruen-hell" : "bg-rot-hell text-rot"}`}>{meldung.text}</p>}
    </form>
  );
}

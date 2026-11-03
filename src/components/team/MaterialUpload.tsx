"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { materialAnlegen } from "@/lib/aktionen/material";
import { dateiMime, endung, MAX_MATERIAL_MB } from "@/lib/formate";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function MaterialUpload({ cohortId, module }: { cohortId: string; module: { id: string; title: string }[] }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);

  async function senden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const daten = new FormData(form);
    const datei = daten.get("datei") as File | null;
    const ext = datei ? endung(datei.name) : "";
    if (!datei || !datei.size) return setMeldung({ ok: false, text: "Bitte eine Datei auswählen." });
    if (!["pdf", "docx", "pptx"].includes(ext)) return setMeldung({ ok: false, text: "Erlaubt sind PDF, DOCX und PPTX." });
    if (datei.size > MAX_MATERIAL_MB * 1024 * 1024) return setMeldung({ ok: false, text: `Die Datei ist größer als ${MAX_MATERIAL_MB} MB.` });
    setLaeuft(true);
    setMeldung(null);
    const pfad = `${cohortId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createBrowserSupabase().storage.from("material").upload(pfad, datei, { contentType: dateiMime[ext] });
    if (error) {
      setLaeuft(false);
      return setMeldung({ ok: false, text: `Hochladen fehlgeschlagen: ${error.message}` });
    }
    const res = await materialAnlegen({
      cohort_id: cohortId,
      module_id: String(daten.get("module_id") || "") || null,
      title: String(daten.get("title") || datei.name.replace(/\.[^.]+$/, "")),
      description: String(daten.get("description") ?? ""),
      storage_path: pfad,
      file_name: datei.name,
      size_bytes: datei.size,
      published: daten.get("published") === "on",
    });
    setLaeuft(false);
    if (res.fehler) return setMeldung({ ok: false, text: res.fehler });
    form.reset();
    setMeldung({ ok: true, text: "Hochgeladen." });
    router.refresh();
  }

  return (
    <form onSubmit={senden} className="space-y-3">
      <div><label className="etikett" htmlFor="datei">Datei (PDF, DOCX, PPTX · max. {MAX_MATERIAL_MB} MB)</label><input id="datei" name="datei" type="file" accept=".pdf,.docx,.pptx" required className="feld" /></div>
      <div><label className="etikett" htmlFor="title">Titel</label><input id="title" name="title" placeholder="z. B. Reader Verfassungen" className="feld" /></div>
      <div><label className="etikett" htmlFor="module_id">Modul (optional)</label>
        <select id="module_id" name="module_id" defaultValue="" className="feld"><option value="">– kein bestimmtes Modul –</option>{module.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
      </div>
      <div><label className="etikett" htmlFor="description">Beschreibung (sehen die Teilnehmenden)</label><textarea id="description" name="description" rows={2} className="feld" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" /> Sofort für Teilnehmende freischalten</label>
      <button disabled={laeuft} className="knopf">{laeuft ? "Lädt hoch …" : "Hochladen"}</button>
      {meldung && <p role="status" className={`rounded-2xl p-3 text-sm font-semibold ${meldung.ok ? "bg-gruen-hell" : "bg-rot-hell text-rot"}`}>{meldung.text}</p>}
    </form>
  );
}

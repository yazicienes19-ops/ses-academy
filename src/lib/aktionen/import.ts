"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { importiere, type Bericht, type ImportArt } from "@/lib/import/importe";
import { createAdminClient } from "@/lib/supabase/admin";

export type ImportZustand = { bericht?: Bericht; fehler?: string; dateiname?: string };

const arten: ImportArt[] = ["teilnehmerliste", "hausaufgaben", "bewertungsbogen", "emails"];

/**
 * Excel-/CSV-Import. Nur admin/vorstand. Läuft mit Dienstschlüssel, weil historische Anwesenheiten
 * (attendances) sonst nur über die Check-in-Funktionen geschrieben werden dürfen.
 */
export async function importieren(_: ImportZustand, formData: FormData): Promise<ImportZustand> {
  await requireStaff("alles");
  const art = String(formData.get("art")) as ImportArt;
  const datei = formData.get("datei");
  if (!arten.includes(art)) return { fehler: "Bitte die Art der Datei wählen." };
  if (!(datei instanceof File) || datei.size === 0) return { fehler: "Bitte eine Datei auswählen." };
  if (datei.size > 10 * 1024 * 1024) return { fehler: "Die Datei ist größer als 10 MB." };
  if (!/\.(xlsx|xlsm|csv)$/i.test(datei.name)) return { fehler: "Bitte eine Excel-Datei (.xlsx, .xlsm) oder CSV hochladen." };
  try {
    const bericht = await importiere(createAdminClient(), art, datei, {
      anwenden: formData.get("modus") === "anwenden",
      vorschlaegeUebernehmen: formData.get("vorschlaege") === "on",
      fehlendeAnlegen: formData.get("anlegen") === "on",
      ueberschreiben: formData.get("ueberschreiben") === "on",
      hausaufgabeNr: Number(formData.get("hausaufgabe_nr")) || 1,
    });
    if (bericht.angewendet) revalidatePath("/team/", "layout");
    return { bericht, dateiname: datei.name };
  } catch (e) {
    return { fehler: e instanceof Error ? e.message : "Die Datei konnte nicht gelesen werden.", dateiname: datei.name };
  }
}

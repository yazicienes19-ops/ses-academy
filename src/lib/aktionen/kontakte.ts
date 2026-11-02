"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";

/** Zurück auf die Seite, von der das Formular kam (nur Team-Bereich), mit Hinweis und Sprung zur Person. */
function zurueck(formData: FormData, hinweis: string, anker?: string): never {
  const pfad = String(formData.get("zurueck") ?? "");
  const ziel = /^\/team\/[\w\-/?=&%.+]*$/.test(pfad) && !pfad.includes("//") ? pfad : "/team/anrufe/";
  const ohne = ziel.replace(/([?&])hinweis=[^&]*&?/, "$1").replace(/[?&]$/, "");
  revalidatePath(ohne.split("?")[0]);
  redirect(`${ohne}${ohne.includes("?") ? "&" : "?"}hinweis=${hinweis}${anker ? `#${anker}` : ""}`);
}

const eintrag = z.object({
  participant_id: z.string().refine(istToken),
  module_id: z.string().refine((w) => w === "" || istToken(w)),
  channel: z.enum(["anruf", "whatsapp", "mail", "persoenlich"]),
  outcome: z.enum(["erreicht", "nicht_erreicht", "rueckruf"]),
  note: z.string().trim().max(300),
});

/** Kontaktversuch vermerken: Kanal, Ergebnis (aus dem gedrückten Knopf) und kurze Notiz. */
export async function kontaktEintragen(formData: FormData) {
  await requireStaff("orga");
  const daten = eintrag.safeParse({
    participant_id: formData.get("participant_id"),
    module_id: formData.get("module_id") ?? "",
    channel: formData.get("channel") ?? "anruf",
    outcome: formData.get("outcome"),
    note: formData.get("note") ?? "",
  });
  if (!daten.success) zurueck(formData, "kontakt-eingabe");
  const { participant_id, module_id, ...rest } = daten.data;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("contact_log").insert({ participant_id, module_id: module_id || null, created_by: auth.user?.id, ...rest });
  zurueck(formData, error ? "kontakt-fehler" : "kontakt", `p-${participant_id}`);
}

/** Eigenen Eintrag zurücknehmen (24 Stunden lang, Admin/Vorstand immer; regelt die Datenbank). */
export async function kontaktLoeschen(formData: FormData) {
  await requireStaff("orga");
  const id = String(formData.get("id") ?? "");
  const person = String(formData.get("participant_id") ?? "");
  if (!istToken(id)) zurueck(formData, "kontakt-eingabe");
  const supabase = await createClient();
  const { data, error } = await supabase.from("contact_log").delete().eq("id", id).select("id");
  zurueck(formData, error || !data?.length ? "kontakt-fehler" : "kontakt-geloescht", istToken(person) ? `p-${person}` : undefined);
}

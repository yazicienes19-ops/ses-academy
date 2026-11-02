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
  const ziel = /^\/team\/[\w\-/?=&%.+]*$/.test(pfad) && !pfad.includes("//") ? pfad : "/team/teilnehmende/";
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

/** Notiz zur Person in den Verlauf schreiben (ab Orga-Team), z. B. Absprachen nach einem Gespräch. */
export async function notizEintragen(formData: FormData) {
  await requireStaff("orga");
  const person = String(formData.get("participant_id") ?? "");
  const notiz = String(formData.get("note") ?? "").trim();
  const modul = String(formData.get("module_id") ?? "");
  if (!istToken(person) || !notiz || notiz.length > 2000 || (modul && !istToken(modul))) zurueck(formData, "kontakt-eingabe");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("contact_log").insert({ participant_id: person, module_id: modul || null, channel: "notiz", outcome: null, note: notiz, created_by: auth.user?.id });
  zurueck(formData, error ? "kontakt-fehler" : "notiz", `p-${person}`);
}

/** Zusage für ein Modul setzen oder zurücknehmen (leer), z. B. nach einem Anruf. */
export async function zusageSetzen(formData: FormData) {
  await requireStaff("orga");
  const person = String(formData.get("participant_id") ?? "");
  const modul = String(formData.get("module_id") ?? "");
  const rsvp = String(formData.get("rsvp") ?? "");
  if (!istToken(person) || !istToken(modul) || !["", "zugesagt", "abgesagt"].includes(rsvp)) zurueck(formData, "kontakt-eingabe");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_rsvp", { p_module_id: modul, p_participant_id: person, p_rsvp: (rsvp || null) as string }); // null = Zusage zurücknehmen
  zurueck(formData, error ? "kontakt-fehler" : "zusage", `p-${person}`);
}

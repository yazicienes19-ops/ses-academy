"use server";

import { redirect } from "next/navigation";
import { istToken } from "@/lib/codes";
import { sendeAbmeldeBestaetigung, sendeTicketMail, ticketKuerzlichGesendet } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Antwort = { result?: string; status?: string; promoted_registration_id?: string | null } | null;

/** Nach dem Abmelden: Bestätigung an die Person (mit Weg zurück), Nachrücker bekommt sofort sein Ticket. */
async function nachAbmeldung(participantId: string, moduleId: string, antwort: Antwort) {
  const admin = createAdminClient();
  const { data: modul } = await admin.from("modules").select("title").eq("id", moduleId).maybeSingle();
  await sendeAbmeldeBestaetigung(participantId, modul?.title ?? "Modul", moduleId);
  if (antwort?.promoted_registration_id) {
    const { data: reg } = await admin.from("registrations").select("participant_id").eq("id", antwort.promoted_registration_id).maybeSingle();
    if (reg) await sendeTicketMail(reg.participant_id);
  }
}

const hinweisNachAbmeldung = (ergebnis?: string) => (ergebnis === "withdrawn" ? "abgemeldet" : ergebnis === "too_late" ? "zu-spaet" : "fehler");
const hinweisNachRueckkehr = (a: Antwort) =>
  a?.result === "rejoined" ? (a.status === "confirmed" ? "wieder-dabei" : "wieder-warteliste") : a?.result === "too_late" ? "zu-spaet" : "nicht-moeglich";

/**
 * Abmelden bzw. entschuldigen über den persönlichen Link aus der Mail. Nachweis ist der link_token; der Inhalt des
 * QR-Codes (checkin_token) reicht dafür nicht (withdraw_by_token prüft das in der Datenbank).
 */
export async function perTicketAbmelden(formData: FormData) {
  const token = String(formData.get("token") ?? "").toLowerCase();
  const moduleId = String(formData.get("module_id") ?? "");
  if (!istToken(token) || !istToken(moduleId)) redirect("/");
  const grund = String(formData.get("grund") ?? "").slice(0, 500);
  const admin = createAdminClient();
  const { data } = await admin.rpc("withdraw_by_token", { p_token: token, p_module_id: moduleId, p_excuse_note: grund });
  const antwort = data as Antwort;
  if (antwort?.result === "withdrawn") {
    const { data: p } = await admin.from("participants").select("id").eq("link_token", token).maybeSingle();
    if (p) await nachAbmeldung(p.id, moduleId, antwort);
  }
  redirect(`/ticket/${token}/?hinweis=${hinweisNachAbmeldung(antwort?.result)}`);
}

/** Abmeldung über den Mail-Link zurücknehmen („Doch teilnehmen“), bis zum Beginn des Moduls. */
export async function perTicketZuruecknehmen(formData: FormData) {
  const token = String(formData.get("token") ?? "").toLowerCase();
  const moduleId = String(formData.get("module_id") ?? "");
  if (!istToken(token) || !istToken(moduleId)) redirect("/");
  const { data } = await createAdminClient().rpc("rejoin_by_token", { p_token: token, p_module_id: moduleId });
  redirect(`/ticket/${token}/?hinweis=${hinweisNachRueckkehr(data as Antwort)}`);
}

/**
 * Ticket-Seite über den QR-Inhalt bzw. einen älteren Link geöffnet: Abmelden geht dort nicht. Stattdessen den
 * Mail-Link an die hinterlegte Adresse schicken (nie an eine andere). Antwort immer gleich, höchstens alle 10 Minuten.
 */
export async function abmeldeLinkSenden(formData: FormData) {
  const token = String(formData.get("token") ?? "").toLowerCase();
  if (!istToken(token)) redirect("/");
  const { data: p } = await createAdminClient().from("participants").select("id, email").eq("checkin_token", token).maybeSingle();
  if (p?.email && !(await ticketKuerzlichGesendet(p.id))) await sendeTicketMail(p.id);
  redirect(`/ticket/${token}/?hinweis=link-gesendet`);
}

/** Angemeldet in „Mein Bereich“: von einem kommenden Modul abmelden. */
export async function meinAbmelden(formData: FormData) {
  const moduleId = String(formData.get("module_id") ?? "");
  if (!istToken(moduleId)) redirect("/mein-bereich/");
  const grund = String(formData.get("grund") ?? "").slice(0, 500);
  const supabase = await createClient();
  const { data } = await supabase.rpc("withdraw_mine", { p_module_id: moduleId, p_excuse_note: grund });
  const antwort = data as Antwort;
  if (antwort?.result === "withdrawn") {
    const { data: ich } = await supabase.rpc("my_participant_id");
    if (ich) await nachAbmeldung(ich, moduleId, antwort);
  }
  redirect(`/mein-bereich/?modul=${hinweisNachAbmeldung(antwort?.result)}#module`);
}

/** Angemeldet in „Mein Bereich“: eigene Abmeldung zurücknehmen. */
export async function meinZuruecknehmen(formData: FormData) {
  const moduleId = String(formData.get("module_id") ?? "");
  if (!istToken(moduleId)) redirect("/mein-bereich/");
  const supabase = await createClient();
  const { data } = await supabase.rpc("rejoin_mine", { p_module_id: moduleId });
  redirect(`/mein-bereich/?modul=${hinweisNachRueckkehr(data as Antwort)}#module`);
}

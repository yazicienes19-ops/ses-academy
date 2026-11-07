"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { mailBereit, sendeNachricht } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";

// Rundmails (Nachrichten an alle bzw. an eine Auswahl): erst prüfen (Empfängerzahl, Testmail an sich selbst), dann zur
// Freigabe vorlegen. Versand nach dem Vier-Augen-Prinzip in freigaben.ts. Nur Admin/Vorstand ohne Modulbegrenzung
// (requireStaff("alles"), in der Datenbank has_full_access()).

const text = (max: number) => z.string().max(max).transform((s) => s.trim());
const schema = z.object({
  betreff: text(200), text: text(10000), betreffTr: text(200), textTr: text(10000),
  sprache: z.enum(["de", "tr", "konto"]),
  filter: z.record(z.string(), z.string()).default({}),
  ids: z.array(z.string()).max(3000).optional(),
  auswahl: z.string().max(300).optional(),
});
export type RundmailEingabe = z.input<typeof schema>;
type Geprueft = z.output<typeof schema>;

export type RundmailPruefung =
  | { ok: true; anzahl: number; tuerkisch: number; ohneAdresse: number }
  | { ok: false; fehler: string };

/** Nur bekannte Filter mit gültigen Werten; bei einer Auswahl genau diese Personen. */
function filterAus(d: Geprueft) {
  const f: Record<string, string | string[]> = {};
  for (const k of ["cohort_id", "region_id", "mentor_id", "module_id", "group_id"]) {
    const v = d.filter[k] ?? "";
    if (k === "region_id" ? /^\d+$/.test(v) : istToken(v)) f[k] = v;
  }
  if (d.ids) f.participant_ids = [...new Set(d.ids.filter(istToken))];
  return f;
}

function pruefeTexte(d: Geprueft): string | null {
  if ((d.sprache === "de" || d.sprache === "konto") && (!d.betreff || !d.text)) return "Bitte Betreff und Text auf Deutsch angeben.";
  if ((d.sprache === "tr" || d.sprache === "konto") && (!d.betreffTr || !d.textTr)) return "Bitte Betreff und Text auf Türkisch angeben.";
  return null;
}

/** Empfänger zählen (gleiche Regeln wie beim Versand), je Sprache. */
export async function rundmailPruefen(eingabe: RundmailEingabe): Promise<RundmailPruefung> {
  await requireStaff("alles");
  const d = schema.safeParse(eingabe);
  if (!d.success) return { ok: false, fehler: "Bitte die Angaben prüfen." };
  const textFehler = pruefeTexte(d.data);
  if (textFehler) return { ok: false, fehler: textFehler };
  const filter = filterAus(d.data);
  if (Array.isArray(filter.participant_ids) && filter.participant_ids.length === 0) return { ok: false, fehler: "Niemand ausgewählt." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("broadcast_recipients", { p_filter: filter });
  if (error) return { ok: false, fehler: "Die Empfänger konnten nicht ermittelt werden." };
  const liste = data ?? [];
  const tuerkisch = d.data.sprache === "tr" ? liste.length : d.data.sprache === "konto" ? liste.filter((e) => e.preferred_language === "tr").length : 0;
  const ohneAdresse = Array.isArray(filter.participant_ids) ? filter.participant_ids.length - liste.length : 0;
  return { ok: true, anzahl: liste.length, tuerkisch, ohneAdresse };
}

/** Testmail an die eigene Adresse; bei „nach Kontosprache“ beide Fassungen. */
export async function rundmailTesten(eingabe: RundmailEingabe): Promise<{ ok: boolean; text: string }> {
  const staff = await requireStaff("alles");
  const d = schema.safeParse(eingabe);
  if (!d.success) return { ok: false, text: "Bitte die Angaben prüfen." };
  const textFehler = pruefeTexte(d.data);
  if (textFehler) return { ok: false, text: textFehler };
  if (!mailBereit()) return { ok: false, text: "Mailversand ist nicht eingerichtet: Die Testmail kann nicht verschickt werden." };
  const an = { participant_id: null, email: staff.email, first_name: staff.name.split(" ")[0] };
  const fassungen = [
    ...(d.data.sprache !== "tr" ? [{ betreff: d.data.betreff, text: d.data.text, sprache: "de" as const }] : []),
    ...(d.data.sprache !== "de" ? [{ betreff: d.data.betreffTr, text: d.data.textTr, sprache: "tr" as const }] : []),
  ];
  for (const f of fassungen) {
    const r = await sendeNachricht(an, f, "test", staff.userId, true);
    if (!r.ok) return { ok: false, text: "Die Testmail konnte nicht verschickt werden: Der Mailserver hat sie abgelehnt oder war nicht erreichbar." };
  }
  return { ok: true, text: fassungen.length > 1 ? `Zwei Testmails (Deutsch und Türkisch) an ${staff.email} verschickt.` : `Testmail an ${staff.email} verschickt.` };
}

/** Zur Freigabe vorlegen. Empfängerzahl und Beschreibung für die zweite Person baut die Datenbank (create_approval). */
export async function rundmailVorlegen(eingabe: RundmailEingabe): Promise<{ fehler: string }> {
  await requireStaff("alles");
  const d = schema.safeParse(eingabe);
  if (!d.success) return { fehler: "Bitte die Angaben prüfen." };
  const textFehler = pruefeTexte(d.data);
  if (textFehler) return { fehler: textFehler };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_approval", {
    p_action: "nachricht",
    p_payload: {
      betreff: d.data.sprache === "tr" ? "" : d.data.betreff, text: d.data.sprache === "tr" ? "" : d.data.text,
      betreff_tr: d.data.sprache === "de" ? "" : d.data.betreffTr, text_tr: d.data.sprache === "de" ? "" : d.data.textTr,
      sprache: d.data.sprache, filter: filterAus(d.data), auswahl: d.data.auswahl ?? "",
    },
  });
  if (error) return { fehler: error.message.includes("no_recipients") ? "Mit dieser Auswahl gibt es keine Empfänger mit E-Mail-Adresse." : "Das hat nicht geklappt." };
  revalidatePath("/team/nachrichten/");
  revalidatePath("/team/freigaben/");
  redirect("/team/nachrichten/?hinweis=beantragt");
}

const vorlageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  betreff: text(200), text: text(10000), betreffTr: text(200), textTr: text(10000),
});

/** Vorlage speichern; gleicher Name überschreibt die vorhandene. */
export async function vorlageSpeichern(eingabe: z.input<typeof vorlageSchema>): Promise<{ ok: boolean; text: string; id?: string }> {
  await requireStaff("alles");
  const d = vorlageSchema.safeParse(eingabe);
  if (!d.success) return { ok: false, text: "Bitte einen Namen für die Vorlage angeben." };
  if (!d.data.betreff && !d.data.betreffTr) return { ok: false, text: "Die Vorlage braucht mindestens einen Betreff." };
  const supabase = await createClient();
  const werte = { name: d.data.name, subject_de: d.data.betreff, body_de: d.data.text, subject_tr: d.data.betreffTr, body_tr: d.data.textTr };
  const { data: vorhanden } = await supabase.from("message_templates").select("id, name");
  const gleich = (vorhanden ?? []).find((v) => v.name.trim().toLowerCase() === d.data.name.toLowerCase());
  const { data, error } = gleich
    ? await supabase.from("message_templates").update(werte).eq("id", gleich.id).select("id").single()
    : await supabase.from("message_templates").insert(werte).select("id").single();
  if (error || !data) return { ok: false, text: "Die Vorlage konnte nicht gespeichert werden." };
  revalidatePath("/team/nachrichten/");
  revalidatePath("/team/teilnehmende/");
  return { ok: true, text: gleich ? `Vorlage „${d.data.name}“ aktualisiert.` : `Vorlage „${d.data.name}“ gespeichert.`, id: data.id };
}

export async function vorlageLoeschen(id: string): Promise<{ ok: boolean; text: string }> {
  await requireStaff("alles");
  if (!istToken(id)) return { ok: false, text: "Unbekannte Vorlage." };
  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  revalidatePath("/team/nachrichten/");
  revalidatePath("/team/teilnehmende/");
  return error ? { ok: false, text: "Das hat nicht geklappt." } : { ok: true, text: "Vorlage gelöscht." };
}

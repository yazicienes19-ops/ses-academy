"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import type { EinlassAntwort, EinlassErgebnis, Zaehler } from "@/lib/einlass";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendeTicketMail } from "@/lib/mail";
import { istGueltigesFormat, normalisiereCode } from "@/lib/tickets";

type Methode = "qr" | "short_code" | "offline_sync";

async function zaehler(tagId: string): Promise<Zaehler | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_day_counts", { p_module_day_id: tagId });
  return (data as Zaehler | null) ?? null;
}

function alsErgebnis(data: unknown, error: unknown): EinlassErgebnis {
  if (error || !data || typeof data !== "object" || !("result" in data)) return { result: "fehler" };
  return data as EinlassErgebnis;
}

/** QR-Scan oder Kurzcode-Eingabe. Geprüft wird alles in der Datenbank (check_in_by_code). */
export async function scannen(
  tagId: string, code: string, methode: Methode, zeitfensterIgnorieren: boolean,
  /** Nur bei offline_sync: wann der Scan ohne Internet tatsächlich war (höchstens 24 Stunden her). */
  gescanntUm?: string,
): Promise<EinlassAntwort> {
  await requireStaff("einlass");
  const normal = normalisiereCode(code);
  if (!istGueltigesFormat(normal)) return { ergebnis: { result: "invalid_code" }, zaehler: await zaehler(tagId) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_by_code", {
    p_module_day_id: tagId,
    p_code: normal,
    p_method: methode,
    p_allow_off_window: zeitfensterIgnorieren,
    p_scanned_at: methode === "offline_sync" ? gescanntUm : undefined,
  });
  revalidatePath("/team/einlass/");
  return { ergebnis: alsErgebnis(data, error), zaehler: await zaehler(tagId) };
}

const walkInSchema = z.object({
  vorname: z.string().trim().min(1).max(80),
  nachname: z.string().trim().max(80),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email())]),
  zugehoerigkeit: z.enum(["guest", "member", "academy_student", "alumni"]),
  einwilligung: z.literal("ja"),
});

/** Walk-in: Person vor Ort erfassen, anmelden und einchecken (ab Orga-Team). Mit E-Mail kommt gleich das Ticket. */
export async function walkIn(tagId: string, formData: FormData): Promise<EinlassAntwort> {
  await requireStaff("orga");
  const d = walkInSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!d.success) {
    const ohneEinwilligung = formData.get("einwilligung") !== "ja";
    return { ergebnis: { result: ohneEinwilligung ? "consent_required" : "fehler" }, zaehler: await zaehler(tagId) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_walk_in", {
    p_module_day_id: tagId,
    p_first_name: d.data.vorname,
    p_last_name: d.data.nachname,
    p_email: d.data.email || undefined,
    p_affiliation: d.data.zugehoerigkeit,
    p_privacy_consent: true,
  });
  const ergebnis = alsErgebnis(data, error);
  if (ergebnis.result === "checked_in" && d.data.email && ergebnis.participant_id) await sendeTicketMail(ergebnis.participant_id);
  revalidatePath("/team/einlass/");
  return { ergebnis, zaehler: await zaehler(tagId) };
}

/** Manuell abhaken aus der Anwesenheitsliste (ab Orga-Team), auch bei Modulen ohne Ticket. */
export async function abhaken(tagId: string, participantId: string, zeitfensterIgnorieren: boolean): Promise<EinlassAntwort> {
  await requireStaff("orga");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_manual", {
    p_module_day_id: tagId,
    p_participant_id: participantId,
    p_allow_off_window: zeitfensterIgnorieren,
  });
  revalidatePath("/team/einlass/");
  return { ergebnis: alsErgebnis(data, error), zaehler: await zaehler(tagId) };
}

/** Fehlscan zurücknehmen (ab Orga-Team). */
export async function zuruecknehmen(attendanceId: string): Promise<boolean> {
  await requireStaff("orga");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("undo_check_in", { p_attendance_id: attendanceId });
  revalidatePath("/team/einlass/");
  return !error && (data as { result?: string } | null)?.result === "undone";
}

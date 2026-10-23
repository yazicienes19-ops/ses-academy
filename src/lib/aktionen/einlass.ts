"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import type { EinlassAntwort, EinlassErgebnis, Zaehler } from "@/lib/einlass";
import { createClient } from "@/lib/supabase/server";
import { istGueltigesFormat, normalisiereCode } from "@/lib/tickets";

type Methode = "qr" | "short_code";

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
export async function scannen(tagId: string, code: string, methode: Methode, zeitfensterIgnorieren: boolean): Promise<EinlassAntwort> {
  await requireStaff("einlass");
  const normal = normalisiereCode(code);
  if (!istGueltigesFormat(normal)) return { ergebnis: { result: "invalid_code" }, zaehler: await zaehler(tagId) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_by_code", {
    p_module_day_id: tagId,
    p_code: normal,
    p_method: methode,
    p_allow_off_window: zeitfensterIgnorieren,
  });
  revalidatePath("/team/einlass/");
  return { ergebnis: alsErgebnis(data, error), zaehler: await zaehler(tagId) };
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

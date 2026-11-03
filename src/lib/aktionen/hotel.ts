"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Hotel & Zimmer: nur admin/vorstand (Namensliste + Türcodes). Teilnehmende sehen ihr Zimmer erst nach Freigabe.

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const zurueck = (modul: string, fehler?: string) =>
  redirect(`/team/hotel/?modul=${modul}${fehler ? `&fehler=${encodeURIComponent(fehler)}` : "&hinweis=gespeichert"}`);

export async function zimmerSpeichern(formData: FormData) {
  await requireStaff("alles");
  const supabase = await createClient();
  const modul = text(formData.get("modul"));
  const werte = {
    module_id: modul,
    participant_id: text(formData.get("participant_id")),
    hotel_name: text(formData.get("hotel_name")),
    room_number: text(formData.get("room_number")),
    room_pin_code: text(formData.get("room_pin_code")) || null,
    check_in_info: text(formData.get("check_in_info")) || null,
  };
  if (!werte.hotel_name || !werte.room_number) zurueck(modul, "Hotel und Zimmernummer sind Pflicht.");
  const { error } = await supabase.from("room_assignments").upsert(werte, { onConflict: "module_id,participant_id" });
  if (error) zurueck(modul, error.message);
  revalidatePath("/team/hotel/");
  zurueck(modul);
}

export async function zimmerEntfernen(formData: FormData) {
  await requireStaff("alles");
  const supabase = await createClient();
  const modul = text(formData.get("modul"));
  await supabase.from("room_assignments").delete().eq("module_id", modul).eq("participant_id", text(formData.get("participant_id")));
  revalidatePath("/team/hotel/");
  zurueck(modul);
}

/** Zimmerverteilung eines Moduls für die Teilnehmer-Dashboards live schalten bzw. zurückziehen. */
export async function zimmerFreigabe(formData: FormData) {
  await requireStaff("alles");
  const supabase = await createClient();
  const modul = text(formData.get("modul"));
  const an = formData.get("published") === "true";
  const { error } = await supabase.from("accommodation_releases").upsert({ module_id: modul, published: an, published_at: an ? new Date().toISOString() : null });
  if (error) zurueck(modul, error.message);
  revalidatePath("/team/hotel/");
  zurueck(modul);
}

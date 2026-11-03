"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Material für Teilnehmende (Reader, Präsentationen, Handouts): ab orga_team. Die Datei lädt der Browser
// direkt in den privaten Bucket „material“ (Storage-Policy material_orga); hier wird nur der Eintrag angelegt.

const Neu = z.object({
  cohort_id: z.uuid(),
  module_id: z.uuid().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000),
  storage_path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|docx|pptx)$/),
  file_name: z.string().min(1).max(300),
  size_bytes: z.number().int().nonnegative(),
  published: z.boolean(),
});

export async function materialAnlegen(eingabe: z.input<typeof Neu>): Promise<{ fehler?: string }> {
  const staff = await requireStaff("orga");
  const werte = Neu.safeParse(eingabe);
  if (!werte.success) return { fehler: "Angaben unvollständig." };
  const supabase = await createClient();
  const { error } = await supabase.from("resources").insert({ ...werte.data, created_by: staff.userId });
  if (error) {
    await supabase.storage.from("material").remove([werte.data.storage_path]);
    return { fehler: error.message };
  }
  revalidatePath("/team/material/");
  return {};
}

export async function materialFreigabe(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  await supabase.from("resources").update({ published: formData.get("published") === "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/team/material/");
}

export async function materialLoeschen(formData: FormData) {
  await requireStaff("orga");
  const supabase = await createClient();
  const { data } = await supabase.from("resources").delete().eq("id", String(formData.get("id"))).select("storage_path").maybeSingle();
  if (data) await supabase.storage.from("material").remove([data.storage_path]);
  revalidatePath("/team/material/");
}

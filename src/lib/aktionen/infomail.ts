"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { istToken } from "@/lib/codes";
import { sendeInfoMail } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function zurueck(pfad: string, hinweis: string): never {
  revalidatePath(pfad);
  redirect(`${pfad}${pfad.includes("?") ? "&" : "?"}hinweis=${hinweis}`);
}

/**
 * Info-Mail an alle, die sie für dieses Modul noch nicht (erfolgreich) bekommen haben. Nur nach ausdrücklicher
 * Bestätigung; wer abgesagt hat, bekommt nichts. empfaenger "zugesagt" = nur wer zugesagt hat.
 */
export async function infoMailAnAlle(formData: FormData) {
  const staff = await requireStaff("alles");
  const modulId = String(formData.get("module_id"));
  const pfad = `/team/module/${modulId}/infomail/`;
  if (!istToken(modulId)) zurueck("/team/module/", "eingabe");
  if (formData.get("bestaetigt") !== "ja") zurueck(pfad, "bestaetigen");
  const nurZugesagt = formData.get("empfaenger") === "zugesagt";
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_info_status", { p_module_id: modulId });
  const offen = (data ?? []).filter((z) => (z.info_status === "offen" || z.info_status === "fehlgeschlagen")
    && z.rsvp !== "abgesagt" && (!nurZugesagt || z.rsvp === "zugesagt"));
  let gesendet = 0;
  let fehler = 0;
  const warteschlange = [...offen];
  async function arbeiter() {
    for (let z = warteschlange.shift(); z; z = warteschlange.shift()) {
      // Reservieren: drückt jemand anderes gleichzeitig „senden“, verschickt nur eine Sitzung
      const { data: meins } = await supabase.rpc("claim_info_mail", { p_module_id: modulId, p_participant_id: z.participant_id });
      if (!meins) continue;
      const e = await sendeInfoMail(z.participant_id, modulId, staff.userId);
      if (e.ok) gesendet++;
      else {
        fehler++;
        await supabase.rpc("release_info_mail", { p_module_id: modulId, p_participant_id: z.participant_id });
      }
    }
  }
  await Promise.all(Array.from({ length: 3 }, arbeiter));
  await createAdminClient().from("audit_log").insert({
    actor_id: staff.userId, action: "infomail_an_alle", entity_type: "module", entity_id: modulId, metadata: { gesendet, fehler, nurZugesagt },
  });
  zurueck(pfad, `info-${gesendet}-${fehler}`);
}

/** Info-Mail einer Person als Test an die eigene Adresse (zählt nicht als versendet). */
export async function infoMailTest(formData: FormData) {
  const staff = await requireStaff("alles");
  const modulId = String(formData.get("module_id"));
  const person = String(formData.get("participant_id"));
  const pfad = `/team/module/${modulId}/infomail/?person=${person}`;
  if (!istToken(modulId) || !istToken(person)) zurueck("/team/module/", "eingabe");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) zurueck(pfad, "keine-eigene-mail");
  const e = await sendeInfoMail(person, modulId, staff.userId, auth.user.email);
  zurueck(pfad, e.ok ? "test-gesendet" : "test-fehler");
}

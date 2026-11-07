"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { istToken } from "@/lib/codes";
import { sendeNachricht, type RundmailText } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";

// Vier-Augen-Prinzip (Entscheidung 25.10.2026): Antrag → Freigabe durch eine zweite Person → Ausführung durch die
// anfragende Person innerhalb von 24 Stunden. Die Regeln setzt die Datenbank durch (decide_approval, claim_approval).

/** Inhalt eines Nachrichten-Antrags (ältere Anträge ohne „sprache“ sind deutsch). */
type NachrichtInhalt = { betreff: string; text: string; betreff_tr?: string; text_tr?: string; sprache?: "de" | "tr" | "konto"; filter: Json };

/** Welche Fassung bekommt eine Person: fest Deutsch/Türkisch oder nach ihrer Kontosprache (wenn beide Texte da sind). */
function rundmailFassung(p: NachrichtInhalt, kontosprache: string | null): RundmailText {
  const tr = p.sprache === "tr" || (p.sprache === "konto" && kontosprache === "tr" && Boolean(p.betreff_tr && p.text_tr));
  return tr ? { betreff: p.betreff_tr ?? "", text: p.text_tr ?? "", sprache: "tr" } : { betreff: p.betreff, text: p.text, sprache: "de" };
}

export async function freigabeEntscheiden(formData: FormData) {
  await requireStaff("alles");
  const id = String(formData.get("id"));
  if (!istToken(id)) redirect("/team/freigaben/?hinweis=eingabe");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_approval", {
    p_id: id, p_approve: formData.get("entscheidung") === "ja", p_note: String(formData.get("notiz") ?? "").slice(0, 500),
  });
  revalidatePath("/team/freigaben/");
  redirect(`/team/freigaben/?hinweis=${error ? "fehler" : data}`);
}

/** Freigegebene Nachricht verschicken. Empfänger werden jetzt neu ermittelt (gleiche Filter). */
export async function nachrichtSenden(formData: FormData) {
  const staff = await requireStaff("alles");
  const id = String(formData.get("id"));
  if (!istToken(id)) redirect("/team/nachrichten/?hinweis=eingabe");
  const supabase = await createClient();
  const { data: antwort } = await supabase.rpc("claim_approval", { p_id: id, p_action: "nachricht" });
  const a = antwort as { result: string; payload?: NachrichtInhalt } | null;
  if (a?.result !== "ok" || !a.payload) redirect(`/team/nachrichten/?hinweis=${a?.result ?? "fehler"}`);
  const inhalt = a.payload;
  const { data: empfaenger } = await supabase.rpc("broadcast_recipients", { p_filter: inhalt.filter });
  let gesendet = 0;
  let fehler = 0;
  const warteschlange = [...(empfaenger ?? [])];
  async function arbeiter() {
    for (let e = warteschlange.shift(); e; e = warteschlange.shift()) {
      if ((await sendeNachricht(e, rundmailFassung(inhalt, e.preferred_language), id, staff.userId)).ok) gesendet++;
      else fehler++;
    }
  }
  await Promise.all(Array.from({ length: 3 }, arbeiter));
  await supabase.rpc("record_approval_result", { p_id: id, p_result: { gesendet, fehler } });
  revalidatePath("/team/nachrichten/");
  redirect(`/team/nachrichten/?hinweis=gesendet-${gesendet}-${fehler}`);
}

/** Export aller Daten der Auswertung beantragen; die Filter der Auswertung werden mitgespeichert. */
export async function exportBeantragen(formData: FormData) {
  await requireStaff("alles");
  const filter = Object.fromEntries([...formData.entries()].filter(([k]) => k !== "$ACTION_ID" && !k.startsWith("$")).map(([k, v]) => [k, String(v).slice(0, 100)]));
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_approval", { p_action: "export", p_payload: { filter } });
  redirect(`/team/auswertung/?hinweis=${error ? "fehler" : "export-beantragt"}`);
}

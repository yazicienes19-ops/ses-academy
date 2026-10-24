"use server";

import { z } from "zod";
import { sendeTicketMail, ticketKuerzlichGesendet } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";

export type ModulOffen = { offen: false } | { offen: true; frei: number | null };

/** Ist das Modul gerade für Gäste offen, und wie viele Plätze sind frei? (null = unbegrenzt) */
export async function modulOffen(slug: string): Promise<ModulOffen> {
  const admin = createAdminClient();
  const { data: m } = await admin
    .from("modules")
    .select("id, capacity, status, open_registration, cancelled_at, module_days(starts_at)")
    .eq("slug", slug)
    .maybeSingle();
  const jetzt = new Date().toISOString();
  if (!m || m.status !== "published" || !m.open_registration || m.cancelled_at || !m.module_days.some((d) => d.starts_at > jetzt)) {
    return { offen: false };
  }
  if (m.capacity === null) return { offen: true, frei: null };
  const { count } = await admin.from("registrations").select("id", { count: "exact", head: true }).eq("module_id", m.id).eq("status", "confirmed");
  return { offen: true, frei: Math.max(0, m.capacity - (count ?? 0)) };
}

export type AnmeldungZustand = { status: "leer" | "angemeldet" | "warteliste" | "schon" | "fehler" };

const schema = z.object({
  slug: z.string().max(80),
  vorname: z.string().trim().min(1).max(80),
  nachname: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  sprache: z.enum(["de", "tr", "en", "fr", "nl"]),
  einwilligung: z.literal("ja"),
});

/** Öffentliche Anmeldung zu einem offenen Modul. Legt die Person an (oder findet sie) und schickt das Ticket. */
export async function gastAnmelden(_vorher: AnmeldungZustand, formData: FormData): Promise<AnmeldungZustand> {
  if (String(formData.get("webseite") ?? "") !== "") return { status: "angemeldet" }; // Spam-Falle
  const d = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!d.success) return { status: "fehler" };

  const { data } = await createAdminClient().rpc("register_public", {
    p_module_slug: d.data.slug,
    p_first_name: d.data.vorname,
    p_last_name: d.data.nachname,
    p_email: d.data.email,
    p_language: d.data.sprache,
  });
  const antwort = data as { result?: string; participant_id?: string; status?: string } | null;
  if (!antwort?.participant_id) return { status: "fehler" };

  if (!(await ticketKuerzlichGesendet(antwort.participant_id))) await sendeTicketMail(antwort.participant_id);
  if (antwort.result === "already_registered") return { status: "schon" };
  return { status: antwort.status === "waitlist" ? "warteliste" : "angemeldet" };
}

/** „Ticket verloren?“: schickt das Ticket erneut, verrät aber nicht, ob es die Adresse gibt. */
export async function ticketAnfordern(_vorher: { gesendet: boolean }, formData: FormData): Promise<{ gesendet: boolean }> {
  const email = z.string().trim().toLowerCase().pipe(z.email()).safeParse(formData.get("email"));
  if (!email.success) return { gesendet: false };
  const admin = createAdminClient();
  const { data: p } = await admin.from("participants").select("id, registrations(id)").eq("email", email.data).maybeSingle();
  if (p && p.registrations.length > 0 && !(await ticketKuerzlichGesendet(p.id))) await sendeTicketMail(p.id);
  return { gesendet: true };
}

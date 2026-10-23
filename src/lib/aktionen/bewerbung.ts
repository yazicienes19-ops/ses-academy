"use server";

import { z } from "zod";
import { sendeBewerbungEingang } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";

export type BewerbungZustand = { status: "leer" | "ok" | "fehler" | "doppelt" };

const jahr = new Date().getFullYear();
const text = (max: number) => z.string().trim().max(max);

const schema = z.object({
  vorname: text(80).min(1),
  nachname: text(80).min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  telefon: text(40).optional(),
  geburtsjahr: z.coerce.number().int().min(jahr - 31).max(jahr - 17),
  land: text(80).min(1),
  stadt: text(80).min(1),
  sprachen: z.array(text(40)).max(5),
  motivation: text(5000).min(1),
  quelle: text(200).optional(),
  sprache: z.enum(["de", "tr", "en", "fr", "nl"]),
  einwilligung: z.literal("ja"),
});

export async function bewerbungAbsenden(_vorher: BewerbungZustand, formData: FormData): Promise<BewerbungZustand> {
  // Spam-Falle: Dieses Feld ist für Menschen unsichtbar. Ist es gefüllt, tun wir so, als hätte es geklappt.
  if (String(formData.get("webseite") ?? "") !== "") return { status: "ok" };

  const roh = Object.fromEntries(formData.entries());
  const geprueft = schema.safeParse({ ...roh, sprachen: formData.getAll("sprachen").map(String) });
  if (!geprueft.success) return { status: "fehler" };
  const d = geprueft.data;

  const admin = createAdminClient();
  const { data: jahrgang } = await admin.from("cohorts").select("id").eq("is_current", true).maybeSingle();
  if (!jahrgang) return { status: "fehler" };

  const { error } = await admin.from("applications").insert({
    cohort_id: jahrgang.id,
    first_name: d.vorname,
    last_name: d.nachname,
    email: d.email,
    phone: d.telefon || null,
    birth_year: d.geburtsjahr,
    country: d.land,
    city: d.stadt,
    languages: d.sprachen,
    motivation: d.motivation,
    source: d.quelle || null,
    language: d.sprache,
    consent_at: new Date().toISOString(),
  });
  if (error?.code === "23505") return { status: "doppelt" };
  if (error) return { status: "fehler" };

  // Die Bewerbung ist gespeichert; scheitert nur die Bestätigungsmail, steht das im Mail-Protokoll.
  await sendeBewerbungEingang({ email: d.email, vorname: d.vorname, sprache: d.sprache });
  return { status: "ok" };
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { kurzcodeAnzeige, qrSvg } from "@/lib/tickets";

export type Schild = { vorname: string; nachname: string; zeile: string; rolle: string; code: string | null; qr: string | null };

/** Bezeichnung auf dem Schild, wie auf den bisherigen Papierschildern (Türkisch). */
const rollen: Record<string, string> = { academy_student: "KATILIMCI", alumni: "MEZUN", member: "ÜYE", guest: "MİSAFİR" };

/**
 * Namensschilder eines Moduls: Name, Region, Generation, Rolle und ein QR-Code mit dem Kurzcode, mit dem am Einlass
 * auch ohne Handy gescannt werden kann. Bewusst nicht der geheime Ticket-Token: der öffnet die Ticket-Seite
 * (Abmelden) und die Feedback-Umfrage; der Kurzcode reicht für den Einlass, auch offline. Dazu leere Schilder für
 * Walk-ins. Läuft mit dem Admin-Client; die Seite prüft vorher die Rolle.
 */
export async function ladeNamensschilder(modulId: string): Promise<{ titel: string; schilder: Schild[] } | null> {
  const db = createAdminClient();
  const { data: modul } = await db
    .from("modules")
    .select("title, registrations(status, participant:participants(first_name, last_name, short_code, affiliation_status, region:regions(name), cohort:cohorts(name)))")
    .eq("id", modulId)
    .maybeSingle();
  if (!modul) return null;

  const personen = modul.registrations
    .filter((r) => r.status === "confirmed")
    .map((r) => r.participant)
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "de"));

  const schilder: Schild[] = await Promise.all(personen.map(async (p) => ({
    vorname: p.first_name,
    nachname: p.last_name,
    zeile: [p.region?.name, p.affiliation_status === "academy_student" ? p.cohort?.name : null].filter(Boolean).join(" · "),
    rolle: rollen[p.affiliation_status] ?? rollen.guest,
    code: p.short_code ? kurzcodeAnzeige(p.short_code) : null,
    qr: p.short_code ? await qrSvg(p.short_code) : null,
  })));
  // Leere Schilder für Walk-ins und Gäste (Name von Hand)
  for (let i = 0; i < 4; i++) schilder.push({ vorname: "", nachname: "", zeile: "", rolle: rollen.guest, code: null, qr: null });
  return { titel: modul.title, schilder };
}

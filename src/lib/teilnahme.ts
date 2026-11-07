import "server-only";

import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type TicketModul = {
  registrationId: string;
  moduleId: string;
  titel: string;
  ort: string | null;
  status: Row<"registrations">["status"];
  ticketNoetig: boolean;
  abgesagt: boolean;
  tage: { id: string; tag: string; beginn: string; ende: string; besucht: boolean }[];
  beginn: string | null;
};

export type TicketDaten = {
  participant: Pick<Row<"participants">, "id" | "first_name" | "last_name" | "email" | "preferred_language" | "checkin_token" | "link_token" | "short_code">;
  module: TicketModul[];
  /** Über den Mail-Link (link_token) geöffnet. Nur dann darf die Seite abmelden; der QR-Inhalt (checkin_token) zeigt nur das Ticket. */
  perLink: boolean;
};

/**
 * Alles, was Ticket-Seite und Ticket-Mail brauchen. Läuft mit Dienstschlüssel, daher nur serverseitig.
 * token: zuerst der Link aus der Mail (link_token), sonst der QR-Inhalt bzw. ältere Links (checkin_token).
 */
export async function ladeTicket(filter: { token: string } | { participantId: string }): Promise<TicketDaten | null> {
  const admin = createAdminClient();
  const spalten = "id, first_name, last_name, email, preferred_language, checkin_token, link_token, short_code";
  let perLink = false;
  let participant: TicketDaten["participant"] | null = null;
  if ("token" in filter) {
    const { data: perMail } = await admin.from("participants").select(spalten).eq("link_token", filter.token).maybeSingle();
    if (perMail) {
      participant = perMail;
      perLink = true;
    } else {
      const { data: perQr } = await admin.from("participants").select(spalten).eq("checkin_token", filter.token).maybeSingle();
      participant = perQr;
    }
  } else {
    const { data } = await admin.from("participants").select(spalten).eq("id", filter.participantId).maybeSingle();
    participant = data;
  }
  if (!participant) return null;

  const { data: regs } = await admin
    .from("registrations")
    .select("id, status, module:modules!inner(id, title, location, status, ticket_required, cancelled_at, module_days(id, day, starts_at, ends_at)), attendances(module_day_id)")
    .eq("participant_id", participant.id)
    .eq("module.status", "published");

  const liste: TicketModul[] = (regs ?? []).map((r) => {
    const besucht = new Set(r.attendances.map((a) => a.module_day_id));
    const tage = [...r.module.module_days]
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((d) => ({ id: d.id, tag: d.day, beginn: d.starts_at, ende: d.ends_at, besucht: besucht.has(d.id) }));
    return {
      registrationId: r.id,
      moduleId: r.module.id,
      titel: r.module.title,
      ort: r.module.location,
      status: r.status,
      ticketNoetig: r.module.ticket_required,
      abgesagt: r.module.cancelled_at !== null,
      tage,
      beginn: tage[0]?.beginn ?? null,
    };
  });
  liste.sort((a, b) => (a.beginn ?? "").localeCompare(b.beginn ?? ""));
  return { participant, module: liste, perLink };
}

/** Datum eines Moduls lesbar, z. B. „14.–15. November 2026“. */
export function modulZeitraum(m: TicketModul, locale: string): string {
  if (m.tage.length === 0) return "";
  const f = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  const von = new Date(m.tage[0].beginn);
  const bis = new Date(m.tage[m.tage.length - 1].beginn);
  return m.tage.length === 1 ? f.format(von) : f.formatRange(von, bis);
}

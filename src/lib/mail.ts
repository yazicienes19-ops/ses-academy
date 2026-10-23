import "server-only";

import nodemailer, { type SendMailOptions } from "nodemailer";
import { locale } from "@/i18n/typ";
import { portalTexte, sprachOder } from "@/lib/portal-texte";
import { createAdminClient } from "@/lib/supabase/admin";
import { ladeTicket, modulZeitraum } from "@/lib/teilnahme";
import { kurzcodeAnzeige, qrPng } from "@/lib/tickets";

function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST fehlt (siehe .env.example).");
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

export function seitenUrl(pfad: string): string {
  return new URL(pfad, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString();
}

function html(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Ergebnis = { ok: true } | { ok: false; fehler: string };

async function protokolliere(eintrag: { participantId: string | null; art: string; an: string; ergebnis: Ergebnis; von?: string }) {
  await createAdminClient().from("email_log").insert({
    participant_id: eintrag.participantId,
    kind: eintrag.art,
    recipient: eintrag.an,
    status: eintrag.ergebnis.ok ? "sent" : "failed",
    error: eintrag.ergebnis.ok ? null : eintrag.ergebnis.fehler,
    triggered_by: eintrag.von ?? null,
  });
}

async function senden(nachricht: SendMailOptions): Promise<Ergebnis> {
  try {
    await transport().sendMail({ from: process.env.MAIL_FROM ?? "SES Academy <ses@islamrat.de>", ...nachricht });
    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: e instanceof Error ? e.message : String(e) };
  }
}

/** Ticket-Mail mit QR-Code, Kurzcode, Modulen und Link zur Ticket-Seite. */
export async function sendeTicketMail(participantId: string, ausgeloestVon?: string): Promise<Ergebnis> {
  const daten = await ladeTicket({ participantId });
  const email = daten?.participant.email;
  if (!daten || !email) return { ok: false, fehler: "Keine E-Mail-Adresse hinterlegt." };
  const p = daten.participant;
  const l = sprachOder(p.preferred_language);
  const t = portalTexte[l];
  const link = seitenUrl(`/ticket/${p.checkin_token}/`);
  const code = kurzcodeAnzeige(p.short_code ?? "");
  const aktiv = daten.module.filter((m) => !m.abgesagt && (m.status === "confirmed" || m.status === "waitlist" || m.status === "pending"));

  const modulZeilen = aktiv.map((m) => {
    const datum = modulZeitraum(m, locale[l]);
    const ort = m.ort ?? t.ortOffen;
    return { text: `• ${m.titel}: ${datum}, ${ort} (${t.status[m.status]})`, html: `<li><strong>${html(m.titel)}</strong><br>${html(datum)} · ${html(ort)} · ${html(t.status[m.status])}</li>` };
  });

  const text = [
    t.mailAnrede(p.first_name), "", t.mailTicketText, "", `${t.kurzcode}: ${code}`, `${t.mailTicketLink}: ${link}`, "",
    t.moduleTitel + ":", ...modulZeilen.map((z) => z.text), "", t.mailAbmeldeHinweis, "", t.mailGruss,
  ].join("\n");

  const inhalt = `<!doctype html><html lang="${l}"><body style="margin:0;background:#f3efe4;font-family:Arial,Helvetica,sans-serif;color:#13201a">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#3c4a42;margin:0 0 16px">SES Academy</p>
  <p style="font-size:16px;line-height:1.6">${html(t.mailAnrede(p.first_name))}<br>${html(t.mailTicketText)}</p>
  <div style="background:#ffffff;border-radius:20px;padding:24px;text-align:center;margin:24px 0">
    <img src="cid:ticket-qr" width="240" height="240" alt="QR-Code" style="display:block;margin:0 auto">
    <p style="margin:16px 0 4px;font-size:13px;color:#3c4a42">${html(t.kurzcode)}</p>
    <p style="margin:0;font-family:Menlo,Consolas,monospace;font-size:26px;font-weight:bold;letter-spacing:.12em">${html(code)}</p>
  </div>
  <p style="text-align:center;margin:0 0 28px"><a href="${html(link)}" style="display:inline-block;background:#13201a;color:#f3efe4;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold">${html(t.mailTicketLink)}</a></p>
  <p style="font-weight:bold;margin:0 0 8px">${html(t.moduleTitel)}</p>
  <ul style="padding-left:18px;line-height:1.6;margin:0 0 24px">${modulZeilen.map((z) => z.html).join("")}</ul>
  <p style="font-size:14px;line-height:1.6;color:#3c4a42">${html(t.mailAbmeldeHinweis)}</p>
  <p style="font-size:14px;line-height:1.6;white-space:pre-line">${html(t.mailGruss)}</p>
</div></body></html>`;

  const ergebnis = await senden({
    to: email,
    subject: t.mailTicketBetreff,
    text,
    html: inhalt,
    attachments: [{ filename: "ticket-qr.png", content: await qrPng(p.checkin_token), cid: "ticket-qr" }],
  });
  await protokolliere({ participantId: p.id, art: "ticket", an: email, ergebnis, von: ausgeloestVon });
  return ergebnis;
}

/** Eingangsbestätigung nach dem Absenden der Bewerbung. */
export async function sendeBewerbungEingang(an: { email: string; vorname: string; sprache: string }): Promise<Ergebnis> {
  const t = portalTexte[sprachOder(an.sprache)];
  const text = [t.mailAnrede(an.vorname), "", t.mailBewerbungText, "", t.mailGruss].join("\n");
  const ergebnis = await senden({
    to: an.email,
    subject: t.mailBewerbungBetreff,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#13201a;max-width:560px;line-height:1.6;white-space:pre-line">${html(text)}</div>`,
  });
  await protokolliere({ participantId: null, art: "application_received", an: an.email, ergebnis });
  return ergebnis;
}

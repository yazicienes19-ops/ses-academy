import "server-only";

import nodemailer, { type SendMailOptions } from "nodemailer";
import { locale } from "@/i18n/typ";
import { portalTexte, sprachOder } from "@/lib/portal-texte";
import { createAdminClient } from "@/lib/supabase/admin";
import { infoMailInhalt, ladeInfoMail } from "@/lib/infomail";
import { ladeTicket, modulZeitraum } from "@/lib/teilnahme";
import { kurzcodeAnzeige, qrPng } from "@/lib/tickets";

/** Ist der Mailversand eingerichtet (SMTP-Zugangsdaten in der .env)? */
export function mailBereit() {
  return Boolean(process.env.SMTP_HOST);
}

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

async function protokolliere(eintrag: { participantId: string | null; art: string; an: string; ergebnis: Ergebnis; von?: string; moduleId?: string }) {
  await createAdminClient().from("email_log").insert({
    participant_id: eintrag.participantId,
    kind: eintrag.art,
    recipient: eintrag.an,
    status: eintrag.ergebnis.ok ? "sent" : "failed",
    error: eintrag.ergebnis.ok ? null : eintrag.ergebnis.fehler,
    triggered_by: eintrag.von ?? null,
    module_id: eintrag.moduleId ?? null,
  });
}

async function senden(nachricht: SendMailOptions): Promise<Ergebnis> {
  if (!mailBereit()) return { ok: false, fehler: "Mailversand nicht eingerichtet (SMTP-Zugangsdaten fehlen)." };
  try {
    await transport().sendMail({ from: process.env.MAIL_FROM ?? "SES Academy <ses@islamrat.de>", ...nachricht });
    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Ticket-Mail mit QR-Code, Kurzcode, Modulen und Link zur Ticket-Seite.
 * art "willkommen": „Dein SES-Konto ist bereit“ mit Hinweis auf „Mein Bereich“ und den Login per Code.
 */
export async function sendeTicketMail(participantId: string, ausgeloestVon?: string, art: "ticket" | "willkommen" = "ticket"): Promise<Ergebnis> {
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

  const willkommen = art === "willkommen";
  const einleitung = willkommen ? t.mailWillkommenText : t.mailTicketText;
  const login = seitenUrl("/mein-bereich/login/");
  const text = [
    t.mailAnrede(p.first_name), "", einleitung, "", `${t.kurzcode}: ${code}`, `${t.mailTicketLink}: ${link}`,
    ...(willkommen ? [`${t.mailWillkommenLogin}: ${login}`] : []), "",
    t.moduleTitel + ":", ...modulZeilen.map((z) => z.text), "", t.mailAbmeldeHinweis, "", t.mailGruss,
  ].join("\n");

  const inhalt = `<!doctype html><html lang="${l}"><body style="margin:0;background:#f3efe4;font-family:Arial,Helvetica,sans-serif;color:#13201a">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#3c4a42;margin:0 0 16px">SES Academy</p>
  <p style="font-size:16px;line-height:1.6">${html(t.mailAnrede(p.first_name))}<br>${html(einleitung)}</p>
  <div style="background:#ffffff;border-radius:20px;padding:24px;text-align:center;margin:24px 0">
    <img src="cid:ticket-qr" width="240" height="240" alt="QR-Code" style="display:block;margin:0 auto">
    <p style="margin:16px 0 4px;font-size:13px;color:#3c4a42">${html(t.kurzcode)}</p>
    <p style="margin:0;font-family:Menlo,Consolas,monospace;font-size:26px;font-weight:bold;letter-spacing:.12em">${html(code)}</p>
  </div>
  <p style="text-align:center;margin:0 0 28px"><a href="${html(link)}" style="display:inline-block;background:#13201a;color:#f3efe4;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold">${html(t.mailTicketLink)}</a>${willkommen ? `<br><a href="${html(login)}" style="display:inline-block;margin-top:12px;color:#13201a;font-weight:bold">${html(t.mailWillkommenLogin)}</a>` : ""}</p>
  <p style="font-weight:bold;margin:0 0 8px">${html(t.moduleTitel)}</p>
  <ul style="padding-left:18px;line-height:1.6;margin:0 0 24px">${modulZeilen.map((z) => z.html).join("")}</ul>
  <p style="font-size:14px;line-height:1.6;color:#3c4a42">${html(t.mailAbmeldeHinweis)}</p>
  <p style="font-size:14px;line-height:1.6;white-space:pre-line">${html(t.mailGruss)}</p>
</div></body></html>`;

  const ergebnis = await senden({
    to: email,
    subject: willkommen ? t.mailWillkommenBetreff : t.mailTicketBetreff,
    text,
    html: inhalt,
    attachments: [{ filename: "ticket-qr.png", content: await qrPng(p.checkin_token), cid: "ticket-qr" }],
  });
  // Auch die Willkommensmail enthält das Ticket; sie zählt deshalb zusätzlich als Ticket-Versand
  await protokolliere({ participantId: p.id, art: willkommen ? "willkommen" : "ticket", an: email, ergebnis, von: ausgeloestVon });
  if (willkommen) await protokolliere({ participantId: p.id, art: "ticket", an: email, ergebnis, von: ausgeloestVon });
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

/** Schutz vor Mail-Flut: Wurde dieser Person in den letzten Minuten schon ein Ticket geschickt? */
export async function ticketKuerzlichGesendet(participantId: string, minuten = 10): Promise<boolean> {
  const seit = new Date(Date.now() - minuten * 60_000).toISOString();
  const { count } = await createAdminClient()
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", participantId)
    .eq("kind", "ticket")
    .eq("status", "sent")
    .gte("created_at", seit);
  return (count ?? 0) > 0;
}

/** Einladung zur Feedback-Umfrage eines Moduls mit persönlichem Link (Ticket-Token als Nachweis). */
export async function sendeFeedbackMail(participantId: string, surveyId: string, ausgeloestVon?: string): Promise<Ergebnis> {
  const db = createAdminClient();
  const [{ data: p }, { data: umfrage }] = await Promise.all([
    db.from("participants").select("id, first_name, email, checkin_token").eq("id", participantId).maybeSingle(),
    db.from("feedback_surveys").select("closes_at, module:modules(title)").eq("id", surveyId).maybeSingle(),
  ]);
  if (!p?.email || !umfrage) return { ok: false, fehler: "Keine E-Mail-Adresse hinterlegt." };
  const link = seitenUrl(`/feedback/${p.checkin_token}/${surveyId}/`);
  const bis = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", timeZone: "Europe/Berlin" }).format(new Date(umfrage.closes_at));
  const titel = umfrage.module?.title ?? "Modul";
  const text = [
    `Hallo ${p.first_name},`, "",
    `danke, dass du beim Modul „${titel}“ dabei warst. Wie fandest du es? Die Umfrage dauert etwa drei Minuten und hilft uns, das nächste Modul besser zu machen.`, "",
    `Zur Umfrage (bis ${bis}): ${link}`, "",
    "Herzliche Grüße", "Dein SES-Academy-Team",
  ].join("\n");
  const ergebnis = await senden({
    to: p.email,
    subject: `Dein Feedback zu „${titel}“ – SES Academy`,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#13201a;max-width:560px;line-height:1.6">
<p>Hallo ${html(p.first_name)},</p>
<p>danke, dass du beim Modul „${html(titel)}“ dabei warst. Wie fandest du es? Die Umfrage dauert etwa drei Minuten und hilft uns, das nächste Modul besser zu machen.</p>
<p style="margin:28px 0"><a href="${html(link)}" style="display:inline-block;background:#13201a;color:#f3efe4;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold">Zur Umfrage</a></p>
<p style="color:#3c4a42;font-size:14px">Die Umfrage ist bis ${html(bis)} offen.</p>
<p>Herzliche Grüße<br>Dein SES-Academy-Team</p></div>`,
  });
  await protokolliere({ participantId: p.id, art: "feedback", an: p.email, ergebnis, von: ausgeloestVon });
  return ergebnis;
}

/** Bestätigung nach einer Selbst-Abgabe in „Mein Bereich“. */
export async function sendeAbgabeBestaetigung(participantId: string, submissionId: string): Promise<Ergebnis> {
  const db = createAdminClient();
  const [{ data: p }, { data: s }] = await Promise.all([
    db.from("participants").select("id, first_name, email").eq("id", participantId).maybeSingle(),
    db.from("submissions").select("file_name, link, submitted_at, assignment:assignments(number, title)").eq("id", submissionId).maybeSingle(),
  ]);
  if (!p?.email || !s) return { ok: false, fehler: "Keine E-Mail-Adresse hinterlegt." };
  const wann = s.submitted_at ? new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(s.submitted_at)) : "";
  const was = s.file_name ?? s.link ?? "Abgabe";
  const text = [
    `Hallo ${p.first_name},`, "",
    `deine Abgabe zu Hausaufgabe ${s.assignment?.number}: ${s.assignment?.title} ist eingegangen${wann ? ` (${wann} Uhr)` : ""}.`,
    `Abgegeben: ${was}`, "",
    "Herzliche Grüße", "Dein SES-Academy-Team",
  ].join("\n");
  const ergebnis = await senden({
    to: p.email,
    subject: `Abgabe eingegangen: Hausaufgabe ${s.assignment?.number} – SES Academy`,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#13201a;max-width:560px;line-height:1.6;white-space:pre-line">${html(text)}</div>`,
  });
  await protokolliere({ participantId: p.id, art: "submission_received", an: p.email, ergebnis });
  return ergebnis;
}

/** Erinnerung zwei Tage vor der Frist einer Hausaufgabe, mit Link zu „Mein Bereich“. */
export async function sendeHausaufgabenErinnerung(participantId: string, assignmentId: string): Promise<Ergebnis> {
  const db = createAdminClient();
  const [{ data: p }, { data: a }] = await Promise.all([
    db.from("participants").select("id, first_name, email").eq("id", participantId).maybeSingle(),
    db.from("assignments").select("number, title, due_date").eq("id", assignmentId).maybeSingle(),
  ]);
  if (!p?.email || !a?.due_date) return { ok: false, fehler: "Keine E-Mail-Adresse oder keine Frist." };
  const frist = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${a.due_date}T12:00:00Z`));
  const link = seitenUrl("/mein-bereich/#hausaufgaben");
  const text = [
    `Hallo ${p.first_name},`, "",
    `kurze Erinnerung: Hausaufgabe ${a.number} („${a.title}“) ist bis ${frist}, 23:59 Uhr fällig. Abgeben kannst du in „Mein Bereich“ als Datei oder Link:`,
    link, "",
    "Falls du schon abgegeben hast oder entschuldigt bist, ignoriere diese Mail einfach.", "",
    "Herzliche Grüße", "Dein SES-Academy-Team",
  ].join("\n");
  const ergebnis = await senden({
    to: p.email,
    subject: `Erinnerung: Hausaufgabe ${a.number} bis ${frist} – SES Academy`,
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#13201a;max-width:560px;line-height:1.6;white-space:pre-line">${html(text)}</div>`,
  });
  await protokolliere({ participantId: p.id, art: `erinnerung_hausaufgabe_${a.number}`, an: p.email, ergebnis });
  return ergebnis;
}

/** Nachricht an alle (nach Vier-Augen-Freigabe): persönliche Anrede, Text, Link zu „Mein Bereich“. */
export async function sendeNachricht(an: { participant_id: string; email: string; first_name: string }, betreff: string, text: string, antragId: string, von?: string): Promise<Ergebnis> {
  const voll = [`Hallo ${an.first_name},`, "", text, "", `Mein Bereich: ${seitenUrl("/mein-bereich/")}`, "", "Herzliche Grüße", "Dein SES-Academy-Team"].join("\n");
  const ergebnis = await senden({
    to: an.email,
    subject: betreff,
    text: voll,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#13201a;max-width:560px;line-height:1.6;white-space:pre-line">${html(voll)}</div>`,
  });
  await protokolliere({ participantId: an.participant_id, art: `nachricht:${antragId}`, an: an.email, ergebnis, von });
  return ergebnis;
}

/**
 * Info-Mail zu einem Modul: Ticket, Termin und Ort, Übernachtung mit Hotel und Zimmer, Tagesordnung in EINER Mail.
 * test = an diese Adresse statt an die Person (Vorschau im eigenen Postfach); zählt dann nicht als versendet.
 */
export async function sendeInfoMail(participantId: string, moduleId: string, ausgeloestVon?: string, test?: string): Promise<Ergebnis> {
  const d = await ladeInfoMail(participantId, moduleId);
  if (!d) return { ok: false, fehler: "Nicht für dieses Modul angemeldet." };
  const an = test ?? d.p.email;
  if (!an) return { ok: false, fehler: "Keine E-Mail-Adresse hinterlegt." };
  const { betreff, text, html } = infoMailInhalt(d, seitenUrl(`/ticket/${d.p.checkin_token}/`));
  const ergebnis = await senden({
    to: an,
    subject: test ? `[Test] ${betreff}` : betreff,
    text,
    html,
    attachments: [{ filename: "ticket-qr.png", content: await qrPng(d.p.checkin_token), cid: "ticket-qr" }],
  });
  if (!test) {
    // Enthält das Ticket: zählt auch als Ticket-Versand
    await protokolliere({ participantId: d.p.id, art: "info", an, ergebnis, von: ausgeloestVon, moduleId });
    await protokolliere({ participantId: d.p.id, art: "ticket", an, ergebnis, von: ausgeloestVon, moduleId });
  }
  return ergebnis;
}

/** Absage eines Moduls an eine angemeldete Person (Deutsch/Türkisch nach Profil). */
export async function sendeAbsageMail(participantId: string, modulTitel: string, ausgeloestVon?: string, moduleId?: string): Promise<Ergebnis> {
  const { data: p } = await createAdminClient().from("participants").select("id, first_name, email, preferred_language").eq("id", participantId).maybeSingle();
  if (!p?.email) return { ok: false, fehler: "Keine E-Mail-Adresse hinterlegt." };
  const tr = p.preferred_language === "tr";
  const betreff = tr ? `${modulTitel}: program iptal edildi` : `${modulTitel} fällt aus`;
  const text = tr
    ? `Merhaba ${p.first_name},\n\nmaalesef „${modulTitel}“ programı iptal edildi. Biletin bu program için geçerli değil. Yeni bir tarih belli olunca sana haber vereceğiz.\n\nSorun olursa bu e-postayı yanıtlaman yeterli.\n\nSelamlarımızla\nSES Academy ekibi`
    : `Hallo ${p.first_name},\n\nleider müssen wir „${modulTitel}“ absagen. Dein Ticket gilt für dieses Modul nicht mehr. Sobald es einen neuen Termin gibt, melden wir uns.\n\nBei Fragen antworte einfach auf diese Mail.\n\nViele Grüße\nDein Team der SES Academy`;
  const ergebnis = await senden({ to: p.email, subject: betreff, text, html: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#13201a;background:#f3efe4;margin:0"><div style="max-width:560px;margin:0 auto;padding:28px 20px;font-size:16px;line-height:1.6;white-space:pre-line">${html(text)}</div></body></html>` });
  await protokolliere({ participantId: p.id, art: "absage", an: p.email, ergebnis, von: ausgeloestVon, moduleId });
  return ergebnis;
}

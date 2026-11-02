import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { kurzcodeAnzeige } from "@/lib/tickets";
import { nachtName } from "@/lib/uebernachtung";

/**
 * Info-Mail zu einem Modul: alles in EINER Mail statt getrennter Mails für Ticket, Tagesordnung und Zimmer.
 * Ticket (QR, Kurzcode), Termin und Ort, Übernachtung mit Hotel und (freigegebenem) Zimmer, Tagesordnung.
 * Inhalt und Versand nutzen dieselbe Funktion, damit die Vorschau genau der echten Mail entspricht.
 */

type Sprache = "de" | "tr";

const texte = {
  de: {
    betreff: (modul: string) => `${modul}: Ticket, Programm und Übernachtung`,
    anrede: (vorname: string) => `Liebe:r ${vorname},`,
    einleitung: (modul: string) => `wir freuen uns auf dich bei „${modul}“! Hier ist alles, was du dafür brauchst, in einer Mail.`,
    termin: "Termin und Ort",
    karte: "Ort auf der Karte",
    ticket: "Dein Ticket",
    ticketText: "Zeig diesen QR-Code beim Einlass. Ohne Handy reicht auch der Kurzcode.",
    kurzcode: "Kurzcode",
    ticketLink: "Ticket öffnen",
    uebernachtung: "Übernachtung",
    hotel: "Hotel",
    naechte: "Deine Nächte",
    zimmer: "Dein Zimmer",
    zimmerFolgt: "Die Zimmereinteilung bekommst du vor Ort.",
    keineUebernachtung: "Du hast keine Übernachtung angegeben. Falls du doch eine brauchst, melde dich bitte bei uns.",
    keineAngabe: "Du hast noch nicht angegeben, ob du übernachtest. Bitte trag es in „Mein Bereich“ ein.",
    programm: "Tagesordnung",
    programmFolgt: "Das Programm für diesen Tag folgt.",
    abmelden: "Falls du nicht teilnehmen kannst, melde dich bitte vorher über dein Ticket ab.",
    gruss: "Viele Grüße\nDein Team der SES Academy",
  },
  tr: {
    betreff: (modul: string) => `${modul}: bilet, program ve konaklama`,
    anrede: (vorname: string) => `Sevgili ${vorname},`,
    einleitung: (modul: string) => `„${modul}“ programında seni görmeyi dört gözle bekliyoruz! İhtiyacın olan her şey bu e-postada.`,
    termin: "Tarih ve yer",
    karte: "Haritada göster",
    ticket: "Biletin",
    ticketText: "Girişte bu QR kodunu göster. Telefonun yoksa kısa kod da yeterli.",
    kurzcode: "Kısa kod",
    ticketLink: "Bileti aç",
    uebernachtung: "Konaklama",
    hotel: "Otel",
    naechte: "Konaklayacağın geceler",
    zimmer: "Odan",
    zimmerFolgt: "Oda dağılımını yerinde öğreneceksin.",
    keineUebernachtung: "Konaklama ihtiyacı belirtmedin. Yine de ihtiyacın olursa lütfen bize yaz.",
    keineAngabe: "Konaklayıp konaklamayacağını henüz belirtmedin. Lütfen „Mein Bereich“ sayfasında bildir.",
    programm: "Program",
    programmFolgt: "Bu günün programı daha sonra bildirilecek.",
    abmelden: "Katılamayacaksan lütfen önceden biletin üzerinden bildir.",
    gruss: "Selamlarımızla\nSES Academy ekibi",
  },
} as const;

const locale = { de: "de-DE", tr: "tr-TR" } as const;

export type InfoDaten = NonNullable<Awaited<ReturnType<typeof ladeInfoMail>>>;

/** Alles für die Info-Mail einer Person zu einem Modul (mit Dienstschlüssel; Aufrufer prüft die Rolle). */
export async function ladeInfoMail(participantId: string, modulId: string) {
  const admin = createAdminClient();
  const [{ data: p }, { data: modul }, { data: reg }, { data: hotels }, { data: zuteilung }] = await Promise.all([
    admin.from("participants").select("id, first_name, last_name, email, preferred_language, checkin_token, short_code").eq("id", participantId).maybeSingle(),
    admin.from("modules").select("id, title, subtitle, location, ticket_required, module_days(id, starts_at, ends_at, program_items(starts_at, ends_at, title, status))").eq("id", modulId).maybeSingle(),
    admin.from("registrations").select("id, status, rsvp, stay_requests(nights)").eq("module_id", modulId).eq("participant_id", participantId).maybeSingle(),
    admin.from("hotels").select("id, name, address, rooms_visible").eq("module_id", modulId).order("created_at").limit(1),
    admin.from("room_assignments").select("hotel_id, rooms(label)").eq("participant_id", participantId),
  ]);
  if (!p || !modul || !reg) return null;
  const hotel = hotels?.[0] ?? null;
  const zimmer = hotel?.rooms_visible ? zuteilung?.find((z) => z.hotel_id === hotel.id)?.rooms?.label ?? null : null;
  const stay = Array.isArray(reg.stay_requests) ? reg.stay_requests[0] : reg.stay_requests;
  const tage = [...modul.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map((t) => ({
    ...t, punkte: t.program_items.filter((x) => x.status !== "entfaellt").sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  }));
  return { p, modul, tage, reg, naechte: stay ? [...stay.nights].sort() : null, hotel, zimmer };
}

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Betreff, Text- und HTML-Fassung. Das QR-Bild steckt im HTML als cid:ticket-qr (Anhang beim Versand). */
export function infoMailInhalt(d: InfoDaten, ticketLink: string) {
  const l: Sprache = d.p.preferred_language === "tr" ? "tr" : "de";
  const t = texte[l];
  const tagLang = new Intl.DateTimeFormat(locale[l], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  const uhr = new Intl.DateTimeFormat(locale[l], { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const zeit = (von: string, bis: string | null) => `${uhr.format(new Date(von))}${bis ? `–${uhr.format(new Date(bis))}` : ""}`;
  const code = kurzcodeAnzeige(d.p.short_code ?? "");
  const karte = d.modul.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.modul.location)}` : null;
  const termine = d.tage.map((x) => `${tagLang.format(new Date(x.starts_at))}, ${zeit(x.starts_at, x.ends_at)}`);

  const uebernachtung: { text: string[]; html: string } = (() => {
    if (d.naechte === null) return { text: [t.keineAngabe], html: `<p style="margin:0">${esc(t.keineAngabe)}</p>` };
    if (d.naechte.length === 0) return { text: [t.keineUebernachtung], html: `<p style="margin:0">${esc(t.keineUebernachtung)}</p>` };
    const zeilen: [string, string][] = [];
    if (d.hotel) zeilen.push([t.hotel, [d.hotel.name, d.hotel.address].filter(Boolean).join(", ")]);
    zeilen.push([t.naechte, d.naechte.map(nachtName).join(", ")]);
    zeilen.push([t.zimmer, d.zimmer ?? t.zimmerFolgt]);
    return {
      text: zeilen.map(([k, v]) => `${k}: ${v}`),
      html: zeilen.map(([k, v]) => `<p style="margin:0 0 6px"><span style="color:#3c4a42">${esc(k)}:</span> <strong>${esc(v)}</strong></p>`).join(""),
    };
  })();

  const programmText = d.tage.flatMap((x) => [
    "", tagLang.format(new Date(x.starts_at)),
    ...(x.punkte.length ? x.punkte.map((pk) => `${zeit(pk.starts_at, pk.ends_at)}  ${pk.title}`) : [t.programmFolgt]),
  ]);
  const programmHtml = d.tage.map((x) => `
    <p style="margin:18px 0 6px;font-weight:bold;color:#3d7a61">${esc(tagLang.format(new Date(x.starts_at)))}</p>
    ${x.punkte.length ? `<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${x.punkte.map((pk) => `
      <tr><td style="padding:6px 10px 6px 0;white-space:nowrap;vertical-align:top;font-weight:bold;border-bottom:1px solid #e4e1d8">${esc(zeit(pk.starts_at, pk.ends_at))}</td>
      <td style="padding:6px 0;border-bottom:1px solid #e4e1d8">${esc(pk.title)}</td></tr>`).join("")}</table>`
      : `<p style="margin:0;color:#3c4a42">${esc(t.programmFolgt)}</p>`}`).join("");

  const abschnitt = (titel: string, inhalt: string) =>
    `<div style="background:#ffffff;border-radius:20px;padding:20px 22px;margin:0 0 16px"><p style="margin:0 0 10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#3d7a61;font-weight:bold">${esc(titel)}</p>${inhalt}</div>`;

  const betreff = t.betreff(d.modul.title);
  const text = [
    t.anrede(d.p.first_name), "", t.einleitung(d.modul.title), "",
    `${t.termin}:`, ...termine, d.modul.location ?? "", ...(karte ? [`${t.karte}: ${karte}`] : []), "",
    `${t.ticket}:`, t.ticketText, `${t.kurzcode}: ${code}`, `${t.ticketLink}: ${ticketLink}`, "",
    `${t.uebernachtung}:`, ...uebernachtung.text, "",
    `${t.programm}:`, ...programmText, "",
    t.abmelden, "", t.gruss,
  ].join("\n");

  const html = `<!doctype html><html lang="${l}"><body style="margin:0;background:#f3efe4;font-family:Arial,Helvetica,sans-serif;color:#13201a">
<div style="max-width:580px;margin:0 auto;padding:28px 16px">
  <div style="background:#3d7a61;color:#ffffff;border-radius:20px;padding:24px 22px;margin:0 0 16px">
    <p style="margin:0;font-size:12px;letter-spacing:.3em;font-weight:bold">SES ACADEMY</p>
    <p style="margin:10px 0 0;font-family:Georgia,serif;font-size:26px;line-height:1.2">${esc(d.modul.title)}</p>
    ${d.modul.subtitle ? `<p style="margin:6px 0 0;font-family:Georgia,serif;font-size:16px;opacity:.9">${esc(d.modul.subtitle)}</p>` : ""}
  </div>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px">${esc(t.anrede(d.p.first_name))}<br>${esc(t.einleitung(d.modul.title))}</p>
  ${abschnitt(t.termin, `${termine.map((z) => `<p style="margin:0 0 4px;font-weight:bold">${esc(z)}</p>`).join("")}${d.modul.location ? `<p style="margin:8px 0 0">${esc(d.modul.location)}${karte ? ` · <a href="${esc(karte)}" style="color:#3d7a61;font-weight:bold">${esc(t.karte)}</a>` : ""}</p>` : ""}`)}
  ${abschnitt(t.ticket, `<p style="margin:0 0 12px;font-size:14px;line-height:1.5">${esc(t.ticketText)}</p>
    <div style="text-align:center">
      <img src="cid:ticket-qr" width="220" height="220" alt="QR-Code" style="display:block;margin:0 auto">
      <p style="margin:12px 0 2px;font-size:13px;color:#3c4a42">${esc(t.kurzcode)}</p>
      <p style="margin:0 0 14px;font-family:Menlo,Consolas,monospace;font-size:24px;font-weight:bold;letter-spacing:.12em">${esc(code)}</p>
      <a href="${esc(ticketLink)}" style="display:inline-block;background:#13201a;color:#f3efe4;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold">${esc(t.ticketLink)}</a>
    </div>`)}
  ${abschnitt(t.uebernachtung, uebernachtung.html)}
  ${abschnitt(t.programm, programmHtml)}
  <p style="font-size:14px;line-height:1.6;color:#3c4a42;margin:8px 4px">${esc(t.abmelden)}</p>
  <p style="font-size:14px;line-height:1.6;white-space:pre-line;margin:8px 4px">${esc(t.gruss)}</p>
</div></body></html>`;
  return { betreff, text, html };
}

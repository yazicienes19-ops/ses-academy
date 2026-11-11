import "server-only";

import { createSign } from "node:crypto";
import { seitenUrl } from "./mail";
import { portalTexte } from "./portal-texte";
import type { TicketDaten } from "./teilnahme";
import { kurzcodeAnzeige, qrInhalt } from "./codes";
import { WALLET_SPRACHE, walletDatum, walletEventName } from "./wallet-anzeige";

/**
 * Google-Wallet-Ticket. Gegenstück zum Apple-Pass (wallet.ts): derselbe Einlass-QR (checkin_token), ein Ticket pro
 * Person. Beim Klick legt der Server Klasse und Ticket über die Wallet-API an oder aktualisiert sie (so sind neue
 * Module auch in schon gespeicherten Tickets sichtbar) und leitet dann auf den „Speichern“-Link von Google weiter.
 *
 * Umgebungsvariablen (fehlt eine, ist die Funktion aus und der Knopf unsichtbar):
 *   GOOGLE_WALLET_ISSUER_ID         Aussteller-ID aus der Google Pay & Wallet Console (nur Ziffern)
 *   GOOGLE_WALLET_SERVICE_ACCOUNT   JSON-Schlüssel des Dienstkontos, roh oder Base64
 */

const API = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

type Dienstkonto = { client_email: string; private_key: string };

function konfiguration(): { issuerId: string; konto: Dienstkonto } | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const roh = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT?.trim();
  if (!issuerId || !/^\d+$/.test(issuerId) || !roh) return null;
  try {
    const json = roh.startsWith("{") ? roh : Buffer.from(roh, "base64").toString("utf8");
    const konto = JSON.parse(json) as Dienstkonto;
    if (!konto.client_email || !konto.private_key) return null;
    return { issuerId, konto };
  } catch {
    return null;
  }
}

export function googleWalletAktiv(): boolean {
  return konfiguration() !== null;
}

function b64url(daten: string | Buffer): string {
  return Buffer.from(daten).toString("base64url");
}

/** RS256-JWT, signiert mit dem Schlüssel des Dienstkontos. */
export function signiereJwt(nutzlast: Record<string, unknown>, privateKey: string): string {
  const kopf = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const rumpf = b64url(JSON.stringify(nutzlast));
  const signatur = createSign("RSA-SHA256").update(`${kopf}.${rumpf}`).sign(privateKey);
  return `${kopf}.${rumpf}.${b64url(signatur)}`;
}

let zugang: { token: string; bis: number } | null = null;

async function zugangsToken(konto: Dienstkonto): Promise<string> {
  if (zugang && zugang.bis > Date.now() + 60_000) return zugang.token;
  const jetzt = Math.floor(Date.now() / 1000);
  const assertion = signiereJwt(
    { iss: konto.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: jetzt, exp: jetzt + 3600 },
    konto.private_key,
  );
  const antwort = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!antwort.ok) throw new Error(`Google-Anmeldung fehlgeschlagen (${antwort.status})`);
  const json = (await antwort.json()) as { access_token: string; expires_in: number };
  zugang = { token: json.access_token, bis: Date.now() + json.expires_in * 1000 };
  return zugang.token;
}

/** Erst aktualisieren, gibt es das noch nicht (404), neu anlegen. */
async function speichere(art: "eventTicketClass" | "eventTicketObject", id: string, inhalt: object, token: string) {
  const kopf = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const update = await fetch(`${API}/${art}/${encodeURIComponent(id)}`, { method: "PUT", headers: kopf, body: JSON.stringify(inhalt) });
  if (update.ok) return;
  if (update.status !== 404) throw new Error(`Google Wallet ${art} (${update.status}): ${await update.text()}`);
  const neu = await fetch(`${API}/${art}`, { method: "POST", headers: kopf, body: JSON.stringify(inhalt) });
  if (!neu.ok && neu.status !== 409) throw new Error(`Google Wallet ${art} anlegen (${neu.status}): ${await neu.text()}`);
}

const text = (wert: string, sprache: string) => ({ defaultValue: { language: sprache, value: wert } });

/** Klasse (Aussehen, für alle gleich) und Ticket (pro Person) so, wie sie an die Wallet-API gehen. */
export function googleWalletInhalt(daten: TicketDaten, issuerId: string) {
  const p = daten.participant;
  const l = WALLET_SPRACHE;
  const t = portalTexte[l];
  const jetzt = Date.now();
  const aktiv = daten.module.filter((m) => !m.abgesagt && (m.status === "confirmed" || m.status === "waitlist" || m.status === "pending"));
  const naechstes = aktiv.find((m) => m.tage.some((d) => Date.parse(d.ende) > jetzt));
  const kurzcode = kurzcodeAnzeige(p.short_code ?? "");

  const klasse = {
    id: `${issuerId}.ses_academy_ticket`,
    issuerName: "SES Academy",
    eventName: text("SES Academy", "de"),
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: "#173226",
    logo: { sourceUri: { uri: seitenUrl("/wallet/google-logo.png") }, contentDescription: text("SES Academy", "de") },
    heroImage: { sourceUri: { uri: seitenUrl("/wallet/google-hero.png") }, contentDescription: text("SES Academy", "de") },
  };

  const objekt = {
    id: `${issuerId}.${p.id}`,
    classId: klasse.id,
    state: "ACTIVE",
    ticketHolderName: `${p.first_name} ${p.last_name}`.trim(),
    barcode: { type: "QR_CODE", value: qrInhalt(p.checkin_token), alternateText: "CHECK-IN" },
    textModulesData: [
      { id: "naechstes", header: "EVENT", body: naechstes ? walletEventName(naechstes) : t.walletKeinTermin },
      ...(naechstes ? [
        { id: "datum", header: "DATE", body: walletDatum(naechstes) },
        { id: "ort", header: "LOCATION", body: naechstes.ort ?? t.ortOffen },
      ] : []),
      { id: "kurzcode", header: t.kurzcode, body: kurzcode },
      ...(aktiv.length ? [{ id: "module", header: t.moduleTitel, body: aktiv.map((m) => `${walletEventName(m)}: ${walletDatum(m)}, ${m.ort ?? t.ortOffen} (${t.status[m.status]})`).join("\n") }] : []),
      { id: "hinweis", header: t.ticketTitel, body: t.ticketIntro },
    ],
    // Ticket-Seite über den QR-Token: ohne Abmelden (das geht nur mit dem Link aus der Mail)
    linksModuleData: { uris: [{ id: "ticket", uri: seitenUrl(`/ticket/${p.checkin_token}/`), description: t.walletTicketSeite }] },
  };
  return { klasse, objekt };
}

/** Legt Klasse und Ticket an bzw. aktualisiert sie und gibt den „In Google Wallet speichern“-Link zurück. */
export async function googleWalletLink(daten: TicketDaten): Promise<string | null> {
  const k = konfiguration();
  if (!k) return null;
  const { klasse, objekt } = googleWalletInhalt(daten, k.issuerId);
  const token = await zugangsToken(k.konto);
  await speichere("eventTicketClass", klasse.id, klasse, token);
  await speichere("eventTicketObject", objekt.id, objekt, token);
  const jwt = signiereJwt(
    {
      iss: k.konto.client_email,
      aud: "google",
      typ: "savetowallet",
      origins: [new URL(seitenUrl("/")).origin],
      payload: { eventTicketObjects: [{ id: objekt.id }] },
    },
    k.konto.private_key,
  );
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

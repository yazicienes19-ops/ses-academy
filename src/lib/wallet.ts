import "server-only";

import { PKPass } from "passkit-generator";
import { seitenUrl } from "./mail";
import { portalTexte } from "./portal-texte";
import type { TicketDaten } from "./teilnahme";
import { kurzcodeAnzeige, qrInhalt } from "./codes";
import { walletBilder } from "./wallet-bilder";
import { WALLET_SPRACHE, walletDatum, walletEventName } from "./wallet-anzeige";

/**
 * Apple-Wallet-Pass (.pkpass) zum Ticket. Inhalt des Barcodes ist derselbe wie beim QR auf der Ticket-Seite
 * (checkin_token), der Einlass-Scanner braucht also nichts Neues. Ein Pass pro Person, Seriennummer = Personen-ID:
 * erneutes Hinzufügen ersetzt den alten Pass in der Wallet.
 *
 * Umgebungsvariablen (fehlt eine, ist die Funktion aus und der Knopf unsichtbar):
 *   APPLE_WALLET_PASS_TYPE_ID  z. B. pass.de.islamrat.ses.ticket
 *   APPLE_WALLET_TEAM_ID       Team ID aus dem Apple-Developer-Konto (10 Zeichen)
 *   APPLE_WALLET_CERT          Pass-Type-ID-Zertifikat als PEM (Zeilenumbrüche echt oder als \n)
 *   APPLE_WALLET_KEY           privater Schlüssel dazu als PEM
 *   APPLE_WALLET_KEY_PASSPHRASE  nur, falls der Schlüssel verschlüsselt ist
 */

// Apple Worldwide Developer Relations G4 (öffentlich, gültig bis 10.12.2030)
const WWDR_G4 = "-----BEGIN CERTIFICATE-----\nMIIEVTCCAz2gAwIBAgIUE9x3lVJx5T3GMujM/+Uh88zFztIwDQYJKoZIhvcNAQEL\nBQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsT\nHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBS\nb290IENBMB4XDTIwMTIxNjE5MzYwNFoXDTMwMTIxMDAwMDAwMFowdTFEMEIGA1UE\nAww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNh\ndGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkc0MRMwEQYDVQQKDApBcHBsZSBJbmMu\nMQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAf\neKp6JzKwRl/nF3bYoJ0OKY6tPTKlxGs3yeRBkWq3eXFdDDQEYHX3rkOPR8SGHgjo\nv9Y5Ui8eZ/xx8YJtPH4GUnadLLzVQ+mxtLxAOnhRXVGhJeG+bJGdayFZGEHVD41t\nQSo5SiHgkJ9OE0/QjJoyuNdqkh4laqQyziIZhQVg3AJK8lrrd3kCfcCXVGySjnYB\n5kaP5eYq+6KwrRitbTOFOCOL6oqW7Z+uZk+jDEAnbZXQYojZQykn/e2kv1MukBVl\nPNkuYmQzHWxq3Y4hqqRfFcYw7V/mjDaSlLfcOQIA+2SM1AyB8j/VNJeHdSbCb64D\nYyEMe9QbsWLFApy9/a8CAwEAAaOB7zCB7DASBgNVHRMBAf8ECDAGAQH/AgEAMB8G\nA1UdIwQYMBaAFCvQaUeUdgn+9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0\nBggrBgEFBQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJv\nb3RjYTAuBgNVHR8EJzAlMCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290\nLmNybDAdBgNVHQ4EFgQUW9n6HeeaGgujmXYiUIY+kchbd6gwDgYDVR0PAQH/BAQD\nAgEGMBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQA/Vj2e5bbD\neeZFIGi9v3OLLBKeAuOugCKMBB7DUshwgKj7zqew1UJEggOCTwb8O0kU+9h0UoWv\np50h5wESA5/NQFjQAde/MoMrU1goPO6cn1R2PWQnxn6NHThNLa6B5rmluJyJlPef\nx4elUWY0GzlxOSTjh2fvpbFoe4zuPfeutnvi0v/fYcZqdUmVIkSoBPyUuAsuORFJ\nEtHlgepZAE9bPFo22noicwkJac3AfOriJP6YRLj477JxPxpd1F1+M02cHSS+APCQ\nA1iZQT0xWmJArzmoUUOSqwSonMJNsUvSq3xKX+udO7xPiEAGE/+QF4oIRynoYpgp\npU8RBWk6z/Kf\n-----END CERTIFICATE-----\n";

function pem(name: string): string | undefined {
  const wert = process.env[name]?.trim();
  return wert ? wert.replace(/\\n/g, "\n") : undefined;
}

function konfiguration() {
  const passTypeIdentifier = process.env.APPLE_WALLET_PASS_TYPE_ID?.trim();
  const teamIdentifier = process.env.APPLE_WALLET_TEAM_ID?.trim();
  const signerCert = pem("APPLE_WALLET_CERT");
  const signerKey = pem("APPLE_WALLET_KEY");
  if (!passTypeIdentifier || !teamIdentifier || !signerCert || !signerKey) return null;
  return { passTypeIdentifier, teamIdentifier, signerCert, signerKey, signerKeyPassphrase: process.env.APPLE_WALLET_KEY_PASSPHRASE || undefined };
}

export function walletAktiv(): boolean {
  return konfiguration() !== null;
}

export async function erzeugeWalletPass(daten: TicketDaten): Promise<Buffer | null> {
  const k = konfiguration();
  if (!k) return null;
  const p = daten.participant;
  const l = WALLET_SPRACHE;
  const t = portalTexte[l];
  const jetzt = Date.now();

  const aktiv = daten.module.filter((m) => !m.abgesagt && (m.status === "confirmed" || m.status === "waitlist" || m.status === "pending"));
  const naechstes = aktiv.find((m) => m.tage.some((d) => Date.parse(d.ende) > jetzt));
  const kommendeTage = aktiv.filter((m) => m.ticketNoetig && m.status === "confirmed")
    .flatMap((m) => m.tage).filter((d) => Date.parse(d.ende) > jetzt).slice(0, 10);

  const modulListe = aktiv.map((m) => `${walletEventName(m)}\n${walletDatum(m)} · ${m.ort ?? t.ortOffen} · ${t.status[m.status]}`).join("\n\n");
  const name = `${p.first_name} ${p.last_name}`.trim();

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: k.passTypeIdentifier,
    teamIdentifier: k.teamIdentifier,
    serialNumber: p.id,
    organizationName: "SES Academy",
    description: t.ticketTitel,
    backgroundColor: "rgb(243, 239, 228)",
    foregroundColor: "rgb(19, 32, 26)",
    labelColor: "rgb(63, 110, 87)",
    sharingProhibited: true,
    eventTicket: {
      primaryFields: [{ key: "name", label: "PARTICIPANT", value: name }],
      secondaryFields: naechstes
        ? [{ key: "modul", label: "EVENT", value: walletEventName(naechstes) }, { key: "datum", label: "DATE", value: walletDatum(naechstes) }]
        : [{ key: "modul", label: "EVENT", value: t.walletKeinTermin }],
      auxiliaryFields: naechstes ? [{ key: "ort", label: "LOCATION", value: naechstes.ort ?? t.ortOffen }] : [],
      backFields: [
        { key: "kurzcode", label: t.kurzcode, value: kurzcodeAnzeige(p.short_code ?? "") },
        { key: "hinweis", label: t.ticketTitel, value: `${t.ticketIntro}\n\n${t.walletHinweis}` },
        ...(modulListe ? [{ key: "module", label: t.moduleTitel, value: modulListe }] : []),
        // Ticket-Seite über den QR-Token: zeigt alles, aber ohne Abmelden (das geht nur mit dem Link aus der Mail)
        { key: "link", label: t.walletTicketSeite, value: seitenUrl(`/ticket/${p.checkin_token}/`), dataDetectorTypes: ["PKDataDetectorTypeLink"] },
      ],
    },
    ...(kommendeTage.length ? { relevantDates: kommendeTage.map((d) => ({ startDate: new Date(Date.parse(d.beginn) - 2 * 3600_000).toISOString(), endDate: d.ende })) } : {}),
  };

  const dateien: Record<string, Buffer> = { "pass.json": Buffer.from(JSON.stringify(passJson)) };
  for (const [datei, b64] of Object.entries(walletBilder)) dateien[datei] = Buffer.from(b64, "base64");

  const pass = new PKPass(dateien, { wwdr: WWDR_G4, signerCert: k.signerCert, signerKey: k.signerKey, signerKeyPassphrase: k.signerKeyPassphrase });
  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: qrInhalt(p.checkin_token), messageEncoding: "iso-8859-1", altText: "CHECK-IN" });
  return pass.getAsBuffer();
}

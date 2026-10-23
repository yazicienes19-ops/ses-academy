// Reine Code-Helfer ohne Abhängigkeiten, nutzbar im Browser und auf dem Server.

const PRAEFIX = "ses:checkin:";

/** Inhalt des QR-Codes. Der Token ist geheim und eindeutig pro Person. */
export function qrInhalt(token: string): string {
  return `${PRAEFIX}${token}`;
}

/** Wie in der Datenbank (normalize_checkin_code): Präfix, Leerzeichen und Bindestriche weg, Großbuchstaben. */
export function normalisiereCode(eingabe: string): string {
  return eingabe.trim().replace(/^ses:checkin:/i, "").replace(/[\s-]/g, "").toUpperCase();
}

/** Ist das überhaupt ein lesbarer Code? Volle UUID (32 Hex) oder Kurzcode (8 Hex). */
export function istGueltigesFormat(normalisiert: string): boolean {
  return /^[0-9A-F]{32}$/.test(normalisiert) || /^[0-9A-F]{8}$/.test(normalisiert);
}

/** Kurzcode zum Vorlesen, z. B. „A1B2-C3D4“. */
export function kurzcodeAnzeige(kurzcode: string): string {
  return `${kurzcode.slice(0, 4)}-${kurzcode.slice(4, 8)}`;
}

export function istToken(wert: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wert);
}

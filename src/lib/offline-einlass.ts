// Offline-Einlass im Browser: schlanke Einlassliste und Warteschlange für Scans ohne Internet.
// Gespeichert wird nur, was der Einlass braucht (Name, Zugehörigkeit, Kurzcode, Token-Hash, Status),
// keine Kontaktdaten. Alte Listen werden nach 3 Tagen automatisch gelöscht.

import type { EinlassErgebnis } from "@/lib/einlass";

const PRAEFIX = "ses-einlass:";
const WARTESCHLANGE = `${PRAEFIX}warteschlange`;
const HALTBAR_MS = 3 * 24 * 3600_000;

export type OfflineEintrag = {
  participant_id: string;
  display_name: string;
  affiliation_status: NonNullable<EinlassErgebnis["affiliation_status"]>;
  short_code: string;
  token_hash: string;
  registration_status: NonNullable<EinlassErgebnis["registration_status"]>;
  checked_in_at: string | null;
};

export type OfflineScan = { tagId: string; code: string; gescanntUm: string; participantId: string; name: string };

type Liste = { gespeichert: number; modulTitel: string; eintraege: OfflineEintrag[] };

// localStorage kann in privaten Fenstern fehlen oder voll sein: dann läuft der Einlass eben nur online.
function lesen<T>(schluessel: string): T | null {
  try {
    const roh = localStorage.getItem(schluessel);
    return roh ? (JSON.parse(roh) as T) : null;
  } catch {
    return null;
  }
}
function schreiben(schluessel: string, wert: unknown) {
  try {
    localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch {
    /* kein Speicher verfügbar */
  }
}

export function listeSpeichern(tagId: string, modulTitel: string, eintraege: OfflineEintrag[]) {
  schreiben(`${PRAEFIX}liste:${tagId}`, { gespeichert: Date.now(), modulTitel, eintraege } satisfies Liste);
}

export function listeLaden(tagId: string): Liste | null {
  return lesen<Liste>(`${PRAEFIX}liste:${tagId}`);
}

/** Abgelaufene Listen entfernen (Datensparsamkeit). Die Warteschlange bleibt, bis sie übertragen ist. */
export function aufraeumen() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k?.startsWith(`${PRAEFIX}liste:`)) continue;
      const l = lesen<Liste>(k);
      if (!l || Date.now() - l.gespeichert > HALTBAR_MS) localStorage.removeItem(k);
    }
  } catch {
    /* kein Speicher verfügbar */
  }
}

export function warteschlange(): OfflineScan[] {
  return lesen<OfflineScan[]>(WARTESCHLANGE) ?? [];
}
export function warteschlangeSetzen(scans: OfflineScan[]) {
  schreiben(WARTESCHLANGE, scans);
  window.dispatchEvent(new Event(WARTESCHLANGE));
}

/** Für useSyncExternalStore: meldet Änderungen der Warteschlange (auch aus anderen Tabs). */
export function warteschlangeAbonnieren(melden: () => void) {
  window.addEventListener(WARTESCHLANGE, melden);
  window.addEventListener("storage", melden);
  return () => {
    window.removeEventListener(WARTESCHLANGE, melden);
    window.removeEventListener("storage", melden);
  };
}

async function sha256Hex(text: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null; // nur in sicheren Verbindungen (https, localhost)
  const puffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(puffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Prüft einen normalisierten Code (32 oder 8 Hex-Zeichen) gegen die gespeicherte Liste,
 * merkt ihn in der Warteschlange vor und markiert die Person lokal als da.
 */
export async function offlinePruefen(tagId: string, code: string): Promise<EinlassErgebnis> {
  const liste = listeLaden(tagId);
  if (!liste) return { result: "offline_ohne_liste" };
  let treffer: OfflineEintrag | undefined;
  if (code.length === 32) {
    const hash = await sha256Hex(code.toLowerCase());
    treffer = hash ? liste.eintraege.find((e) => e.token_hash === hash) : undefined;
  } else {
    treffer = liste.eintraege.find((e) => e.short_code === code);
  }
  if (!treffer) return { result: "not_found" };

  const person = {
    participant_id: treffer.participant_id,
    display_name: treffer.display_name,
    affiliation_status: treffer.affiliation_status,
    module_title: liste.modulTitel,
    registration_status: treffer.registration_status,
  };
  if (treffer.registration_status !== "confirmed") return { ...person, result: "not_eligible" };
  if (treffer.checked_in_at) return { ...person, result: "offline_bereits", checked_in_at: treffer.checked_in_at };

  const jetzt = new Date().toISOString();
  treffer.checked_in_at = jetzt;
  listeSpeichern(tagId, liste.modulTitel, liste.eintraege);
  warteschlangeSetzen([...warteschlange(), { tagId, code, gescanntUm: jetzt, participantId: treffer.participant_id, name: treffer.display_name }]);
  return { ...person, result: "offline_vorgemerkt", checked_in_at: jetzt };
}

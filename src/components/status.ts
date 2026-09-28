"use client";

import { useSyncExternalStore } from "react";
import type { Modul } from "@/i18n/daten";

export type Status = "vorbei" | "naechstes" | "geplant";

// Beim Build wird das Build-Datum verwendet, im Browser das echte heutige Datum –
// so veraltet die Seite nicht, wenn sie länger nicht neu gebaut wird.
const buildTag = new Date().toISOString().slice(0, 10);
const heuteImBrowser = () => new Date().toISOString().slice(0, 10);
const abonnieren = () => () => {};

export function useHeute(): string {
  return useSyncExternalStore(abonnieren, heuteImBrowser, () => buildTag);
}

export function statusListe(module: Modul[], heute: string): Status[] {
  let naechstesVergeben = false;
  return module.map((m) => {
    if (m.bis < heute) return "vorbei";
    if (!naechstesVergeben) {
      naechstesVergeben = true;
      return "naechstes";
    }
    return "geplant";
  });
}

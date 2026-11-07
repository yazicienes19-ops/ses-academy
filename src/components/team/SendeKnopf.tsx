"use client";

import { useFormStatus } from "react-dom";

/** Absendeknopf, der während der Anfrage gesperrt ist (kein doppeltes Absenden bei Doppelklick oder langsamem WLAN). */
export function SendeKnopf({ children, laeuft, className = "knopf" }: { children: React.ReactNode; laeuft: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending} className={className}>{pending ? laeuft : children}</button>;
}

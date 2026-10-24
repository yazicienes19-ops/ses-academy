/** Rückmeldung nach einer Aktion (über ?hinweis= in der Adresse). */
export function Hinweis({ code, texte }: { code?: string | string[]; texte: Record<string, { text: string; gut: boolean }> }) {
  const h = typeof code === "string" ? texte[code] : undefined;
  if (!h) return null;
  return <p role="status" className={`mt-4 rounded-2xl p-4 ${h.gut ? "bg-emerald-100 text-emerald-950" : "bg-amber-100 text-amber-950"}`}>{h.text}</p>;
}

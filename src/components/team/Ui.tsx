import Link from "next/link";

export function Titel({ kicker, children, aktion }: { kicker?: string; children: React.ReactNode; aktion?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && <p className="text-sm font-semibold tracking-wide text-sage uppercase">{kicker}</p>}
        <h1 className="font-display mt-1 text-4xl leading-none font-extrabold">{children}</h1>
      </div>
      {aktion}
    </div>
  );
}

export function Zahl({ wert, text, href, ton = "neutral" }: { wert: number | string; text: string; href?: string; ton?: "neutral" | "warnung" | "gut" }) {
  const farbe = ton === "warnung" ? "bg-gelb-hell" : ton === "gut" ? "bg-gruen-hell" : "bg-weiss";
  const inhalt = (
    <>
      <span className="font-display block text-3xl font-extrabold">{wert}</span>
      <span className="mt-1 block text-sm text-ink-soft">{text}</span>
    </>
  );
  return href ? (
    <Link href={href} className={`block rounded-3xl p-5 ring-1 ring-line transition hover:ring-ink ${farbe}`}>{inhalt}</Link>
  ) : (
    <div className={`rounded-3xl p-5 ring-1 ring-line ${farbe}`}>{inhalt}</div>
  );
}

const hinweise: Record<string, string> = {
  gespeichert: "Gespeichert.",
  bewertet: "Bewertung gespeichert.",
  "ticket-gesendet": "QR-Code per Mail verschickt.",
  "ticket-fehler": "Die Mail konnte nicht verschickt werden (keine E-Mail-Adresse oder Mailserver nicht erreichbar).",
};

/** Rückmeldung aus ?hinweis= bzw. ?fehler= */
export function Rueckmeldung({ hinweis, fehler }: { hinweis?: string | string[]; fehler?: string | string[] }) {
  if (typeof fehler === "string") return <p role="alert" className="mb-6 rounded-2xl bg-rot-hell p-4 text-sm font-semibold text-rot">{fehler}</p>;
  if (typeof hinweis === "string") return <p role="status" className={`mb-6 rounded-2xl p-4 text-sm font-semibold ${hinweis === "ticket-fehler" ? "bg-gelb-hell" : "bg-gruen-hell"}`}>{hinweise[hinweis] ?? hinweis}</p>;
  return null;
}

export function Leer({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl border-2 border-dashed border-line p-8 text-center text-ink-soft">{children}</p>;
}

export const laender: Record<string, string> = { DE: "Deutschland", AT: "Österreich", FR: "Frankreich", CH: "Schweiz", NL: "Niederlande", BE: "Belgien", other: "Andere" };

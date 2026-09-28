import type { Modul } from "@/content/site";

export function Kicker({ children, hell = false }: { children: React.ReactNode; hell?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-semibold tracking-[0.2em] uppercase ${hell ? "text-signal" : "text-sage"}`}>
      <span className={`h-px w-8 ${hell ? "bg-signal" : "bg-sage"}`} aria-hidden />
      {children}
    </p>
  );
}

export function Seitenkopf({ kicker, titel, text }: { kicker: string; titel: React.ReactNode; text?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 pb-12 sm:px-6 sm:pt-20 lg:px-10">
      <Kicker>{kicker}</Kicker>
      <h1 className="font-display mt-5 max-w-5xl text-[clamp(2.6rem,8vw,6.5rem)] leading-[0.92] font-extrabold">{titel}</h1>
      {text && <p className="mt-7 max-w-2xl text-lg text-ink-soft sm:text-xl">{text}</p>}
    </section>
  );
}

const artFarbe: Record<Modul["art"], string> = {
  Auftakt: "bg-signal text-ink",
  Seminar: "bg-paper text-ink ring-1 ring-line",
  Skills: "bg-mint text-white",
  Abschluss: "bg-ink text-paper",
};

export function ArtBadge({ art }: { art: Modul["art"] }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${artFarbe[art]}`}>{art}</span>;
}

export function StatusPunkt({ status }: { status: Modul["status"] }) {
  if (status === "abgeschlossen")
    return <span className="text-xs font-medium text-ink-soft">✓ stattgefunden</span>;
  if (status === "naechstes")
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-sage">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
        </span>
        als Nächstes
      </span>
    );
  return <span className="text-xs font-medium text-ink-soft/70">geplant</span>;
}

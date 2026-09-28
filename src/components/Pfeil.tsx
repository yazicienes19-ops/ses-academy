type Richtung = "rechts" | "links" | "runter" | "extern";

const drehung: Record<Richtung, string> = { rechts: "0", links: "180", runter: "90", extern: "-45" };

/** Einheitlicher Pfeil statt Textzeichen (→ ← ↓ ↗). Gleitet beim Hover über Link/Knopf leicht mit (siehe globals.css). */
export function Pfeil({ richtung = "rechts", className = "" }: { richtung?: Richtung; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`pfeil pfeil-${richtung} inline-block h-[1em] w-[1em] shrink-0 align-[-0.14em] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform={`rotate(${drehung[richtung]} 12 12)`}>
        <path d="M5 12h13" />
        <path d="M12.5 6.5 18 12l-5.5 5.5" />
      </g>
    </svg>
  );
}

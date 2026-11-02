import Link from "next/link";

const reiter = [
  { pfad: "", name: "Übersicht" },
  { pfad: "programm/", name: "Programm" },
  { pfad: "referenten/", name: "Referenten" },
  { pfad: "checkliste/", name: "Checkliste" },
  { pfad: "gruppen/", name: "Gruppen" },
  { pfad: "hotel/", name: "Logistik" },
  { pfad: "zimmerplan/", name: "Zimmerplan" },
  { pfad: "material/", name: "Material und Medien" },
] as const;

/** Reiter eines Moduls (Plan: Programm, Referenten, Material, Logistik, Medien; dazu Checkliste und Gruppen). */
export function ModulReiter({ id, titel, aktiv }: { id: string; titel: string; aktiv: (typeof reiter)[number]["pfad"] }) {
  return (
    <div className="mb-6">
      <Link href="/team/module/" className="text-sm font-semibold text-ink-soft hover:text-ink">← Alle Module</Link>
      <h1 className="font-display mt-2 text-3xl font-bold">{titel}</h1>
      <nav aria-label="Bereiche des Moduls" className="mt-4 flex gap-1 overflow-x-auto border-b border-line pb-px">
        {reiter.map((r) => (
          <Link key={r.pfad} href={`/team/module/${id}/${r.pfad}`} aria-current={aktiv === r.pfad ? "page" : undefined}
            className={`shrink-0 rounded-t-2xl px-4 py-2 text-sm font-semibold ${aktiv === r.pfad ? "bg-ink text-paper" : "hover:bg-paper-deep"}`}>
            {r.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}

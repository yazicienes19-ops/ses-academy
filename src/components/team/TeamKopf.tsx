import Link from "next/link";
import { abmelden } from "@/lib/aktionen/team";
import { darf, rollenName, type Staff } from "@/lib/auth";

/** Kopfzeile im Team-Bereich. Zeigt nur die Bereiche, die die Rolle nutzen darf. */
export function TeamKopf({ staff, aktiv }: { staff: Staff; aktiv?: "einlass" | "bewerbungen" }) {
  const link = (name: typeof aktiv) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${aktiv === name ? "bg-ink text-paper" : "hover:bg-paper-deep"}`;
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/team/" className="mr-auto flex items-center gap-3">
          <img src="/brand/ses-logo.png" alt="SES Academy" className="h-8 w-auto" />
          <span className="text-sm text-ink-soft">{staff.name} · {rollenName[staff.role]}</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/team/einlass/" className={link("einlass")}>Einlass</Link>
          {darf.alles(staff.role) && <Link href="/team/bewerbungen/" className={link("bewerbungen")}>Bewerbungen</Link>}
          <form action={abmelden}>
            <button type="submit" className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-paper-deep">Abmelden</button>
          </form>
        </nav>
      </div>
    </header>
  );
}

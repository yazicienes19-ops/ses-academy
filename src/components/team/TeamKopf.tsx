import Link from "next/link";
import {
  BedDouble, BookOpen, CalendarClock, ChartColumn, Contact, FolderOpen, House, Inbox, KeyRound, Layers, LogOut,
  MessagesSquare, ScanLine, ShieldX, Send, ShieldCheck, Upload, UserCog, Users, type LucideIcon,
} from "lucide-react";
import { HandyMenue } from "@/components/team/HandyMenue";
import { abmelden } from "@/lib/aktionen/team";
import { darf, modulBereiche, rollenName, type Staff, type StaffRole } from "@/lib/auth";

type Bereich =
  | "start" | "einlass" | "regieplan" | "rollenplan" | "gruppen" | "module" | "bewerbungen" | "teilnehmende" | "anrufe" | "hausaufgaben"
  | "mitglieder" | "auswertung" | "import" | "logistik" | "dokumente" | "sitzungen" | "nachrichten" | "freigaben" | "loeschantraege" | "team";

type Eintrag = { id: Bereich; name: string; href: string; icon: LucideIcon; recht: (r: StaffRole) => boolean };

const alle = () => true;
const gruppen: { titel: string; eintraege: Eintrag[] }[] = [
  { titel: "", eintraege: [{ id: "start", name: "Übersicht", href: "/team/", icon: House, recht: alle }] },
  {
    titel: "Eventtag",
    eintraege: [
      { id: "einlass", name: "Einlass", href: "/team/einlass/", icon: ScanLine, recht: alle },
      { id: "regieplan", name: "Regieplan", href: "/team/regieplan/", icon: CalendarClock, recht: alle },
    ],
  },
  {
    titel: "Programm",
    eintraege: [
      { id: "module", name: "Module", href: "/team/module/", icon: Layers, recht: darf.alles },
      { id: "bewerbungen", name: "Bewerbungen", href: "/team/bewerbungen/", icon: Inbox, recht: darf.alles },
    ],
  },
  {
    titel: "Teilnehmende",
    eintraege: [
      { id: "teilnehmende", name: "Teilnehmende", href: "/team/teilnehmende/", icon: Users, recht: darf.orga },
      { id: "hausaufgaben", name: "Hausaufgaben", href: "/team/hausaufgaben/", icon: BookOpen, recht: darf.orga },
      { id: "mitglieder", name: "Mitglieder", href: "/mein-bereich/verzeichnis/", icon: Contact, recht: darf.orga },
      { id: "auswertung", name: "Auswertung", href: "/team/auswertung/", icon: ChartColumn, recht: darf.alles },
      { id: "import", name: "Import", href: "/team/import/", icon: Upload, recht: darf.alles },
    ],
  },
  {
    titel: "Organisation",
    eintraege: [
      { id: "logistik", name: "Logistik", href: "/team/logistik/", icon: BedDouble, recht: darf.orga },
      { id: "dokumente", name: "Dokumente", href: "/team/dokumente/", icon: FolderOpen, recht: darf.orga },
      { id: "sitzungen", name: "Sitzungen", href: "/team/sitzungen/", icon: MessagesSquare, recht: darf.orga },
      { id: "nachrichten", name: "Nachrichten", href: "/team/nachrichten/", icon: Send, recht: darf.alles },
      { id: "freigaben", name: "Freigaben", href: "/team/freigaben/", icon: ShieldCheck, recht: darf.alles },
      { id: "loeschantraege", name: "Löschanträge", href: "/team/loeschantraege/", icon: ShieldX, recht: darf.admin },
      { id: "team", name: "Team", href: "/team/team/", icon: UserCog, recht: darf.admin },
    ],
  },
];

function Navigation({ staff, aktiv }: { staff: Staff; aktiv: Bereich }) {
  return (
    <nav aria-label="Team-Bereich" className="space-y-6">
      {gruppen.map((g) => {
        // Auf ein Modul begrenzte Zugänge: nur Übersicht, Einlass und Regieplan
        const sichtbar = g.eintraege.filter((e) => e.recht(staff.role) && (!staff.modulId || (modulBereiche as readonly string[]).includes(e.id)));
        if (sichtbar.length === 0) return null;
        return (
          <div key={g.titel || "start"}>
            {g.titel && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.12em] text-paper/45 uppercase">{g.titel}</p>}
            <ul className="space-y-0.5">
              {sichtbar.map((e) => {
                const an = e.id === aktiv;
                return (
                  <li key={e.id}>
                    <Link href={e.href} aria-current={an ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition ${an ? "bg-signal font-semibold text-ink" : "text-paper/80 hover:bg-white/8 hover:text-paper"}`}>
                      <e.icon aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={an ? 2.4 : 1.8} />
                      {e.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Konto({ staff }: { staff: Staff }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <div className="flex items-center gap-3 px-3">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal font-display text-sm font-bold text-ink">
          {staff.name.split(" ").map((t) => t[0]).slice(0, 2).join("")}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-paper">{staff.name}</span>
          <span className="block text-xs text-paper/55">{rollenName[staff.role]}</span>
        </span>
      </div>
      <div className="mt-3 flex gap-1 px-1">
        <Link href="/team/passwort/" className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-paper/75 hover:bg-white/8 hover:text-paper">
          <KeyRound aria-hidden className="h-4 w-4" /> Passwort
        </Link>
        <form action={abmelden} className="flex-1">
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-paper/75 hover:bg-white/8 hover:text-paper">
            <LogOut aria-hidden className="h-4 w-4" /> Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}

const handyTabs: { id: Bereich; name: string; href: string; icon: LucideIcon }[] = [
  { id: "start", name: "Übersicht", href: "/team/", icon: House },
  { id: "einlass", name: "Einlass", href: "/team/einlass/", icon: ScanLine },
  { id: "regieplan", name: "Regieplan", href: "/team/regieplan/", icon: CalendarClock },
];

/**
 * Gerüst des Team-Bereichs: am Computer eine feste Seitenleiste mit den Bereichen nach Aufgaben gruppiert,
 * am Handy oben eine schlanke Leiste mit Menü und unten die drei wichtigsten Bereiche für den Eventtag.
 * Zeigt nur, was die Rolle nutzen darf. (Der Seiteninhalt rückt über body:has(.team-leiste) nach rechts, siehe globals.css.)
 */
export function TeamKopf({ staff, aktiv = "start" }: { staff: Staff; aktiv?: Bereich; breit?: boolean }) {
  const titel = gruppen.flatMap((g) => g.eintraege).find((e) => e.id === aktiv)?.name ?? "Team";
  return (
    <>
      {/* Computer */}
      <aside className="team-leiste fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-forest px-3 py-5 lg:flex">
        <Link href="/team/" className="mb-6 flex items-center gap-3 px-3">
          <span className="rounded-xl bg-paper px-2 py-1"><img src="/brand/ses-logo.png" alt="SES Academy" className="h-7 w-auto" /></span>
          <span className="font-display text-sm font-semibold tracking-wide text-paper/80">Team</span>
        </Link>
        <div className="-mr-1 flex-1 overflow-y-auto pr-1"><Navigation staff={staff} aktiv={aktiv} /></div>
        <Konto staff={staff} />
      </aside>

      {/* Handy und Tablet */}
      <HandyMenue titel={titel}>
        <Navigation staff={staff} aktiv={aktiv} />
        <div className="mt-6"><Konto staff={staff} /></div>
      </HandyMenue>
      <nav aria-label="Schnellzugriff" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {handyTabs.map((t) => (
          <Link key={t.id} href={t.href} aria-current={t.id === aktiv ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${t.id === aktiv ? "text-ink" : "text-ink-soft/70"}`}>
            <span className={`rounded-full px-4 py-1 ${t.id === aktiv ? "bg-signal" : ""}`}><t.icon aria-hidden className="h-5 w-5" /></span>
            {t.name}
          </Link>
        ))}
      </nav>
    </>
  );
}

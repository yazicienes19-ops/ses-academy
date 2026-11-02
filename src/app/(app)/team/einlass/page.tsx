import type { Metadata } from "next";
import { jetztMs } from "@/lib/zeit";
import { Einlass, type ListenEintrag } from "@/components/team/Einlass";
import { TagWahl } from "@/components/team/TagWahl";
import { TeamKopf } from "@/components/team/TeamKopf";
import { darf, requireStaff } from "@/lib/auth";
import type { Zaehler } from "@/lib/einlass";
import type { OfflineEintrag } from "@/lib/offline-einlass";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Einlass | SES Academy" };

const STUNDE = 3600_000;

/** Einlass ist von 4 Stunden vor Beginn bis 6 Stunden nach Ende möglich (wie in checkin_core). */
function imZeitfenster(tag: { starts_at: string; ends_at: string }, jetzt: number) {
  return jetzt >= Date.parse(tag.starts_at) - 4 * STUNDE && jetzt <= Date.parse(tag.ends_at) + 6 * STUNDE;
}


export default async function EinlassSeite({ searchParams }: PageProps<"/team/einlass">) {
  const staff = await requireStaff("einlass");
  const { tag: gewaehlt } = await searchParams;
  const supabase = await createClient();
  const jetzt = jetztMs();

  const { data: tageRoh } = await supabase
    .from("module_days")
    .select("id, day, starts_at, ends_at, module:modules!inner(title, status, ticket_required, cancelled_at)")
    .eq("module.status", "published")
    .order("starts_at");

  const alleTage = (tageRoh ?? []).filter((t) => t.module.cancelled_at === null);
  // Einlass-Helfer:innen sehen nur Tage, an denen gerade Einlass ist
  const tage = darf.orga(staff.role) ? alleTage : alleTage.filter((t) => imZeitfenster(t, jetzt));
  const vorschlag = tage.find((t) => imZeitfenster(t, jetzt)) ?? tage.find((t) => Date.parse(t.ends_at) > jetzt) ?? tage.at(-1);
  const tag = tage.find((t) => t.id === gewaehlt) ?? vorschlag;

  let zaehler: Zaehler | null = null;
  let alle: ListenEintrag[] = [];
  if (tag) {
    const [{ data: z }, { data: l }] = await Promise.all([
      supabase.rpc("get_day_counts", { p_module_day_id: tag.id }),
      // Für alle Rollen: die schlanke Liste für den Offline-Modus (ohne Kontaktdaten)
      supabase.rpc("get_checkin_list", { p_module_day_id: tag.id }),
    ]);
    zaehler = z as Zaehler | null;
    alle = (l ?? []) as ListenEintrag[];
  }
  const offlineListe: OfflineEintrag[] = alle.map(({ attendance_id: _, ...e }) => e);

  return (
    <>
      <TeamKopf staff={staff} aktiv="einlass" />
      <main className="mx-auto max-w-3xl px-4 py-6 lg:max-w-7xl">
        <h1 className="font-display text-3xl font-bold">Einlass</h1>
        {!tag ? (
          <p className="mt-6 rounded-3xl bg-white/80 p-6 ring-1 ring-line">
            {darf.orga(staff.role) ? "Es gibt noch keine veröffentlichten Modultage." : "Gerade findet kein Einlass statt. Der Scanner öffnet 4 Stunden vor Beginn eines Modultags."}
          </p>
        ) : (
          <>
            <TagWahl tage={tage} aktiv={tag.id} pfad="/team/einlass/" jetzt={jetztMs()} />
            <div className="mt-6">
              <Einlass
                key={tag.id}
                tagId={tag.id}
                modulTitel={tag.module.title}
                ticketNoetig={tag.module.ticket_required}
                zaehler={zaehler}
                offlineListe={offlineListe}
                liste={darf.orga(staff.role) ? alle : null}
                darfZeitfensterIgnorieren={darf.alles(staff.role)}
                darfWalkIn={darf.orga(staff.role)}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}

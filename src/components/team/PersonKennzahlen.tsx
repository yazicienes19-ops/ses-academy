import Link from "next/link";
import { Zahl } from "@/components/team/Ui";
import { createClient } from "@/lib/supabase/server";
import { jetztMs } from "@/lib/zeit";

const datum = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });

type Reg = {
  id: string; status: string;
  modules: { id: string; title: string; cancelled_at: string | null; module_days: { id: string; starts_at: string; ends_at: string }[] };
  attendances: { module_day_id: string }[];
};

type Badge = { text: string; klasse: string };

/** Status eines Moduls aus Sicht der Person, für die Zeitleiste. */
function badge(r: Reg, jetzt: number): Badge {
  const tage = r.modules.module_days;
  const vorbei = tage.filter((t) => Date.parse(t.ends_at) < jetzt).length;
  const da = r.attendances.length;
  if (r.modules.cancelled_at) return { text: "Modul abgesagt", klasse: "bg-paper-deep" };
  if (r.status === "excused") return { text: "Entschuldigt", klasse: "bg-paper-deep" };
  if (r.status === "cancelled") return { text: "Storniert", klasse: "bg-paper-deep" };
  if (r.status === "waitlist") return { text: "Warteliste", klasse: "bg-gelb-hell" };
  if (r.status !== "confirmed") return { text: "Nicht bestätigt", klasse: "bg-gelb-hell" };
  if (vorbei === 0) return { text: "Angemeldet", klasse: "bg-weiss ring-1 ring-line" };
  if (da === 0) return { text: vorbei < tage.length ? "Läuft · noch nicht da" : "Verpasst / No-Show", klasse: "bg-rot-hell text-rot" };
  return { text: `Teilgenommen · ${da}/${tage.length} ${tage.length === 1 ? "Tag" : "Tage"}`, klasse: "bg-gruen-hell" };
}

/** Kennzahlen und Zeitleiste für die Teilnehmer-Detailseite (nur admin/vorstand). */
export async function PersonKennzahlen({ participantId }: { participantId: string }) {
  const supabase = await createClient();
  const [{ data: alle }, { data: regs }] = await Promise.all([
    supabase.rpc("get_participant_analytics"),
    supabase.from("registrations")
      .select("id,status,modules(id,title,cancelled_at,module_days(id,starts_at,ends_at)),attendances(module_day_id)")
      .eq("participant_id", participantId),
  ]);
  const k = (alle ?? []).find((a) => a.participant_id === participantId);
  const jetzt = jetztMs();
  const zeitleiste = ((regs ?? []) as unknown as Reg[])
    .map((r) => ({ r, beginn: [...r.modules.module_days].sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]?.starts_at ?? null }))
    .sort((a, b) => (a.beginn ?? "9").localeCompare(b.beginn ?? "9"));

  return (
    <section className="karte mb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-2xl font-bold">Teilnahme</h2>
        <Link href="/team/auswertung/" className="link text-sm">zur Auswertung</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Zahl wert={k?.total_attended ?? 0} text="Tage besucht" />
        <Zahl wert={k?.total_no_shows ?? 0} text="Tage verpasst" ton={k?.total_no_shows ? "warnung" : "neutral"} />
        <Zahl wert={k?.attendance_rate != null ? `${k.attendance_rate.toLocaleString("de-DE")} %` : "–"} text="Quote" />
        <Zahl wert={k?.current_streak ?? 0} text="aktuelle Serie" ton={k?.current_streak ? "gut" : "neutral"} />
        <Zahl wert={k?.longest_streak ?? 0} text="Rekord-Serie" />
        <Zahl wert={k?.last_attended_at ? datum.format(new Date(k.last_attended_at)) : "–"} text={k?.last_attended_title ? `zuletzt da: ${k.last_attended_title}` : "noch nie da"} />
      </div>
      {k && k.trailing_misses >= 2 && (
        <p className="mt-4 rounded-2xl bg-gelb-hell p-3 text-sm font-semibold">Zuletzt {k.trailing_misses} Modultage in Folge verpasst. Vielleicht kurz nachfragen?</p>
      )}
      {zeitleiste.length > 0 && (
        <ol className="mt-5 divide-y divide-line">
          {zeitleiste.map(({ r, beginn }) => {
            const b = badge(r, jetzt);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><span className="font-semibold">{r.modules.title}</span>{beginn && <span className="text-sm text-ink-soft"> · {datum.format(new Date(beginn))}</span>}</span>
                <span className={`chip ${b.klasse}`}>{b.text}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

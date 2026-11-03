import type { Metadata } from "next";
import Link from "next/link";
import { TeamKopf } from "@/components/team/TeamKopf";
import { Leer, Rueckmeldung, Titel } from "@/components/team/Ui";
import { requireStaff } from "@/lib/auth";
import { zimmerEntfernen, zimmerFreigabe, zimmerSpeichern } from "@/lib/aktionen/hotel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hotel | SES Academy" };

type Person = { id: string; first_name: string; last_name: string };

export default async function Hotel({ searchParams }: PageProps<"/team/hotel">) {
  const staff = await requireStaff("alles");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: jahrgang } = await supabase.from("cohorts").select("id").eq("is_current", true).maybeSingle();
  const { data: module } = await supabase.from("modules").select("id,title,module_days(day)").eq("cohort_id", jahrgang?.id ?? "");
  const sortiert = (module ?? [])
    .map((m) => ({ ...m, start: m.module_days.map((d) => d.day).sort()[0] ?? "9" }))
    .sort((a, b) => a.start.localeCompare(b.start));
  const heute = new Date().toISOString().slice(0, 10);
  const modulId = typeof sp.modul === "string" ? sp.modul : (sortiert.find((m) => m.start >= heute) ?? sortiert[0])?.id;
  const modul = sortiert.find((m) => m.id === modulId);

  const [{ data: regs }, { data: zimmer }, { data: freigabe }] = modul
    ? await Promise.all([
        supabase.from("registrations").select("participants(id,first_name,last_name)").eq("module_id", modul.id).in("status", ["confirmed", "pending", "waitlist"]),
        supabase.from("room_assignments").select("*").eq("module_id", modul.id),
        supabase.from("accommodation_releases").select("published,published_at").eq("module_id", modul.id).maybeSingle(),
      ])
    : [{ data: [] }, { data: [] }, { data: null }];
  const personen = ((regs ?? []).map((r) => r.participants) as unknown as Person[]).filter(Boolean).sort((a, b) => a.first_name.localeCompare(b.first_name));
  const proPerson = new Map((zimmer ?? []).map((z) => [z.participant_id, z]));
  const belegung = new Map<string, number>();
  for (const z of zimmer ?? []) belegung.set(`${z.hotel_name}|${z.room_number}`, (belegung.get(`${z.hotel_name}|${z.room_number}`) ?? 0) + 1);
  const hotels = [...new Set((zimmer ?? []).map((z) => z.hotel_name))];
  const live = freigabe?.published ?? false;

  return (
    <>
      <TeamKopf staff={staff} aktiv="hotel" breit />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Titel
          kicker="Hotel & Zimmer"
          aktion={modul && (
            <form action={zimmerFreigabe} className="flex items-center gap-3">
              <input type="hidden" name="modul" value={modul.id} /><input type="hidden" name="published" value={String(!live)} />
              <span className={`chip px-3 py-1 ${live ? "bg-gruen-hell" : "bg-gelb-hell"}`}>{live ? "● live in den Teilnehmer-Dashboards" : "○ noch nicht freigegeben"}</span>
              <button className={live ? "knopf-hell" : "knopf"}>{live ? "Zurückziehen" : "Für Teilnehmende freigeben"}</button>
            </form>
          )}
        >
          {modul?.title ?? "Kein Modul"}
        </Titel>
        <Rueckmeldung hinweis={sp.hinweis} fehler={sp.fehler} />
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Modul wählen">
          {sortiert.map((m) => (
            <Link key={m.id} href={`?modul=${m.id}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${m.id === modulId ? "bg-ink text-paper" : "bg-weiss ring-1 ring-line"}`}>{m.title.split(/[–:]/)[0].trim()}</Link>
          ))}
        </nav>
        <p className="mb-6 text-sm text-ink-soft">
          {proPerson.size} von {personen.length} angemeldeten Personen haben ein Zimmer. Mitbewohner:innen ergeben sich aus gleichem Hotel und gleicher Zimmernummer; Teilnehmende sehen nur deren Vornamen.
        </p>
        <datalist id="hotels">{hotels.map((h) => <option key={h} value={h} />)}</datalist>
        {personen.length ? (
          <div className="overflow-x-auto rounded-3xl bg-weiss ring-1 ring-line">
            <div className="hidden grid-cols-[1.2fr_1.2fr_6rem_6rem_1.6fr_auto] gap-2 border-b border-line px-3 py-2.5 text-xs font-semibold tracking-wide text-ink-soft uppercase md:grid">
              <span>Person</span><span>Hotel</span><span>Zimmer</span><span>Tür-Code</span><span>Check-in-Info</span><span />
            </div>
            {personen.map((p) => {
              const z = proPerson.get(p.id);
              const n = z ? belegung.get(`${z.hotel_name}|${z.room_number}`) ?? 1 : 0;
              return (
                <form key={p.id} action={zimmerSpeichern} className="grid gap-2 border-b border-line px-3 py-2.5 last:border-b-0 md:grid-cols-[1.2fr_1.2fr_6rem_6rem_1.6fr_10.5rem] md:items-center">
                  <input type="hidden" name="modul" value={modul!.id} /><input type="hidden" name="participant_id" value={p.id} />
                  <span className="font-semibold">{p.first_name} {p.last_name}{z && n > 1 && <span className="ml-2 chip bg-paper-deep text-xs">{n} im Zimmer</span>}</span>
                  <input name="hotel_name" list="hotels" required defaultValue={z?.hotel_name ?? hotels[0] ?? ""} aria-label="Hotel" className="feld" />
                  <input name="room_number" required defaultValue={z?.room_number ?? ""} aria-label="Zimmer" className="feld" />
                  <input name="room_pin_code" defaultValue={z?.room_pin_code ?? ""} aria-label="Tür-Code" autoComplete="off" className="feld font-mono" />
                  <input name="check_in_info" defaultValue={z?.check_in_info ?? ""} placeholder="z. B. Check-in ab 15 Uhr, Rezeption EG" aria-label="Check-in-Info" className="feld" />
                  <div className="flex items-center gap-2">
                    <button className="knopf px-3 py-2">{z ? "Speichern" : "Zuweisen"}</button>
                    {z && <button formAction={zimmerEntfernen} formNoValidate className="text-xs text-rot underline">Entfernen</button>}
                  </div>
                </form>
              );
            })}
          </div>
        ) : <Leer>Für dieses Modul ist noch niemand angemeldet.</Leer>}
      </main>
    </>
  );
}

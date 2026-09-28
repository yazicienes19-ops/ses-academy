import type { Metadata } from "next";
import { modulplan } from "@/content/site";
import { ArtBadge, Seitenkopf, StatusPunkt } from "@/components/ui";

export const metadata: Metadata = {
  title: "Programm",
  description: "Alle Module der SES Academy von April 2026 bis Mai 2028.",
};

export default function ProgrammPage() {
  const jahre = [2026, 2027, 2028];
  return (
    <>
      <Seitenkopf
        kicker="Programm 2026–2028"
        titel={
          <>
            13 Module. <span className="marker">Ein Weg</span> in die Politik.
          </>
        }
        text="Seminare, Skills-Workshops und Ländergruppen – von der Verfassung bis zur Kommunalpolitik, von Köln bis Brüssel."
      />

      <div className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-10">
        {jahre.map((jahr) => (
          <section key={jahr} className="grid gap-6 border-t border-line py-12 lg:grid-cols-[180px_1fr] lg:gap-12">
            <h2 className="font-display text-6xl font-extrabold text-sage/30 lg:sticky lg:top-28 lg:self-start">{jahr}</h2>
            <ol className="grid gap-4">
              {modulplan
                .filter((m) => m.jahr === jahr)
                .map((m) => (
                  <li
                    key={m.nr}
                    className={`rounded-3xl p-6 sm:p-8 ${
                      m.status === "naechstes" ? "bg-forest text-paper" : "bg-white/60 ring-1 ring-line"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`font-display text-sm font-bold ${m.status === "naechstes" ? "text-signal" : "text-sage"}`}>
                        Modul {String(m.nr).padStart(2, "0")}
                      </span>
                      <ArtBadge art={m.art} />
                      {m.status === "naechstes" ? (
                        <span className="text-xs font-semibold text-signal">● als Nächstes</span>
                      ) : (
                        <StatusPunkt status={m.status} />
                      )}
                    </div>
                    <h3 className="font-display mt-4 text-2xl leading-tight font-bold sm:text-3xl">{m.titel}</h3>
                    <p className={`mt-2 font-medium ${m.status === "naechstes" ? "text-paper/80" : "text-ink-soft"}`}>
                      {m.datum}
                      {m.ort ? ` · ${m.ort}` : ""}
                    </p>
                    {m.themen.length > 0 && (
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {m.themen.map((t) => (
                          <li
                            key={t}
                            className={`rounded-full px-3 py-1.5 text-sm ${
                              m.status === "naechstes" ? "bg-paper/10 text-paper" : "bg-paper-deep/70 text-ink"
                            }`}
                          >
                            {t}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
            </ol>
          </section>
        ))}
        <p className="border-t border-line pt-8 text-sm text-ink-soft">
          Termine und Orte ab Dezember 2026 sind in Planung und können sich noch ändern.
        </p>
      </div>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";

type Verweis = { href: string; label: string };

/**
 * 404- und Fehlerseite im SES-Design (Logo, grünes Feld mit Megafon-Muster, große Zahl). Ohne Hooks, daher in
 * Server- und Client-Komponenten nutzbar. andere: dieselbe Aussage kurz in weiteren Sprachen.
 */
export function Fehlerseite({ code, titel, text, andere = [], verweise, kennung, children }: {
  code: string; titel: string; text: string; andere?: { lang: string; text: string }[]; verweise: Verweis[]; kennung?: string; children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <Link href="/" aria-label="SES Academy, zur Startseite" className="self-start"><Image src="/brand/ses-logo.png" alt="SES Academy" width={900} height={446} className="h-10 w-auto" /></Link>
      <div className="muster relative mt-8 overflow-hidden rounded-[2rem] bg-forest p-7 text-paper sm:p-10">
        <div aria-hidden className="absolute inset-0 bg-forest/85" />
        <div className="relative">
          <p className="font-display text-[clamp(4.5rem,18vw,8rem)] leading-none font-extrabold text-signal">{code}</p>
          <h1 className="font-display mt-4 text-3xl leading-tight font-extrabold sm:text-4xl">{titel}</h1>
          <p className="mt-3 max-w-xl text-lg text-paper/85">{text}</p>
          {andere.length > 0 && (
            <ul className="mt-5 space-y-1 border-t border-paper/15 pt-4 text-sm text-paper/70">
              {andere.map((a) => <li key={a.lang} lang={a.lang}>{a.text}</li>)}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {children}
        {verweise.map((v, i) => <Link key={v.href} href={v.href} className={i === 0 && !children ? "knopf" : "knopf-hell"}>{v.label}</Link>)}
      </div>
      {kennung && <p className="mt-6 text-xs text-ink-soft">Fehlernummer für Rückfragen an ses@islamrat.de: <span className="font-mono">{kennung}</span></p>}
    </div>
  );
}

export const nichtGefunden = {
  titel: "Diese Seite gibt es nicht.",
  text: "Vielleicht ist der Link veraltet oder unvollständig. Prüfe die Adresse oder geh zurück zur Startseite.",
  andere: [
    { lang: "tr", text: "Bu sayfa bulunamadı. Bağlantı eski ya da eksik olabilir." },
    { lang: "en", text: "This page does not exist. The link may be outdated or incomplete." },
  ],
};

export const schiefgelaufen = {
  titel: "Da ist etwas schiefgelaufen.",
  text: "Bitte versuch es gleich noch einmal. Passiert es wieder, schreib uns an ses@islamrat.de.",
  andere: [
    { lang: "tr", text: "Bir sorun oluştu. Lütfen biraz sonra tekrar dene." },
    { lang: "en", text: "Something went wrong. Please try again in a moment." },
  ],
};

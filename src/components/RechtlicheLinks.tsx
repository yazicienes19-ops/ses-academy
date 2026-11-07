import { DATENSCHUTZ_URL, IMPRESSUM_URL } from "@/lib/rechtliches";

/** Links zu Datenschutz und Impressum (Seiten des Islamrats), z. B. unter Formularen und in „Mein Bereich“. */
export function RechtlicheLinks({ impressum, datenschutz, className = "" }: { impressum: string; datenschutz: string; className?: string }) {
  return (
    <p className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${className}`}>
      <a href={DATENSCHUTZ_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{datenschutz}</a>
      <a href={IMPRESSUM_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{impressum}</a>
    </p>
  );
}

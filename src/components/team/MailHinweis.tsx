import { MailWarning } from "lucide-react";
import { mailBereit } from "@/lib/mail";

/**
 * Deutlicher Hinweis, solange keine SMTP-Zugangsdaten eingetragen sind (mailBereit). Dann gehen keine Mails raus:
 * weder Tickets und Info-Mails noch die Login-Codes. Groß auf der Startseite, knapp direkt an jedem Versandknopf.
 */
export function MailHinweis({ knapp = false, className = "" }: { knapp?: boolean; className?: string }) {
  if (mailBereit()) return null;
  if (knapp)
    return (
      <p role="alert" className={`flex items-start gap-2 rounded-2xl bg-rot-hell px-4 py-2.5 text-sm font-semibold text-rot ${className}`}>
        <MailWarning aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        Mailversand ist nicht eingerichtet: Hier geht im Moment keine Mail raus.
      </p>
    );
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-2xl bg-rot-hell p-4 text-rot ${className}`}>
      <MailWarning aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Mailversand ist noch nicht eingerichtet.</p>
        <p className="mt-1 text-sm">
          Es gehen keine Mails raus: keine Tickets, Info-Mails, Willkommens- und Absagemails und auch keine Login-Codes für „Mein Bereich“.
          Die Zugangsdaten für das Postfach ses@islamrat.de müssen noch auf dem Server eingetragen werden.
        </p>
      </div>
    </div>
  );
}

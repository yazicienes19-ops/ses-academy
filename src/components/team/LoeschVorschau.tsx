type Zahlen = Record<string, number | boolean>;

const geloescht: [string, string][] = [
  ["kontakte", "Anrufe und Kontakt-Notizen"], ["notizen", "Notizen des Teams"], ["uebernachtung", "Angaben zur Übernachtung (mit Hinweisen ans Team)"],
  ["zimmer", "Zimmer-Zuteilungen"], ["zimmerwuensche", "Zimmerwunsch-Zuordnungen"], ["beitraege", "verknüpfte Beiträge"],
  ["engagements", "Engagements"], ["bewerbungen", "Bewerbungen (mit Motivation)"], ["mails", "Mail-Protokoll: Adresse wird entfernt"],
];
const anonymisiert: [string, string][] = [
  ["anmeldungen", "Anmeldungen zu Modulen"], ["anwesenheiten", "Anwesenheiten (Check-ins)"], ["abgaben", "Hausaufgaben-Abgaben mit Bewertungen und Dateien"],
  ["entschuldigungen", "Entschuldigungen für Hausaufgaben"], ["feedback", "Feedback-Antworten"], ["gruppen", "Gruppen-Zuordnungen"], ["mitgliedschaften", "Mitgliedschaften (Generation)"],
];

/** Was eine Löschung bewirkt (aus deletion_counts): unter Löschanträge und in der Freigabe für die zweite Person. */
export function LoeschVorschau({ zahlen: z }: { zahlen: Zahlen }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <p className="font-semibold text-rot">Wird gelöscht</p>
        <ul className="mt-1 space-y-0.5 text-sm">
          <li>Name, E-Mail, Telefon, Geschlecht, Foto{z.foto ? " (vorhanden)" : ""}; Ticket und Links werden ungültig</li>
          <li>{z.team_konto ? "Login-Konto: bleibt, weil es zugleich ein Team-Konto ist (unter „Team“ entfernen)" : z.konto ? "Login-Konto für „Mein Bereich“" : "kein Login-Konto vorhanden"}</li>
          {geloescht.filter(([k]) => Number(z[k] ?? 0) > 0).map(([k, n]) => <li key={k}>{n}: {String(z[k])}</li>)}
        </ul>
      </div>
      <div>
        <p className="font-semibold">Bleibt ohne Namen („Gelöschte Person“) für die Auswertung</p>
        <ul className="mt-1 space-y-0.5 text-sm">
          {anonymisiert.filter(([k]) => Number(z[k] ?? 0) > 0).map(([k, n]) => <li key={k}>{n}: {String(z[k])}</li>)}
          <li className="text-ink-soft">Region, Generation, GT/KGT und Sorumlu bleiben für die Statistik.</li>
        </ul>
      </div>
    </div>
  );
}

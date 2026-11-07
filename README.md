# SES Academy

Fünfsprachige Website der SES Academy, dazu Bewerbung, Teilnahme und Einlass (Check-in).

## Bereiche

| Pfad | Für wen | Was |
| --- | --- | --- |
| `/`, `/bewerbung/`, `/seminar/…`, `/en/…` | Öffentlich | Website. Das Bewerbungsformular speichert in Supabase und schickt eine Eingangsbestätigung; es ist nur während einer Bewerbungsphase da (`BEWERBUNG_OFFEN=ja` beim Bauen und Starten), sonst nimmt auch der Server nichts an. Ist ein Modul im Team-Bereich „offen für Gäste“, erscheint auf seiner Seminarseite ein Anmeldeformular (gleicher Kurzname wie in der Adresse). |
| `/ticket/` | Öffentlich | „Ticket verloren?“: schickt das Ticket erneut an die angegebene Adresse. |
| `/ticket/<token>/` | Teilnehmende | Persönliches Ticket: QR-Code, Kurzcode, Module. Über den Link aus der Mail (`link_token`) auch selbst abmelden bzw. entschuldigen und das bis zum Modulbeginn wieder zurücknehmen; nach dem Abmelden kommt eine Bestätigung per Mail. Der QR-Code enthält einen anderen Token (`checkin_token`): Wer nur den QR kennt (Foto, ältere Links), sieht das Ticket, kann aber nicht abmelden. |
| `/team/` | Team (Login) | Übersicht je nach Rolle. |
| `/team/einlass/` | alle Team-Rollen | Scanner und Kurzcode. Ab Orga-Team auch die Anwesenheitsliste (abhaken, zurücknehmen). |
| `/team/regieplan/` | alle Team-Rollen (pflegen ab Orga-Team) | Regie- und Rollenplan eines Modultags auf einer Seite: Programm mit Stand nach der Uhr (läuft/vorbei automatisch, von Hand nur „entfällt“), Zeitplan verschieben, je Punkt die Eingeteilten; rechts das Team des Tages (ab Orga-Team) mit Leitung und Telefon; Druckansicht A4 quer unter `/team/regieplan/druck/`. Aktualisiert sich alle 30 Sekunden. |
| `/team/rollenplan/` | ab Orga-Team | Weiterleitung auf den Regieplan (Team des Tages steht dort rechts). |
| `/team/bewerbungen/` | Admin, Vorstand | Bewerbungen annehmen (meldet für alle Module an und schickt das Ticket), ablehnen, Warteliste (jeweils nach Rückfrage, mit Mail in der Sprache der Bewerbung), Ticket erneut senden; Zähler an den Reitern. |
| `/team/teilnehmende/` | Admin, Vorstand | Willkommensmail („Dein SES-Konto ist bereit“, mit Ticket und Login-Anleitung, fünf Sprachen) an alle, die sich noch nie angemeldet haben (nach Rückfrage). Gefilterte Liste als Excel (E-Mail-Spalte nur für Admin/Vorstand); Mehrfachauswahl und Rundmail an die Auswahl (Vier-Augen-Prinzip). Teilnehmende mit Region, GT/KGT, Verantwortlichen; Anwesenheit je Modul und Tag (nachtragen/zurücknehmen), QR-Code per Mail, Stimmen-Beiträge verknüpfen. Ansicht „Verantwortliche“ (Sorumlu) mit E-Mail. |
| `/team/logistik/` | ab Orga-Team | Je kommendes Modul: Hotels und Betten, Stand des Zimmerplans, offene Materialliste, Stornofrist; Wege zu Hotel, Zimmerplan, Material, Kosten, Namensschildern, Notfall-Liste. |
| `/team/loeschantraege/` | Admin | Löschanträge aus „Mein Bereich“: zeigt, was gelöscht und was ohne Namen für die Auswertung behalten wird; bestätigen oder mit Notiz ablehnen. |
| `/team/hausaufgaben/` | ab Orga-Team | Hausaufgaben, wer abgegeben hat und wer nicht, Bewertung nach dem Rhetorik-Bogen (9 Kriterien × 1–5 Punkte, Feedback), Gruppenvideos. Namen ohne Kontaktdaten. |
| `/team/import/` | Admin, Vorstand | Excel/CSV einlesen: Teilnehmerliste, Hausaufgabenliste, Bewertungsbogen, E-Mail-Adressen (z. B. Google-Formular). Immer erst Vorschau, dann übernehmen. |
| `/mein-bereich/` | Teilnehmende (Login per E-Mail-Code) | Profil mit Abzeichen (Generation, Team, Referent …), Telefon, Sprache, Foto, Kontaktfreigabe, Foto-Einwilligung, E-Mail ändern (Bestätigung über alte und neue Adresse). Eigener QR-Code, kommende Module, Anwesenheit, Hausaufgaben selbst abgeben (Datei bis 100 MB oder Link, mit Bestätigungsmail), eigene Beiträge. Bewertungen bleiben intern (Entscheidung 25.10.2026): angezeigt wird nur, ob die Abgabe eingegangen ist. |
| `/team/module/` | Admin, Vorstand | Module anlegen und bearbeiten, Termine, mit/ohne Ticket, zählt für Serien, offen für Gäste, Plätze, absagen. Beim Veröffentlichen wird der Jahrgang angemeldet. Info-Mail je Modul (Ticket, Ort, Übernachtung, Tagesordnung) mit Vorschau und Testmail an sich selbst; „an alle“ nur nach ausdrücklicher Bestätigung und nur an die, die sie noch nicht bekommen haben (auch bei gleichzeitigem Klicken). Nach einer Absage ist der Versand gesperrt. |
| `/team/gruppen/` | ab Orga-Team | „Fehlt noch“ je Sorumlu am Eventtag: wer noch nicht eingecheckt ist, mit Anruf-Knopf; Admin/Vorstand pflegen dort Telefon und persönlichen Link der Sorumlu. |
| `/sorumlu/<link>/` | Sorumlu (geheimer Link, ohne Konto) | Die eigene Gruppe am aktuellen Modultag, wer fehlt, mit Anruf-Knopf. |
| `/team/module/<id>/namensschilder/` | ab Orga-Team | Namensschilder zum Drucken: acht je A4-Seite mit Name, Region, Generation und QR-Code für den Einlass, vier leere für Walk-ins. |
| `/feedback/<link-token>/<umfrage>/` | Teilnehmende (Link aus der Mail) | Feedback-Umfrage zum Modul; antworten kann nur, wer eingecheckt war. Das Team sieht auf der Modulseite nur zusammengefasste Ergebnisse. |
| `/team/module/<id>/programm/` · `referenten/` · `checkliste/` · `gruppen/` | ab Orga-Team | Reiter des Moduls: Programm aller Tage; Referentenpool mit Status je Modul und Gästeblatt (Anreise, Abholung, Betreuung, Technik, Folien, Honorar); Checkliste aus der Vorlage mit Fristen und Zuständigen; Gruppen und Räume mit Vorschlag nach Land oder GT/KGT und Anwesenheit je Gruppe. |
| `/team/` | Team | Startseite: nächstes Modul, meine Aufgaben (abhaken), Fristen der nächsten zwei Wochen (Checkliste, Stornofrist Hotel, Hausaufgaben). |
| `/team/module/<id>/hotel/` | ab Orga-Team (Abfrage öffnen: Admin/Vorstand) | Übernachtung: Abfrage in „Mein Bereich“ (Nächte, Anreise, Zimmerwunsch, Hinweise), ein oder mehrere Hotels mit Kontingent, Preis je Zimmer und Nacht und Stornofrist, Zimmer anlegen („101-110“), Zimmer zuteilen (auch über Hotelgrenzen; eine Person hat je Modul ein Zimmer), Zimmerliste je Hotel als PDF, Excel oder per Mail ans Hotel. |
| `/team/module/<id>/kosten/` · `material/` | ab Orga-Team | Kostenübersicht (Hotel aus dem Zimmerplan, Honorare und Reisekosten, sonstige Posten); Materialliste zum Abhaken, dazu Unterlagen und Medien. |
| `/team/module/<id>/notfall/` | ab Orga-Team | Notfall-Liste zum Drucken: alle Angemeldeten mit Kurzcode und Kästchen je Tag, Leitung vor Ort. Am Vorabend legt `scripts/notfall-pdf.mts` sie automatisch als PDF ab. |
| `/team/dokumente/` | ab Orga-Team | Dokumentenablage mit Suche (Titel, Beschreibung, Schlagwort), Art, Status (Entwurf, in Prüfung, final, Archiv), Kommission, Modul; jede neue Datei eine Version; Download nur über den Server. Im Modul als Reiter „Material und Medien“. |
| `/team/sitzungen/` | ab Orga-Team | Sitzungen mit Protokoll, Beschlüssen und Aufgaben (Zuständige, Fristen, erscheinen auf der Startseite). |
| `/gast/<link>/` | Referent:innen (Link ohne Konto, nur bei Zusage) | Ablauf, Ort, Anreise, Hotel, Ansprechperson; Folien, Foto und Kurzprofil selbst hochladen. Den Link zeigt das Gästeblatt im Reiter „Referenten“. |
| `/team/nachrichten/` | Admin, Vorstand | Nachricht an alle (Generation, Region, Sorumlu-Gruppe, Angemeldete eines Moduls, Gruppe) per Mail nach Freigabe durch eine zweite Person; Vorlagen, Deutsch/Türkisch/nach Kontosprache, vor dem Vorlegen Empfängerzahl und Testmail an sich selbst; Text für die WhatsApp-Gruppe zum Kopieren. |
| `/team/freigaben/` | Admin, Vorstand | Vier-Augen-Prinzip (Entscheidung 25.10.2026): Nachrichten an alle, Exporte aller Daten und Team-Zugänge gibt eine zweite Person frei; ausführen innerhalb von 24 Stunden, einmal. Team-Zugänge gibt nur ein Admin frei. |
| `/team/team/` | Admin | Team-Zugang beantragen (ohne Passwort, Anmeldung per E-Mail-Code) und nach Freigabe anlegen; Rollen herabstufen sofort, hochstufen nach Freigabe; entfernen. Nach dem Anlegen bekommt die Person eine Willkommensmail. Zugang auf ein Modul begrenzen („nur Demokratie“, nur Orga-Team und Einlass-Helfer): nur Einlass und Regieplan dieses Moduls, in der Datenbank erzwungen (`staff_members.module_id`), und nur vom Einlassbeginn am ersten bis 6 Stunden nach dem letzten Tag. Begrenzen geht sofort, Aufheben oder Wechseln nur mit Freigabe. |
| `/mein-bereich/verzeichnis/` | Mitglieder und Team ab Orga | Mitgliederverzeichnis mit Foto, Region, Abzeichen; E-Mail/Telefon nur mit Freigabe der Person (Team ab Vorstand immer). |
| `/team/passwort/` | alle Team-Rollen | Eigenes Passwort ändern. |
| `/mein-bereich/login/` | alle | Ein Login für alle per E-Mail-Code: Teilnehmende landen in „Mein Bereich“, Teamkonten im Team-Bereich. Der Passwort-Login unter `/team/login/` bleibt vorerst. |
| `/team/zweiter-faktor/` | Team | Authenticator-App einrichten bzw. Code eingeben. Ist die Pflicht eingeschaltet (`/team/team/`, nur Admin mit eigenem zweiten Faktor), gelten Teamrechte in der Datenbank nur mit zweitem Faktor. Handy verloren: Admin setzt den Faktor zurück. |

Rollen: `admin`, `vorstand` (alles), `orga_team` (Einlass mit Liste), `checkin_helper` (nur Scanner und Kurzcode, keine Kontaktdaten).

## Lokal starten

Voraussetzung: Docker (z. B. OrbStack) und die Supabase-CLI.

```bash
npm install
supabase start                 # lokale Datenbank mit Migration und Testdaten
cp .env.example .env.local     # Schlüssel aus `supabase status` eintragen
npm run dev
```

- Team-Logins (nur lokal, Passwort `test1234`): `admin@ses.test`, `vorstand@ses.test`, `orga@ses.test`, `helfer@ses.test`
- Verschickte Mails landen lokal in Mailpit: http://127.0.0.1:55324
- Die Kamera im Scanner funktioniert auf dem Handy nur über https. Zum Testen: `npx next dev --experimental-https`

## Tests

```bash
npm run test:db                # alle Datenbanktests in supabase/tests/, setzt die lokale DB zurück
BEWERBUNG_OFFEN=ja npm run build && BEWERBUNG_OFFEN=ja npx next start -p 3100 &   # Phase 1 braucht eine offene Bewerbungsphase
supabase db reset && node scripts/e2e-phase1.mjs   # Ende-zu-Ende, headless
supabase db reset && node scripts/e2e-phase2.mjs
supabase db reset && node scripts/e2e-phase3-4.mjs # Offline-Einlass, Walk-in, Auswertung
supabase db reset && BASIS=http://localhost:3100 node scripts/e2e-nachbesserung.mjs   # Teil „bewerbung“ erwartet eine geschlossene Phase (Build ohne BEWERBUNG_OFFEN)
supabase db reset && BASIS=http://localhost:3100 node scripts/e2e-wuensche.mjs   # Wünsche vom 07.11.2026
```

## Importe

Team → Import, oder ohne Oberfläche:
`npx tsx --conditions=react-server --env-file=.env.local scripts/import-test.mts <teilnehmerliste|hausaufgaben|bewertungsbogen|emails> <datei> [anwenden] [vorschlaege] [anlegen]`

- Namen werden tolerant abgeglichen (türkische Zeichen, Tippfehler, nur Vorname, abgeschnittene Dateinamen, Zweitnamen). Unklares zeigt die Vorschau; „Ähnliche Namen zuordnen“ übernimmt die Vorschläge.
- Teilnehmerliste: Modul 1/2/3 = die ersten Module aus `src/i18n/daten.ts` (Auftakt, Verfassungen, Skills-Workshop); „+“ wird als Anwesenheit an allen Tagen des Moduls eingetragen. Alle Personen werden außerdem für die kommenden Module des Jahrgangs angemeldet.
- Echte Excel-Dateien gehören nie ins Repository.

## Produktion

- **Migration:** mit `supabase link --project-ref <ref>` und `supabase db push` (spielt `seed.sql` NICHT ein).
- **Umgebungsvariablen beim Hosting:** alle aus `.env.example`, mit echten Werten. Ohne sie funktionieren Bewerbung und Team-Bereich nicht.
- **Hosting:** Die Seite braucht einen Server, zum Beispiel Vercel. Ein reiner Webspace genügt nicht mehr.
- **Login „Mein Bereich“:** In Supabase unter Authentication → Email Templates „Magic Link“ und „Confirm signup“ mit `supabase/templates/anmeldung.html` füllen; Site-URL = Adresse der Seite.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# SES Academy

Fünfsprachige Website der SES Academy, dazu Bewerbung, Teilnahme und Einlass (Check-in).

## Bereiche

| Pfad | Für wen | Was |
| --- | --- | --- |
| `/`, `/bewerbung/`, `/seminar/…`, `/en/…` | Öffentlich | Website. Das Bewerbungsformular speichert in Supabase und schickt eine Eingangsbestätigung. |
| `/ticket/<token>/` | Teilnehmende | Persönliches Ticket: QR-Code, Kurzcode, Module, selbst abmelden oder entschuldigen. Der Link kommt per Mail. |
| `/team/` | Team (Login) | Übersicht je nach Rolle. |
| `/team/einlass/` | alle Team-Rollen | Scanner und Kurzcode. Ab Orga-Team auch die Anwesenheitsliste (abhaken, zurücknehmen). |
| `/team/bewerbungen/` | Admin, Vorstand | Bewerbungen annehmen (meldet für alle Module an und schickt das Ticket), ablehnen, Warteliste, Ticket erneut senden. |

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
npm run test:db                # 37 Datenbanktests (setzt die lokale DB zurück)
npm run build && npx next start -p 3100 &
supabase db reset && node scripts/e2e-phase1.mjs   # Ende-zu-Ende, headless
```

## Produktion

- **Migration:** mit `supabase link --project-ref <ref>` und `supabase db push` (spielt `seed.sql` NICHT ein).
- **Umgebungsvariablen beim Hosting:** alle aus `.env.example`, mit echten Werten. Ohne sie funktionieren Bewerbung und Team-Bereich nicht.
- **Hosting:** Die Seite braucht einen Server, zum Beispiel Vercel. Ein reiner Webspace genügt nicht mehr.

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

# Betrieb der SES-Organisation

Bis zum Umzug auf den IGMG-Server läuft die Plattform auf Yusufs Rechner. Dieser Ordner enthält alles dafür. Später wird derselbe Aufbau auf dem Server gestartet.

| Teil | Wo | Erreichbar |
| --- | --- | --- |
| Datenbank, Anmeldung, Dateien (Supabase in Docker) | `docker-compose.yml` | nur auf diesem Rechner (127.0.0.1:56321 und :56322) |
| Website mit Team-Bereich (Next.js) | Betriebskopie `~/SES_ACADEMY/betrieb-app` | nur auf diesem Rechner (127.0.0.1:3200) |
| HTTPS-Zugang | `https-zugang.mjs` | im selben WLAN: `https://<Rechnername>.local:8443` |
| Geheimnisse, Zertifikat, Sicherungen, Logs | `~/SES_ACADEMY/betrieb-daten` (außerhalb des Repos) | nur für den eigenen Benutzer |

Die Entwicklung (`supabase start`, `npm run dev`, `npm run test:db`) bleibt davon getrennt. `supabase db reset` und die Tests fassen die Betriebsdaten nicht an.

## Einmal einrichten

Voraussetzungen: Docker Desktop läuft, Node 22, Supabase CLI. FileVault ist an (Systemeinstellungen → Datenschutz & Sicherheit).

```bash
cd ~/SES_ACADEMY/website
./betrieb/ses.sh einrichten
```

Das legt `~/SES_ACADEMY/betrieb-daten/.env` mit neuen Passwörtern und Schlüsseln an, erzeugt das Zertifikat, startet die Datenbank und spielt die Migrationen ein.

Danach in `~/SES_ACADEMY/betrieb-daten/.env` selbst eintragen, nicht im Chat:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`: Postausgangsserver des Postfachs ses@islamrat.de. Ohne diese Angaben gehen keine Tickets und keine Login-Codes raus (siehe „Mailversand einrichten“).
- `SICHERUNG_ZIEL`: Ordner auf einem zweiten Gerät, zum Beispiel einer externen SSD unter `/Volumes/SES-Sicherung`.

Dann bauen, starten und das erste Admin-Konto anlegen:

```bash
./betrieb/ses.sh aktualisieren
./betrieb/ses.sh start
./betrieb/ses.sh admin yusuf@… "Yusuf Yeneroğlu"
```

Das Startpasswort erscheint einmal im Terminal. Nach dem ersten Login unter „Passwort“ ändern. `./ses.sh admin` ist nur für die Einrichtung gedacht und umgeht das Vier-Augen-Prinzip; am besten so die drei Admins anlegen (Yusuf, Bünyamin Kalem, Murat Gümüş). Alle weiteren Teamkonten beantragt ein Admin im Team-Bereich unter „Team“, ein zweiter Admin gibt sie frei.

Zum Schluss den Autostart einrichten. Damit startet die Plattform beim Anmelden am Rechner, die Sicherung läuft täglich um 02:30 und die Notfall-Liste entsteht täglich um 20:00 für Module mit Termin am nächsten Tag:

```bash
./betrieb/ses.sh autostart
```

## Mailversand einrichten

Solange `SMTP_HOST` leer ist, geht keine Mail raus: keine Tickets und Info-Mails, und die Anmeldung (GoTrue) verschickt keine Login-Codes („Noop mail client“ im Log). Der Team-Bereich zeigt das auf der Startseite und an jedem Versandknopf rot an.

In `~/SES_ACADEMY/betrieb-daten/.env` diese Zeilen ausfüllen (Werte vom Postausgangsserver des Postfachs ses@islamrat.de):

```bash
SMTP_HOST=smtp.beispiel.de          # Postausgangsserver
SMTP_PORT=587                       # 587 mit STARTTLS (üblich) oder 465 mit TLS
SMTP_SECURE=false                   # false bei 587, true bei 465
SMTP_USER=ses@islamrat.de           # Benutzername des Postfachs
SMTP_PASS=…                         # Passwort des Postfachs
SMTP_FROM_ADDRESS=ses@islamrat.de   # Absender der Login-Codes (GoTrue)
MAIL_FROM="SES Academy <ses@islamrat.de>"   # Absender aller anderen Mails
```

Absender (`SMTP_FROM_ADDRESS`, Adresse in `MAIL_FROM`) und `SMTP_USER` sollten dieselbe Adresse sein; viele Mailserver lehnen fremde Absender ab. GoTrue kennt kein `SMTP_SECURE`: Bei Port 465 nutzt es TLS von selbst, sonst STARTTLS.

Dann prüfen und neu starten (die Website und GoTrue lesen die Werte nur beim Start):

```bash
./betrieb/ses.sh mailtest deine.adresse@beispiel.de   # Testmail; meldet Fehler bei Verbindung, TLS oder Anmeldung
./betrieb/ses.sh stopp && ./betrieb/ses.sh start
```

Zum Schluss unter `/mein-bereich/login/` die eigene Adresse eingeben: Der Login-Code muss ankommen (auch im Spam-Ordner nachsehen). Danach im Team-Bereich eine Info-Mail als Test an sich selbst schicken.

## Alltag

| Was | Befehl |
| --- | --- |
| Läuft alles? | `./betrieb/ses.sh status` |
| Neue Version einspielen (nach Änderungen im Code) | `./betrieb/ses.sh aktualisieren && ./betrieb/ses.sh stopp && ./betrieb/ses.sh start` |
| Sicherung jetzt | `./betrieb/ses.sh sicherung` |
| Prüfen, ob sich die Sicherung einspielen lässt (einmal im Monat) | `./betrieb/ses.sh wiederherstellen-test` |
| Notfall-Liste für ein Datum | `./betrieb/ses.sh notfall 2026-11-14` |
| Mailversand testen | `./betrieb/ses.sh mailtest <adresse>` |
| Logs ansehen | `./betrieb/ses.sh logs web` · `logs https` · `logs auth` |
| Alles anhalten | `./betrieb/ses.sh stopp` |

`aktualisieren` nimmt den Stand des aktuellen Branches. Mit `./betrieb/ses.sh aktualisieren <commit oder tag>` lässt sich ein bestimmter Stand einspielen, auch ein älterer, falls eine neue Version Probleme macht.

## Am Eventtag

1. Rechner und Handys ins selbe WLAN. Ist das WLAN vor Ort unsicher, den Rechner als Hotspot nutzen oder einen eigenen mobilen Router mitbringen.
2. Auf jedem Team-Handy `https://<Rechnername>.local:8443/team/` öffnen und die Zertifikatswarnung einmal bestätigen („Details → Website besuchen“). Klappt der Name nicht, geht auch die IP-Adresse des Rechners, die `./betrieb/ses.sh status` nicht anzeigt, aber `ipconfig getifaddr en0`.
3. Den Rechner nicht zuklappen und ans Netzteil hängen. Ruhezustand verhindern: `caffeinate -dis` in einem Terminal laufen lassen.
4. Fällt etwas aus, gilt die Notfall-Liste vom Vorabend (`~/SES_ACADEMY/dokumente/notfall-listen`). Der Einlass kann außerdem offline weiterlaufen, wenn die Liste vorher auf das Handy geladen wurde.

## Regeln, solange die Daten auf diesem Rechner liegen

- Die Festplatte ist verschlüsselt (FileVault).
- Jeden Tag wird auf ein zweites Gerät gesichert (`SICHERUNG_ZIEL`, Autostart).
- Der Umzug auf den IGMG-Server folgt direkt nach Abschluss des Baus. Danach werden die Daten auf diesem Rechner gelöscht.

## Umzug auf den IGMG-Server

Derselbe Ordner läuft dort unverändert. Auf dem Server einrichten, dann die letzte Sicherung von diesem Rechner einspielen:

```bash
./betrieb/ses.sh einrichten          # auf dem Server, mit eigenen neuen Schlüsseln
docker compose -f betrieb/docker-compose.yml --env-file ~/SES_ACADEMY/betrieb-daten/.env -p ses-betrieb exec -T db \
  pg_restore -U postgres -d postgres --no-owner --clean --if-exists < ses-<datum>.dump
./betrieb/ses.sh wiederherstellen-test
```

Für den Server ändern sich nur `SITE_URL` (Portal-Adresse unter der SES-Domain mit echtem Zertifikat statt `https-zugang.mjs`) und der Mailversand (Freigabe des Servers als Absender für ses@islamrat.de durch die Islamrat-IT: SPF, DKIM, DMARC). Die Anzahl der Personen, Anwesenheiten und Abgaben vorher und nachher vergleichen, dann den Rechner auf Notfallsystem umstellen und die Daten dort löschen.

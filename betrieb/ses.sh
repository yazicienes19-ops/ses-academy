#!/bin/bash
# Steuerung des Betriebs der SES-Organisation. Siehe README.md in diesem Ordner.
#
#   ./ses.sh einrichten                 einmalig: Schlüssel, Zertifikat, Datenbank, Migrationen
#   ./ses.sh aktualisieren [ref]        Betriebskopie des Codes auf Stand ref bringen (Standard: aktueller Branch), bauen
#   ./ses.sh start | stopp | status     Datenbank, Website und HTTPS-Zugang
#   ./ses.sh migrieren                  neue Migrationen einspielen
#   ./ses.sh grunddaten                 1. Generation, Module mit Terminen, Regieplan 14.11. (mehrfach ausführbar)
#   ./ses.sh admin <email> <name>       Teamkonto mit Rolle Admin anlegen (Startpasswort wird einmal angezeigt)
#   ./ses.sh passwort <email>           neues Startpasswort für ein bestehendes Teamkonto (wird einmal angezeigt)
#   ./ses.sh sicherung                  Sicherung jetzt (läuft sonst täglich), Kopie auf SICHERUNG_ZIEL
#   ./ses.sh wiederherstellen-test      neueste Sicherung probeweise einspielen und Zahlen vergleichen
#   ./ses.sh notfall [JJJJ-MM-TT]       Notfall-Listen für morgen bzw. den Tag als PDF
#   ./ses.sh erinnerungen               Hausaufgaben-Erinnerung zwei Tage vor der Frist (läuft sonst täglich)
#   ./ses.sh mailtest <adresse>         Testmail über die SMTP-Zugangsdaten aus der .env, mit klarer Fehlermeldung
#   ./ses.sh autostart                  Start beim Anmelden, Sicherung 02:30, Erinnerungen 17:00, Notfall-Liste 20:00
set -euo pipefail

HIER="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HIER/.." && pwd)"
SES_ROOT="${SES_ROOT:-$HOME/SES_ACADEMY}"
DATEN="${SES_DATEN:-$SES_ROOT/betrieb-daten}"
APP="${SES_APP:-$SES_ROOT/betrieb-app}"
LOGS="$DATEN/logs"
PROJEKT="${SES_PROJEKT:-ses-betrieb}"   # anderer Name z. B. für einen Probelauf neben dem echten Betrieb
COMPOSE=(docker compose -f "$HIER/docker-compose.yml" --env-file "$DATEN/.env" -p "$PROJEKT")

lade_env() {
  [ -f "$DATEN/.env" ] || { echo "Fehlt: $DATEN/.env – zuerst ./ses.sh einrichten"; exit 1; }
  set -a; . "$DATEN/.env"; set +a
  export SES_DATEN="$DATEN"
  # Für Next.js (Server) und Skripte
  export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:${API_PORT:-56321}"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
  export NEXT_PUBLIC_SITE_URL="$SITE_URL"
  export DB_URL="postgresql://postgres:${POSTGRES_PASSWORD}@127.0.0.1:${DB_PORT:-56322}/postgres?sslmode=disable"
}

warte_auf_db() {
  for _ in $(seq 1 60); do
    if "${COMPOSE[@]}" exec -T db pg_isready -U postgres -h localhost >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  echo "Datenbank startet nicht. Logs: ./ses.sh logs db"; exit 1
}

zertifikat() {
  mkdir -p "$DATEN/tls"
  [ -f "$DATEN/tls/zertifikat.pem" ] && return 0
  local ip; ip="$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1)"
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
    -keyout "$DATEN/tls/schluessel.pem" -out "$DATEN/tls/zertifikat.pem" \
    -subj "/CN=SES-Organisation" \
    -addext "subjectAltName=DNS:${LOKALER_NAME},DNS:localhost,IP:127.0.0.1,IP:${ip}" 2>/dev/null
  chmod 600 "$DATEN/tls/schluessel.pem"
  echo "Zertifikat für ${LOKALER_NAME} und ${ip} angelegt."
}

migrieren() {
  local ordner="$APP/supabase"
  [ -d "$ordner/migrations" ] || ordner="$REPO/supabase"
  supabase migration up --db-url "$DB_URL" --workdir "$(dirname "$ordner")"
}

pid_laeuft() { [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }

starte_dienst() {  # name, befehl...
  local name="$1"; shift
  if pid_laeuft "$DATEN/$name.pid"; then echo "$name läuft schon."; return 0; fi
  mkdir -p "$LOGS"
  nohup "$@" >>"$LOGS/$name.log" 2>&1 &
  echo $! >"$DATEN/$name.pid"
}

stoppe_dienst() {
  if pid_laeuft "$DATEN/$1.pid"; then kill "$(cat "$DATEN/$1.pid")" && echo "$1 gestoppt."; fi
  rm -f "$DATEN/$1.pid"
}

befehl="${1:-status}"; shift || true
case "$befehl" in
  einrichten)
    node "$HIER/schluessel.mjs" "$DATEN"
    lade_env
    zertifikat
    mkdir -p "$DATEN/sicherungen" "$LOGS"
    "${COMPOSE[@]}" up -d
    warte_auf_db
    sleep 3
    migrieren
    echo "Eingerichtet. Weiter: SMTP-Zugang in $DATEN/.env eintragen, dann ./ses.sh aktualisieren && ./ses.sh start"
    ;;

  aktualisieren)
    lade_env
    ref="${1:-$(git -C "$REPO" rev-parse --abbrev-ref HEAD)}"
    if [ ! -d "$APP/.git" ] && [ ! -f "$APP/.git" ]; then
      git -C "$REPO" worktree add --detach "$APP" "$ref"
    else
      git -C "$APP" checkout --detach "$ref"
    fi
    (cd "$APP" && npm ci --no-audit --no-fund && npx next build)
    echo "Betriebskopie auf $(git -C "$APP" log -1 --format='%h %s') gebaut. Neu starten: ./ses.sh stopp && ./ses.sh start"
    ;;

  start)
    lade_env
    "${COMPOSE[@]}" up -d
    warte_auf_db
    migrieren
    [ -d "$APP/.next" ] || { echo "Noch nicht gebaut: ./ses.sh aktualisieren"; exit 1; }
    starte_dienst web bash -c "cd '$APP' && exec npx next start -p '${WEB_PORT:-3200}' -H 127.0.0.1"
    starte_dienst https node "$HIER/https-zugang.mjs"
    sleep 4
    echo "Läuft: $SITE_URL  (im selben WLAN; beim ersten Öffnen das Zertifikat bestätigen)"
    ;;

  stopp)
    stoppe_dienst https
    stoppe_dienst web
    "${COMPOSE[@]}" stop
    ;;

  status)
    lade_env
    "${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}'
    for d in web https; do pid_laeuft "$DATEN/$d.pid" && echo "$d: läuft" || echo "$d: gestoppt"; done
    echo "Adresse: $SITE_URL"
    ;;

  logs)
    lade_env
    if [ "${1:-}" = web ] || [ "${1:-}" = https ]; then tail -n 100 -f "$LOGS/$1.log"; else "${COMPOSE[@]}" logs --tail 100 -f "$@"; fi
    ;;

  migrieren)
    lade_env; migrieren
    ;;

  grunddaten)
    lade_env
    "${COMPOSE[@]}" exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <"$HIER/grunddaten.sql"
    "${COMPOSE[@]}" exec -T db psql -U postgres -d postgres -tAc "SELECT count(*) || ' Module, ' || (SELECT count(*) FROM public.module_days) || ' Termine, ' || (SELECT count(*) FROM public.program_items) || ' Programmpunkte' FROM public.modules"
    ;;

  admin)
    lade_env
    email="${1:?E-Mail fehlt}"; name="${2:?Name fehlt}"
    (cd "$APP" 2>/dev/null || cd "$REPO"; npx tsx --conditions=react-server "$HIER/admin-anlegen.mts" "$email" "$name")
    ;;

  passwort)
    lade_env
    email="${1:?E-Mail fehlt}"
    (cd "$APP" 2>/dev/null || cd "$REPO"; npx tsx --conditions=react-server "$HIER/passwort-neu.mts" "$email")
    ;;

  sicherung)
    lade_env
    mkdir -p "$DATEN/sicherungen"
    stempel="$(date +%Y-%m-%d_%H%M)"
    datei="$DATEN/sicherungen/ses-$stempel.dump"
    "${COMPOSE[@]}" exec -T db pg_dump -U postgres -d postgres -Fc --no-owner >"$datei"
    "${COMPOSE[@]}" run --rm --no-deps -T --entrypoint tar storage -C /mnt -cz . >"$DATEN/sicherungen/dateien-$stempel.tar.gz"
    chmod 600 "$datei" "$DATEN/sicherungen/dateien-$stempel.tar.gz"
    # 30 Tage lokal aufbewahren
    find "$DATEN/sicherungen" -type f -mtime +30 -delete
    if [ -n "${SICHERUNG_ZIEL:-}" ]; then
      if [ -d "$SICHERUNG_ZIEL" ]; then
        rsync -a "$DATEN/sicherungen/" "$SICHERUNG_ZIEL/ses-sicherungen/" && echo "Kopie auf $SICHERUNG_ZIEL"
      else
        echo "WARNUNG: Sicherungsziel $SICHERUNG_ZIEL nicht erreichbar (zweites Gerät angeschlossen?)" >&2
      fi
    else
      echo "Hinweis: SICHERUNG_ZIEL ist leer, die Sicherung liegt nur auf diesem Rechner." >&2
    fi
    echo "Sicherung: $datei ($(du -h "$datei" | cut -f1))"
    ;;

  wiederherstellen-test)
    lade_env
    neueste="$(ls -t "$DATEN"/sicherungen/ses-*.dump 2>/dev/null | head -1)"
    [ -n "$neueste" ] || { echo "Keine Sicherung gefunden."; exit 1; }
    "${COMPOSE[@]}" exec -T db psql -U postgres -q -c "DROP DATABASE IF EXISTS wiederherstellung_test" -c "CREATE DATABASE wiederherstellung_test"
    # Ohne --exit-on-error: Supabase-interne Objekte (Tresor, Standardrechte) melden Rechtefehler, die eigenen Daten kommen trotzdem an.
    "${COMPOSE[@]}" exec -T db pg_restore -U postgres -d wiederherstellung_test --no-owner <"$neueste" 2>"$LOGS/wiederherstellung.log" || true
    bekannt='grant options cannot be granted back|permission denied (to change default privileges|for function pg_|for table secrets)|^Command was|^pg_restore: warning: errors ignored'
    unbekannt="$(grep -vE "$bekannt" "$LOGS/wiederherstellung.log" | grep -c "error" || true)"
    abfrage="SELECT (SELECT count(*) FROM public.participants) || ' Personen, ' || (SELECT count(*) FROM public.attendances) || ' Anwesenheiten, ' || (SELECT count(*) FROM public.submissions) || ' Abgaben, ' || (SELECT count(*) FROM auth.users) || ' Konten'"
    live="$("${COMPOSE[@]}" exec -T db psql -U postgres -d postgres -tAc "$abfrage")"
    test="$("${COMPOSE[@]}" exec -T db psql -U postgres -d wiederherstellung_test -tAc "$abfrage" 2>/dev/null || echo "Fehler")"
    "${COMPOSE[@]}" exec -T db psql -U postgres -q -c "DROP DATABASE wiederherstellung_test"
    echo "Live:          $live"
    echo "Sicherung:     $test   ($(basename "$neueste"))"
    [ "$unbekannt" = 0 ] || echo "ACHTUNG: $unbekannt unerwartete Fehler beim Einspielen. Log: $LOGS/wiederherstellung.log"
    if [ "$live" = "$test" ] && [ "$unbekannt" = 0 ]; then echo "OK: Die Sicherung lässt sich vollständig einspielen."
    else echo "Bitte prüfen. Abweichende Zahlen sind normal, wenn seit der Sicherung neue Einträge dazugekommen sind."; fi
    ;;

  notfall)
    lade_env
    (cd "$APP" && npx tsx --conditions=react-server scripts/notfall-pdf.mts "$SES_ROOT/dokumente/notfall-listen" ${1:+"$1"})
    ;;

  erinnerungen)
    lade_env
    (cd "$APP" && npx tsx --conditions=react-server scripts/erinnerungen.mts)
    ;;

  mailtest)
    lade_env
    adresse="${1:?Empfängeradresse fehlt: ./ses.sh mailtest name@beispiel.de}"
    # nodemailer liegt in der Betriebskopie (bzw. im Repo, falls noch nicht gebaut)
    if [ -d "$APP/node_modules/nodemailer" ]; then cd "$APP"; else cd "$REPO"; fi
    node "$HIER/mailtest.mjs" "$adresse"
    ;;

  autostart)
    lade_env
    ziel="$HOME/Library/LaunchAgents"
    mkdir -p "$ziel"
    pfad="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:/usr/bin:/bin:/usr/sbin:/sbin"
    plist() {  # label, argumente (kommagetrennt), zeitplan-xml
      cat >"$ziel/$1.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$1</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$HIER/ses.sh</string><string>$2</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$pfad</string></dict>
  <key>StandardOutPath</key><string>$LOGS/$1.log</string>
  <key>StandardErrorPath</key><string>$LOGS/$1.log</string>
  $3
</dict></plist>
PLIST
      launchctl bootout "gui/$(id -u)/$1" 2>/dev/null || true
      launchctl bootstrap "gui/$(id -u)" "$ziel/$1.plist"
    }
    plist de.ses-organisation.start start "<key>RunAtLoad</key><true/>"
    plist de.ses-organisation.sicherung sicherung "<key>StartCalendarInterval</key><dict><key>Hour</key><integer>2</integer><key>Minute</key><integer>30</integer></dict>"
    plist de.ses-organisation.erinnerungen erinnerungen "<key>StartCalendarInterval</key><dict><key>Hour</key><integer>17</integer><key>Minute</key><integer>0</integer></dict>"
    plist de.ses-organisation.notfall notfall "<key>StartCalendarInterval</key><dict><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>"
    echo "Autostart eingerichtet: Start beim Anmelden, Sicherung täglich 02:30, Erinnerungen 17:00, Notfall-Liste 20:00."
    echo "Entfernen: launchctl bootout gui/$(id -u)/de.ses-organisation.<start|sicherung|erinnerungen|notfall> und die plist in $ziel löschen."
    ;;

  *)
    sed -n '2,16p' "$0"; exit 1
    ;;
esac

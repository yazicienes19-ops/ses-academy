-- Datenbanktests für Check-in, Rechte und Kennzahlen.
-- Voraussetzung: frische Datenbank mit seed.sql (supabase db reset).
-- Ausführen: npm run test:db   (alles läuft in einer Transaktion und wird zurückgerollt)
\set ON_ERROR_STOP 1
BEGIN;

CREATE FUNCTION pg_temp.login(p_email text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  RESET ROLE;
  IF p_email IS NULL THEN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    EXECUTE 'SET LOCAL ROLE anon';
    RETURN;
  END IF;
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION pg_temp.ok(label text, actual text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FEHLER %: erwartet %, bekommen %', label, expected, actual;
  END IF;
  RAISE NOTICE 'ok  %', label;
END $$;

-- Werte vorab als Superuser holen
CREATE TEMP TABLE t AS
SELECT
  (SELECT d.id FROM public.module_days d JOIN public.modules m ON m.id = d.module_id WHERE m.slug = 'probe-einlass') AS probe_day,
  (SELECT d.id FROM public.module_days d JOIN public.modules m ON m.id = d.module_id WHERE m.slug = 'probe-ohne-ticket') AS ohne_day,
  (SELECT d.id FROM public.module_days d JOIN public.modules m ON m.id = d.module_id WHERE m.slug = 'demokratie' ORDER BY day LIMIT 1) AS demo_day,
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demo_module,
  (SELECT checkin_token FROM public.participants WHERE email = 'amina@example.test') AS amina_token,
  (SELECT short_code FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf_code,
  (SELECT id FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf_id,
  (SELECT short_code FROM public.participants WHERE email = 'gast2@example.test') AS warteliste_code,
  (SELECT short_code FROM public.participants WHERE email = 'gast1@example.test') AS gast_code;
GRANT SELECT ON t TO authenticated, anon, service_role;

-- 1. QR-Scan durch Helfer
SELECT pg_temp.login('helfer@ses.test');
CREATE TEMP TABLE r1 AS SELECT public.check_in_by_code(probe_day, 'ses:checkin:' || amina_token, 'qr') AS r FROM t;
GRANT SELECT ON r1 TO authenticated, anon;
SELECT pg_temp.ok('QR-Scan checkt ein', r->>'result', 'checked_in') FROM r1;
SELECT pg_temp.ok('Name kommt zurück', r->>'display_name', 'Amina Yilmaz') FROM r1;
SELECT pg_temp.ok('Zugehörigkeit kommt zurück', r->>'affiliation_status', 'academy_student') FROM r1;

-- 2. Zweitscan liefert den ursprünglichen Zeitpunkt
SELECT pg_temp.ok('Zweitscan erkannt', (public.check_in_by_code(probe_day, amina_token::text, 'qr'))->>'result', 'already_checked_in') FROM t;
SELECT pg_temp.ok('Zweitscan zeigt ersten Zeitpunkt',
  (public.check_in_by_code(probe_day, amina_token::text, 'qr'))->>'checked_in_at', r1.r->>'checked_in_at') FROM t, r1;

-- 3. Kurzcode mit Bindestrich, Leerzeichen und Kleinbuchstaben
SELECT pg_temp.ok('Kurzcode A1B2-C3D4 normalisiert',
  (public.check_in_by_code(probe_day, ' ' || lower(left(yusuf_code, 4)) || '-' || right(yusuf_code, 4) || ' ', 'short_code'))->>'result', 'checked_in') FROM t;

-- 4. Ungültige und unbekannte Codes
SELECT pg_temp.ok('Unsinn ist ungültig', (public.check_in_by_code(probe_day, 'hallo', 'short_code'))->>'result', 'invalid_code') FROM t;
SELECT pg_temp.ok('Unbekannter Kurzcode', (public.check_in_by_code(probe_day, 'FFFFFFFF', 'short_code'))->>'result', 'not_found') FROM t;

-- 5. Warteliste darf nicht rein
SELECT pg_temp.ok('Warteliste abgewiesen', (public.check_in_by_code(probe_day, warteliste_code, 'short_code'))->>'result', 'not_eligible') FROM t;
SELECT pg_temp.ok('Warteliste mit Status', (public.check_in_by_code(probe_day, warteliste_code, 'short_code'))->>'registration_status', 'waitlist') FROM t;

-- 6. Modul ohne Ticket: Scan gesperrt, manuell nur ab orga_team
SELECT pg_temp.ok('Ohne Ticket: Scan gesperrt', (public.check_in_by_code(ohne_day, amina_token::text, 'qr'))->>'result', 'ticket_not_required') FROM t;
DO $$ BEGIN
  PERFORM public.check_in_manual((SELECT ohne_day FROM t), (SELECT yusuf_id FROM t));
  RAISE EXCEPTION 'FEHLER Helfer darf nicht manuell abhaken';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Helfer darf nicht manuell abhaken';
END $$;
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Orga hakt manuell ab', (public.check_in_manual(ohne_day, yusuf_id))->>'result', 'checked_in') FROM t;

-- 7. Zeitfenster
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.ok('Außerhalb des Zeitfensters', (public.check_in_by_code(demo_day, amina_token::text, 'qr'))->>'result', 'outside_checkin_window') FROM t;
SELECT pg_temp.ok('Helfer kann Zeitfenster nicht übergehen', (public.check_in_by_code(demo_day, amina_token::text, 'qr', true))->>'result', 'outside_checkin_window') FROM t;
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.ok('Vorstand darf übergehen', (public.check_in_by_code(demo_day, amina_token::text, 'qr', true))->>'result', 'checked_in') FROM t;
SELECT pg_temp.ok('Gast ohne Anmeldung zum Modul', (public.check_in_by_code(demo_day, gast_code, 'short_code', true))->>'result', 'not_registered') FROM t;

-- 8. Offline-Nachtrag
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.ok('Nachträgliche Zeit nur bei offline_sync',
  (public.check_in_by_code(probe_day, gast_code, 'qr', false, now() - interval '30 minutes'))->>'result', 'invalid_scan_time') FROM t;
SELECT pg_temp.ok('Offline-Nachtrag übernimmt Scanzeit',
  ((public.check_in_by_code(probe_day, gast_code, 'offline_sync', false, now() - interval '30 minutes'))->>'checked_in_at')::timestamptz::text,
  (now() - interval '30 minutes')::text) FROM t;

-- 9. Datensparsamkeit: Helfer sieht keine Tabellen, nur die schlanke Liste
SELECT pg_temp.ok('Helfer liest keine Teilnehmertabelle', (SELECT count(*) FROM public.participants)::text, '0');
SELECT pg_temp.ok('Helfer liest keine Anmeldungen', (SELECT count(*) FROM public.registrations)::text, '0');
SELECT pg_temp.ok('Helfer bekommt Einlassliste', ((SELECT count(*) FROM public.get_checkin_list((SELECT probe_day FROM t))) > 0)::text, 'true');
SELECT pg_temp.ok('Zähler eingecheckt', (public.get_day_counts(probe_day))->>'checked_in', '3') FROM t;
DO $$ BEGIN
  PERFORM * FROM public.get_participant_analytics();
  RAISE EXCEPTION 'FEHLER Helfer darf keine Kennzahlen';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Helfer darf keine Kennzahlen';
END $$;

-- 10. Ohne Login geht gar nichts
SELECT pg_temp.login(NULL);
DO $$ BEGIN
  PERFORM public.check_in_by_code((SELECT probe_day FROM t), 'FFFFFFFF');
  RAISE EXCEPTION 'FEHLER anon darf nicht einchecken';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  anon darf nicht einchecken';
END $$;
SELECT pg_temp.ok('anon sieht veröffentlichte Module', ((SELECT count(*) FROM public.modules) > 0)::text, 'true');
SELECT pg_temp.ok('anon sieht keine Teilnehmenden', (SELECT count(*) FROM public.participants)::text, '0');

-- 11. Walk-in und Rücknahme
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Walk-in ohne Einwilligung abgelehnt',
  (public.create_walk_in(probe_day, 'Spontan', 'Gast', NULL, 'guest', false))->>'result', 'consent_required') FROM t;
CREATE TEMP TABLE w AS SELECT public.create_walk_in(probe_day, 'Spontan', 'Gast', 'spontan@example.test', 'guest', true) AS r FROM t;
GRANT SELECT ON w TO authenticated;
SELECT pg_temp.ok('Walk-in checkt direkt ein', r->>'result', 'checked_in') FROM w;
SELECT pg_temp.ok('Rücknahme', (public.undo_check_in(
  (SELECT attendance_id FROM public.get_checkin_list((SELECT probe_day FROM t)) WHERE display_name = 'Spontan Gast')))->>'result', 'undone');

-- 12. Kennzahlen (Stand der Testdaten, vor heutigen Scans unverändert für vergangene Tage)
SELECT pg_temp.login('admin@ses.test');
CREATE TEMP TABLE a AS
SELECT p.email, x.* FROM public.get_participant_analytics() x JOIN public.participants p ON p.id = x.participant_id;
SELECT pg_temp.ok('Amina Serie', current_streak || '/' || longest_streak, '6/6') FROM a WHERE email = 'amina@example.test';
SELECT pg_temp.ok('Amina Quote', attendance_rate::text, '100.0') FROM a WHERE email = 'amina@example.test';
SELECT pg_temp.ok('Yusuf No-Shows', total_no_shows::text, '2') FROM a WHERE email = 'yusuf@example.test';
SELECT pg_temp.ok('Yusuf Serie (Juni verpasst)', current_streak || '/' || longest_streak, '2/2') FROM a WHERE email = 'yusuf@example.test';
SELECT pg_temp.ok('Leila entschuldigt bricht Serie nicht', current_streak || '/' || longest_streak, '4/4') FROM a WHERE email = 'leila@example.test';
SELECT pg_temp.ok('Leila Entschuldigungen', total_cancelled_or_excused::text, '1') FROM a WHERE email = 'leila@example.test';

-- 13. Selbst entschuldigen über den Ticket-Link (Server mit service_role)
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.ok('Jahrgang entschuldigt sich', (public.withdraw_by_token(amina_token, demo_module, 'Krank'))->>'status', 'excused') FROM t;

ROLLBACK;

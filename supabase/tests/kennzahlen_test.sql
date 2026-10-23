-- Tests für Kennzahlen pro Modul, Modultag und Person (Migration 20261025090000_kennzahlen.sql).
-- Erwartungswerte aus seed.sql: Auftakt alle da, Verfassungen ohne Yusuf, Skills-Workshop Leila entschuldigt.
\set ON_ERROR_STOP 1
BEGIN;

CREATE FUNCTION pg_temp.login(p_email text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  RESET ROLE;
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION pg_temp.ok(label text, actual text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'FEHLER %: erwartet %, bekommen %', label, expected, actual; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;

SELECT pg_temp.login('vorstand@ses.test');
CREATE TEMP TABLE ms AS SELECT * FROM public.get_module_stats();
SELECT pg_temp.ok('Auftakt: 3 angemeldet, alle da, 100 %', registered || '/' || attended_people || '/' || no_shows || '/' || attendance_rate, '3/3/0/100.0') FROM ms WHERE title = 'Auftakt';
SELECT pg_temp.ok('Verfassungen: 1 No-Show, 66,7 %', registered || '/' || attended_people || '/' || no_shows || '/' || attendance_rate, '3/2/1/66.7') FROM ms WHERE title = 'Verfassungen';
SELECT pg_temp.ok('Skills-Workshop: Entschuldigte zählen nicht als angemeldet', registered || '/' || cancelled_or_excused || '/' || attendance_rate, '2/1/100.0') FROM ms WHERE title = 'Skills-Workshop';
SELECT pg_temp.ok('Künftiges Modul: keine No-Shows, keine Quote', no_shows || '/' || coalesce(attendance_rate::text, 'leer'), '0/leer') FROM ms WHERE title = 'Demokratie';
SELECT pg_temp.ok('Zeitraum filtert Module', (SELECT count(*) FROM public.get_module_stats('2026-06-01', '2026-07-01'))::text, '1');

CREATE TEMP TABLE ds AS SELECT * FROM public.get_day_stats('2026-06-01', '2026-07-01');
SELECT pg_temp.ok('Tagesstatistik: 2 Tage im Juni', (SELECT count(*) FROM ds)::text, '2');
SELECT pg_temp.ok('Tagesstatistik: 3 erwartet, 2 da', string_agg(DISTINCT expected || '/' || checked_in, ','), '3/2') FROM ds;

-- Yusuf fehlt ab jetzt auch im September: 4 verpasste Serientage in Folge
RESET ROLE;
DELETE FROM public.attendances a USING public.registrations r, public.participants p, public.modules m
 WHERE a.registration_id = r.id AND r.participant_id = p.id AND r.module_id = m.id
   AND p.email = 'yusuf@example.test' AND m.slug = 'skills-workshop';
SELECT pg_temp.login('vorstand@ses.test');
CREATE TEMP TABLE pa AS SELECT p.email, x.* FROM public.get_participant_analytics() x JOIN public.participants p ON p.id = x.participant_id;
SELECT pg_temp.ok('Yusuf: 4 Tage in Folge verpasst, Serie 0, Rekord 2', trailing_misses || '/' || current_streak || '/' || longest_streak, '4/0/2') FROM pa WHERE email = 'yusuf@example.test';
SELECT pg_temp.ok('Amina: nichts verpasst', trailing_misses::text, '0') FROM pa WHERE email = 'amina@example.test';
SELECT pg_temp.ok('Leila: Entschuldigung ist kein Verpassen', trailing_misses::text, '0') FROM pa WHERE email = 'leila@example.test';

SELECT pg_temp.login('orga@ses.test');
DO $$ BEGIN
  PERFORM * FROM public.get_module_stats();
  RAISE EXCEPTION 'FEHLER Orga darf keine Auswertung';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Orga darf keine Auswertung';
END $$;

ROLLBACK;

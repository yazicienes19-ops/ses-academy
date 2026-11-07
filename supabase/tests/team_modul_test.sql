-- Tests für Migration 20261124090000_team_modul_begrenzung.sql: Team-Zugang auf ein Modul begrenzt (Rechte in der
-- Datenbank, nicht nur in der Oberfläche), Vier-Augen-Prinzip beim Aufheben.
-- Voraussetzung: frische Datenbank mit seed.sql; alles in einer Transaktion.
\set ON_ERROR_STOP 1
BEGIN;

CREATE FUNCTION pg_temp.login(p_email text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  RESET ROLE;
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', p_email,
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', 0)))::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION pg_temp.ok(label text, actual text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'FEHLER %: erwartet %, bekommen %', label, expected, actual; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;

CREATE FUNCTION pg_temp.verboten(label text, sql text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RAISE EXCEPTION 'FEHLER %: hätte abgelehnt werden müssen', label;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok  %', label;
END $$;

-- Setup: je ein Orga- und Helfer-Konto nur für „Demokratie“ (wie nach einem freigegebenen Antrag)
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'modul.orga@ses.test', now(), now(), now()),
       ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'modul.helfer@ses.test', now(), now(), now());
INSERT INTO public.staff_members (user_id, role, display_name, module_id)
SELECT u.id, CASE WHEN u.email LIKE 'modul.orga%' THEN 'orga_team'::public.staff_role ELSE 'checkin_helper' END, 'Nur Demokratie',
       (SELECT id FROM public.modules WHERE slug = 'demokratie')
  FROM auth.users u WHERE u.email IN ('modul.orga@ses.test', 'modul.helfer@ses.test');
CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demo,
  (SELECT id FROM public.modules WHERE slug = 'probe-einlass') AS probe,
  (SELECT d.id FROM public.module_days d JOIN public.modules m ON m.id = d.module_id WHERE m.slug = 'demokratie' ORDER BY d.day LIMIT 1) AS demo_tag,
  (SELECT d.id FROM public.module_days d JOIN public.modules m ON m.id = d.module_id WHERE m.slug = 'probe-einlass') AS probe_tag,
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT short_code FROM public.participants WHERE email = 'amina@example.test') AS amina_code,
  (SELECT id FROM auth.users WHERE email = 'modul.orga@ses.test') AS modul_orga,
  (SELECT id FROM auth.users WHERE email = 'orga@ses.test') AS orga,
  (SELECT id FROM auth.users WHERE email = 'vorstand@ses.test') AS vorstand;
GRANT SELECT ON t TO authenticated;
-- Daten anderer Bereiche, die ein begrenztes Konto nicht sehen darf
INSERT INTO public.hotels (module_id, name) SELECT probe, 'TestHotel anderes Modul' FROM t;
INSERT INTO public.program_items (module_day_id, starts_at, title) SELECT probe_tag, now(), 'Fremder Punkt' FROM t;
INSERT INTO public.duty_assignments (module_day_id, person_name, task) SELECT probe_tag, 'Fremde Person', 'Einlass' FROM t;

-- 1) Prüffunktionen
SELECT pg_temp.login('modul.orga@ses.test');
SELECT pg_temp.ok('Begrenzt: kein allgemeiner Orga-Zugang', public.has_orga_access()::text, 'false');
SELECT pg_temp.ok('Begrenzt: kein allgemeiner Einlass-Zugang', public.has_checkin_access()::text, 'false');
SELECT pg_temp.ok('Begrenzt: Orga-Zugang für das eigene Modul', public.has_orga_access((SELECT demo FROM t))::text, 'true');
SELECT pg_temp.ok('Begrenzt: kein Zugang zu anderem Modul', public.has_orga_access((SELECT probe FROM t))::text, 'false');

-- 2) Einlass: eigenes Modul ja, anderes nein
SELECT pg_temp.ok('Einlass-Liste eigenes Modul', ((SELECT count(*) FROM public.get_checkin_list((SELECT demo_tag FROM t))) > 0)::text, 'true');
SELECT pg_temp.ok('Einlass-Liste anderes Modul leer', (SELECT count(*)::text FROM public.get_checkin_list((SELECT probe_tag FROM t))), '0');
SELECT pg_temp.ok('Zähler anderes Modul leer', (SELECT public.get_day_counts((SELECT probe_tag FROM t)) IS NULL)::text, 'true');
SELECT pg_temp.ok('Kurzcode im eigenen Modul wird geprüft', public.check_in_by_code((SELECT demo_tag FROM t), (SELECT amina_code FROM t), 'short_code') ->> 'result', 'outside_checkin_window');
SELECT pg_temp.verboten('Kurzcode im anderen Modul gesperrt', $q$SELECT public.check_in_by_code((SELECT probe_tag FROM t), (SELECT amina_code FROM t), 'short_code')$q$);
SELECT pg_temp.verboten('Abhaken im anderen Modul gesperrt', $q$SELECT public.check_in_manual((SELECT probe_tag FROM t), (SELECT amina FROM t))$q$);
SELECT pg_temp.verboten('Walk-in im anderen Modul gesperrt', $q$SELECT public.create_walk_in((SELECT probe_tag FROM t), 'X', 'Y', NULL, 'guest', true)$q$);

-- 2b) Keine Auskunft über Personen außerhalb des Moduls (Name, ID), auch nicht per E-Mail oder Kurzcode
RESET ROLE;
UPDATE public.module_days SET starts_at = now() - interval '1 hour', ends_at = now() + interval '5 hours' WHERE id = (SELECT demo_tag FROM t);
CREATE TEMP TABLE fremd AS SELECT id, short_code, (SELECT count(*) FROM public.participants) AS vorher
  FROM public.participants WHERE email = 'gast1@example.test';   -- nur für das Probe-Modul angemeldet
GRANT SELECT ON fremd TO authenticated;
SELECT pg_temp.login('modul.orga@ses.test');
CREATE TEMP TABLE w1 AS SELECT public.create_walk_in((SELECT demo_tag FROM t), 'Anders', 'Name', 'gast1@example.test', 'guest', true) AS r;
SELECT pg_temp.ok('Walk-in mit fremder E-Mail: neutrales Ergebnis', (SELECT r ->> 'result' FROM w1), 'email_in_use');
SELECT pg_temp.ok('… ohne Name, ID und Modul', (SELECT (r ? 'participant_id' OR r ? 'display_name' OR r ? 'module_title')::text FROM w1), 'false');
CREATE TEMP TABLE w2 AS SELECT public.create_walk_in((SELECT demo_tag FROM t), 'Gast', 'Bestätigt', 'gast1@example.test', 'guest', true) AS r;
SELECT pg_temp.ok('Auch bei passendem Vornamen keine Anmeldung der fremden Person', (SELECT r ->> 'result' FROM w2), 'email_in_use');
RESET ROLE;
SELECT pg_temp.ok('Jeder Treffer steht im Protokoll',
  (SELECT count(*)::text FROM public.audit_log WHERE action = 'walk_in_email_in_use' AND actor_id = (SELECT modul_orga FROM t) AND target_participant_id = (SELECT id FROM fremd)), '2');
SELECT pg_temp.ok('Nichts angelegt, keine Anmeldung im Modul',
  (SELECT count(*) FROM public.participants)::text || '/' || (SELECT count(*) FROM public.registrations WHERE participant_id = (SELECT id FROM fremd) AND module_id = (SELECT demo FROM t))::text,
  (SELECT vorher FROM fremd)::text || '/0');
SELECT pg_temp.login('modul.orga@ses.test');
CREATE TEMP TABLE c1 AS SELECT public.check_in_by_code((SELECT demo_tag FROM t), (SELECT short_code FROM fremd), 'short_code') AS r;
SELECT pg_temp.ok('Kurzcode einer fremden Person: nicht angemeldet, ohne Name', (SELECT (r ->> 'result') || '/' || (r ? 'display_name')::text FROM c1), 'not_registered/false');
CREATE TEMP TABLE c2 AS SELECT public.check_in_manual((SELECT demo_tag FROM t), (SELECT id FROM fremd)) AS r;
SELECT pg_temp.ok('Abhaken einer fremden Person: ohne Name', (SELECT (r ->> 'result') || '/' || (r ? 'display_name')::text FROM c2), 'not_registered/false');
-- unbegrenzte Konten unverändert: Hinweis mit Name
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Unbegrenztes Orga-Team: Hinweis auf die andere Person wie bisher',
  public.create_walk_in((SELECT demo_tag FROM t), 'Anders', 'Name', 'gast1@example.test', 'guest', true) ->> 'result', 'email_other_person');
SELECT pg_temp.login('modul.orga@ses.test');

-- 3) Regieplan: Programm und Team des Tages nur im eigenen Modul
SELECT pg_temp.ok('Fremdes Programm unsichtbar', (SELECT count(*)::text FROM public.program_items WHERE module_day_id = (SELECT probe_tag FROM t)), '0');
SELECT pg_temp.ok('Fremdes Team unsichtbar', (SELECT count(*)::text FROM public.duty_assignments WHERE module_day_id = (SELECT probe_tag FROM t)), '0');
INSERT INTO public.program_items (module_day_id, starts_at, title) SELECT demo_tag, now(), 'Eigener Punkt' FROM t;
INSERT INTO public.duty_assignments (module_day_id, person_name, task) SELECT demo_tag, 'Eigene Person', 'Technik' FROM t;
SELECT pg_temp.ok('Eigenes Programm und Team pflegbar',
  (SELECT count(*)::text FROM public.program_items WHERE title = 'Eigener Punkt') || '/' || (SELECT count(*)::text FROM public.duty_assignments WHERE person_name = 'Eigene Person'), '1/1');
SELECT pg_temp.verboten('Programmpunkt im anderen Modul anlegen gesperrt',
  $q$INSERT INTO public.program_items (module_day_id, starts_at, title) SELECT probe_tag, now(), 'x' FROM t$q$);
UPDATE public.program_items SET title = 'gekapert' WHERE title = 'Fremder Punkt';
RESET ROLE;
SELECT pg_temp.ok('Programmpunkt im anderen Modul ändern wirkt nicht', (SELECT count(*)::text FROM public.program_items WHERE title = 'Fremder Punkt'), '1');
SELECT pg_temp.login('modul.orga@ses.test');

-- 4) Alles andere bleibt verschlossen (Teilnehmende, Hotels, Dokumente, Sitzungen, Aufgaben, Kontakte, Hausaufgaben)
SELECT pg_temp.ok('Keine Teilnehmendenliste', (SELECT count(*)::text FROM public.get_people((SELECT demo FROM t))), '0');
SELECT pg_temp.ok('Keine Hotels', (SELECT count(*)::text FROM public.hotels), '0');
SELECT pg_temp.ok('Keine Dokumente', (SELECT count(*)::text FROM public.documents), '0');
SELECT pg_temp.ok('Keine Sitzungen', (SELECT count(*)::text FROM public.meetings), '0');
SELECT pg_temp.ok('Keine Aufgaben', (SELECT count(*)::text FROM public.tasks), '0');
SELECT pg_temp.ok('Keine Kontakte', (SELECT count(*)::text FROM public.contact_log), '0');
SELECT pg_temp.ok('Keine Hausaufgaben', (SELECT count(*)::text FROM public.assignments), '0');
SELECT pg_temp.ok('Keine Anwesenheiten direkt', (SELECT count(*)::text FROM public.attendances), '0');

-- 5) Begrenzter Einlass-Helfer: Zähler nur im eigenen Modul
SELECT pg_temp.login('modul.helfer@ses.test');
SELECT pg_temp.ok('Helfer: Zähler eigenes Modul', (SELECT public.get_day_counts((SELECT demo_tag FROM t)) IS NOT NULL)::text, 'true');
SELECT pg_temp.ok('Helfer: Zähler anderes Modul leer', (SELECT public.get_day_counts((SELECT probe_tag FROM t)) IS NULL)::text, 'true');
SELECT pg_temp.verboten('Helfer: Abhaken auch im eigenen Modul gesperrt', $q$SELECT public.check_in_manual((SELECT demo_tag FROM t), (SELECT amina FROM t))$q$);

-- 6) Unbegrenzte Konten unverändert
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Unbegrenztes Orga-Team sieht alle Hotels', (SELECT count(*)::text FROM public.hotels WHERE name = 'TestHotel anderes Modul'), '1');
SELECT pg_temp.ok('Unbegrenztes Orga-Team: Teilnehmendenliste', ((SELECT count(*) FROM public.get_people((SELECT demo FROM t))) > 0)::text, 'true');
SELECT pg_temp.ok('Unbegrenztes Orga-Team: fremdes Programm sichtbar', (SELECT count(*)::text FROM public.program_items WHERE title = 'Fremder Punkt'), '1');

-- 7) Vier-Augen-Prinzip: begrenzen sofort, aufheben/wechseln nur mit Freigabe; nur Orga-Team und Helfer
SELECT pg_temp.login('admin@ses.test');
UPDATE public.staff_members SET module_id = (SELECT demo FROM t) WHERE user_id = (SELECT orga FROM t);
SELECT pg_temp.ok('Auf ein Modul begrenzen geht sofort', (SELECT (module_id = (SELECT demo FROM t))::text FROM public.staff_members WHERE user_id = (SELECT orga FROM t)), 'true');
SELECT pg_temp.verboten('Begrenzung aufheben nur mit Freigabe',
  $q$UPDATE public.staff_members SET module_id = NULL WHERE user_id = (SELECT orga FROM t)$q$);
SELECT pg_temp.verboten('Modul wechseln nur mit Freigabe',
  $q$UPDATE public.staff_members SET module_id = (SELECT probe FROM t) WHERE user_id = (SELECT orga FROM t)$q$);
DO $$ BEGIN
  UPDATE public.staff_members SET module_id = (SELECT id FROM public.modules WHERE slug = 'demokratie')
   WHERE user_id = (SELECT vorstand FROM t);
  RAISE EXCEPTION 'FEHLER Vorstand mit Modul';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  Vorstand/Admin lassen sich nicht auf ein Modul begrenzen';
END $$;
DO $$ BEGIN
  PERFORM public.create_approval('team_zugang', jsonb_build_object('art', 'neu', 'email', 'x@example.test', 'name', 'X', 'rolle', 'vorstand',
    'modul', (SELECT id FROM public.modules WHERE slug = 'demokratie')));
  RAISE EXCEPTION 'FEHLER Antrag Vorstand mit Modul';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'module_scope_role' THEN RAISE; END IF;
  RAISE NOTICE 'ok  Antrag „Vorstand nur Modul“ abgelehnt';
END $$;
SELECT public.create_approval('team_zugang', jsonb_build_object('art', 'neu', 'email', 'neu.modul@example.test', 'name', 'Neu Modul',
  'rolle', 'checkin_helper', 'modul', (SELECT demo FROM t)));
SELECT pg_temp.ok('Antrag hält das Modul fest', (SELECT (payload ->> 'modul')::uuid = (SELECT demo FROM t) FROM public.approvals WHERE payload ->> 'email' = 'neu.modul@example.test')::text, 'true');
SELECT public.create_approval('team_zugang', jsonb_build_object('art', 'zeitraum', 'user_id', (SELECT orga FROM t), 'modul', NULL));
-- zweiter Admin gibt frei (als Superuser angelegt, wie bei der Einrichtung), Antragsteller führt aus
RESET ROLE;
UPDATE public.staff_members SET role = 'admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'vorstand@ses.test');
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.ok('Zweiter Admin gibt neues Konto frei', public.decide_approval((SELECT id FROM public.approvals WHERE payload ->> 'email' = 'neu.modul@example.test'), true), 'approved');
SELECT pg_temp.ok('Zweiter Admin gibt Aufheben frei', public.decide_approval((SELECT id FROM public.approvals WHERE payload ->> 'art' = 'zeitraum'), true), 'approved');
RESET ROLE;
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'neu.modul@example.test', now(), now(), now());
CREATE TEMP TABLE k AS SELECT id AS neu FROM auth.users WHERE email = 'neu.modul@example.test';
GRANT SELECT ON k TO authenticated;
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.ok('Neues Konto wird angelegt', public.execute_team_approval((SELECT id FROM public.approvals WHERE payload ->> 'email' = 'neu.modul@example.test'),
  (SELECT neu FROM k)), 'ok');
SELECT pg_temp.ok('Neues Konto ist auf das Modul begrenzt',
  (SELECT (module_id = (SELECT demo FROM t))::text FROM public.staff_members WHERE user_id = (SELECT neu FROM k)), 'true');
SELECT pg_temp.ok('Aufheben nach Freigabe', public.execute_team_approval((SELECT id FROM public.approvals WHERE payload ->> 'art' = 'zeitraum')), 'ok');
SELECT pg_temp.ok('Orga-Team wieder unbegrenzt', (SELECT (module_id IS NULL)::text FROM public.staff_members WHERE user_id = (SELECT orga FROM t)), 'true');

ROLLBACK;

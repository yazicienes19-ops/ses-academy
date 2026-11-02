-- Tests für Migration 20261109090000_kontakte.sql: Kontakt-Protokoll und Anrufliste.
\set ON_ERROR_STOP 1
BEGIN;

CREATE FUNCTION pg_temp.login(p_email text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  RESET ROLE;
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', p_email,
    'amr', json_build_array(json_build_object('method', 'otp', 'timestamp', 0)))::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION pg_temp.ok(label text, actual text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'FEHLER %: erwartet %, bekommen %', label, expected, actual; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;

-- Setup: Amina hat ein Konto (als Teilnehmerin), Demokratie mit den angemeldeten Testpersonen
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'amina@example.test', now(), now(), now());
UPDATE public.participants p SET user_id = u.id FROM auth.users u WHERE u.email = p.email AND p.email = 'amina@example.test';
UPDATE public.participants SET phone = '+49 170 1234567' WHERE email = 'amina@example.test';
CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demo,
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT id FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf,
  (SELECT id FROM auth.users WHERE email = 'admin@ses.test') AS admin_id,
  '+49 170 1234567'::text AS phone_amina;
GRANT SELECT ON t TO authenticated;
INSERT INTO public.registrations (module_id, participant_id, status, source)
SELECT demo, p, 'confirmed', 'cohort' FROM t, unnest(ARRAY[amina, yusuf]) p
ON CONFLICT (module_id, participant_id) DO UPDATE SET status = 'confirmed';

-- 1) Einlass-Helfer: keine Kontakte, keine Anrufliste
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.ok('Helfer sieht keine Anrufliste', (SELECT count(*)::text FROM public.get_call_list((SELECT demo FROM t))), '0');
DO $$ BEGIN
  INSERT INTO public.contact_log (participant_id, outcome) SELECT amina, 'erreicht' FROM t;
  RAISE EXCEPTION 'FEHLER Helfer darf eintragen';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Helfer darf nicht eintragen';
END $$;

-- 2) Orga trägt ein, nur unter eigenem Namen
SELECT pg_temp.login('orga@ses.test');
INSERT INTO public.contact_log (participant_id, module_id, outcome, note) SELECT amina, demo, 'nicht_erreicht', 'Mailbox' FROM t;
INSERT INTO public.contact_log (participant_id, module_id, channel, outcome) SELECT amina, demo, 'whatsapp', 'erreicht' FROM t;
DO $$ BEGIN
  INSERT INTO public.contact_log (participant_id, outcome, created_at) SELECT amina, 'erreicht', now() - interval '3 days' FROM t;
  RAISE EXCEPTION 'FEHLER Eintrag zurückdatiert';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  nicht zurückdatierbar';
END $$;
-- in einer Transaktion haben beide dieselbe Zeit; der Anruf war vorher
RESET ROLE;
UPDATE public.contact_log SET created_at = now() - interval '1 minute' WHERE note = 'Mailbox';
SELECT pg_temp.login('orga@ses.test');
DO $$ BEGIN
  INSERT INTO public.contact_log (participant_id, outcome, created_by) SELECT amina, 'erreicht', admin_id FROM t;
  RAISE EXCEPTION 'FEHLER Orga trägt unter fremdem Namen ein';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Eintrag nur unter eigenem Namen';
END $$;
DO $$ BEGIN
  INSERT INTO public.contact_log (participant_id, outcome) SELECT amina, 'vielleicht' FROM t;
  RAISE EXCEPTION 'FEHLER unbekanntes Ergebnis angenommen';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  nur bekannte Ergebnisse';
END $$;

-- 3) Anrufliste: letzter Kontakt, Anzahl, Name des Teammitglieds; Yusuf noch offen
SELECT pg_temp.ok('Amina: letzter Kontakt per WhatsApp erreicht',
  (SELECT last_channel || ' ' || last_outcome || ' ' || contacts || ' ' || (last_by IS NOT NULL) FROM public.get_call_list((SELECT demo FROM t)) WHERE participant_id = (SELECT amina FROM t)),
  'whatsapp erreicht 2 true');
SELECT pg_temp.ok('Yusuf noch nicht kontaktiert',
  (SELECT contacts::text || ' ' || coalesce(last_outcome, '-') FROM public.get_call_list((SELECT demo FROM t)) WHERE participant_id = (SELECT yusuf FROM t)), '0 -');
SELECT pg_temp.ok('Orga sieht Telefonnummer in der Anrufliste',
  (SELECT phone FROM public.get_call_list((SELECT demo FROM t)) WHERE participant_id = (SELECT amina FROM t)), (SELECT phone_amina FROM t));
SELECT pg_temp.ok('Verlauf der Person, neueste zuerst, eigene markiert',
  (SELECT string_agg(outcome || ':' || mine, ',') FROM public.get_contacts(NULL, (SELECT amina FROM t))), 'erreicht:true,nicht_erreicht:true');
SELECT pg_temp.ok('Ohne Modul und Person kein Verlauf', (SELECT count(*)::text FROM public.get_contacts()), '0');

-- 4) Nicht nachträglich ändern; eigene Einträge 24 Stunden lang entfernen
DO $$ BEGIN
  UPDATE public.contact_log SET note = 'geändert';
  RAISE EXCEPTION 'FEHLER Eintrag geändert';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  kein Ändern';
END $$;
RESET ROLE;
UPDATE public.contact_log SET created_at = now() - interval '2 days' WHERE note = 'Mailbox';
SELECT pg_temp.login('orga@ses.test');
DELETE FROM public.contact_log WHERE note = 'Mailbox';
SELECT pg_temp.ok('Alter Eintrag bleibt', (SELECT count(*)::text FROM public.contact_log WHERE note = 'Mailbox'), '1');
DELETE FROM public.contact_log WHERE channel = 'whatsapp';
SELECT pg_temp.ok('Frischer eigener Eintrag entfernt', (SELECT count(*)::text FROM public.contact_log), '1');

-- 5) Teilnehmerin sieht nichts davon
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Teilnehmerin liest keine Kontakte', (SELECT count(*)::text FROM public.contact_log), '0');
SELECT pg_temp.ok('Teilnehmerin bekommt keinen Verlauf', (SELECT count(*)::text FROM public.get_contacts(NULL, (SELECT amina FROM t))), '0');
SELECT pg_temp.ok('Teilnehmerin bekommt keine Anrufliste', (SELECT count(*)::text FROM public.get_call_list((SELECT demo FROM t))), '0');

-- 6) Admin darf auch fremde und alte Einträge entfernen
SELECT pg_temp.login('admin@ses.test');
DELETE FROM public.contact_log WHERE note = 'Mailbox';
SELECT pg_temp.ok('Admin entfernt alten fremden Eintrag', (SELECT count(*)::text FROM public.contact_log), '0');

-- Notizen im selben Verlauf; Teilnehmendenliste für das Orga-Team ohne E-Mail
SELECT pg_temp.login('orga@ses.test');
INSERT INTO public.contact_log (participant_id, channel, outcome, note) SELECT amina, 'notiz', NULL, 'Kommt mit dem Zug' FROM t;
SELECT pg_temp.ok('Orga schreibt eine Notiz', (SELECT count(*)::text FROM public.contact_log WHERE channel = 'notiz'), '1');
DO $$ BEGIN
  INSERT INTO public.contact_log (participant_id, channel, outcome, note) SELECT amina, 'notiz', 'erreicht', 'x' FROM t;
  RAISE EXCEPTION 'FEHLER Notiz mit Ergebnis';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  Notiz hat kein Ergebnis';
END $$;
SELECT pg_temp.ok('Orga sieht in der Liste keine E-Mail', (SELECT count(email)::text FROM public.get_people((SELECT demo FROM t))), '0');
SELECT pg_temp.ok('Liste zeigt die letzte Notiz', (SELECT last_note FROM public.get_people((SELECT demo FROM t)) WHERE participant_id = (SELECT amina FROM t)), 'Kommt mit dem Zug');
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.ok('Admin sieht E-Mail', (SELECT email FROM public.get_people(NULL, (SELECT amina FROM t))), 'amina@example.test');

ROLLBACK;

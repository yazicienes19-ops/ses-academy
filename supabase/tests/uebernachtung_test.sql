-- Tests für Migration 20261030090000_uebernachtung.sql: Übernachtung, Hotel, Zimmerplan.
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

-- Setup: Amina und Yusuf mit Konto; Winter School (18.–23.12.) fragt Übernachtung ab
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'amina@example.test', now(), now(), now()),
       ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'yusuf@example.test', now(), now(), now());
UPDATE public.participants p SET user_id = u.id FROM auth.users u WHERE u.email = p.email AND p.email IN ('amina@example.test', 'yusuf@example.test');
UPDATE public.participants SET gender = 'w' WHERE email = 'amina@example.test';
CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.modules WHERE slug = 'winter-school') AS ws,
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demo,
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT id FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf,
  (SELECT id FROM public.participants WHERE email = 'leila@example.test') AS leila;
GRANT SELECT ON t TO authenticated;

-- 1) Abfrage noch geschlossen
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Abfrage geschlossen', public.save_my_stay((SELECT ws FROM t), '{2026-12-18}', NULL, 'bahn', NULL, '', ''), 'closed');

-- 2) Orga öffnet die Abfrage (über modules ist das Admin/Vorstand vorbehalten), legt Hotel und Zimmer an
RESET ROLE;
UPDATE public.modules SET stay_form_open = true WHERE slug = 'winter-school';
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Amina speichert Nächte und Anreise',
  public.save_my_stay((SELECT ws FROM t), '{2026-12-17,2026-12-18,2026-12-19,2026-12-25,2026-12-18}', '2026-12-17 18:00+01', 'bahn', '2026-12-23 15:00+01', 'mit Leila', 'vegetarisch'), 'saved');
SELECT pg_temp.ok('Nur Nächte rund um das Modul, ohne Doppelte', (SELECT nights::text FROM public.stay_requests), '{2026-12-17,2026-12-18,2026-12-19}');
SELECT pg_temp.ok('Erneutes Speichern ändert die Angaben', public.save_my_stay((SELECT ws FROM t), '{2026-12-18}', NULL, 'auto', NULL, '', ''), 'saved');
SELECT pg_temp.ok('Amina sieht nur ihre eigenen Angaben', (SELECT count(*)::text || ' ' || max(arrival_by) FROM public.stay_requests), '1 auto');
SELECT pg_temp.ok('Nicht angemeldetes Modul', public.save_my_stay(gen_random_uuid(), '{}', NULL, NULL, NULL, '', ''), 'not_registered');
SELECT pg_temp.ok('Amina sieht keine Hotels', (SELECT count(*)::text FROM public.hotels), '0');

SELECT pg_temp.login('orga@ses.test');
INSERT INTO public.hotels (module_id, name, address, quota_rooms, price_per_night, cancellation_deadline)
SELECT ws, 'Testhotel', 'Hauptstraße 1', 20, 49.50, '2026-12-01' FROM t;
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT id, '101', 2 FROM public.hotels WHERE name = 'Testhotel';
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT id, '102', 1 FROM public.hotels WHERE name = 'Testhotel';
INSERT INTO public.room_assignments (room_id, participant_id) SELECT r.id, (SELECT amina FROM t) FROM public.rooms r WHERE r.label = '101';
INSERT INTO public.room_assignments (room_id, participant_id) SELECT r.id, (SELECT leila FROM t) FROM public.rooms r WHERE r.label = '101';
SELECT pg_temp.ok('Zimmer 101 mit zwei belegt', (SELECT count(*)::text FROM public.room_assignments ra JOIN public.rooms r ON r.id = ra.room_id WHERE r.label = '101'), '2');
DO $$ BEGIN
  INSERT INTO public.room_assignments (room_id, participant_id) SELECT r.id, (SELECT yusuf FROM t) FROM public.rooms r WHERE r.label = '101';
  RAISE EXCEPTION 'FEHLER Zimmer überbelegt';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  Volles Zimmer nimmt niemanden mehr auf';
END $$;
DO $$ BEGIN
  INSERT INTO public.room_assignments (room_id, participant_id) SELECT r.id, (SELECT amina FROM t) FROM public.rooms r WHERE r.label = '102';
  RAISE EXCEPTION 'FEHLER doppelt im Hotel';
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'ok  Pro Hotel nur ein Zimmer je Person';
END $$;

-- 3) Überblick fürs Team
CREATE TEMP TABLE ov AS SELECT * FROM public.get_stay_overview((SELECT ws FROM t));
SELECT pg_temp.ok('Überblick: drei Angemeldete', (SELECT count(*)::text FROM ov), '3');
SELECT pg_temp.ok('Amina: geantwortet, Zimmer 101, eine Nacht', (SELECT answered || ' ' || room_label || ' ' || cardinality(nights) FROM ov WHERE participant_id = (SELECT amina FROM t)), 'true 101 1');
SELECT pg_temp.ok('Zimmerplan zeigt das Geschlecht', (SELECT gender FROM ov WHERE participant_id = (SELECT amina FROM t)), 'w');
SELECT pg_temp.ok('Yusuf: noch keine Angaben', (SELECT answered::text FROM ov WHERE participant_id = (SELECT yusuf FROM t)), 'false');
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.ok('Helfer sieht keinen Überblick', (SELECT count(*)::text FROM public.get_stay_overview((SELECT ws FROM t))), '0');

-- 4) Amina sieht ihr Zimmer erst nach Freigabe, und nicht, wer sonst darin schläft
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Amina: Zimmer vor Freigabe verborgen', (SELECT count(*)::text FROM public.get_my_rooms()), '0');
SELECT pg_temp.login('orga@ses.test');
UPDATE public.hotels SET rooms_visible = true WHERE module_id = (SELECT ws FROM t);
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Amina: eigenes Zimmer', (SELECT hotel_name || ' ' || room_label FROM public.get_my_rooms()), 'Testhotel 101');
SELECT pg_temp.ok('Amina sieht keine Zimmerbelegung', (SELECT count(*)::text FROM public.room_assignments), '0');

ROLLBACK;

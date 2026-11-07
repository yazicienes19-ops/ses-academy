-- Tests für Migration 20261110090000_zimmerplan.sql: Zimmerplan, Wunsch-Korrekturen, Verlauf.
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

-- Setup: Amina (Konto), Leila, Yusuf in Demokratie angemeldet; ein früheres Modul (Verfassungen) mit Hotel
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'amina@example.test', now(), now(), now());
UPDATE public.participants p SET user_id = u.id FROM auth.users u WHERE u.email = p.email AND p.email = 'amina@example.test';
CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demo,
  (SELECT id FROM public.modules WHERE slug = 'verfassungen') AS frueher,
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT id FROM public.participants WHERE email = 'leila@example.test') AS leila,
  (SELECT id FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf,
  (SELECT first_name || ' ' || last_name || ' / ' || (SELECT title FROM public.modules WHERE slug = 'verfassungen')
     FROM public.participants WHERE email = 'leila@example.test') AS erwartet_verlauf;
GRANT SELECT ON t TO authenticated;
INSERT INTO public.registrations (module_id, participant_id, status, source)
SELECT demo, p, 'confirmed', 'cohort' FROM t, unnest(ARRAY[amina, leila, yusuf]) p
ON CONFLICT (module_id, participant_id) DO UPDATE SET status = 'confirmed';
INSERT INTO public.stay_requests (registration_id, nights, room_wish)
SELECT r.id, '{2026-11-13,2026-11-14}', CASE WHEN r.participant_id = (SELECT amina FROM t) THEN 'Leila' ELSE '' END
  FROM public.registrations r, t WHERE r.module_id = t.demo AND r.participant_id IN (t.amina, t.leila, t.yusuf)
ON CONFLICT (registration_id) DO NOTHING;

-- 1) Einlass-Helfer und Teilnehmende sehen nichts
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.ok('Helfer: keine Planungsdaten', (SELECT count(*)::text FROM public.get_room_planning((SELECT demo FROM t))), '0');
DO $$ BEGIN
  PERFORM public.apply_room_plan(gen_random_uuid(), '[]');
  RAISE EXCEPTION 'FEHLER Helfer übernimmt Plan';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Helfer darf keinen Plan übernehmen';
END $$;

-- 2) Früheres Modul: Amina und Leila waren zusammen im Zimmer (von Hand)
SELECT pg_temp.login('orga@ses.test');
INSERT INTO public.hotels (module_id, name) SELECT frueher, 'Altes Hotel' FROM t;
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT id, 'A1', 2 FROM public.hotels WHERE name = 'Altes Hotel';
INSERT INTO public.room_assignments (room_id, participant_id, hotel_id)
SELECT r.id, p, r.hotel_id FROM public.rooms r, t, unnest(ARRAY[amina, leila]) p WHERE r.label = 'A1';
SELECT pg_temp.ok('Handzuteilung ist „manual“', (SELECT string_agg(DISTINCT source, ',') FROM public.room_assignments), 'manual');

-- 3) Planungsdaten und Verlauf
SELECT pg_temp.ok('Planungsdaten: drei Angemeldete mit Nächten',
  (SELECT count(*)::text FROM public.get_room_planning((SELECT demo FROM t)) WHERE cardinality(nights) = 2 AND participant_id IN (SELECT unnest(ARRAY[amina, leila, yusuf]) FROM t)), '3');
SELECT pg_temp.ok('Wunsch kommt mit', (SELECT room_wish FROM public.get_room_planning((SELECT demo FROM t)) WHERE participant_id = (SELECT amina FROM t)), 'Leila');
SELECT pg_temp.ok('Verlauf: Amina war mit Leila im Zimmer (Verfassungen)',
  (SELECT mate_name || ' / ' || module_title FROM public.get_room_history((SELECT demo FROM t)) WHERE participant_id = (SELECT amina FROM t)),
  (SELECT erwartet_verlauf FROM t));
SELECT pg_temp.ok('Verlauf zählt das eigene Modul nicht', (SELECT count(*)::text FROM public.get_room_history((SELECT frueher FROM t))), '0');
SELECT pg_temp.ok('Zimmer einer Person mit Mitbewohnerin',
  (SELECT room_label || ' ' || cardinality(mates) FROM public.get_person_rooms((SELECT amina FROM t))), 'A1 1');

-- 4) Vorschlag übernehmen: Handzuteilung bleibt, Vorschläge ersetzen sich
INSERT INTO public.hotels (module_id, name) SELECT demo, 'Neues Hotel' FROM t;
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT h.id, l, 2 FROM public.hotels h, unnest(ARRAY['101', '102', '103']) l WHERE h.name = 'Neues Hotel';
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT h.id, 'E1', 1 FROM public.hotels h WHERE h.name = 'Neues Hotel';
CREATE TEMP TABLE z AS SELECT h.id AS hotel,
  (SELECT id FROM public.rooms WHERE hotel_id = h.id AND label = '101') AS r101,
  (SELECT id FROM public.rooms WHERE hotel_id = h.id AND label = '102') AS r102,
  (SELECT id FROM public.rooms WHERE hotel_id = h.id AND label = '103') AS r103,
  (SELECT id FROM public.rooms WHERE hotel_id = h.id AND label = 'E1') AS e1,
  (SELECT id FROM public.rooms WHERE label = 'A1') AS alt
  FROM public.hotels h WHERE h.name = 'Neues Hotel';
GRANT SELECT ON z TO authenticated;
INSERT INTO public.room_assignments (room_id, participant_id, hotel_id) SELECT r101, yusuf, hotel FROM z, t;

SELECT pg_temp.ok('Plan übernommen, Yusuf bleibt fest',
  (SELECT public.apply_room_plan(hotel, jsonb_build_array(
     jsonb_build_object('room_id', r102, 'participant_id', yusuf),
     jsonb_build_object('room_id', r102, 'participant_id', amina),
     jsonb_build_object('room_id', r102, 'participant_id', leila)))::text FROM z, t), '2');
SELECT pg_temp.ok('Yusuf weiter in 101 (von Hand)',
  (SELECT ro.label || ' ' || ra.source FROM public.room_assignments ra JOIN public.rooms ro ON ro.id = ra.room_id WHERE ra.participant_id = (SELECT yusuf FROM t) AND ra.hotel_id = (SELECT hotel FROM z)), '101 manual');
SELECT pg_temp.ok('Planungsdaten zeigen Zimmer und Herkunft',
  (SELECT room_label || ' ' || source FROM public.get_room_planning((SELECT demo FROM t)) WHERE participant_id = (SELECT amina FROM t)), '102 auto');

SELECT pg_temp.ok('Neuer Vorschlag ersetzt den alten',
  (SELECT public.apply_room_plan(hotel, jsonb_build_array(jsonb_build_object('room_id', r103, 'participant_id', amina)))::text FROM z, t), '1');
SELECT pg_temp.ok('Leila ist nicht mehr eingeteilt',
  (SELECT count(*)::text FROM public.room_assignments WHERE participant_id = (SELECT leila FROM t) AND hotel_id = (SELECT hotel FROM z)), '0');
SELECT pg_temp.ok('Zimmer aus einem anderen Hotel wird ignoriert',
  (SELECT public.apply_room_plan(hotel, jsonb_build_array(jsonb_build_object('room_id', alt, 'participant_id', leila)))::text FROM z, t), '0');

SELECT pg_temp.ok('Wieder ein Vorschlag: Amina in 103',
  (SELECT public.apply_room_plan(hotel, jsonb_build_array(jsonb_build_object('room_id', r103, 'participant_id', amina)))::text FROM z, t), '1');
DO $$ BEGIN
  PERFORM public.apply_room_plan(hotel, jsonb_build_array(
    jsonb_build_object('room_id', e1, 'participant_id', amina), jsonb_build_object('room_id', e1, 'participant_id', leila))) FROM z, t;
  RAISE EXCEPTION 'FEHLER überbelegt';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  Überbelegung wird abgelehnt';
END $$;
SELECT pg_temp.ok('Nach dem Fehler alles wie vorher',
  (SELECT string_agg(ro.label, ',' ORDER BY ro.label) FROM public.room_assignments ra JOIN public.rooms ro ON ro.id = ra.room_id WHERE ra.hotel_id = (SELECT hotel FROM z)), '101,103');

-- 5) Wunsch-Korrekturen: Orga ja, Teilnehmende nein
INSERT INTO public.room_wish_overrides (module_id, participant_id, token, wished_id) SELECT demo, amina, 'leila', leila FROM t;
SELECT pg_temp.ok('Korrektur gespeichert', (SELECT count(*)::text FROM public.room_wish_overrides), '1');
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Teilnehmerin sieht keine Korrekturen', (SELECT count(*)::text FROM public.room_wish_overrides), '0');
SELECT pg_temp.ok('Teilnehmerin sieht keinen Verlauf', (SELECT count(*)::text FROM public.get_person_rooms((SELECT amina FROM t))), '0');
SELECT pg_temp.ok('Teilnehmerin sieht keine Zimmer', (SELECT count(*)::text FROM public.room_assignments), '0');

-- „So übernehmen“ einmalig (Migration 20261122090000_zimmerplan_einmal): zweiter Aufruf ändert nichts
RESET ROLE;
DELETE FROM public.hotels WHERE module_id = (SELECT id FROM public.modules WHERE slug = 'winter-school');
CREATE TEMP TABLE w AS SELECT (SELECT id FROM public.modules WHERE slug = 'winter-school') AS ws,
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT id FROM public.participants WHERE email = 'leila@example.test') AS leila;
GRANT SELECT ON w TO authenticated;
SELECT pg_temp.login('helfer@ses.test');
DO $$ BEGIN
  PERFORM public.apply_probe_rooms((SELECT ws FROM w), 2, '[]');
  RAISE EXCEPTION 'FEHLER Helfer darf Zimmer übernehmen';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Helfer darf nicht übernehmen';
END $$;
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Erste Übernahme legt Hotel, Zimmer und Einteilung an',
  (public.apply_probe_rooms((SELECT ws FROM w), 2, jsonb_build_array(jsonb_build_object('label', '0001', 'section', 'Frauen',
    'personen', jsonb_build_array((SELECT amina FROM w), (SELECT leila FROM w))))))->>'assigned', '2');
SELECT pg_temp.ok('Zweite Übernahme (Doppelklick) ändert nichts',
  (public.apply_probe_rooms((SELECT ws FROM w), 2, jsonb_build_array(jsonb_build_object('label', '0001', 'personen', '[]'::jsonb))))->>'result', 'already_applied');
SELECT pg_temp.ok('Ein Hotel, ein Zimmer, zwei Personen',
  (SELECT count(DISTINCT h.id) || '/' || count(DISTINCT r.id) || '/' || count(ra.participant_id)
     FROM public.hotels h JOIN public.rooms r ON r.hotel_id = h.id LEFT JOIN public.room_assignments ra ON ra.room_id = r.id
    WHERE h.module_id = (SELECT ws FROM w)), '1/1/2');

ROLLBACK;

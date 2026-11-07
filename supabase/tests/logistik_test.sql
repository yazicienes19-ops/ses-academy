-- Tests für die Logistik-Wünsche: 20261126090000_mehrere_hotels.sql (mehrere Hotels je Modul) und
-- 20261127090000_kosten_material.sql (Kostenübersicht, Materialliste, Zimmerliste ans Hotel).
-- Voraussetzung: frische Datenbank mit seed.sql; alles in einer Transaktion.
\set ON_ERROR_STOP 1
BEGIN;

CREATE FUNCTION pg_temp.login(p_email text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  RESET ROLE;
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', p_email)::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION pg_temp.ok(label text, actual text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'FEHLER %: erwartet %, bekommen %', label, expected, actual; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;

CREATE FUNCTION pg_temp.fehler(label text, sql text, erwartet text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RAISE EXCEPTION 'FEHLER %: hätte abgelehnt werden müssen', label;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%' || erwartet || '%' THEN RAISE EXCEPTION 'FEHLER %: falscher Fehler %', label, SQLERRM; END IF;
  RAISE NOTICE 'ok  %', label;
END $$;

-- Setup: Orga-Konto nur für „Demokratie“, zwei Hotels im Modul Demokratie, eines im Probe-Modul
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'modul.orga@ses.test', now(), now(), now());
INSERT INTO public.staff_members (user_id, role, display_name, module_id)
SELECT id, 'orga_team', 'Nur Demokratie', (SELECT id FROM public.modules WHERE slug = 'demokratie') FROM auth.users WHERE email = 'modul.orga@ses.test';
INSERT INTO public.hotels (module_id, name, price_per_night, created_at) SELECT id, 'Hotel A', 80, now() - interval '1 minute' FROM public.modules WHERE slug = 'demokratie';
INSERT INTO public.hotels (module_id, name, price_per_night) SELECT id, 'Pension B', 50 FROM public.modules WHERE slug = 'demokratie';
INSERT INTO public.hotels (module_id, name) SELECT id, 'Hotel Probe' FROM public.modules WHERE slug = 'probe-einlass';
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT id, '101', 1 FROM public.hotels WHERE name = 'Hotel A';
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT id, '102', 2 FROM public.hotels WHERE name = 'Hotel A';
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT id, 'B1', 2 FROM public.hotels WHERE name = 'Pension B';
INSERT INTO public.rooms (hotel_id, label, capacity) SELECT id, 'P1', 2 FROM public.hotels WHERE name = 'Hotel Probe';
CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demo,
  (SELECT id FROM public.hotels WHERE name = 'Hotel A') AS ha,
  (SELECT id FROM public.hotels WHERE name = 'Pension B') AS hb,
  (SELECT r.id FROM public.rooms r JOIN public.hotels h ON h.id = r.hotel_id WHERE h.name = 'Hotel A' AND r.label = '101') AS a101,
  (SELECT r.id FROM public.rooms r JOIN public.hotels h ON h.id = r.hotel_id WHERE h.name = 'Hotel A' AND r.label = '102') AS a102,
  (SELECT r.id FROM public.rooms r JOIN public.hotels h ON h.id = r.hotel_id WHERE h.name = 'Pension B') AS b1,
  (SELECT r.id FROM public.rooms r JOIN public.hotels h ON h.id = r.hotel_id WHERE h.name = 'Hotel Probe') AS p1,
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT id FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf,
  (SELECT id FROM public.participants WHERE email = 'leila@example.test') AS leila;
GRANT SELECT ON t TO authenticated;

-- 1) Zuteilen und Umziehen zwischen Hotels
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Amina in Hotel A', public.assign_room((SELECT amina FROM t), (SELECT a101 FROM t)), 'ok');
SELECT pg_temp.ok('Umzug in die Pension in einem Schritt', public.assign_room((SELECT amina FROM t), (SELECT b1 FROM t)), 'ok');
SELECT pg_temp.ok('… danach genau ein Zimmer im Modul', (SELECT string_agg(r.label, ',') FROM public.room_assignments ra JOIN public.rooms r ON r.id = ra.room_id
  JOIN public.hotels h ON h.id = ra.hotel_id WHERE ra.participant_id = (SELECT amina FROM t) AND h.module_id = (SELECT demo FROM t)), 'B1');
SELECT pg_temp.ok('Zimmer gilt als Handzuteilung', (SELECT source FROM public.room_assignments WHERE participant_id = (SELECT amina FROM t) AND hotel_id = (SELECT hb FROM t)), 'manual');
SELECT pg_temp.fehler('Direkt in ein zweites Hotel desselben Moduls: abgelehnt',
  $q$INSERT INTO public.room_assignments (room_id, participant_id, hotel_id) VALUES ((SELECT a102 FROM t), (SELECT amina FROM t), (SELECT ha FROM t))$q$, 'person_in_other_hotel');
SELECT pg_temp.ok('Anderes Modul: eigenes Zimmer erlaubt', (SELECT count(*) FROM (SELECT 1) x WHERE (
  SELECT public.assign_room((SELECT amina FROM t), (SELECT p1 FROM t))) = 'ok')::text, '1');
SELECT pg_temp.ok('Yusuf in 101 (1 Bett)', public.assign_room((SELECT yusuf FROM t), (SELECT a101 FROM t)), 'ok');
SELECT pg_temp.ok('Volles Zimmer: room_full', public.assign_room((SELECT amina FROM t), (SELECT a101 FROM t)), 'room_full');
SELECT pg_temp.ok('… Amina bleibt in der Pension', (SELECT r.label FROM public.room_assignments ra JOIN public.rooms r ON r.id = ra.room_id
  WHERE ra.participant_id = (SELECT amina FROM t) AND ra.hotel_id IN ((SELECT ha FROM t), (SELECT hb FROM t))), 'B1');

-- 2) Übersichten: eine Zeile je Person, mit Hotel
SELECT pg_temp.ok('get_room_planning: eine Zeile je Person', (SELECT (count(*) = count(DISTINCT participant_id))::text FROM public.get_room_planning((SELECT demo FROM t))), 'true');
SELECT pg_temp.ok('get_room_planning: Hotel der Person', (SELECT hotel_id::text FROM public.get_room_planning((SELECT demo FROM t)) WHERE participant_id = (SELECT amina FROM t)), (SELECT hb::text FROM t));
SELECT pg_temp.ok('get_stay_overview: Hotel und Zimmer', (SELECT room_label || '/' || (hotel_id = (SELECT ha FROM t)) FROM public.get_stay_overview((SELECT demo FROM t)) WHERE participant_id = (SELECT yusuf FROM t)), '101/true');

-- 3) Vorschlag übernehmen: wer in einem anderen Hotel ist, bleibt dort
SELECT pg_temp.ok('Plan für Hotel A übergeht Amina (Pension)', public.apply_room_plan((SELECT ha FROM t),
  jsonb_build_array(jsonb_build_object('room_id', (SELECT a102 FROM t), 'participant_id', (SELECT amina FROM t)),
                    jsonb_build_object('room_id', (SELECT a102 FROM t), 'participant_id', (SELECT leila FROM t))))::text, '1');
SELECT pg_temp.ok('… Amina weiter in der Pension, Leila in 102', (SELECT string_agg(r.label, ',' ORDER BY r.label) FROM public.room_assignments ra JOIN public.rooms r ON r.id = ra.room_id
  WHERE ra.participant_id IN ((SELECT amina FROM t), (SELECT leila FROM t)) AND ra.hotel_id IN ((SELECT ha FROM t), (SELECT hb FROM t))), '102,B1');

-- 4) Automatische Einteilung für ein bestimmtes, noch leeres Hotel
RESET ROLE;
INSERT INTO public.hotels (module_id, name) SELECT demo, 'Haus C' FROM t;
SELECT pg_temp.login('orga@ses.test');
CREATE TEMP TABLE pr AS SELECT public.apply_probe_rooms((SELECT demo FROM t), 2, jsonb_build_array(
  jsonb_build_object('label', '2er 01', 'section', 'Frauen', 'personen', jsonb_build_array((SELECT amina FROM t), (SELECT leila FROM t)))),
  (SELECT id FROM public.hotels WHERE name = 'Haus C')) AS r;
SELECT pg_temp.ok('Probe für Haus C angelegt', (SELECT r ->> 'result' FROM pr), 'applied');
SELECT pg_temp.ok('… Amina und Leila (schon in anderen Hotels) bleiben, wo sie sind', (SELECT (r ->> 'assigned') FROM pr), '0');
SELECT pg_temp.ok('… Zimmer nur in Haus C', (SELECT count(*)::text FROM public.rooms r JOIN public.hotels h ON h.id = r.hotel_id WHERE h.name = 'Haus C'), '1');
SELECT pg_temp.ok('Zweites Mal: schon übernommen', public.apply_probe_rooms((SELECT demo FROM t), 2, '[]', (SELECT id FROM public.hotels WHERE name = 'Haus C')) ->> 'result', 'already_applied');
SELECT pg_temp.ok('Hotel eines anderen Moduls: ungültig', public.apply_probe_rooms((SELECT demo FROM t), 2, '[]', (SELECT id FROM public.hotels WHERE name = 'Hotel Probe')) ->> 'result', 'invalid');
SELECT pg_temp.ok('Ohne Hotel wie bisher: Modul hat schon Zimmer', public.apply_probe_rooms((SELECT demo FROM t), 2, '[]') ->> 'result', 'already_applied');

-- 5) Rechte: Einlass-Helfer und auf ein Modul begrenzte Konten nicht (wie bisher: Logistik nur unbegrenzt ab Orga-Team)
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.fehler('Helfer kann nicht zuteilen', $q$SELECT public.assign_room((SELECT leila FROM t), (SELECT b1 FROM t))$q$, 'orga_access_required');
SELECT pg_temp.ok('Helfer sieht keine Hotels', (SELECT count(*)::text FROM public.hotels), '0');
SELECT pg_temp.login('modul.orga@ses.test');
SELECT pg_temp.fehler('Modul-Konto kann nicht zuteilen', $q$SELECT public.assign_room((SELECT leila FROM t), (SELECT b1 FROM t))$q$, 'orga_access_required');
SELECT pg_temp.ok('Modul-Konto: Übersicht leer', (SELECT count(*)::text FROM public.get_room_planning((SELECT demo FROM t))), '0');

-- 6) Kosten und Materialliste: ab Orga-Team, nicht für Helfer und Modul-Konten
SELECT pg_temp.login('orga@ses.test');
INSERT INTO public.module_costs (module_id, label, category, amount) SELECT demo, 'Mittagessen', 'verpflegung', 1250.50 FROM t;
SELECT pg_temp.ok('Orga legt Kostenposten an', (SELECT amount::text FROM public.module_costs WHERE label = 'Mittagessen'), '1250.50');
SELECT pg_temp.fehler('Negativer Betrag abgelehnt', $q$INSERT INTO public.module_costs (module_id, label, amount) SELECT demo, 'Minus', -1 FROM t$q$, 'check');
SELECT pg_temp.fehler('Unbekannte Art abgelehnt', $q$INSERT INTO public.module_costs (module_id, label, category, amount) SELECT demo, 'X', 'urlaub', 1 FROM t$q$, 'check');
INSERT INTO public.module_materials (module_id, label, quantity) SELECT id, 'Beamer', '1' FROM public.modules WHERE slug = 'probe-einlass';
INSERT INTO public.module_materials (module_id, label, done_at) SELECT id, 'Kabel', now() FROM public.modules WHERE slug = 'probe-einlass';
INSERT INTO public.module_materials (module_id, label) SELECT demo, 'beamer' FROM t;
SELECT pg_temp.ok('Liste übernehmen: nur Neues', public.copy_materials((SELECT id FROM public.modules WHERE slug = 'probe-einlass'), (SELECT demo FROM t))::text, '1');
SELECT pg_temp.ok('… ohne Haken', (SELECT (done_at IS NULL)::text FROM public.module_materials WHERE module_id = (SELECT demo FROM t) AND label = 'Kabel'), 'true');
UPDATE public.hotels SET room_list_sent_at = now(), room_list_sent_to = 'hotel@example.test' WHERE id = (SELECT ha FROM t);
SELECT pg_temp.ok('Orga trägt Versand der Zimmerliste ein', (SELECT room_list_sent_to FROM public.hotels WHERE id = (SELECT ha FROM t)), 'hotel@example.test');
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.ok('Helfer sieht keine Kosten', (SELECT count(*)::text FROM public.module_costs), '0');
SELECT pg_temp.ok('Helfer sieht keine Materialliste', (SELECT count(*)::text FROM public.module_materials), '0');
SELECT pg_temp.fehler('Helfer legt keine Kosten an', $q$INSERT INTO public.module_costs (module_id, label, amount) SELECT demo, 'X', 1 FROM t$q$, 'row-level security');
SELECT pg_temp.fehler('Helfer übernimmt keine Liste', $q$SELECT public.copy_materials((SELECT id FROM public.modules WHERE slug = 'probe-einlass'), (SELECT demo FROM t))$q$, 'orga_access_required');
SELECT pg_temp.login('modul.orga@ses.test');
SELECT pg_temp.ok('Modul-Konto sieht keine Kosten', (SELECT count(*)::text FROM public.module_costs), '0');
SELECT pg_temp.ok('Modul-Konto sieht keine Materialliste', (SELECT count(*)::text FROM public.module_materials), '0');
SELECT pg_temp.fehler('Modul-Konto legt kein Material an', $q$INSERT INTO public.module_materials (module_id, label) SELECT demo, 'X' FROM t$q$, 'row-level security');

ROLLBACK;

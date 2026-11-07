-- Tests für Migration 20261028090000_feedback_sorumlu.sql: Feedback-Umfrage, Sorumlu-Gruppen.
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

CREATE FUNCTION pg_temp.server() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';
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

-- Setup: Sorumlu A betreut Amina und Yusuf, Sorumlu B betreut Leila
INSERT INTO public.mentors (name, phone) VALUES ('Sorumlu A', '+49 170 1111111'), ('Sorumlu B', NULL);
UPDATE public.participants SET mentor_id = (SELECT id FROM public.mentors WHERE name = 'Sorumlu A'), phone = '+49 170 2222222'
 WHERE email IN ('amina@example.test', 'yusuf@example.test');
UPDATE public.participants SET mentor_id = (SELECT id FROM public.mentors WHERE name = 'Sorumlu B') WHERE email = 'leila@example.test';

CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.modules WHERE slug = 'skills-workshop') AS skills,
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demokratie,
  (SELECT d.id FROM public.module_days d JOIN public.modules m ON m.id = d.module_id WHERE m.slug = 'skills-workshop' ORDER BY d.starts_at LIMIT 1) AS skills_tag1,
  (SELECT access_token FROM public.mentors WHERE name = 'Sorumlu A') AS token_a,
  (SELECT link_token FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT link_token FROM public.participants WHERE email = 'leila@example.test') AS leila,
  (SELECT link_token FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf;
GRANT SELECT ON t TO authenticated, service_role;

-- 1) Umfrage anlegen: nur Admin/Vorstand, mit 7 Standardfragen
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.verboten('Orga kann keine Umfrage anlegen',
  $q$SELECT public.create_feedback_survey((SELECT skills FROM t), now() - interval '1 day', now() + interval '7 days')$q$);
SELECT pg_temp.login('vorstand@ses.test');
CREATE TEMP TABLE s AS SELECT public.create_feedback_survey((SELECT skills FROM t), now() - interval '1 day', now() + interval '7 days') AS id;
CREATE TEMP TABLE s_zu AS SELECT public.create_feedback_survey((SELECT demokratie FROM t), now() + interval '20 days', now() + interval '30 days') AS id;
GRANT SELECT ON s, s_zu TO authenticated, service_role;
SELECT pg_temp.ok('Vorstand: 7 Standardfragen', (SELECT count(*)::text FROM public.feedback_questions WHERE survey_id = (SELECT id FROM s)), '7');
CREATE TEMP TABLE q AS SELECT id, position, kind FROM public.feedback_questions WHERE survey_id = (SELECT id FROM s);
GRANT SELECT ON q TO authenticated, service_role;

-- 2) Antworten über den Ticket-Token (serverseitig)
SELECT pg_temp.server();
SELECT pg_temp.ok('Amina (war da) kann antworten',
  public.submit_feedback((SELECT amina FROM t), (SELECT id FROM s), jsonb_build_object(
    (SELECT id FROM q WHERE position = 1)::text, 5,
    (SELECT id FROM q WHERE position = 2)::text, 9,            -- außerhalb der Skala, wird verworfen
    (SELECT id FROM q WHERE position = 6)::text, 'Die Ländergruppen',
    gen_random_uuid()::text, 'unbekannte Frage')), 'saved');
SELECT pg_temp.ok('Amina: zweites Absenden überschreibt',
  public.submit_feedback((SELECT amina FROM t), (SELECT id FROM s), jsonb_build_object(
    (SELECT id FROM q WHERE position = 1)::text, 4,
    (SELECT id FROM q WHERE position = 6)::text, 'Die Ländergruppen')), 'saved');
SELECT pg_temp.ok('Yusuf (war da) kann antworten',
  public.submit_feedback((SELECT yusuf FROM t), (SELECT id FROM s), jsonb_build_object((SELECT id FROM q WHERE position = 1)::text, 2)), 'saved');
SELECT pg_temp.ok('Leila (entschuldigt, nicht da) kann nicht antworten',
  public.submit_feedback((SELECT leila FROM t), (SELECT id FROM s), '{}'), 'not_attended');
SELECT pg_temp.ok('Umfrage noch nicht offen', public.submit_feedback((SELECT amina FROM t), (SELECT id FROM s_zu), '{}'), 'closed');
SELECT pg_temp.ok('Unbekannter Token', public.submit_feedback(gen_random_uuid(), (SELECT id FROM s), '{}'), 'not_found');
-- Leeres Formular (Migration 20261120090000_feedback_leer): keine Antwort, bestehende bleibt
SELECT pg_temp.ok('Leeres Formular zählt nicht', public.submit_feedback((SELECT yusuf FROM t), (SELECT id FROM s), '{}'), 'empty');
SELECT pg_temp.ok('Nur ungültige Werte zählen nicht', public.submit_feedback((SELECT yusuf FROM t), (SELECT id FROM s),
  jsonb_build_object((SELECT id FROM q WHERE position = 1)::text, 9, (SELECT id FROM q WHERE position = 6)::text, '   ')), 'empty');
SELECT pg_temp.ok('Yusufs Antwort bleibt erhalten',
  (SELECT answers ->> (SELECT id FROM q WHERE position = 1)::text FROM public.feedback_responses
    WHERE survey_id = (SELECT id FROM s) AND participant_id = (SELECT id FROM public.participants WHERE email = 'yusuf@example.test')), '2');

-- 3) Ergebnisse nur zusammengefasst und nur für Admin/Vorstand
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.ok('Vorstand liest keine Einzelantworten', (SELECT count(*)::text FROM public.feedback_responses), '0');
CREATE TEMP TABLE erg AS SELECT * FROM public.get_feedback_results((SELECT id FROM s));
SELECT pg_temp.ok('Frage 1: 2 Antworten, Schnitt 3,00', (SELECT answers || ' / ' || average FROM erg WHERE nr = 1), '2 / 3.00');
SELECT pg_temp.ok('Frage 1: Verteilung 1–5', (SELECT distribution::text FROM erg WHERE nr = 1), '{0,1,0,1,0}');
SELECT pg_temp.ok('Frage 2: Wert 9 wurde verworfen', (SELECT answers::text FROM erg WHERE nr = 2), '0');
SELECT pg_temp.ok('Frage 6: Freitext ohne Namen', (SELECT texts::text FROM erg WHERE nr = 6), '{"Die Ländergruppen"}');
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Orga sieht keine Ergebnisse', (SELECT count(*)::text FROM public.get_feedback_results((SELECT id FROM s))), '0');

-- 4) Sorumlu-Gruppen
SELECT pg_temp.ok('Orga sieht alle drei Personen nach Gruppe',
  (SELECT string_agg(mentor_name || ':' || split_part(name, ' ', 1), ',' ORDER BY mentor_name, name) FROM public.get_group_status((SELECT skills_tag1 FROM t))),
  'Sorumlu A:Amina,Sorumlu A:Yusuf,Sorumlu B:Leila');
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.ok('Helfer sieht keine Gruppen (Telefonnummern)', (SELECT count(*)::text FROM public.get_group_status((SELECT skills_tag1 FROM t))), '0');
SELECT pg_temp.verboten('Helfer kann den Sorumlu-Link nicht aufrufen',
  $q$SELECT * FROM public.get_group_status_by_token((SELECT token_a FROM t), (SELECT skills_tag1 FROM t))$q$);
SELECT pg_temp.server();
SELECT pg_temp.ok('Sorumlu-Link A: nur die eigene Gruppe mit Telefon',
  (SELECT string_agg(split_part(name, ' ', 1) || '=' || coalesce(phone, '-'), ',' ORDER BY name) FROM public.get_group_status_by_token((SELECT token_a FROM t), (SELECT skills_tag1 FROM t))),
  'Amina=+49 170 2222222,Yusuf=+49 170 2222222');
SELECT pg_temp.ok('Falscher Sorumlu-Link: nichts', (SELECT count(*)::text FROM public.get_group_status_by_token(gen_random_uuid(), (SELECT skills_tag1 FROM t))), '0');

ROLLBACK;

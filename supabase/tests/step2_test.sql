-- Tests für Step 2 (Migration 20261026090000_step2_engagement_speaker.sql):
-- harte Fristen, Hausaufgaben-Statuslogik, Entschuldigungen, Notenschnitt, Engagement, Speaker.
-- Legt eigene Aufgaben an (seed.sql enthält keine); alles in einer Transaktion.
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

RESET ROLE;
CREATE TEMP TABLE cohort AS SELECT cohort_id FROM public.participants WHERE email = 'amina@example.test';

-- A1: Frist vor einer Woche → Amina pünktlich (bewertet), Leila verspätet, Yusuf fehlt
INSERT INTO public.assignments (cohort_id, number, title, description, due_date)
VALUES ((SELECT cohort_id FROM cohort), 901, 'Rhetorik-Video Step2', 'Testaufgabe',
        (now() AT TIME ZONE 'Europe/Berlin')::date - 7);
CREATE TEMP TABLE a1 AS SELECT id, due_date FROM public.assignments WHERE number = 901;

INSERT INTO public.submissions (assignment_id, label, submitted_on) VALUES
  ((SELECT id FROM a1), 'Amina Yilmaz',  (SELECT due_date FROM a1) - 2),
  ((SELECT id FROM a1), 'Leila Haddad',  (SELECT due_date FROM a1) + 1);
INSERT INTO public.submission_participants (submission_id, participant_id)
SELECT s.id, p.id FROM public.submissions s
  JOIN public.participants p
    ON (p.email = 'amina@example.test' AND s.label = 'Amina Yilmaz')
    OR (p.email = 'leila@example.test' AND s.label = 'Leila Haddad')
 WHERE s.assignment_id = (SELECT id FROM a1);
CREATE TEMP TABLE abg AS SELECT s.id, sp.participant_id FROM public.submissions s
  JOIN public.submission_participants sp ON sp.submission_id = s.id WHERE s.assignment_id = (SELECT id FROM a1);

INSERT INTO public.reviews (submission_id, content, structure, body_language, facial_expression,
                            voice, language, presence, impact, overall, reviewed_on)
SELECT abg.id, 4, 4, 4, 4, 4, 4, 4, 4, 5, (SELECT due_date FROM a1) FROM abg
  JOIN public.participants p ON p.id = abg.participant_id WHERE p.email = 'amina@example.test';

-- A2: Frist in 30 Tagen → Yusuf entschuldigt, Amina offen. A3: ohne Frist → offen.
INSERT INTO public.assignments (cohort_id, number, title, due_date)
VALUES ((SELECT cohort_id FROM cohort), 902, 'Dokumentation Step2',
        (now() AT TIME ZONE 'Europe/Berlin')::date + 30),
       ((SELECT cohort_id FROM cohort), 903, 'Ohne Frist Step2', NULL);
CREATE TEMP TABLE a2 AS SELECT id FROM public.assignments WHERE number = 902;
CREATE TEMP TABLE a3 AS SELECT id FROM public.assignments WHERE number = 903;
INSERT INTO public.assignment_excusals (assignment_id, participant_id, note)
SELECT (SELECT id FROM a2), id, 'Krankheit' FROM public.participants WHERE email = 'yusuf@example.test';

-- Die Setup-Tabellen gehören dem Superuser; die folgenden Abfragen laufen als authenticated.
GRANT SELECT ON cohort, a1, abg, a2, a3 TO authenticated;

-- 1) Frist-Trigger
SELECT pg_temp.ok('Frist-Trigger leitet 23:59 Berliner Zeit ab',
  (SELECT due_at::text FROM public.assignments WHERE id = (SELECT id FROM a1)),
  (SELECT ((due_date + time '23:59') AT TIME ZONE 'Europe/Berlin')::text FROM a1));

-- 2) Statuslogik
SELECT pg_temp.login('vorstand@ses.test');
CREATE TEMP TABLE st AS SELECT p.email, x.* FROM public.get_assignment_status((SELECT id FROM a1)) x
  JOIN public.participants p ON p.id = x.participant_id;
SELECT pg_temp.ok('A1: Amina pünktlich', (SELECT status FROM st WHERE email = 'amina@example.test'), 'puenktlich');
SELECT pg_temp.ok('A1: Leila verspätet', (SELECT status FROM st WHERE email = 'leila@example.test'), 'verspaetet');
SELECT pg_temp.ok('A1: Yusuf fehlt', (SELECT status FROM st WHERE email = 'yusuf@example.test'), 'fehlt');
SELECT pg_temp.ok('A1: Aminas Bewertung gezählt', (SELECT review_count::text FROM st WHERE email = 'amina@example.test'), '1');
CREATE TEMP TABLE st2 AS SELECT p.email, x.status FROM public.get_assignment_status((SELECT id FROM a2)) x
  JOIN public.participants p ON p.id = x.participant_id;
SELECT pg_temp.ok('A2: Yusuf entschuldigt', (SELECT status FROM st2 WHERE email = 'yusuf@example.test'), 'entschuldigt');
SELECT pg_temp.ok('A2: Amina offen', (SELECT status FROM st2 WHERE email = 'amina@example.test'), 'offen');
SELECT pg_temp.ok('A3 ohne Frist: offen',
  (SELECT status FROM public.get_assignment_status((SELECT id FROM a3)) x
     JOIN public.participants p ON p.id = x.participant_id WHERE p.email = 'amina@example.test'), 'offen');

-- 3) Bewertungsteam (orga_team) darf den Status lesen
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Bewertungsteam sieht Hausaufgaben-Status',
  (SELECT count(*)::text FROM public.get_assignment_status((SELECT id FROM a1))), '3');

-- 4) Engagement (vor dem ersten Kennzahlen-Aufruf anlegen; Schreiben darf nur der Vorstand)
RESET ROLE;
INSERT INTO public.engagements (participant_id, kind, role, organization, started_on)
SELECT id, 'jugendrat', 'Ratsmitglied', 'Jugendrat Köln', '2026-02-01'
  FROM public.participants WHERE email = 'amina@example.test';
INSERT INTO public.engagements (participant_id, kind, role, organization, started_on, ended_on)
SELECT id, 'verein', 'Gründungsmitglied', 'Debattierverein', '2025-09-01', '2026-03-31'
  FROM public.participants WHERE email = 'amina@example.test';

-- 5) Kennzahlen im Dossier (nur admin/vorstand)
SELECT pg_temp.login('vorstand@ses.test');
CREATE TEMP TABLE kp AS SELECT x.* FROM public.get_participant_homework_analytics(
  (SELECT id FROM public.participants WHERE email = 'amina@example.test')) x;
SELECT pg_temp.ok('Amina: 3 erwartet, 1 pünktlich, 2 offen, Quote 33,3 %',
  (SELECT hw_expected || '/' || hw_on_time || '/' || hw_open || '/' || coalesce(homework_rate::text, 'leer') FROM kp),
  '3/1/2/33.3');
SELECT pg_temp.ok('Amina: Notenschnitt 4,1 (9 Kriterien gleich gewichtet)',
  (SELECT coalesce(grade_avg::text, 'leer') FROM kp), '4.1');

CREATE TEMP TABLE ky AS SELECT x.hw_expected, x.hw_missing, x.hw_excused, x.hw_open, x.homework_rate
  FROM public.get_participant_homework_analytics(
    (SELECT id FROM public.participants WHERE email = 'yusuf@example.test')) x;
SELECT pg_temp.ok('Yusuf: 3 erwartet, 1 fehlt, 1 entschuldigt, 1 offen, Quote 0,0 %',
  (SELECT hw_expected || '/' || hw_missing || '/' || hw_excused || '/' || hw_open || '/' || coalesce(homework_rate::text, 'leer') FROM ky),
  '3/1/1/1/0.0');

SELECT pg_temp.ok('Amina: 2 Engagements erfasst',
  (SELECT engagement_count::text FROM kp), '2');

-- 6) Speaker: erfasst am Modultag, ohne Anmeldung und ohne Auswirkung auf Kennzahlen
INSERT INTO public.module_day_speakers (module_day_id, display_name, affiliation, kind, topic)
SELECT d.id, 'Elif Yılmaz', 'Bürgermeisterin von Köln', 'politiker', 'Kommunalpolitik live'
  FROM public.module_days d JOIN public.modules m ON m.id = d.module_id
 WHERE m.slug = 'demokratie' ORDER BY d.starts_at LIMIT 1;
SELECT pg_temp.ok('Speaker erfasst, ohne Anmeldung zu erzeugen',
  (SELECT count(*)::text FROM public.registrations r JOIN public.modules m ON m.id = r.module_id
    WHERE m.slug = 'demokratie') || '/'
  || (SELECT count(*)::text FROM public.module_day_speakers s JOIN public.module_days d ON d.id = s.module_day_id
       JOIN public.modules m ON m.id = d.module_id WHERE m.slug = 'demokratie'), '3/1');
SELECT pg_temp.ok('Speaker taucht nicht in Kennzahlen auf (Demokratie weiter 3 angemeldet)',
  (SELECT registered::text FROM public.get_module_stats() WHERE title = 'Demokratie'), '3');

-- 7) Rechte: Hausaufgaben-Kennzahlen nur admin/vorstand; Helfer gar nichts
SELECT pg_temp.login('orga@ses.test');
DO $$ BEGIN
  PERFORM * FROM public.get_participant_homework_analytics(
    (SELECT id FROM public.participants WHERE email = 'amina@example.test'));
  RAISE EXCEPTION 'FEHLER Orga darf keine Hausaufgaben-Kennzahlen';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Orga: Status ja, Kennzahlen nein';
END $$;

SELECT pg_temp.login('helfer@ses.test');
DO $$ BEGIN
  PERFORM * FROM public.get_assignment_status(
    (SELECT id FROM public.assignments WHERE number = 901));
  RAISE EXCEPTION 'FEHLER Helfer darf keinen Hausaufgaben-Status';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  Helfer: weder Status noch Kennzahlen';
END $$;

ROLLBACK;

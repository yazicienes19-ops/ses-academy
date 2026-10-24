-- Datenbanktests für Hausaufgaben, Bewertungen, Verantwortliche und „Mein Bereich“.
-- Voraussetzung: frische Datenbank mit seed.sql (supabase db reset).
-- Ausführen: npm run test:db   (alles läuft in einer Transaktion und wird zurückgerollt)
\set ON_ERROR_STOP 1
BEGIN;

-- p_methode: wie die Sitzung entstanden ist ('otp' = Code/Link aus der E-Mail, 'password' = Passwort)
CREATE FUNCTION pg_temp.login(p_email text, p_methode text DEFAULT 'otp') RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  RESET ROLE;
  IF p_email IS NULL THEN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    EXECUTE 'SET LOCAL ROLE anon';
    RETURN;
  END IF;
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', p_email,
    'amr', json_build_array(json_build_object('method', p_methode, 'timestamp', 0)))::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION pg_temp.ok(label text, actual text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FEHLER %: erwartet %, bekommen %', label, expected, actual;
  END IF;
  RAISE NOTICE 'ok  %', label;
END $$;

CREATE FUNCTION pg_temp.verboten(label text, sql text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RAISE EXCEPTION 'FEHLER %: hätte abgelehnt werden müssen', label;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok  %', label;
END $$;

-- Testdaten als Superuser: Amina und Yusuf (angenommen, mit E-Mail) bekommen ein Login-Konto,
-- Amina hat eine Gruppenabgabe mit Leila, Yusuf eine eigene.
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'amina@example.test', now(), now(), now()),
       ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'yusuf@example.test', now(), now(), now()),
       ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'leila@example.test', NULL,  now(), now());
INSERT INTO public.participant_notes (participant_id, body) SELECT id, 'Intern: nur fürs Team' FROM public.participants WHERE email = 'amina@example.test';
INSERT INTO public.mentors (name, email) VALUES ('Test Sorumlu', 'sorumlu@example.test');
UPDATE public.participants SET region_id = (SELECT id FROM public.regions WHERE name = 'Köln'), branch = 'KGT',
       mentor_id = (SELECT id FROM public.mentors WHERE name = 'Test Sorumlu')
 WHERE email = 'amina@example.test';

CREATE TEMP TABLE t AS
SELECT (SELECT id FROM public.cohorts WHERE is_current) AS jahrgang,
       (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
       (SELECT id FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf,
       (SELECT id FROM public.participants WHERE email = 'leila@example.test') AS leila;
GRANT SELECT ON t TO authenticated, anon;

-- 1. Orga-Team legt Hausaufgabe, Abgaben und Bewertung an
SELECT pg_temp.login('orga@ses.test', 'password');
INSERT INTO public.assignments (cohort_id, number, title) SELECT jahrgang, 1, 'Rhetorik-Video' FROM t;
INSERT INTO public.submissions (assignment_id, label, file_name) SELECT id, 'Amina & Leila', 'amina-leila.mp4' FROM public.assignments WHERE number = 1;
INSERT INTO public.submissions (assignment_id, label) SELECT id, 'Yusuf' FROM public.assignments WHERE number = 1;
INSERT INTO public.submission_participants SELECT s.id, t.amina FROM public.submissions s, t WHERE s.label = 'Amina & Leila';
INSERT INTO public.submission_participants SELECT s.id, t.leila FROM public.submissions s, t WHERE s.label = 'Amina & Leila';
INSERT INTO public.submission_participants SELECT s.id, t.yusuf FROM public.submissions s, t WHERE s.label = 'Yusuf';
INSERT INTO public.reviews (submission_id, reviewer_id, reviewer_name, content, structure, overall, strengths)
SELECT id, auth.uid(), 'Orga', 5, 4, 4, 'Klare Kernaussage' FROM public.submissions WHERE label = 'Amina & Leila';
INSERT INTO public.reviews (submission_id, reviewer_id, content) SELECT id, auth.uid(), 2 FROM public.submissions WHERE label = 'Yusuf';
SELECT pg_temp.ok('Orga sieht alle Abgaben', count(*)::text, '2') FROM public.submissions;
SELECT pg_temp.ok('Orga: Namensliste ohne Kontaktdaten', (SELECT display_name FROM public.get_participant_directory() d, t WHERE d.id = t.amina), 'Amina Yilmaz');
SELECT pg_temp.ok('Orga: Region/GT/Verantwortliche in Namensliste', (SELECT region || '/' || branch || '/' || mentor FROM public.get_participant_directory() d, t WHERE d.id = t.amina), 'Köln/KGT/Test Sorumlu');
SELECT pg_temp.ok('Orga darf participants nicht direkt lesen', count(*)::text, '0') FROM public.participants;

SELECT pg_temp.ok('Orga sieht keine internen Notizen (nur Admin/Vorstand)', count(*)::text, '0') FROM public.participant_notes;
SELECT pg_temp.login('admin@ses.test', 'password');
SELECT pg_temp.ok('Admin sieht interne Notiz', string_agg(body, ','), 'Intern: nur fürs Team') FROM public.participant_notes;

-- 2. Einlass-Helfer:in: kein Zugriff auf Hausaufgaben
SELECT pg_temp.login('helfer@ses.test', 'password');
SELECT pg_temp.ok('Helfer sieht keine Abgaben', count(*)::text, '0') FROM public.submissions;
SELECT pg_temp.ok('Helfer sieht keine Bewertungen', count(*)::text, '0') FROM public.reviews;
SELECT pg_temp.verboten('Helfer: keine Namensliste', 'SELECT * FROM public.get_participant_directory()');

-- 3. Kontoübernahme verhindern: Passwort-Sitzung oder unbestätigte Adresse wird nicht verknüpft
SELECT pg_temp.login('amina@example.test', 'password');
SELECT pg_temp.ok('Passwort-Sitzung wird nicht verknüpft', public.link_my_account(), 'none');
SELECT pg_temp.ok('… und sieht nichts', count(*)::text, '0') FROM public.participants;
SELECT pg_temp.login('leila@example.test');
SELECT pg_temp.ok('Unbestätigte Adresse wird nicht verknüpft', public.link_my_account(), 'none');

-- 4. Amina meldet sich per E-Mail-Code an: Konto wird verknüpft
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Konto verknüpft', public.link_my_account(), 'participant');
SELECT pg_temp.ok('Amina sieht nur sich selbst', count(*)::text, '1') FROM public.participants;
SELECT pg_temp.ok('Amina sieht nur ihre Abgabe', string_agg(label, ','), 'Amina & Leila') FROM public.submissions;
SELECT pg_temp.ok('Amina sieht die Bewertung ihrer Abgabe', string_agg(strengths, ','), 'Klare Kernaussage') FROM public.reviews;
SELECT pg_temp.ok('Amina sieht die Hausaufgabe ihres Jahrgangs', count(*)::text, '1') FROM public.assignments;
SELECT pg_temp.ok('Amina sieht keine Mitabgaben-Zuordnung von Leila', count(*)::text, '1') FROM public.submission_participants;
SELECT pg_temp.ok('Amina sieht keine Verantwortlichen', count(*)::text, '0') FROM public.mentors;
SELECT pg_temp.ok('Amina sieht keine internen Notizen', count(*)::text, '0') FROM public.participant_notes;
SELECT pg_temp.verboten('Amina: keine Namensliste', 'SELECT * FROM public.get_participant_directory()');
CREATE TEMP TABLE upd AS WITH u AS (UPDATE public.reviews SET content = 5 RETURNING 1) SELECT count(*) AS n FROM u;
SELECT pg_temp.ok('Amina kann Bewertungen nicht ändern', n::text, '0') FROM upd;
CREATE TEMP TABLE upd2 AS WITH u AS (UPDATE public.participants SET branch = 'GT' RETURNING 1) SELECT count(*) AS n FROM u;
SELECT pg_temp.ok('Amina kann ihre Stammdaten nicht ändern', n::text, '0') FROM upd2;

-- 5. Yusuf sieht nur seine eigene (schlechtere) Bewertung
SELECT pg_temp.login('yusuf@example.test');
SELECT pg_temp.ok('Yusuf verknüpft', public.link_my_account(), 'participant');
SELECT pg_temp.ok('Yusuf sieht nur seine Bewertung', string_agg(content::text, ','), '2') FROM public.reviews;

-- 6. Unbekannte E-Mail wird nicht verknüpft, nicht eingeloggt sieht niemand etwas
RESET ROLE;
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'fremd@example.test', now(), now(), now());
SELECT pg_temp.login('fremd@example.test');
SELECT pg_temp.ok('Fremde Adresse: kein Profil', public.link_my_account(), 'none');
SELECT pg_temp.ok('Fremde Adresse sieht keine Abgaben', count(*)::text, '0') FROM public.submissions;
SELECT pg_temp.login(NULL);
SELECT pg_temp.ok('Anonym: keine Abgaben', count(*)::text, '0') FROM public.submissions;
SELECT pg_temp.ok('Anonym: keine Beiträge', count(*)::text, '0') FROM public.contributions;

-- 7. Neues Modul: auch per Liste importierte Teilnehmende (ohne Bewerbung) werden angemeldet
RESET ROLE;
INSERT INTO public.participants (first_name, last_name, affiliation_status, cohort_id)
SELECT 'Import', 'Person', 'academy_student', jahrgang FROM t;
INSERT INTO public.modules (slug, title, status, cohort_id) SELECT 'test-modul', 'Testmodul', 'published', jahrgang FROM t;
SELECT pg_temp.login('admin@ses.test', 'password');
SELECT public.register_cohort_for_module((SELECT id FROM public.modules WHERE slug = 'test-modul'));
RESET ROLE;
SELECT pg_temp.ok('Importierte Person für neues Modul angemeldet', count(*)::text, '1')
  FROM public.registrations r JOIN public.participants p ON p.id = r.participant_id JOIN public.modules m ON m.id = r.module_id
 WHERE m.slug = 'test-modul' AND p.first_name = 'Import';

ROLLBACK;

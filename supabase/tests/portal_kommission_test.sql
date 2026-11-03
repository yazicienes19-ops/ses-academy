-- Datenbanktests: Abgaben durch Teilnehmende, Material, Regieplan/Tagesordnung, Hotelzimmer.
-- Voraussetzung: frische Datenbank mit seed.sql (supabase db reset). Läuft in einer Transaktion und wird zurückgerollt.
\set ON_ERROR_STOP 1
BEGIN;

CREATE FUNCTION pg_temp.login(p_email text, p_methode text DEFAULT 'otp') RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  RESET ROLE;
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

-- Erwartet einen Fehler; p_meldung (optional) muss in der Fehlermeldung vorkommen
CREATE FUNCTION pg_temp.fehler(label text, sql text, p_meldung text DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RAISE EXCEPTION 'FEHLER %: hätte abgelehnt werden müssen', label;
EXCEPTION
  WHEN raise_exception THEN RAISE;
  WHEN OTHERS THEN
    IF p_meldung IS NOT NULL AND position(p_meldung IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'FEHLER %: falscher Fehler „%“ (erwartet „%“)', label, SQLERRM, p_meldung;
    END IF;
    RAISE NOTICE 'ok  % (%)', label, SQLERRM;
END $$;

-- Testdaten als Superuser -------------------------------------------------------------------------
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'amina@example.test', now(), now(), now()),
       ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'yusuf@example.test', now(), now(), now());

-- Zweiter Jahrgang mit eigener Aufgabe (darf für Amina unsichtbar/unzugänglich sein)
INSERT INTO public.cohorts (id, name, year, is_current) VALUES ('00000000-0000-4000-8000-000000002028', 'Jahrgang 2028', 2028, false);

CREATE TEMP TABLE t AS
SELECT (SELECT id FROM public.cohorts WHERE is_current) AS jahrgang,
       (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
       (SELECT id FROM public.participants WHERE email = 'yusuf@example.test') AS yusuf,
       (SELECT id FROM public.modules WHERE slug = 'verfassungen') AS verfassungen,
       (SELECT id FROM public.module_days WHERE module_id = (SELECT id FROM public.modules WHERE slug = 'verfassungen') ORDER BY starts_at LIMIT 1) AS tag1;
GRANT SELECT ON t TO authenticated;
-- Yusuf hat „Verfassungen“ abgesagt: Tagesordnung darf er dann nicht mehr sehen
UPDATE public.registrations r SET status = 'cancelled' FROM t WHERE r.participant_id = t.yusuf AND r.module_id = t.verfassungen;

SELECT pg_temp.login('amina@example.test'); SELECT public.link_my_account();
SELECT pg_temp.login('yusuf@example.test'); SELECT public.link_my_account();

-- 1. Kommission (orga_team) legt an -------------------------------------------------------------
SELECT pg_temp.login('orga@ses.test', 'password');
INSERT INTO public.assignments (cohort_id, number, title, allowed_formats) SELECT jahrgang, 1, 'Essay', ARRAY['pdf', 'text'] FROM t;
INSERT INTO public.assignments (cohort_id, number, title, allowed_formats) SELECT jahrgang, 2, 'Video', ARRAY['link'] FROM t;
INSERT INTO public.assignments (id, cohort_id, number, title) VALUES ('00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-000000002028', 1, 'Anderer Jahrgang');
SELECT pg_temp.fehler('Formate nur aus pdf/docx/text/link',
  $q$UPDATE public.assignments SET allowed_formats = ARRAY['mp4'] WHERE number = 2$q$, 'check');

INSERT INTO public.resources (cohort_id, title, storage_path, file_name, published) SELECT jahrgang, 'Reader Verfassungen', 'r/reader.pdf', 'reader.pdf', true FROM t;
INSERT INTO public.resources (cohort_id, title, storage_path, file_name, published) SELECT jahrgang, 'Entwurf', 'r/entwurf.pdf', 'entwurf.pdf', false FROM t;
INSERT INTO public.resources (cohort_id, title, storage_path, file_name, published) VALUES ('00000000-0000-4000-8000-000000002028', 'Anderer Jahrgang', 'r/anders.pdf', 'anders.pdf', true);

INSERT INTO public.agenda_items (module_day_id, starts_at, ends_at, title, location, published) SELECT tag1, '09:30', '10:00', 'Begrüßung', 'Saal A', true FROM t;
INSERT INTO public.agenda_items (module_day_id, starts_at, title, published) SELECT tag1, '12:00', 'Mittagspause (Entwurf)', false FROM t;
INSERT INTO public.agenda_item_internal (item_id, responsible, note) SELECT id, 'Furkan', 'Mikro 2 testen' FROM public.agenda_items WHERE title = 'Begrüßung';
SELECT pg_temp.ok('Orga sieht Regieplan inkl. interner Notiz', (SELECT note FROM public.agenda_item_internal), 'Mikro 2 testen');

-- Hotel ist admin/vorstand vorbehalten
SELECT pg_temp.fehler('Orga darf keine Zimmer zuweisen',
  $q$INSERT INTO public.room_assignments (module_id, participant_id, hotel_name, room_number) SELECT verfassungen, amina, 'H', '1' FROM t$q$, 'row-level security');

-- 2. Einlass-Helfer:in sieht nichts davon ------------------------------------------------------
SELECT pg_temp.login('helfer@ses.test', 'password');
SELECT pg_temp.ok('Helfer: kein Material', count(*)::text, '0') FROM public.resources;
SELECT pg_temp.ok('Helfer: kein Regieplan', count(*)::text, '0') FROM public.agenda_items;
SELECT pg_temp.ok('Helfer: keine internen Notizen', count(*)::text, '0') FROM public.agenda_item_internal;

-- 3. Admin weist Zimmer zu (noch nicht freigegeben) --------------------------------------------
SELECT pg_temp.login('admin@ses.test', 'password');
INSERT INTO public.room_assignments (module_id, participant_id, hotel_name, room_number, room_pin_code, check_in_info)
SELECT verfassungen, amina, 'Hotel Rhein', '204', '4711', 'Ab 15 Uhr' FROM t;
INSERT INTO public.room_assignments (module_id, participant_id, hotel_name, room_number, room_pin_code)
SELECT verfassungen, yusuf, 'Hotel Rhein', '204', '4711' FROM t;
INSERT INTO public.accommodation_releases (module_id, published) SELECT verfassungen, false FROM t;

-- 4. Amina (Teilnehmerin) ----------------------------------------------------------------------
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Teilnehmerin: nur freigeschaltetes Material des eigenen Jahrgangs', string_agg(title, ','), 'Reader Verfassungen') FROM public.resources;
SELECT pg_temp.ok('Teilnehmerin: nur veröffentlichte Tagesordnung', string_agg(title, ','), 'Begrüßung') FROM public.agenda_items;
SELECT pg_temp.ok('Teilnehmerin: keine internen Regieplan-Notizen', count(*)::text, '0') FROM public.agenda_item_internal;
SELECT pg_temp.ok('Teilnehmerin: Zimmer vor Freigabe unsichtbar (Tabelle)', count(*)::text, '0') FROM public.room_assignments;
SELECT pg_temp.ok('Teilnehmerin: Zimmer vor Freigabe unsichtbar (my_rooms)', count(*)::text, '0') FROM public.my_rooms();
SELECT pg_temp.ok('Teilnehmerin sieht keine Aufgabe des anderen Jahrgangs', string_agg(title, ',' ORDER BY number), 'Essay,Video') FROM public.assignments;
SELECT pg_temp.fehler('Teilnehmerin darf kein Material anlegen',
  $q$INSERT INTO public.resources (cohort_id, title, storage_path, file_name) SELECT jahrgang, 'x', 'x.pdf', 'x.pdf' FROM t$q$, 'row-level security');
SELECT pg_temp.fehler('Teilnehmerin darf Tagesordnung nicht ändern',
  $q$INSERT INTO public.agenda_items (module_day_id, starts_at, title, published) SELECT tag1, '08:00', 'x', true FROM t$q$, 'row-level security');

-- Abgaben
SELECT pg_temp.ok('Textabgabe (erlaubt)', (SELECT public.submit_assignment(id, 'Mein Essaytext') IS NOT NULL FROM public.assignments WHERE number = 1)::text, 'true');
SELECT pg_temp.ok('Abgabe als eigene, datierte Zeile', (SELECT source || '/' || content || '/' || (submitted_on IS NOT NULL) FROM public.submissions), 'participant/Mein Essaytext/true');
SELECT pg_temp.ok('Nachbessern ersetzt statt verdoppelt', (SELECT public.submit_assignment(id, 'Überarbeitet') IS NOT NULL FROM public.assignments WHERE number = 1)::text, 'true');
SELECT pg_temp.ok('… weiterhin genau eine Abgabe', (SELECT count(*) || '/' || max(content) FROM public.submissions), '1/Überarbeitet');
SELECT pg_temp.fehler('Link bei reiner PDF/Text-Aufgabe abgelehnt',
  $q$SELECT public.submit_assignment(id, NULL, 'https://youtu.be/x') FROM public.assignments WHERE number = 1$q$, 'format_not_allowed:link');
SELECT pg_temp.fehler('Ungültiger Link abgelehnt',
  $q$SELECT public.submit_assignment(id, NULL, 'javascript:alert(1)') FROM public.assignments WHERE number = 2$q$, 'invalid_link');
SELECT pg_temp.fehler('Leere Abgabe abgelehnt',
  $q$SELECT public.submit_assignment(id, '   ') FROM public.assignments WHERE number = 2$q$, 'empty_submission');
SELECT pg_temp.fehler('Aufgabe eines anderen Jahrgangs abgelehnt',
  $q$SELECT public.submit_assignment('00000000-0000-4000-8000-0000000000aa', 'x')$q$, 'assignment_not_mine');
SELECT pg_temp.fehler('Datei, die nicht hochgeladen wurde, abgelehnt',
  $q$SELECT public.submit_assignment(a.id, NULL, NULL, a.id || '/' || t.amina || '/abgabe.pdf', 'essay.pdf') FROM public.assignments a, t WHERE a.number = 1$q$, 'invalid_upload_path');
SELECT pg_temp.fehler('Fremder Ordner abgelehnt',
  $q$SELECT public.submit_assignment(a.id, NULL, NULL, a.id || '/' || t.yusuf || '/abgabe.pdf', 'x.pdf') FROM public.assignments a, t WHERE a.number = 1$q$, 'invalid_upload_path');

-- Dateispeicher: eigener Ordner ja, fremder Ordner/fremder Jahrgang nein
INSERT INTO storage.objects (bucket_id, name) SELECT 'abgaben', a.id || '/' || t.amina || '/abgabe.pdf' FROM public.assignments a, t WHERE a.number = 1;
SELECT pg_temp.ok('Upload in eigenen Ordner', count(*)::text, '1') FROM storage.objects WHERE bucket_id = 'abgaben';
SELECT pg_temp.ok('PDF-Abgabe nach Upload', (SELECT public.submit_assignment(a.id, NULL, NULL, a.id || '/' || t.amina || '/abgabe.pdf', 'essay.pdf') IS NOT NULL FROM public.assignments a, t WHERE a.number = 1)::text, 'true');
SELECT pg_temp.fehler('Upload in fremden Ordner',
  $q$INSERT INTO storage.objects (bucket_id, name) SELECT 'abgaben', a.id || '/' || t.yusuf || '/abgabe.pdf' FROM public.assignments a, t WHERE a.number = 1$q$, 'row-level security');
SELECT pg_temp.fehler('Upload zu Aufgabe eines anderen Jahrgangs',
  $q$INSERT INTO storage.objects (bucket_id, name) SELECT 'abgaben', '00000000-0000-4000-8000-0000000000aa' || '/' || t.amina || '/abgabe.pdf' FROM t$q$, 'row-level security');
SELECT pg_temp.fehler('Teilnehmerin darf nichts ins Material hochladen',
  $q$INSERT INTO storage.objects (bucket_id, name) VALUES ('material', 'r/eigenes.pdf')$q$, 'row-level security');

-- 5. Yusuf: sieht Aminas Abgabe nicht, ist für „Verfassungen“ nicht angemeldet -------------------
SELECT pg_temp.login('yusuf@example.test');
SELECT pg_temp.ok('Andere Teilnehmende sehen fremde Abgaben nicht', count(*)::text, '0') FROM public.submissions;
SELECT pg_temp.ok('… und keine fremden Dateien', count(*)::text, '0') FROM storage.objects WHERE bucket_id = 'abgaben';
SELECT pg_temp.ok('Tagesordnung nur für angemeldete Module (abgesagt → nichts)', count(*)::text, '0') FROM public.agenda_items;

-- 6. Kommission: Status, Download-Recht, Bewertung sperrt Nachbessern ---------------------------
SELECT pg_temp.login('orga@ses.test', 'password');
SELECT pg_temp.ok('Status zählt Teilnehmer-Abgabe als pünktlich',
  (SELECT s.status FROM public.get_assignment_status((SELECT a.id FROM public.assignments a, t WHERE a.number = 1 AND a.cohort_id = t.jahrgang)) s, t WHERE s.participant_id = t.amina), 'puenktlich');
SELECT pg_temp.ok('Orga darf Abgabedatei lesen', count(*)::text, '1') FROM storage.objects WHERE bucket_id = 'abgaben';
INSERT INTO public.reviews (submission_id, reviewer_id, overall) SELECT id, auth.uid(), 4 FROM public.submissions;
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.fehler('Nach Bewertung kein Nachbessern mehr',
  $q$SELECT public.submit_assignment(id, 'Noch mal') FROM public.assignments WHERE number = 1$q$, 'already_reviewed');

-- 7. Freigabe der Zimmer -----------------------------------------------------------------------
SELECT pg_temp.login('admin@ses.test', 'password');
UPDATE public.accommodation_releases SET published = true, published_at = now();
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Nach Freigabe: eigenes Zimmer mit Code und Mitbewohner-Vorname',
  (SELECT hotel_name || ' ' || room_number || ' / ' || room_pin_code || ' / ' || array_to_string(roommates, ',') FROM public.my_rooms()), 'Hotel Rhein 204 / 4711 / Yusuf');
SELECT pg_temp.ok('Tabelle zeigt nur die eigene Zuweisung', count(*)::text, '1') FROM public.room_assignments;
WITH u AS (UPDATE public.accommodation_releases SET published = false RETURNING 1)
SELECT pg_temp.ok('Teilnehmerin kann Freigabe nicht ändern (0 Zeilen)', count(*)::text, '0') FROM u;

ROLLBACK;

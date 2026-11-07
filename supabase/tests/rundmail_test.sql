-- Tests für Migration 20261125090000_rundmails.sql: Vorlagen, Sprache, Auswahl einzelner Personen.
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

-- Setup: Leila schreibt auf Türkisch; ein Orga-Konto nur für „Demokratie“
UPDATE public.participants SET preferred_language = 'tr' WHERE email = 'leila@example.test';
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'modul.orga@ses.test', now(), now(), now());
INSERT INTO public.staff_members (user_id, role, display_name, module_id)
SELECT id, 'orga_team', 'Nur Demokratie', (SELECT id FROM public.modules WHERE slug = 'demokratie') FROM auth.users WHERE email = 'modul.orga@ses.test';
CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT id FROM public.participants WHERE email = 'leila@example.test') AS leila,
  (SELECT count(*) FROM public.participants WHERE active AND email IS NOT NULL) AS alle;
GRANT SELECT ON t TO authenticated;

-- 1) Vorlagen: nur Admin/Vorstand
SELECT pg_temp.login('admin@ses.test');
INSERT INTO public.message_templates (name, subject_de, body_de, subject_tr, body_tr) VALUES ('Erinnerung', 'Erinnerung', 'Bitte zusagen.', 'Hatırlatma', 'Lütfen katılımını bildir.');
SELECT pg_temp.ok('Admin legt Vorlage an und liest sie', (SELECT count(*)::text FROM public.message_templates), '1');
SELECT pg_temp.fehler('Gleicher Name (Groß/Klein egal) nur einmal', $q$INSERT INTO public.message_templates (name, subject_de) VALUES (' erinnerung', 'X')$q$, 'message_templates_name');
SELECT pg_temp.fehler('Vorlage braucht einen Betreff', $q$INSERT INTO public.message_templates (name) VALUES ('Leer')$q$, 'check');
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.ok('Vorstand sieht Vorlagen', (SELECT count(*)::text FROM public.message_templates), '1');
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Orga-Team sieht keine Vorlagen', (SELECT count(*)::text FROM public.message_templates), '0');
SELECT pg_temp.fehler('Orga-Team legt keine Vorlage an', $q$INSERT INTO public.message_templates (name, subject_de) VALUES ('Orga', 'X')$q$, 'row-level security');
SELECT pg_temp.login('modul.orga@ses.test');
SELECT pg_temp.ok('Modul-Konto sieht keine Vorlagen', (SELECT count(*)::text FROM public.message_templates), '0');

-- 2) Empfänger: Auswahl einzelner Personen, Rechte
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.ok('Ohne Filter alle aktiven mit E-Mail', (SELECT count(*) FROM public.broadcast_recipients('{}'))::text, (SELECT alle::text FROM t));
SELECT pg_temp.ok('Auswahl: genau die ausgewählten', (SELECT string_agg(first_name, ',' ORDER BY first_name) FROM public.broadcast_recipients(
  jsonb_build_object('participant_ids', jsonb_build_array((SELECT amina FROM t), (SELECT leila FROM t))))), 'Amina,Leila');
SELECT pg_temp.ok('Leere Auswahl: niemand', (SELECT count(*)::text FROM public.broadcast_recipients('{"participant_ids": []}')), '0');
SELECT pg_temp.ok('Unsinn in der Auswahl: niemand', (SELECT count(*)::text FROM public.broadcast_recipients('{"participant_ids": ["x"]}')), '0');
RESET ROLE;
UPDATE public.participants SET active = false WHERE email = 'amina@example.test';
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.ok('Ausgeschiedene bekommen auch ausgewählt nichts', (SELECT string_agg(first_name, ',') FROM public.broadcast_recipients(
  jsonb_build_object('participant_ids', jsonb_build_array((SELECT amina FROM t), (SELECT leila FROM t))))), 'Leila');
RESET ROLE;
UPDATE public.participants SET active = true WHERE email = 'amina@example.test';
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Orga-Team: keine Empfänger', (SELECT count(*)::text FROM public.broadcast_recipients('{}')), '0');
SELECT pg_temp.login('modul.orga@ses.test');
SELECT pg_temp.ok('Modul-Konto: keine Empfänger', (SELECT count(*)::text FROM public.broadcast_recipients(
  jsonb_build_object('participant_ids', jsonb_build_array((SELECT amina FROM t))))), '0');
SELECT pg_temp.fehler('Modul-Konto legt keinen Antrag an', $q$SELECT public.create_approval('nachricht', '{"betreff":"a","text":"b"}')$q$, 'full_access_required');

-- 3) Anträge mit Sprache
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.fehler('Kontosprache braucht beide Texte', $q$SELECT public.create_approval('nachricht', '{"betreff":"a","text":"b","sprache":"konto"}')$q$, 'invalid_payload');
SELECT pg_temp.fehler('Türkisch braucht den türkischen Text', $q$SELECT public.create_approval('nachricht', '{"betreff":"a","text":"b","sprache":"tr"}')$q$, 'invalid_payload');
SELECT pg_temp.fehler('Unbekannte Sprache', $q$SELECT public.create_approval('nachricht', '{"betreff":"a","text":"b","sprache":"en"}')$q$, 'invalid_payload');
SELECT pg_temp.fehler('Auswahl mit Unsinn abgelehnt', $q$SELECT public.create_approval('nachricht', '{"betreff":"a","text":"b","filter":{"participant_ids":["x"]}}')$q$, 'invalid_payload');
SELECT pg_temp.fehler('Leere Auswahl: keine Empfänger', $q$SELECT public.create_approval('nachricht', '{"betreff":"a","text":"b","filter":{"participant_ids":[]}}')$q$, 'no_recipients');

CREATE TEMP TABLE a1 AS SELECT public.create_approval('nachricht', jsonb_build_object('betreff', 'Treffen', 'text', 'Samstag', 'betreff_tr', 'Buluşma',
  'text_tr', 'Cumartesi', 'sprache', 'konto')) AS id;
SELECT pg_temp.ok('Kontosprache: Anzahl je Sprache im Antrag', (SELECT payload ->> 'anzahl' || '/' || (payload ->> 'anzahl_tr') FROM public.approvals WHERE id = (SELECT id FROM a1)),
  (SELECT alle::text FROM t) || '/1');
SELECT pg_temp.ok('Beschreibung nennt die Sprachen', (SELECT summary LIKE '%nach Kontosprache: 1 auf Türkisch, ' || ((SELECT alle FROM t) - 1) || ' auf Deutsch%' FROM public.approvals WHERE id = (SELECT id FROM a1))::text, 'true');

CREATE TEMP TABLE a2 AS SELECT public.create_approval('nachricht', jsonb_build_object('betreff_tr', 'Buluşma', 'text_tr', 'Cumartesi', 'sprache', 'tr',
  'auswahl', 'Noch keine Zusage', 'filter', jsonb_build_object('participant_ids', jsonb_build_array((SELECT amina FROM t), (SELECT amina FROM t), (SELECT leila FROM t))))) AS id;
SELECT pg_temp.ok('Auswahl: Doppelte entfernt, 2 Empfänger', (SELECT payload ->> 'anzahl' || '/' || jsonb_array_length(payload -> 'filter' -> 'participant_ids') FROM public.approvals WHERE id = (SELECT id FROM a2)), '2/2');
SELECT pg_temp.ok('Beschreibung nennt die Auswahl und Türkisch', (SELECT summary FROM public.approvals WHERE id = (SELECT id FROM a2)),
  'Nachricht „Buluşma“ an 2 Personen (Auswahl aus Teilnehmende: 2 Personen (Noch keine Zusage)) · auf Türkisch');

-- 4) Freigabe und Ausführung unverändert: Inhalt kommt einmal zurück
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.ok('Zweite Person gibt frei', public.decide_approval((SELECT id FROM a2), true), 'approved');
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.ok('Ausführen liefert Sprache und Auswahl', (SELECT (public.claim_approval((SELECT id FROM a2), 'nachricht') -> 'payload' ->> 'sprache')), 'tr');
SELECT pg_temp.ok('… nur einmal', (SELECT public.claim_approval((SELECT id FROM a2), 'nachricht') ->> 'result'), 'ausgefuehrt');

ROLLBACK;

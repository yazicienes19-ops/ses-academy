-- Tests für Migrationen 20261128090000_datenschutz.sql und 20261129090000_loeschung_vier_augen.sql: Verzeichnis-Austragen,
-- Löschantrag, Löschen/Anonymisieren nur nach Vier-Augen-Freigabe.
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

-- Setup: Amina und Leila bekommen ein Login-Konto (wie nach dem ersten Login in „Mein Bereich“), Amina Daten zum Löschen
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', e, now(), now(), now()
  FROM unnest(ARRAY['amina@example.test', 'leila@example.test']) e WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = e);
UPDATE public.participants p SET user_id = u.id, phone = '+49 170 1234567', gender = 'w', photo_path = p.id || '/1.jpg'
  FROM auth.users u WHERE u.email = p.email AND p.email IN ('amina@example.test', 'leila@example.test');
CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina,
  (SELECT user_id FROM public.participants WHERE email = 'amina@example.test') AS amina_user,
  (SELECT checkin_token FROM public.participants WHERE email = 'amina@example.test') AS amina_token,
  (SELECT count(*) FROM public.attendances a JOIN public.registrations r ON r.id = a.registration_id JOIN public.participants p ON p.id = r.participant_id WHERE p.email = 'amina@example.test') AS amina_da,
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demo;
GRANT SELECT ON t TO authenticated;
INSERT INTO public.contact_log (participant_id, channel, note) SELECT amina, 'notiz', 'ruft zurück' FROM t;
INSERT INTO public.stay_requests (registration_id, notes) SELECT r.id, 'Allergie' FROM public.registrations r, t WHERE r.participant_id = t.amina AND r.module_id = t.demo;
INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type) SELECT amina_user, amina, 'submission_self', 'submission' FROM t;
INSERT INTO public.email_log (participant_id, kind, recipient, status) SELECT amina, 'ticket', 'amina@example.test', 'sent' FROM t;

-- 1) Verzeichnis: selbst austragen, dann für alle unsichtbar
SELECT pg_temp.login('leila@example.test');
SELECT pg_temp.ok('Leila sieht Amina im Verzeichnis', (SELECT count(*)::text FROM public.get_member_directory() WHERE name = 'Amina Yilmaz'), '1');
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Amina trägt sich aus', public.set_my_directory_opt_out(true), 'saved');
SELECT pg_temp.login('leila@example.test');
SELECT pg_temp.ok('… Leila sieht sie nicht mehr', (SELECT count(*)::text FROM public.get_member_directory() WHERE name = 'Amina Yilmaz'), '0');
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.ok('… auch das Team nicht', (SELECT count(*)::text FROM public.get_member_directory() WHERE name = 'Amina Yilmaz'), '0');
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Wieder eintragen', public.set_my_directory_opt_out(false), 'saved');
SELECT pg_temp.login('leila@example.test');
SELECT pg_temp.ok('… wieder sichtbar', (SELECT count(*)::text FROM public.get_member_directory() WHERE name = 'Amina Yilmaz'), '1');
UPDATE public.participants SET directory_opt_out = true WHERE email = 'amina@example.test';
RESET ROLE;
SELECT pg_temp.ok('Leila kann Amina nicht austragen', (SELECT directory_opt_out::text FROM public.participants WHERE id = (SELECT amina FROM t)), 'false');

-- 2) Löschantrag stellen, zurückziehen, erneut stellen
SELECT pg_temp.login('amina@example.test');
SELECT pg_temp.ok('Antrag stellen', public.request_my_deletion('Ich brauche das Konto nicht mehr'), 'requested');
SELECT pg_temp.ok('Kein zweiter offener Antrag', public.request_my_deletion(''), 'already_open');
SELECT pg_temp.ok('Eigenen Antrag sehen', (SELECT status FROM public.deletion_requests), 'offen');
SELECT pg_temp.ok('Zurückziehen', public.withdraw_my_deletion(), 'withdrawn');
SELECT pg_temp.ok('Erneut stellen', public.request_my_deletion('Bitte löschen'), 'requested');
SELECT pg_temp.fehler('Kein direktes Anlegen', $q$INSERT INTO public.deletion_requests (participant_id) SELECT amina FROM t$q$, 'permission denied');
SELECT pg_temp.login('leila@example.test');
SELECT pg_temp.ok('Leila sieht Aminas Antrag nicht', (SELECT count(*)::text FROM public.deletion_requests), '0');
CREATE TEMP TABLE antrag AS SELECT id FROM public.deletion_requests WHERE status = 'offen';
GRANT SELECT ON antrag TO authenticated;
RESET ROLE;
DELETE FROM antrag;
INSERT INTO antrag SELECT id FROM public.deletion_requests WHERE status = 'offen' AND participant_id = (SELECT amina FROM t);

-- 2b) Interne Zählfunktion ist nicht direkt aufrufbar (auch nicht für angemeldete Teilnehmende oder Admins)
SELECT pg_temp.login('leila@example.test');
SELECT pg_temp.fehler('Teilnehmende: deletion_counts mit fremder ID gesperrt', $q$SELECT public.deletion_counts((SELECT amina FROM t))$q$, 'permission denied');
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.fehler('Vorstand: deletion_counts gesperrt', $q$SELECT public.deletion_counts((SELECT amina FROM t))$q$, 'permission denied');
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.fehler('Admin: deletion_counts nur über die Vorschau', $q$SELECT public.deletion_counts((SELECT amina FROM t))$q$, 'permission denied');
RESET ROLE;
SELECT pg_temp.ok('authenticated hat kein EXECUTE auf deletion_counts', has_function_privilege('authenticated', 'public.deletion_counts(uuid)', 'EXECUTE')::text, 'false');
SELECT pg_temp.ok('anon hat kein EXECUTE auf deletion_counts', has_function_privilege('anon', 'public.deletion_counts(uuid)', 'EXECUTE')::text, 'false');

-- 3) Nur Admin legt vor; ohne Freigabe wird nicht gelöscht; die eigene Vorlage kann niemand freigeben
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.ok('Vorstand sieht keine Löschanträge', (SELECT count(*)::text FROM public.deletion_requests), '0');
SELECT pg_temp.fehler('Vorstand: keine Vorschau', $q$SELECT public.deletion_preview((SELECT id FROM antrag))$q$, 'admin_required');
SELECT pg_temp.fehler('Vorstand legt keine Löschung vor', $q$SELECT public.create_approval('person_loeschen', jsonb_build_object('antrag', (SELECT id FROM antrag)))$q$, 'admin_required');
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.fehler('Orga legt keine Löschung vor', $q$SELECT public.create_approval('person_loeschen', jsonb_build_object('antrag', (SELECT id FROM antrag)))$q$, 'full_access_required');
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.ok('Admin sieht den Antrag', (SELECT count(*)::text FROM public.deletion_requests WHERE status = 'offen'), '1');
SELECT pg_temp.ok('Vorschau nennt Konto, Notizen, Übernachtung', (SELECT (z ->> 'konto') || '/' || (z ->> 'kontakte') || '/' || (z ->> 'uebernachtung') || '/' || (z ->> 'foto')
  FROM (SELECT public.deletion_preview((SELECT id FROM antrag)) -> 'zahlen' AS z) x), 'true/1/1/true');
SELECT pg_temp.ok('Ablehnen nur mit Notiz', public.reject_deletion((SELECT id FROM antrag), ' '), 'note_required');
SELECT pg_temp.fehler('Unsinnige Vorlage abgelehnt', $q$SELECT public.create_approval('person_loeschen', jsonb_build_object('antrag', gen_random_uuid()))$q$, 'invalid_payload');
CREATE TEMP TABLE frei AS SELECT public.create_approval('person_loeschen', jsonb_build_object('antrag', (SELECT id FROM antrag))) AS id;
GRANT SELECT ON frei TO authenticated;
SELECT pg_temp.ok('Vorlage mit Vorschau für die zweite Person', (SELECT (payload ->> 'name') || '/' || (payload -> 'zahlen' ->> 'kontakte') || '/' || (summary LIKE 'Person löschen: Amina Yilmaz (Löschantrag vom %')
  FROM public.approvals WHERE id = (SELECT id FROM frei)), 'Amina Yilmaz/1/true');
SELECT pg_temp.fehler('Je Antrag nur eine offene Vorlage', $q$SELECT public.create_approval('person_loeschen', jsonb_build_object('antrag', (SELECT id FROM antrag)))$q$, 'already_requested');
SELECT pg_temp.ok('Ohne Freigabe: nicht gelöscht', public.execute_deletion((SELECT id FROM frei)) ->> 'result', 'offen');
SELECT pg_temp.ok('… Person unverändert', (SELECT first_name FROM public.participants WHERE id = (SELECT amina FROM t)), 'Amina');
SELECT pg_temp.ok('Eigene Vorlage freigeben schlägt fehl', public.decide_approval((SELECT id FROM frei), true), 'own_request');
SELECT pg_temp.ok('… weiter offen', (SELECT status FROM public.approvals WHERE id = (SELECT id FROM frei)), 'offen');
SELECT pg_temp.fehler('Freigabe am Verfahren vorbei (direkt) gesperrt', $q$UPDATE public.approvals SET status = 'freigegeben' WHERE id = (SELECT id FROM frei) RETURNING 1$q$, 'permission denied');
SELECT pg_temp.ok('claim_approval gibt Lösch-Freigaben nicht heraus', public.claim_approval((SELECT id FROM frei), 'person_loeschen') ->> 'result', 'not_found');
RESET ROLE;
SELECT pg_temp.ok('Selbstfreigabe auch per CHECK ausgeschlossen', (SELECT count(*)::text FROM pg_constraint WHERE conrelid = 'public.approvals'::regclass AND pg_get_constraintdef(oid) LIKE '%decided_by <> requested_by%'), '1');
SELECT pg_temp.login('vorstand@ses.test');
SELECT pg_temp.ok('Vorstand sieht die Vorschau in der Freigabe', (SELECT payload -> 'zahlen' ->> 'uebernachtung' FROM public.approvals WHERE id = (SELECT id FROM frei)), '1');
SELECT pg_temp.fehler('Vorstand kann nicht selbst löschen', $q$SELECT public.execute_deletion((SELECT id FROM frei))$q$, 'admin_required');
SELECT pg_temp.ok('Zweite Person (Vorstand) gibt frei', public.decide_approval((SELECT id FROM frei), true), 'approved');
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.fehler('Orga kann nicht löschen', $q$SELECT public.execute_deletion((SELECT id FROM frei))$q$, 'admin_required');

-- 4) Löschen und anonymisieren
SELECT pg_temp.login('admin@ses.test');
CREATE TEMP TABLE erg AS SELECT public.execute_deletion((SELECT id FROM frei), 'erledigt per Antrag') AS r;
SELECT pg_temp.ok('Ausgeführt, Foto zum Entfernen gemeldet', (SELECT (r ->> 'result') || '/' || (r ->> 'photo_path' LIKE '%/1.jpg') || '/' || (r ->> 'konto_geloescht') FROM erg), 'ok/true/true');
RESET ROLE;
SELECT pg_temp.ok('Name und Kontaktdaten weg', (SELECT first_name || ' ' || last_name LIKE 'Gelöschte Person (%' AND email IS NULL AND phone IS NULL AND gender IS NULL
  AND photo_path IS NULL AND NOT active AND user_id IS NULL AND directory_opt_out FROM public.participants WHERE id = (SELECT amina FROM t))::text, 'true');
SELECT pg_temp.ok('Altes Ticket ungültig', (SELECT count(*)::text FROM public.participants WHERE checkin_token = (SELECT amina_token FROM t)), '0');
SELECT pg_temp.ok('Login-Konto gelöscht', (SELECT count(*)::text FROM auth.users WHERE id = (SELECT amina_user FROM t)), '0');
SELECT pg_temp.ok('Notizen und Übernachtung gelöscht', ((SELECT count(*) FROM public.contact_log WHERE participant_id = (SELECT amina FROM t))
  + (SELECT count(*) FROM public.stay_requests s JOIN public.registrations r ON r.id = s.registration_id WHERE r.participant_id = (SELECT amina FROM t)))::text, '0');
SELECT pg_temp.ok('Bewerbung gelöscht', (SELECT count(*)::text FROM public.applications WHERE email = 'amina@example.test'), '0');
SELECT pg_temp.ok('Anwesenheiten bleiben', (SELECT count(*) FROM public.attendances a JOIN public.registrations r ON r.id = a.registration_id WHERE r.participant_id = (SELECT amina FROM t))::text,
  (SELECT amina_da::text FROM t));
SELECT pg_temp.ok('Mail-Protokoll ohne Adresse', (SELECT string_agg(DISTINCT recipient, ',') FROM public.email_log WHERE participant_id = (SELECT amina FROM t)), 'gelöscht');
SELECT pg_temp.ok('Audit: eigene Aktionen ohne Konto, Löschung protokolliert', (SELECT (count(*) FILTER (WHERE actor_id IS NOT NULL AND action = 'submission_self'))::text || '/' ||
  (count(*) FILTER (WHERE action = 'participant_anonymized'))::text FROM public.audit_log WHERE target_participant_id = (SELECT amina FROM t)), '0/1');
SELECT pg_temp.ok('Antrag erledigt mit Ergebnis', (SELECT status || '/' || (result ->> 'konto_geloescht') FROM public.deletion_requests WHERE id = (SELECT id FROM antrag)), 'erledigt/true');
SELECT pg_temp.ok('Freigabe ausgeführt', (SELECT status FROM public.approvals WHERE id = (SELECT id FROM frei)), 'ausgefuehrt');
SELECT pg_temp.ok('Genau einmal gelöscht (ein Protokolleintrag)', (SELECT count(*)::text FROM public.audit_log WHERE action = 'participant_anonymized' AND target_participant_id = (SELECT amina FROM t)), '1');
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.ok('Zweimal geht nicht', public.execute_deletion((SELECT id FROM frei)) ->> 'result', 'ausgefuehrt');
RESET ROLE;
SELECT pg_temp.ok('… weiterhin genau ein Eintrag', (SELECT count(*)::text FROM public.audit_log WHERE action = 'participant_anonymized' AND target_participant_id = (SELECT amina FROM t)), '1');

-- 5) Team-Konto bleibt: Antrag einer Person, deren Login zugleich ein Team-Konto ist
RESET ROLE;
UPDATE public.participants SET user_id = (SELECT id FROM auth.users WHERE email = 'orga@ses.test') WHERE email = 'yusuf@example.test';
INSERT INTO public.deletion_requests (participant_id) SELECT id FROM public.participants WHERE email = 'yusuf@example.test';
-- zweiter Admin (wie bei der Einrichtung per ./ses.sh admin) legt vor, der erste gibt frei; nur die vorlegende Person führt aus
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin2@ses.test', now(), now(), now());
INSERT INTO public.staff_members (user_id, role, display_name) SELECT id, 'admin', 'Admin Zwei' FROM auth.users WHERE email = 'admin2@ses.test';
SELECT pg_temp.login('admin2@ses.test');
CREATE TEMP TABLE frei2 AS SELECT public.create_approval('person_loeschen', jsonb_build_object('antrag', (SELECT id FROM public.deletion_requests WHERE status = 'offen'))) AS id;
GRANT SELECT ON frei2 TO authenticated;
SELECT pg_temp.login('admin@ses.test');
SELECT pg_temp.ok('Zweiter Admin gibt frei', public.decide_approval((SELECT id FROM frei2), true), 'approved');
SELECT pg_temp.ok('Nur die vorlegende Person führt aus', public.execute_deletion((SELECT id FROM frei2)) ->> 'result', 'not_requester');
SELECT pg_temp.login('admin2@ses.test');
SELECT pg_temp.ok('Team-Konto wird nicht gelöscht', public.execute_deletion((SELECT id FROM frei2)) ->> 'konto_geloescht', 'false');
RESET ROLE;
SELECT pg_temp.ok('… Team-Zugang besteht weiter', (SELECT count(*)::text FROM public.staff_members s JOIN auth.users u ON u.id = s.user_id WHERE u.email = 'orga@ses.test'), '1');

ROLLBACK;

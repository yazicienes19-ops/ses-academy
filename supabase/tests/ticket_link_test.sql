-- Tests für Migration 20261119090000_ticket_link.sql: Abmelden nur mit dem Mail-Link (link_token) oder angemeldet,
-- nicht mit dem QR-Inhalt (checkin_token); Abmeldung selbst zurücknehmen; Einlass per QR unverändert.
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

-- Setup: Yusuf bekommt ein Login-Konto (wie nach dem ersten Login per Code)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'yusuf@example.test', '', now(), now(), now(), '{}', '{}');
UPDATE public.participants SET user_id = (SELECT id FROM auth.users WHERE email = 'yusuf@example.test') WHERE email = 'yusuf@example.test';

CREATE TEMP TABLE t AS SELECT
  (SELECT id FROM public.modules WHERE slug = 'demokratie') AS demo,
  (SELECT id FROM public.modules WHERE slug = 'probe-einlass') AS probe,
  (SELECT d.id FROM public.module_days d JOIN public.modules m ON m.id = d.module_id WHERE m.slug = 'probe-einlass') AS probe_tag,
  (SELECT id FROM public.participants WHERE email = 'amina@example.test') AS amina_id,
  (SELECT checkin_token FROM public.participants WHERE email = 'amina@example.test') AS amina_qr,
  (SELECT link_token FROM public.participants WHERE email = 'amina@example.test') AS amina_link,
  (SELECT link_token FROM public.participants WHERE email = 'leila@example.test') AS leila_link;
GRANT SELECT ON t TO authenticated, service_role;

-- 1) Jede Person hat einen eigenen Link-Token, verschieden vom QR-Token
SELECT pg_temp.ok('Link-Token für alle gesetzt und eindeutig',
  (SELECT (count(*) = count(DISTINCT link_token) AND bool_and(link_token <> checkin_token))::text FROM public.participants), 'true');

-- 2) Mit dem QR-Inhalt kann niemand mehr abmelden
SELECT pg_temp.server();
SELECT pg_temp.ok('QR-Token meldet nicht ab', (public.withdraw_by_token((SELECT amina_qr FROM t), (SELECT demo FROM t), 'fremd'))->>'result', 'not_found');
SELECT pg_temp.ok('Anmeldung bleibt bestätigt',
  (SELECT status::text FROM public.registrations WHERE module_id = (SELECT demo FROM t) AND participant_id = (SELECT amina_id FROM t)), 'confirmed');

-- 3) Mit dem Mail-Link geht es, mit Protokoll des vorherigen Status
SELECT pg_temp.ok('Mail-Link meldet ab (Jahrgang: entschuldigt)', (public.withdraw_by_token((SELECT amina_link FROM t), (SELECT demo FROM t), 'Krank'))->>'status', 'excused');
SELECT pg_temp.ok('Protokoll mit vorherigem Status und Weg',
  (SELECT metadata->>'previous_status' || '/' || (metadata->>'via') FROM public.audit_log WHERE action = 'registration_withdrawn' ORDER BY id DESC LIMIT 1), 'confirmed/link');
SELECT pg_temp.ok('Zweites Abmelden: nicht angemeldet', (public.withdraw_by_token((SELECT amina_link FROM t), (SELECT demo FROM t)))->>'result', 'not_registered');

-- 4) Zurücknehmen über den Mail-Link
SELECT pg_temp.ok('QR-Token nimmt nicht zurück', (public.rejoin_by_token((SELECT amina_qr FROM t), (SELECT demo FROM t)))->>'result', 'not_found');
SELECT pg_temp.ok('Fremder Link nimmt nicht zurück (Leila war nicht abgemeldet)', (public.rejoin_by_token((SELECT leila_link FROM t), (SELECT demo FROM t)))->>'result', 'not_withdrawn');
SELECT pg_temp.ok('Doch teilnehmen', (public.rejoin_by_token((SELECT amina_link FROM t), (SELECT demo FROM t)))->>'status', 'confirmed');
SELECT pg_temp.ok('Wieder bestätigt, Grund gelöscht',
  (SELECT status::text || '/' || coalesce(excuse_note, '-') FROM public.registrations WHERE module_id = (SELECT demo FROM t) AND participant_id = (SELECT amina_id FROM t)), 'confirmed/-');
SELECT pg_temp.ok('Zweimal zurücknehmen geht nicht', (public.rejoin_by_token((SELECT amina_link FROM t), (SELECT demo FROM t)))->>'result', 'not_withdrawn');

-- 5) Vom Team gesetzter Status lässt sich nicht selbst zurücknehmen
RESET ROLE;
UPDATE public.registrations SET status = 'excused', status_changed_at = now() + interval '1 minute'
 WHERE module_id = (SELECT demo FROM t) AND participant_id = (SELECT id FROM public.participants WHERE email = 'leila@example.test');
SELECT pg_temp.server();
SELECT pg_temp.ok('Team-Entscheidung bleibt', (public.rejoin_by_token((SELECT leila_link FROM t), (SELECT demo FROM t)))->>'result', 'not_possible');

-- 6) Begonnenes Modul: weder abmelden noch zurücknehmen
SELECT pg_temp.ok('Probe-Modul läuft schon', (public.withdraw_by_token((SELECT amina_link FROM t), (SELECT probe FROM t)))->>'result', 'too_late');

-- 7) Angemeldet in „Mein Bereich“: nur die eigene Anmeldung
SELECT pg_temp.login('yusuf@example.test');
SELECT pg_temp.ok('Yusuf meldet sich selbst ab', (public.withdraw_mine((SELECT demo FROM t), 'Prüfung'))->>'result', 'withdrawn');
SELECT pg_temp.ok('Yusuf nimmt zurück', (public.rejoin_mine((SELECT demo FROM t)))->>'result', 'rejoined');
SELECT pg_temp.verboten('Teilnehmende rufen den Kern nicht direkt auf',
  $q$SELECT public.withdraw_registration((SELECT amina_id FROM t), (SELECT demo FROM t), NULL, 'x')$q$);
SELECT pg_temp.verboten('Teilnehmende rufen den Token-Weg nicht auf',
  $q$SELECT public.rejoin_by_token((SELECT amina_link FROM t), (SELECT demo FROM t))$q$);
SELECT pg_temp.login('orga@ses.test');
SELECT pg_temp.ok('Teamkonto ohne Teilnehmerprofil', (public.withdraw_mine((SELECT demo FROM t)))->>'result', 'not_found');

-- 8) Platz inzwischen vergeben: zurück auf die Warteliste (Gäste)
RESET ROLE;
-- Probe-Modul genau voll: Jahrgang (3) und Gast 1 bestätigt, Gast 2 wartet
UPDATE public.modules SET capacity = (SELECT count(*) FROM public.registrations WHERE module_id = (SELECT probe FROM t) AND status = 'confirmed') WHERE id = (SELECT probe FROM t);
UPDATE public.module_days SET starts_at = now() + interval '2 days', ends_at = now() + interval '2 days 5 hours' WHERE id = (SELECT probe_tag FROM t);
CREATE TEMP TABLE g AS SELECT link_token AS gast1 FROM public.participants WHERE email = 'gast1@example.test';
GRANT SELECT ON g TO service_role;
SELECT pg_temp.server();
SELECT pg_temp.ok('Gast meldet sich ab (Warteliste rückt nach)',
  ((public.withdraw_by_token((SELECT gast1 FROM g), (SELECT probe FROM t)))->>'promoted_registration_id' IS NOT NULL)::text, 'true');
SELECT pg_temp.ok('Platz weg: Gast kommt auf die Warteliste', (public.rejoin_by_token((SELECT gast1 FROM g), (SELECT probe FROM t)))->>'status', 'waitlist');

-- 8b) Kapazität: Abmelden und Zurücknehmen nutzen dieselbe Regel (alle Bestätigten zählen), nichts läuft über
RESET ROLE;
UPDATE public.registrations SET status = 'confirmed', status_changed_at = now() - interval '1 hour'
 WHERE module_id = (SELECT demo FROM t);                                          -- Amina, Yusuf, Leila (Jahrgang)
UPDATE public.modules SET capacity = 2 WHERE id = (SELECT demo FROM t);           -- Jahrgang überbelegt: 3 von 2
INSERT INTO public.registrations (module_id, participant_id, status, source)
SELECT (SELECT demo FROM t), id, 'waitlist', 'public' FROM public.participants WHERE email = 'gast2@example.test';
CREATE FUNCTION pg_temp.bestaetigt() RETURNS text LANGUAGE sql AS $$
  SELECT count(*)::text FROM public.registrations WHERE module_id = (SELECT id FROM public.modules WHERE slug = 'demokratie') AND status = 'confirmed'
$$;
CREATE FUNCTION pg_temp.gast_status() RETURNS text LANGUAGE sql AS $$
  SELECT r.status::text FROM public.registrations r JOIN public.participants p ON p.id = r.participant_id
   WHERE r.module_id = (SELECT id FROM public.modules WHERE slug = 'demokratie') AND p.email = 'gast2@example.test'
$$;
SELECT pg_temp.server();
SELECT pg_temp.ok('Überbelegt: Jahrgang meldet ab, niemand rückt nach',
  coalesce((public.withdraw_by_token((SELECT amina_link FROM t), (SELECT demo FROM t)))->>'promoted_registration_id', 'keiner'), 'keiner');
SELECT pg_temp.ok('Gast wartet weiter', pg_temp.gast_status(), 'waitlist');
SELECT pg_temp.ok('Zurücknehmen bei vollem Modul: Warteliste statt Überbelegung',
  (public.rejoin_by_token((SELECT amina_link FROM t), (SELECT demo FROM t)))->>'status', 'waitlist');
SELECT pg_temp.ok('Bestätigt bleibt bei 2 von 2', pg_temp.bestaetigt(), '2');
-- genau voll: Abmelden macht einen Platz frei, der Gast rückt nach; Zurücknehmen danach nur auf die Warteliste
RESET ROLE;
UPDATE public.modules SET capacity = 2 WHERE id = (SELECT demo FROM t);
SELECT pg_temp.server();
SELECT pg_temp.ok('Genau voll: Abmelden lässt jemanden von der Warteliste nachrücken',
  ((public.withdraw_by_token((SELECT leila_link FROM t), (SELECT demo FROM t)))->>'promoted_registration_id' IS NOT NULL)::text, 'true');
SELECT pg_temp.ok('Wieder 2 von 2 bestätigt', pg_temp.bestaetigt(), '2');
SELECT pg_temp.ok('Leila nimmt zurück: Warteliste', (public.rejoin_by_token((SELECT leila_link FROM t), (SELECT demo FROM t)))->>'status', 'waitlist');
SELECT pg_temp.ok('Weiter höchstens 2 von 2 bestätigt', pg_temp.bestaetigt(), '2');
-- mehrfach ab und wieder an: es rückt niemand doppelt nach, nichts läuft über
SELECT pg_temp.ok('Leila meldet sich (von der Warteliste) ab', (public.withdraw_by_token((SELECT leila_link FROM t), (SELECT demo FROM t)))->>'result', 'withdrawn');
SELECT pg_temp.ok('und wieder an', (public.rejoin_by_token((SELECT leila_link FROM t), (SELECT demo FROM t)))->>'status', 'waitlist');
SELECT pg_temp.ok('Nach mehrfachem Ab- und Anmelden: 2 von 2', pg_temp.bestaetigt(), '2');

-- 9) Einlass per QR-Code funktioniert weiter mit dem alten QR-Inhalt
RESET ROLE;
UPDATE public.module_days SET starts_at = now() - interval '1 hour', ends_at = now() + interval '5 hours' WHERE id = (SELECT probe_tag FROM t);
SELECT pg_temp.login('helfer@ses.test');
SELECT pg_temp.ok('Bisheriger QR checkt ein', (public.check_in_by_code((SELECT probe_tag FROM t), 'ses:checkin:' || (SELECT amina_qr FROM t), 'qr'))->>'result', 'checked_in');
SELECT pg_temp.ok('Link-Token ist kein Einlass-Code', (public.check_in_by_code((SELECT probe_tag FROM t), (SELECT amina_link FROM t)::text, 'qr'))->>'result', 'not_found');

ROLLBACK;

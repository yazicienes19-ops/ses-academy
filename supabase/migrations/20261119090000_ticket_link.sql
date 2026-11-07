-- Ticket-Link getrennt vom Einlass-QR (Gesamttest 02.11.2026).
--
-- Bisher steckte im QR-Code derselbe geheime Token (checkin_token), der auch die Ticket-Seite mit „Ich kann nicht
-- teilnehmen“ und die Feedback-Umfrage öffnet. Wer ein Foto vom QR hatte, konnte die Person von Modulen abmelden.
-- Jetzt:
--   checkin_token  bleibt der Inhalt des QR-Codes (Einlass, auch offline, und alle schon verschickten Tickets).
--   link_token     neu, nur in Mails: Ticket-Seite mit Abmelden und „Doch teilnehmen“, Feedback-Umfrage.
-- Abmelden geht nur noch mit dem link_token oder angemeldet in „Mein Bereich“. Die Ticket-Seite zeigt sich weiter
-- auch unter dem alten Link (checkin_token), dort aber ohne Abmelden.
-- Wer sich abgemeldet hat, kann das bis zum Modulbeginn selbst zurücknehmen.

ALTER TABLE public.participants ADD COLUMN link_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.participants ADD CONSTRAINT participants_link_token_key UNIQUE (link_token);
COMMENT ON COLUMN public.participants.link_token IS
  'Geheimer Token für Links in Mails (Ticket-Seite mit Abmelden, Feedback). Nie im QR-Code; der QR enthält checkin_token.';

-- ---------------------------------------------------------------------------
-- Abmelden und Zurücknehmen: ein gemeinsamer Kern, aufgerufen über den Mail-Link oder aus „Mein Bereich“
-- ---------------------------------------------------------------------------
-- Ist ein Platz frei? Dieselbe Regel wie bei der öffentlichen Anmeldung (register_public): alle bestätigten
-- Anmeldungen zählen gegen modules.capacity, leer = unbegrenzt. Nachrücken beim Abmelden und Zurücknehmen nutzen
-- genau diese Regel, damit die Plätze nie überlaufen (auch nicht durch wiederholtes Ab- und Anmelden).
CREATE FUNCTION public.module_has_free_seat(p_module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.capacity IS NULL
      OR (SELECT count(*) FROM public.registrations r WHERE r.module_id = m.id AND r.status = 'confirmed') < m.capacity
    FROM public.modules m WHERE m.id = p_module_id
$$;

CREATE FUNCTION public.withdraw_registration(p_participant_id uuid, p_module_id uuid, p_excuse_note text, p_via text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  reg public.registrations%ROWTYPE;
  first_start timestamptz;
  new_status public.registration_status;
  promoted uuid;
BEGIN
  PERFORM 1 FROM public.modules WHERE id = p_module_id FOR NO KEY UPDATE;
  SELECT * INTO reg FROM public.registrations WHERE module_id = p_module_id AND participant_id = p_participant_id FOR UPDATE;
  IF NOT FOUND OR reg.status NOT IN ('confirmed', 'pending', 'waitlist') THEN
    RETURN jsonb_build_object('result', 'not_registered');
  END IF;
  SELECT min(starts_at) INTO first_start FROM public.module_days WHERE module_id = p_module_id;
  IF first_start <= now() THEN RETURN jsonb_build_object('result', 'too_late'); END IF;

  -- Jahrgang entschuldigt sich (zählt neutral), Gäste melden sich ab
  new_status := CASE WHEN reg.source = 'cohort' THEN 'excused' ELSE 'cancelled' END;
  UPDATE public.registrations SET status = new_status, excuse_note = nullif(trim(p_excuse_note), ''),
         status_changed_at = now() WHERE id = reg.id;

  -- Nachrücken nur, wenn dadurch wirklich ein Platz frei geworden ist
  IF reg.status = 'confirmed' AND public.module_has_free_seat(p_module_id) THEN
    UPDATE public.registrations SET status = 'confirmed', status_changed_at = now()
     WHERE id = (SELECT id FROM public.registrations WHERE module_id = p_module_id AND status = 'waitlist'
                 ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id INTO promoted;
  END IF;

  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_participant_id, 'registration_withdrawn', 'registration', reg.id,
          jsonb_build_object('status', new_status, 'previous_status', reg.status, 'via', p_via, 'promoted_registration_id', promoted));
  RETURN jsonb_build_object('result', 'withdrawn', 'status', new_status, 'promoted_registration_id', promoted);
END $$;

-- Abmeldung selbst zurücknehmen: nur, wenn die letzte Änderung die eigene Abmeldung war (nicht, wenn das Team den
-- Status gesetzt hat), das Modul noch nicht begonnen hat und nicht abgesagt ist. Wer bestätigt war, bekommt den Platz
-- zurück, solange noch einer frei ist (module_has_free_seat, für Jahrgang und Gäste gleich); sonst, und wer vorher
-- wartete, die Warteliste.
CREATE FUNCTION public.rejoin_registration(p_participant_id uuid, p_module_id uuid, p_via text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  m public.modules%ROWTYPE;
  reg public.registrations%ROWTYPE;
  first_start timestamptz;
  letzte public.audit_log%ROWTYPE;
  vorher text;
  new_status public.registration_status;
BEGIN
  SELECT * INTO m FROM public.modules WHERE id = p_module_id FOR NO KEY UPDATE;
  IF NOT FOUND OR m.status <> 'published' OR m.cancelled_at IS NOT NULL THEN RETURN jsonb_build_object('result', 'not_possible'); END IF;
  SELECT * INTO reg FROM public.registrations WHERE module_id = p_module_id AND participant_id = p_participant_id FOR UPDATE;
  IF NOT FOUND OR reg.status NOT IN ('excused', 'cancelled') THEN RETURN jsonb_build_object('result', 'not_withdrawn'); END IF;
  SELECT min(starts_at) INTO first_start FROM public.module_days WHERE module_id = p_module_id;
  IF first_start IS NULL OR first_start <= now() THEN RETURN jsonb_build_object('result', 'too_late'); END IF;

  SELECT * INTO letzte FROM public.audit_log
   WHERE entity_type = 'registration' AND entity_id = reg.id ORDER BY created_at DESC, id DESC LIMIT 1;
  IF NOT FOUND OR letzte.action <> 'registration_withdrawn' OR letzte.created_at < reg.status_changed_at - interval '1 second' THEN
    RETURN jsonb_build_object('result', 'not_possible');
  END IF;

  vorher := coalesce(letzte.metadata ->> 'previous_status', 'confirmed');
  new_status := CASE
    WHEN vorher IN ('waitlist', 'pending') THEN vorher::public.registration_status
    WHEN public.module_has_free_seat(p_module_id) THEN 'confirmed'
    ELSE 'waitlist' END;
  UPDATE public.registrations SET status = new_status, excuse_note = NULL, status_changed_at = now() WHERE id = reg.id;

  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_participant_id, 'registration_rejoined', 'registration', reg.id,
          jsonb_build_object('status', new_status, 'via', p_via));
  RETURN jsonb_build_object('result', 'rejoined', 'status', new_status);
END $$;

-- Über den Link aus der Mail (serverseitig mit service_role). Der QR-Inhalt (checkin_token) reicht nicht mehr.
CREATE OR REPLACE FUNCTION public.withdraw_by_token(p_token uuid, p_module_id uuid, p_excuse_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pid uuid;
BEGIN
  SELECT id INTO pid FROM public.participants WHERE link_token = p_token;
  IF pid IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  RETURN public.withdraw_registration(pid, p_module_id, p_excuse_note, 'link');
END $$;

CREATE FUNCTION public.rejoin_by_token(p_token uuid, p_module_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pid uuid;
BEGIN
  SELECT id INTO pid FROM public.participants WHERE link_token = p_token;
  IF pid IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  RETURN public.rejoin_registration(pid, p_module_id, 'link');
END $$;

-- Angemeldet in „Mein Bereich“: nur die eigene Anmeldung
CREATE FUNCTION public.withdraw_mine(p_module_id uuid, p_excuse_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pid uuid := public.my_participant_id();
BEGIN
  IF pid IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  RETURN public.withdraw_registration(pid, p_module_id, p_excuse_note, 'mein_bereich');
END $$;

CREATE FUNCTION public.rejoin_mine(p_module_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pid uuid := public.my_participant_id();
BEGIN
  IF pid IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  RETURN public.rejoin_registration(pid, p_module_id, 'mein_bereich');
END $$;

-- Feedback über den Mail-Link statt über den QR-Inhalt (Einladungen gingen bisher noch keine im Betrieb raus:
-- Umfragen öffnen frühestens am letzten Modultag)
CREATE OR REPLACE FUNCTION public.submit_feedback(p_token uuid, p_survey_id uuid, p_answers jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  pid uuid;
  s public.feedback_surveys%ROWTYPE;
  sauber jsonb := '{}';
  q record;
  wert jsonb;
BEGIN
  SELECT id INTO pid FROM public.participants WHERE link_token = p_token;
  IF pid IS NULL THEN RETURN 'not_found'; END IF;
  SELECT * INTO s FROM public.feedback_surveys WHERE id = p_survey_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF now() < s.opens_at OR now() > s.closes_at THEN RETURN 'closed'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.attendances a
      JOIN public.registrations r ON r.id = a.registration_id
     WHERE r.participant_id = pid AND r.module_id = s.module_id) THEN
    RETURN 'not_attended';
  END IF;
  -- nur bekannte Fragen, Skala 1–5, Text höchstens 2000 Zeichen
  FOR q IN SELECT id, kind FROM public.feedback_questions WHERE survey_id = s.id LOOP
    wert := p_answers -> q.id::text;
    IF wert IS NULL OR wert = 'null'::jsonb THEN CONTINUE; END IF;
    IF q.kind = 'skala' AND jsonb_typeof(wert) = 'number' AND (wert #>> '{}')::numeric IN (1, 2, 3, 4, 5) THEN
      sauber := sauber || jsonb_build_object(q.id::text, (wert #>> '{}')::int);
    ELSIF q.kind = 'text' AND jsonb_typeof(wert) = 'string' AND length(trim(wert #>> '{}')) > 0 THEN
      sauber := sauber || jsonb_build_object(q.id::text, left(trim(wert #>> '{}'), 2000));
    END IF;
  END LOOP;
  INSERT INTO public.feedback_responses (survey_id, participant_id, answers) VALUES (s.id, pid, sauber)
  ON CONFLICT (survey_id, participant_id) DO UPDATE SET answers = excluded.answers, submitted_at = now();
  RETURN 'saved';
END $$;

REVOKE ALL ON FUNCTION public.withdraw_registration(uuid, uuid, text, text), public.rejoin_registration(uuid, uuid, text),
  public.module_has_free_seat(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rejoin_by_token(uuid, uuid), public.withdraw_mine(uuid, text), public.rejoin_mine(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rejoin_by_token(uuid, uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.rejoin_by_token(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_mine(uuid, text), public.rejoin_mine(uuid) TO authenticated;

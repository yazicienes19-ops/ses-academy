-- Feedback-Umfrage (Gesamttest 02.11.2026): Ein leeres Formular zählte als Antwort. Jetzt braucht es mindestens
-- eine gültige Antwort (Skala 1–5 oder Text), sonst 'empty' und nichts wird gespeichert. Eine bestehende Antwort
-- bleibt dabei unverändert.

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
  -- Ein leeres Formular ist keine Antwort (zählte sonst in der Auswertung mit)
  IF sauber = '{}'::jsonb THEN RETURN 'empty'; END IF;
  INSERT INTO public.feedback_responses (survey_id, participant_id, answers) VALUES (s.id, pid, sauber)
  ON CONFLICT (survey_id, participant_id) DO UPDATE SET answers = excluded.answers, submitted_at = now();
  RETURN 'saved';
END $$;

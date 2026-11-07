-- Löschung vollständig (Sicherheitsprüfung 07.11.2026): Nach dem Ausführen standen Name, E-Mail und Grund der
-- gelöschten Person weiter in der Freigabe (summary/payload) und im Löschantrag (reason). execute_deletion entfernt
-- sie jetzt im selben Schritt. Sonst unverändert gegenüber 20261129090000_loeschung_vier_augen.sql.

CREATE OR REPLACE FUNCTION public.execute_deletion(p_approval_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  f public.approvals%ROWTYPE;
  d public.deletion_requests%ROWTYPE;
  p public.participants%ROWTYPE;
  zahlen jsonb;
  konto_geloescht boolean := false;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required'; END IF;
  SELECT * INTO f FROM public.approvals WHERE id = p_approval_id AND action = 'person_loeschen' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF f.requested_by <> auth.uid() THEN RETURN jsonb_build_object('result', 'not_requester'); END IF;
  IF f.status <> 'freigegeben' THEN RETURN jsonb_build_object('result', f.status); END IF;
  IF f.decided_by IS NULL OR f.decided_by = f.requested_by THEN RETURN jsonb_build_object('result', 'own_request'); END IF;
  IF f.decided_at < now() - interval '24 hours' THEN RETURN jsonb_build_object('result', 'expired'); END IF;
  SELECT * INTO d FROM public.deletion_requests WHERE id = (f.payload ->> 'antrag')::uuid FOR UPDATE;
  IF NOT FOUND OR d.participant_id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF d.status <> 'offen' THEN RETURN jsonb_build_object('result', d.status); END IF;
  SELECT * INTO p FROM public.participants WHERE id = d.participant_id FOR UPDATE;
  zahlen := public.deletion_counts(p.id);

  -- löschen
  DELETE FROM public.contact_log WHERE participant_id = p.id;
  DELETE FROM public.participant_notes WHERE participant_id = p.id;
  DELETE FROM public.stay_requests s USING public.registrations r WHERE r.id = s.registration_id AND r.participant_id = p.id;
  DELETE FROM public.room_assignments WHERE participant_id = p.id;
  DELETE FROM public.room_wish_overrides WHERE participant_id = p.id OR wished_id = p.id;
  DELETE FROM public.contributions WHERE participant_id = p.id;
  DELETE FROM public.engagements WHERE participant_id = p.id;
  DELETE FROM public.applications a WHERE a.participant_id = p.id OR (p.email IS NOT NULL AND a.email = p.email);
  UPDATE public.email_log SET recipient = 'gelöscht', error = NULL WHERE participant_id = p.id;

  -- anonymisieren: Anwesenheiten, Hausaufgaben, Feedback, Gruppen und Mitgliedschaften bleiben für die Auswertung
  -- Name in der Beschriftung der Abgaben ersetzen (bei Gruppenabgaben nur diesen Namen)
  UPDATE public.submissions s SET label = replace(s.label, public.display_name(p), 'Gelöschte Person')
    FROM public.submission_participants sp WHERE sp.submission_id = s.id AND sp.participant_id = p.id;
  UPDATE public.participants SET
    first_name = 'Gelöschte', last_name = 'Person (' || upper(left(p.id::text, 4)) || ')',
    email = NULL, phone = NULL, gender = NULL, photo_path = NULL, photo_consent_at = NULL, share_contact = false,
    directory_opt_out = true, active = false, user_id = NULL,
    checkin_token = gen_random_uuid(), link_token = gen_random_uuid()   -- alte Tickets und Links gelten nicht mehr
   WHERE id = p.id;

  -- Login-Konto löschen (nicht, wenn es zugleich ein Team-Konto ist; das entfernt ein Admin unter „Team“)
  IF p.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.staff_members WHERE user_id = p.user_id) THEN
    UPDATE public.audit_log SET actor_id = NULL WHERE actor_id = p.user_id;
    UPDATE public.email_log SET triggered_by = NULL WHERE triggered_by = p.user_id;
    DELETE FROM auth.users WHERE id = p.user_id;
    konto_geloescht := true;
  END IF;

  UPDATE public.deletion_requests SET status = 'erledigt', decided_by = auth.uid(), decided_at = now(),
         decision_note = nullif(left(trim(p_note), 1000), ''), result = zahlen || jsonb_build_object('konto_geloescht', konto_geloescht)
   WHERE id = d.id;
  UPDATE public.approvals SET status = 'ausgefuehrt', executed_at = now(),
         result = jsonb_build_object('konto_geloescht', konto_geloescht) WHERE id = f.id;
  -- Name, E-Mail und Grund auch aus dem Löschantrag und allen Freigaben zu diesem Antrag entfernen
  -- (abgelehnte und abgelaufene eingeschlossen); übrig bleiben nur Kennung und Zahlen.
  UPDATE public.approvals
     SET summary = 'Person löschen: Gelöschte Person (' || upper(left(p.id::text, 4)) || ')',
         payload = jsonb_build_object('antrag', d.id, 'zahlen', zahlen),
         decision_note = NULL
   WHERE action = 'person_loeschen' AND payload ->> 'antrag' = d.id::text;
  UPDATE public.deletion_requests SET reason = '' WHERE id = d.id;
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'approval_executed', 'approval', f.id, jsonb_build_object('action', f.action));
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p.id, 'participant_anonymized', 'deletion_request', d.id, zahlen || jsonb_build_object('freigabe', f.id, 'freigegeben_von', f.decided_by));
  RETURN jsonb_build_object('result', 'ok', 'photo_path', p.photo_path, 'konto_geloescht', konto_geloescht);
END $$;

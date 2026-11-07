-- Datenschutz (Wünsche aus dem Gesamttest 02.11.2026): aus dem Mitgliederverzeichnis austragen, Konto löschen als
-- Löschantrag, den ein Admin im Team-Bereich bearbeitet.
--
--   participants.directory_opt_out   = nicht im Mitgliederverzeichnis zeigen (neue Spalte, für alle bestehenden false)
--   set_my_directory_opt_out(bool)    = selbst in „Mein Bereich“ austragen bzw. wieder eintragen
--   deletion_requests                 = Löschanträge; je Person höchstens einer offen
--   request_my_deletion / withdraw_my_deletion   = in „Mein Bereich“ stellen bzw. zurückziehen
--   deletion_preview(antrag)          = was gelöscht, was anonymisiert wird (Zahlen), nur Admin
--   execute_deletion / reject_deletion = Admin bestätigt bzw. lehnt ab
--
-- Keine sofortige Selbstlöschung: Anwesenheiten und Hausaufgaben gehören zur Auswertung. Sie bleiben, aber ohne Namen
-- und Kontaktdaten („Gelöschte Person“). Gelöscht werden Kontaktdaten, Login-Konto, Foto, Notizen und Anrufe, Angaben
-- zur Übernachtung (auch Gesundheitshinweise), Zimmer, Beiträge, Engagements und die Bewerbung.
-- Bestehende Daten: nur die neue Spalte (Standard false) und die neue Tabelle; nichts wird verändert.

ALTER TABLE public.participants ADD COLUMN directory_opt_out boolean NOT NULL DEFAULT false;

-- Verzeichnis: Ausgetragene erscheinen für niemanden (auch nicht für das Team; das Team hat die Teilnehmendenliste)
CREATE OR REPLACE FUNCTION public.get_member_directory()
RETURNS TABLE (participant_id uuid, name text, region text, branch text, badges text[], has_photo boolean,
               email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), r.name, p.branch,
         array_agg(public.membership_badge(m) ORDER BY m.valid_from DESC),
         p.photo_path IS NOT NULL,
         CASE WHEN p.share_contact OR public.has_full_access() THEN p.email END,
         CASE WHEN p.share_contact OR public.has_full_access() THEN p.phone END
    FROM public.participants p
    JOIN public.memberships m ON m.participant_id = p.id
     AND (m.valid_until IS NULL OR m.valid_until >= (now() AT TIME ZONE 'Europe/Berlin')::date)
    LEFT JOIN public.regions r ON r.id = p.region_id
   WHERE p.active AND NOT p.directory_opt_out
     AND (public.my_participant_id() IS NOT NULL OR public.has_orga_access())   -- Einlass-Helfer sehen nur den Einlass
   GROUP BY p.id, r.name
   ORDER BY p.last_name, p.first_name
$$;

CREATE FUNCTION public.set_my_directory_opt_out(p_opt_out boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pid uuid := public.my_participant_id();
BEGIN
  IF pid IS NULL THEN RETURN 'no_participant'; END IF;
  UPDATE public.participants SET directory_opt_out = coalesce(p_opt_out, false) WHERE id = pid;
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), pid, 'directory_opt_out', 'participant', pid, jsonb_build_object('opt_out', coalesce(p_opt_out, false)));
  RETURN 'saved';
END $$;

-- ---------------------------------------------------------------------------
-- Löschanträge
-- ---------------------------------------------------------------------------
CREATE TABLE public.deletion_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  reason         text NOT NULL DEFAULT '' CHECK (length(reason) <= 1000),
  status         text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt', 'abgelehnt', 'zurueckgezogen')),
  requested_at   timestamptz NOT NULL DEFAULT now(),
  decided_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at     timestamptz,
  decision_note  text CHECK (decision_note IS NULL OR length(decision_note) <= 1000),
  result         jsonb          -- was gelöscht bzw. anonymisiert wurde (nur Zahlen)
);
CREATE UNIQUE INDEX deletion_requests_offen ON public.deletion_requests (participant_id) WHERE status = 'offen';

-- Nur Admins (ohne Modulbegrenzung) bearbeiten Löschanträge
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT public.has_full_access() AND public.current_staff_role() = 'admin'
$$;

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY deletion_requests_admin ON public.deletion_requests FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY deletion_requests_self  ON public.deletion_requests FOR SELECT TO authenticated USING (participant_id = public.my_participant_id());
-- Anlegen und Ändern nur über die Funktionen unten
REVOKE ALL ON public.deletion_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.deletion_requests FROM authenticated;

CREATE FUNCTION public.request_my_deletion(p_reason text DEFAULT '')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pid uuid := public.my_participant_id(); aid uuid;
BEGIN
  IF pid IS NULL THEN RETURN 'no_participant'; END IF;
  IF EXISTS (SELECT 1 FROM public.deletion_requests WHERE participant_id = pid AND status = 'offen') THEN RETURN 'already_open'; END IF;
  INSERT INTO public.deletion_requests (participant_id, reason) VALUES (pid, left(coalesce(trim(p_reason), ''), 1000)) RETURNING id INTO aid;
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id)
  VALUES (auth.uid(), pid, 'deletion_requested', 'deletion_request', aid);
  RETURN 'requested';
END $$;

CREATE FUNCTION public.withdraw_my_deletion()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pid uuid := public.my_participant_id(); aid uuid;
BEGIN
  IF pid IS NULL THEN RETURN 'no_participant'; END IF;
  UPDATE public.deletion_requests SET status = 'zurueckgezogen', decided_at = now()
   WHERE participant_id = pid AND status = 'offen' RETURNING id INTO aid;
  IF aid IS NULL THEN RETURN 'not_found'; END IF;
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id)
  VALUES (auth.uid(), pid, 'deletion_withdrawn', 'deletion_request', aid);
  RETURN 'withdrawn';
END $$;

-- Was beim Bestätigen passiert, in Zahlen (für die Anzeige im Team-Bereich und das Ergebnis im Antrag).
-- Interne Hilfsfunktion: nur für Admins (eigene Prüfung) und für niemanden direkt aufrufbar (siehe REVOKE unten);
-- aufgerufen wird sie aus deletion_preview und execute_deletion.
CREATE FUNCTION public.deletion_counts(pid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required'; END IF;
  RETURN jsonb_build_object(
    -- wird gelöscht
    'konto',          (SELECT p.user_id IS NOT NULL FROM public.participants p WHERE p.id = pid),
    'team_konto',     (SELECT EXISTS (SELECT 1 FROM public.staff_members s JOIN public.participants p ON p.user_id = s.user_id WHERE p.id = pid)),
    'foto',           (SELECT p.photo_path IS NOT NULL FROM public.participants p WHERE p.id = pid),
    'kontakte',       (SELECT count(*) FROM public.contact_log WHERE participant_id = pid),
    'notizen',        (SELECT count(*) FROM public.participant_notes WHERE participant_id = pid),
    'uebernachtung',  (SELECT count(*) FROM public.stay_requests s JOIN public.registrations r ON r.id = s.registration_id WHERE r.participant_id = pid),
    'zimmer',         (SELECT count(*) FROM public.room_assignments WHERE participant_id = pid),
    'zimmerwuensche', (SELECT count(*) FROM public.room_wish_overrides WHERE participant_id = pid OR wished_id = pid),
    'beitraege',      (SELECT count(*) FROM public.contributions WHERE participant_id = pid),
    'engagements',    (SELECT count(*) FROM public.engagements WHERE participant_id = pid),
    'bewerbungen',    (SELECT count(*) FROM public.applications a WHERE a.participant_id = pid
                         OR a.email = (SELECT p.email FROM public.participants p WHERE p.id = pid)),
    'mails',          (SELECT count(*) FROM public.email_log WHERE participant_id = pid),
    -- bleibt ohne Namen für die Auswertung
    'anmeldungen',    (SELECT count(*) FROM public.registrations WHERE participant_id = pid),
    'anwesenheiten',  (SELECT count(*) FROM public.attendances a JOIN public.registrations r ON r.id = a.registration_id WHERE r.participant_id = pid),
    'abgaben',        (SELECT count(*) FROM public.submission_participants WHERE participant_id = pid),
    'entschuldigungen', (SELECT count(*) FROM public.assignment_excusals WHERE participant_id = pid),
    'feedback',       (SELECT count(*) FROM public.feedback_responses WHERE participant_id = pid),
    'gruppen',        (SELECT count(*) FROM public.group_members WHERE participant_id = pid),
    'mitgliedschaften', (SELECT count(*) FROM public.memberships WHERE participant_id = pid));
END $$;

CREATE FUNCTION public.deletion_preview(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE d public.deletion_requests%ROWTYPE; p public.participants%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required'; END IF;
  SELECT * INTO d FROM public.deletion_requests WHERE id = p_request_id;
  IF NOT FOUND OR d.participant_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.participants WHERE id = d.participant_id;
  RETURN jsonb_build_object('name', public.display_name(p), 'email', p.email, 'zahlen', public.deletion_counts(p.id));
END $$;

-- Bestätigen: löschen und anonymisieren in einem Schritt. Liefert den Pfad des Fotos (die Datei entfernt der Server).
CREATE FUNCTION public.execute_deletion(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  d public.deletion_requests%ROWTYPE;
  p public.participants%ROWTYPE;
  zahlen jsonb;
  konto_geloescht boolean := false;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required'; END IF;
  SELECT * INTO d FROM public.deletion_requests WHERE id = p_request_id FOR UPDATE;
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
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p.id, 'participant_anonymized', 'deletion_request', d.id, zahlen);
  RETURN jsonb_build_object('result', 'ok', 'photo_path', p.photo_path, 'konto_geloescht', konto_geloescht);
END $$;

CREATE FUNCTION public.reject_deletion(p_request_id uuid, p_note text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE d public.deletion_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required'; END IF;
  IF coalesce(trim(p_note), '') = '' THEN RETURN 'note_required'; END IF;
  SELECT * INTO d FROM public.deletion_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF d.status <> 'offen' THEN RETURN d.status; END IF;
  UPDATE public.deletion_requests SET status = 'abgelehnt', decided_by = auth.uid(), decided_at = now(), decision_note = left(trim(p_note), 1000)
   WHERE id = d.id;
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id)
  VALUES (auth.uid(), d.participant_id, 'deletion_rejected', 'deletion_request', d.id);
  RETURN 'rejected';
END $$;

REVOKE ALL ON FUNCTION public.set_my_directory_opt_out(boolean), public.is_admin(), public.request_my_deletion(text),
  public.withdraw_my_deletion(), public.deletion_counts(uuid), public.deletion_preview(uuid), public.execute_deletion(uuid, text),
  public.reject_deletion(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_directory_opt_out(boolean), public.is_admin(), public.request_my_deletion(text),
  public.withdraw_my_deletion(), public.deletion_preview(uuid), public.execute_deletion(uuid, text),
  public.reject_deletion(uuid, text) TO authenticated;
-- deletion_counts nur intern (über deletion_preview bzw. execute_deletion): Supabase vergibt EXECUTE auf neue
-- Funktionen standardmäßig auch an authenticated, deshalb ausdrücklich auch dort entziehen
REVOKE ALL ON FUNCTION public.deletion_counts(uuid) FROM PUBLIC, anon, authenticated;

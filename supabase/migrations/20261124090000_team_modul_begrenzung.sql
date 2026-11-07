-- Team-Zugang „auf ein Modul begrenzen“ (Gesamttest 02.11.2026): bisher begrenzte die Auswahl nur die Zeit, ein Konto
-- „Orga-Team · nur Demokratie“ sah im Zeitfenster alles wie jedes Orga-Konto (Hotels anderer Module, Dokumente,
-- Sitzungen, Teilnehmende …). Jetzt gilt die Begrenzung in der Datenbank:
--
--   staff_members.module_id   gesetzt = Zugang nur für dieses Modul (nur für Orga-Team und Einlass-Helfer)
--   has_orga_access(), has_checkin_access(), has_full_access()   ohne Argument: nur für unbegrenzte Konten.
--       Alles, was nicht ausdrücklich modulbezogen freigegeben ist, bleibt begrenzten Konten verschlossen.
--   has_orga_access(modul), has_checkin_access(modul)   unbegrenzte Konten wie bisher, begrenzte nur für ihr Modul.
--
-- Begrenzte Konten erfahren über Personen außerhalb ihres Moduls nichts: Kurzcode, Abhaken und Walk-in mit fremder
-- E-Mail liefern dann weder Namen noch ID (neutrales Ergebnis, nichts wird angelegt).
-- Begrenzte Konten bekommen damit genau die Eventtag-Werkzeuge ihres Moduls: Einlass (Scan, Kurzcode, Liste, Abhaken,
-- Walk-in, Offline-Liste) und Regieplan (Programm, Team des Tages). Bestehende Konten haben keine module_id und
-- verhalten sich wie bisher (auch bereits befristete: die Begrenzung auf ein Modul wird einmal neu gesetzt).
-- Vier-Augen-Prinzip: Begrenzen geht sofort, Aufheben oder Wechseln des Moduls ist eine Vergabe mit Freigabe.

ALTER TABLE public.staff_members ADD COLUMN module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_modul_nur_orga_helfer
  CHECK (module_id IS NULL OR role IN ('orga_team', 'checkin_helper'));
COMMENT ON COLUMN public.staff_members.module_id IS
  'Zugang nur für dieses Modul (Einlass und Regieplan). NULL = alle Module. Wird das Modul gelöscht, entfällt der Zugang.';

-- Modul des angemeldeten Teamkontos (NULL = unbegrenzt), mit denselben Bedingungen wie current_staff_role()
CREATE FUNCTION public.current_staff_module()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT module_id FROM public.staff_members
   WHERE user_id = auth.uid()
     AND (valid_from IS NULL OR valid_from <= now())
     AND (valid_until IS NULL OR valid_until > now())
     AND (NOT public.mfa_required() OR coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2')
$$;

-- Ohne Modul: nur unbegrenzte Konten (sicherer Standard für alle bestehenden Regeln und Funktionen)
CREATE OR REPLACE FUNCTION public.has_full_access()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(public.current_staff_role() IN ('admin', 'vorstand'), false) AND public.current_staff_module() IS NULL
$$;

CREATE OR REPLACE FUNCTION public.has_orga_access()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(public.current_staff_role() IN ('admin', 'vorstand', 'orga_team'), false) AND public.current_staff_module() IS NULL
$$;

CREATE OR REPLACE FUNCTION public.has_checkin_access()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT public.current_staff_role() IS NOT NULL AND public.current_staff_module() IS NULL
$$;

-- Mit Modul: unbegrenzte Konten wie bisher, begrenzte nur für ihr eigenes Modul
CREATE FUNCTION public.has_orga_access(p_module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(public.current_staff_role() IN ('admin', 'vorstand', 'orga_team'), false)
     AND (public.current_staff_module() IS NULL OR public.current_staff_module() = p_module_id)
$$;

CREATE FUNCTION public.has_checkin_access(p_module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT public.current_staff_role() IS NOT NULL
     AND (public.current_staff_module() IS NULL OR public.current_staff_module() = p_module_id)
$$;

-- ---------------------------------------------------------------------------
-- Eventtag-Werkzeuge modulbezogen: Einlass und Regieplan
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_in_by_code(
  p_module_day_id uuid, p_code text,
  p_method public.checkin_method DEFAULT 'qr',
  p_allow_off_window boolean DEFAULT false,
  p_scanned_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  d public.module_days%ROWTYPE;
  p public.participants%ROWTYPE;
  code text := public.normalize_checkin_code(p_code);
BEGIN
  IF NOT public.has_checkin_access((SELECT d0.module_id FROM public.module_days d0 WHERE d0.id = p_module_day_id)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'checkin_access_required';
  END IF;
  -- Offline-Nachträge dürfen nicht in der Zukunft liegen und nicht älter als 24 Stunden sein
  IF p_scanned_at IS NOT NULL AND (p_method <> 'offline_sync'
     OR p_scanned_at > clock_timestamp() + interval '5 minutes'
     OR p_scanned_at < clock_timestamp() - interval '24 hours') THEN
    RETURN jsonb_build_object('result', 'invalid_scan_time');
  END IF;

  SELECT * INTO d FROM public.module_days WHERE id = p_module_day_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'day_not_found'); END IF;

  IF code ~ '^[0-9A-F]{32}$' THEN
    SELECT * INTO p FROM public.participants WHERE checkin_token = code::uuid;
  ELSIF code ~ '^[0-9A-F]{8}$' THEN
    SELECT * INTO p FROM public.participants WHERE short_code = code;
  ELSE
    RETURN jsonb_build_object('result', 'invalid_code');
  END IF;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  -- Auf ein Modul begrenzte Konten erfahren über Personen außerhalb ihres Moduls nichts (kein Name, keine ID)
  IF public.current_staff_module() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.registrations r0 WHERE r0.participant_id = p.id AND r0.module_id = d.module_id) THEN
    RETURN jsonb_build_object('result', 'not_registered');
  END IF;

  RETURN public.checkin_core(d, p, p_method, p_allow_off_window, p_scanned_at);
END $$;

CREATE OR REPLACE FUNCTION public.check_in_manual(
  p_module_day_id uuid, p_participant_id uuid, p_allow_off_window boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  d public.module_days%ROWTYPE;
  p public.participants%ROWTYPE;
BEGIN
  IF NOT public.has_orga_access((SELECT d0.module_id FROM public.module_days d0 WHERE d0.id = p_module_day_id)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required';
  END IF;
  SELECT * INTO d FROM public.module_days WHERE id = p_module_day_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'day_not_found'); END IF;
  SELECT * INTO p FROM public.participants WHERE id = p_participant_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF public.current_staff_module() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.registrations r0 WHERE r0.participant_id = p.id AND r0.module_id = d.module_id) THEN
    RETURN jsonb_build_object('result', 'not_registered');
  END IF;
  RETURN public.checkin_core(d, p, 'manual', p_allow_off_window, NULL);
END $$;

CREATE OR REPLACE FUNCTION public.undo_check_in(p_attendance_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE att public.attendances%ROWTYPE; pid uuid;
BEGIN
  IF NOT public.has_orga_access((SELECT d0.module_id FROM public.attendances a0 JOIN public.module_days d0 ON d0.id = a0.module_day_id WHERE a0.id = p_attendance_id)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required';
  END IF;
  DELETE FROM public.attendances WHERE id = p_attendance_id RETURNING * INTO att;
  IF att.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  SELECT participant_id INTO pid FROM public.registrations WHERE id = att.registration_id;
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), pid, 'checkin_undone', 'attendance', att.id,
          jsonb_build_object('module_day_id', att.module_day_id, 'checked_in_at', att.checked_in_at));
  RETURN jsonb_build_object('result', 'undone');
END $$;

CREATE OR REPLACE FUNCTION public.create_walk_in(
  p_module_day_id uuid, p_first_name text, p_last_name text, p_email text DEFAULT NULL,
  p_affiliation public.affiliation_status DEFAULT 'guest', p_privacy_consent boolean DEFAULT false,
  p_allow_off_window boolean DEFAULT false, p_force_new boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  d public.module_days%ROWTYPE;
  m public.modules%ROWTYPE;
  p public.participants%ROWTYPE;
  vorhanden public.participants%ROWTYPE;
  mail text := public.normalize_email(p_email);
  pid uuid;
BEGIN
  IF NOT public.has_orga_access((SELECT d0.module_id FROM public.module_days d0 WHERE d0.id = p_module_day_id)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required';
  END IF;
  IF NOT p_privacy_consent THEN RETURN jsonb_build_object('result', 'consent_required'); END IF;
  SELECT * INTO d FROM public.module_days WHERE id = p_module_day_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'day_not_found'); END IF;
  SELECT * INTO m FROM public.modules WHERE id = d.module_id;

  -- Erst prüfen, ob der Einlass überhaupt ginge; sonst bliebe eine angemeldete Person ohne Check-in zurück
  IF m.status <> 'published' THEN RETURN jsonb_build_object('result', 'module_not_available', 'module_title', m.title); END IF;
  IF m.cancelled_at IS NOT NULL THEN RETURN jsonb_build_object('result', 'module_cancelled', 'module_title', m.title); END IF;
  IF NOT (p_allow_off_window AND public.has_full_access())
     AND clock_timestamp() NOT BETWEEN d.starts_at - interval '4 hours' AND d.ends_at + interval '6 hours' THEN
    RETURN jsonb_build_object('result', 'outside_checkin_window', 'module_title', m.title,
      'window_start', d.starts_at - interval '4 hours', 'window_end', d.ends_at + interval '6 hours');
  END IF;

  IF mail IS NOT NULL THEN
    SELECT * INTO vorhanden FROM public.participants WHERE email = mail;
    -- Auf ein Modul begrenzte Konten: die E-Mail einer Person außerhalb des Moduls nicht verraten (kein Name, keine ID)
    -- und diese Person auch nicht anmelden; es wird nichts angelegt, die E-Mail bleibt eindeutig
    IF FOUND AND public.current_staff_module() IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.registrations r0 WHERE r0.participant_id = vorhanden.id AND r0.module_id = m.id) THEN
      -- Dass die Adresse existiert, ist bewusst in Kauf genommen (geprüfte Teamkonten); jeder Treffer wird
      -- protokolliert, damit Rateversuche auffallen
      INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
      VALUES (auth.uid(), vorhanden.id, 'walk_in_email_in_use', 'module_day', d.id,
              jsonb_build_object('module_id', m.id, 'staff_module_id', public.current_staff_module()));
      RETURN jsonb_build_object('result', 'email_in_use');
    END IF;
    -- Die E-Mail gehört schon jemandem mit anderem Vornamen: nicht einfach diese Person einchecken
    IF FOUND AND public.name_key(vorhanden.first_name) <> public.name_key(p_first_name) THEN
      RETURN jsonb_build_object('result', 'email_other_person', 'participant_id', vorhanden.id,
        'display_name', public.display_name(vorhanden), 'module_title', m.title);
    END IF;
  ELSIF NOT p_force_new THEN
    SELECT p2.* INTO vorhanden FROM public.participants p2
      JOIN public.registrations r ON r.participant_id = p2.id AND r.module_id = m.id
     WHERE public.name_key(p2.first_name) = public.name_key(p_first_name)
       AND public.name_key(p2.last_name) = public.name_key(p_last_name)
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('result', 'possible_duplicate', 'participant_id', vorhanden.id,
        'display_name', public.display_name(vorhanden), 'module_title', m.title);
    END IF;
  END IF;

  pid := public.upsert_participant(p_first_name, p_last_name, mail, NULL, p_affiliation, 'de', true);
  INSERT INTO public.registrations (module_id, participant_id, status, source)
  VALUES (d.module_id, pid, 'confirmed', 'walk_in')
  ON CONFLICT (module_id, participant_id) DO UPDATE
    SET status = 'confirmed', status_changed_at = now()
    WHERE public.registrations.status IN ('cancelled', 'excused', 'waitlist', 'pending');
  SELECT * INTO p FROM public.participants WHERE id = pid;
  RETURN public.checkin_core(d, p, 'walk_in', p_allow_off_window, NULL);
END $$;

CREATE OR REPLACE FUNCTION public.get_checkin_list(p_module_day_id uuid)
RETURNS TABLE (participant_id uuid, display_name text, affiliation_status public.affiliation_status,
               short_code text, token_hash text, registration_status public.registration_status,
               attendance_id uuid, checked_in_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), p.affiliation_status, p.short_code,
         encode(extensions.digest(replace(p.checkin_token::text, '-', ''), 'sha256'), 'hex'),
         r.status, a.id, a.checked_in_at
    FROM public.module_days d
    JOIN public.registrations r ON r.module_id = d.module_id
    JOIN public.participants p ON p.id = r.participant_id
    LEFT JOIN public.attendances a ON a.registration_id = r.id AND a.module_day_id = d.id
   WHERE d.id = p_module_day_id AND public.has_checkin_access(d.module_id)
   ORDER BY p.last_name, p.first_name
$$;

CREATE OR REPLACE FUNCTION public.get_day_counts(p_module_day_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN public.has_checkin_access((SELECT d0.module_id FROM public.module_days d0 WHERE d0.id = p_module_day_id)) THEN jsonb_build_object(
    'checked_in', count(a.id),
    'expected', count(*) FILTER (WHERE r.status = 'confirmed'),
    'waitlist', count(*) FILTER (WHERE r.status = 'waitlist'),
    'excused', count(*) FILTER (WHERE r.status IN ('excused', 'cancelled')))
  END
    FROM public.module_days d
    JOIN public.registrations r ON r.module_id = d.module_id
    LEFT JOIN public.attendances a ON a.registration_id = r.id AND a.module_day_id = d.id
   WHERE d.id = p_module_day_id
$$;

-- Module, Termine, Programm und Team des Tages: begrenzte Konten nur für ihr Modul
DROP POLICY modules_public_read ON public.modules;
CREATE POLICY modules_public_read ON public.modules FOR SELECT USING (status = 'published' OR public.has_checkin_access(id));
DROP POLICY days_public_read ON public.module_days;
CREATE POLICY days_public_read ON public.module_days FOR SELECT
  USING (public.has_checkin_access(module_id) OR EXISTS (SELECT 1 FROM public.modules m WHERE m.id = module_id AND m.status = 'published'));

DROP POLICY program_items_read ON public.program_items;
DROP POLICY program_items_write ON public.program_items;
CREATE POLICY program_items_read ON public.program_items FOR SELECT TO authenticated
  USING (public.has_checkin_access((SELECT d.module_id FROM public.module_days d WHERE d.id = module_day_id)));
CREATE POLICY program_items_write ON public.program_items FOR ALL TO authenticated
  USING (public.has_orga_access((SELECT d.module_id FROM public.module_days d WHERE d.id = module_day_id)))
  WITH CHECK (public.has_orga_access((SELECT d.module_id FROM public.module_days d WHERE d.id = module_day_id)));

DROP POLICY duty_read ON public.duty_assignments;
DROP POLICY duty_write ON public.duty_assignments;
CREATE POLICY duty_read ON public.duty_assignments FOR SELECT TO authenticated
  USING (public.has_orga_access((SELECT d.module_id FROM public.module_days d WHERE d.id = module_day_id)));
CREATE POLICY duty_write ON public.duty_assignments FOR ALL TO authenticated
  USING (public.has_orga_access((SELECT d.module_id FROM public.module_days d WHERE d.id = module_day_id)))
  WITH CHECK (public.has_orga_access((SELECT d.module_id FROM public.module_days d WHERE d.id = module_day_id)));

-- wie die bisherigen Prüffunktionen auch für anon ausführbar (Lese-Regeln für veröffentlichte Module gelten ohne Login)
GRANT EXECUTE ON FUNCTION public.current_staff_module(), public.has_orga_access(uuid), public.has_checkin_access(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Team-Zugänge: Modul im Antrag, beim Ausführen und in der Sperre gegen Vergabe ohne Freigabe
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_approval(p_action text, p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  beschreibung text;
  inhalt jsonb := coalesce(p_payload, '{}');
  anzahl integer;
  f jsonb;
  teile text[] := '{}';
  ziel public.staff_members%ROWTYPE;
  rolle public.staff_role;
  fenster jsonb;
  aid uuid;
BEGIN
  IF NOT public.has_full_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required'; END IF;
  IF p_action = 'nachricht' THEN
    IF coalesce(trim(inhalt ->> 'betreff'), '') = '' OR coalesce(trim(inhalt ->> 'text'), '') = '' THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    f := coalesce(inhalt -> 'filter', '{}');
    SELECT count(*) INTO anzahl FROM public.broadcast_recipients(f);
    IF anzahl = 0 THEN RAISE EXCEPTION 'no_recipients'; END IF;
    IF f ? 'cohort_id' THEN teile := teile || ('Generation ' || coalesce((SELECT name FROM public.cohorts WHERE id = (f ->> 'cohort_id')::uuid), '?')); END IF;
    IF f ? 'region_id' THEN teile := teile || ('Region ' || coalesce((SELECT name FROM public.regions WHERE id = (f ->> 'region_id')::int), '?')); END IF;
    IF f ? 'mentor_id' THEN teile := teile || ('Sorumlu ' || coalesce((SELECT name FROM public.mentors WHERE id = (f ->> 'mentor_id')::uuid), '?')); END IF;
    IF f ? 'module_id' THEN teile := teile || ('angemeldet für ' || coalesce((SELECT title FROM public.modules WHERE id = (f ->> 'module_id')::uuid), '?')); END IF;
    IF f ? 'group_id' THEN teile := teile || ('Gruppe ' || coalesce((SELECT name FROM public.module_groups WHERE id = (f ->> 'group_id')::uuid), '?')); END IF;
    inhalt := jsonb_build_object('betreff', left(inhalt ->> 'betreff', 200), 'text', left(inhalt ->> 'text', 10000), 'filter', f, 'anzahl', anzahl);
    beschreibung := format('Nachricht „%s“ an %s Personen (%s)', inhalt ->> 'betreff', anzahl,
                           CASE WHEN cardinality(teile) = 0 THEN 'alle aktiven mit E-Mail' ELSE array_to_string(teile, ', ') END);
  ELSIF p_action = 'export' THEN
    inhalt := jsonb_build_object('filter', coalesce(inhalt -> 'filter', '{}'));
    beschreibung := 'Export der Auswertung als CSV mit Namen und E-Mail-Adressen aller Teilnehmenden';
  ELSIF p_action = 'team_zugang' AND inhalt ->> 'art' = 'neu' THEN
    rolle := (inhalt ->> 'rolle')::public.staff_role;
    -- Auf ein Modul begrenzen gibt es nur für Orga-Team und Einlass-Helfer
    IF nullif(inhalt ->> 'modul', '') IS NOT NULL AND rolle NOT IN ('orga_team', 'checkin_helper') THEN RAISE EXCEPTION 'module_scope_role'; END IF;
    IF coalesce(trim(inhalt ->> 'email'), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR coalesce(trim(inhalt ->> 'name'), '') = '' THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    IF nullif(inhalt ->> 'modul', '') IS NOT NULL THEN
      fenster := public.module_access_window((inhalt ->> 'modul')::uuid);
      IF fenster IS NULL THEN RAISE EXCEPTION 'module_without_days'; END IF;
    END IF;
    inhalt := jsonb_build_object('art', 'neu', 'email', lower(trim(inhalt ->> 'email')), 'name', left(trim(inhalt ->> 'name'), 80),
                                 'rolle', rolle, 'von', fenster ->> 'von', 'bis', fenster ->> 'bis', 'titel', fenster ->> 'titel',
                                 'modul', nullif(inhalt ->> 'modul', ''));
    beschreibung := format('Neuer Team-Zugang: %s <%s> als %s%s', inhalt ->> 'name', inhalt ->> 'email', public.staff_role_name(rolle),
      CASE WHEN fenster IS NOT NULL THEN format(', nur %s vom %s bis %s', fenster ->> 'titel',
             to_char((fenster ->> 'von')::timestamptz AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI'),
             to_char((fenster ->> 'bis')::timestamptz AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI')) ELSE ', unbefristet' END);
  ELSIF p_action = 'team_zugang' AND inhalt ->> 'art' = 'rolle' THEN
    rolle := (inhalt ->> 'rolle')::public.staff_role;
    SELECT * INTO ziel FROM public.staff_members WHERE user_id = (inhalt ->> 'user_id')::uuid;
    IF NOT FOUND OR public.staff_role_rank(rolle) <= public.staff_role_rank(ziel.role) THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    IF ziel.module_id IS NOT NULL AND rolle NOT IN ('orga_team', 'checkin_helper') THEN RAISE EXCEPTION 'module_scope_role'; END IF;
    inhalt := jsonb_build_object('art', 'rolle', 'user_id', ziel.user_id, 'rolle', rolle);
    beschreibung := format('%s: Rolle von %s auf %s hochstufen', ziel.display_name, public.staff_role_name(ziel.role), public.staff_role_name(rolle));
  ELSIF p_action = 'team_zugang' AND inhalt ->> 'art' = 'zeitraum' THEN
    SELECT * INTO ziel FROM public.staff_members WHERE user_id = (inhalt ->> 'user_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    IF nullif(inhalt ->> 'modul', '') IS NOT NULL AND ziel.role NOT IN ('orga_team', 'checkin_helper') THEN RAISE EXCEPTION 'module_scope_role'; END IF;
    IF nullif(inhalt ->> 'modul', '') IS NOT NULL THEN
      fenster := public.module_access_window((inhalt ->> 'modul')::uuid);
      IF fenster IS NULL THEN RAISE EXCEPTION 'module_without_days'; END IF;
    END IF;
    inhalt := jsonb_build_object('art', 'zeitraum', 'user_id', ziel.user_id, 'von', fenster ->> 'von', 'bis', fenster ->> 'bis', 'titel', fenster ->> 'titel',
                                 'modul', nullif(inhalt ->> 'modul', ''));
    beschreibung := format('%s (%s): Zugang %s', ziel.display_name, public.staff_role_name(ziel.role),
      CASE WHEN fenster IS NULL THEN 'unbefristet machen'
           ELSE format('auf %s ausweiten: %s bis %s', fenster ->> 'titel',
             to_char((fenster ->> 'von')::timestamptz AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI'),
             to_char((fenster ->> 'bis')::timestamptz AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI')) END);
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
  INSERT INTO public.approvals (action, summary, payload, requested_by) VALUES (p_action, beschreibung, inhalt, auth.uid()) RETURNING id INTO aid;
  RETURN aid;
END $$;

CREATE OR REPLACE FUNCTION public.execute_team_approval(p_id uuid, p_new_user uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  a public.approvals%ROWTYPE;
  von timestamptz; bis timestamptz; titel text;
BEGIN
  IF public.current_staff_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required'; END IF;
  SELECT * INTO a FROM public.approvals WHERE id = p_id AND action = 'team_zugang' FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF a.requested_by <> auth.uid() THEN RETURN 'not_requester'; END IF;
  IF a.status <> 'freigegeben' THEN RETURN a.status; END IF;
  IF a.decided_at < now() - interval '24 hours' THEN RETURN 'expired'; END IF;
  IF (SELECT role FROM public.staff_members WHERE user_id = a.decided_by) IS DISTINCT FROM 'admin' THEN RETURN 'admin_required'; END IF;

  -- Zeitraum genau so, wie er beim Antrag festgehalten und freigegeben wurde
  von := (a.payload ->> 'von')::timestamptz;
  bis := (a.payload ->> 'bis')::timestamptz;
  titel := a.payload ->> 'titel';
  PERFORM set_config('ses.team_freigabe', 'ok', true);
  IF a.payload ->> 'art' = 'zeitraum' THEN
    -- Modul aus dem Antrag (ältere Anträge ohne „modul“: nur Zeitraum, wie bisher)
    UPDATE public.staff_members SET valid_from = von, valid_until = bis, module_id = (a.payload ->> 'modul')::uuid,
           label = CASE WHEN titel IS NOT NULL THEN CASE WHEN role = 'checkin_helper' THEN 'Helfer' ELSE 'Team' END || ' · ' || titel END
     WHERE user_id = (a.payload ->> 'user_id')::uuid;
  ELSIF a.payload ->> 'art' = 'rolle' THEN
    IF (SELECT module_id FROM public.staff_members WHERE user_id = (a.payload ->> 'user_id')::uuid) IS NOT NULL
       AND a.payload ->> 'rolle' NOT IN ('orga_team', 'checkin_helper') THEN
      PERFORM set_config('ses.team_freigabe', '', true);
      RETURN 'module_scope_role';
    END IF;
    UPDATE public.staff_members SET role = (a.payload ->> 'rolle')::public.staff_role WHERE user_id = (a.payload ->> 'user_id')::uuid;
  ELSE
    IF p_new_user IS NULL OR (SELECT lower(email) FROM auth.users WHERE id = p_new_user) IS DISTINCT FROM a.payload ->> 'email' THEN
      PERFORM set_config('ses.team_freigabe', '', true);
      RETURN 'user_mismatch';
    END IF;
    INSERT INTO public.staff_members (user_id, role, display_name, valid_from, valid_until, module_id, label)
    VALUES (p_new_user, (a.payload ->> 'rolle')::public.staff_role, a.payload ->> 'name', von, bis, (a.payload ->> 'modul')::uuid,
            CASE WHEN titel IS NOT NULL THEN CASE WHEN a.payload ->> 'rolle' = 'checkin_helper' THEN 'Helfer' ELSE 'Team' END || ' · ' || titel END);
  END IF;
  PERFORM set_config('ses.team_freigabe', '', true);
  UPDATE public.approvals SET status = 'ausgefuehrt', executed_at = now() WHERE id = p_id;
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'approval_executed', 'approval', p_id, jsonb_build_object('action', a.action, 'art', a.payload ->> 'art'));
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.staff_members_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_setting('ses.team_freigabe', true) = 'ok' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' OR public.staff_role_rank(NEW.role) > public.staff_role_rank(OLD.role) OR NEW.user_id <> OLD.user_id
     -- Zeitraum ausweiten (später enden, früher beginnen, Befristung aufheben) ist ebenfalls eine Vergabe
     OR (OLD.valid_until IS NOT NULL AND (NEW.valid_until IS NULL OR NEW.valid_until > OLD.valid_until))
     OR (OLD.valid_from IS NOT NULL AND (NEW.valid_from IS NULL OR NEW.valid_from < OLD.valid_from))
     -- Modulbegrenzung aufheben oder auf ein anderes Modul wechseln ebenso (auf ein Modul begrenzen geht sofort)
     OR (OLD.module_id IS NOT NULL AND NEW.module_id IS DISTINCT FROM OLD.module_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'team_approval_required';
  END IF;
  RETURN NEW;
END $$;

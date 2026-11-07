-- Löschanträge im Vier-Augen-Prinzip (Beschluss vom 25.10.2026: „Person löschen nur mit zweiter Person“).
--
-- Ablauf wie bei den anderen freigabepflichtigen Aktionen (approvals):
--   1. Ein Admin legt die Löschung zur Freigabe vor: create_approval('person_loeschen', {antrag}). Die Vorschau
--      (Name, was gelöscht und was ohne Namen behalten wird) steht im Antrag, die zweite Person sieht sie unter „Freigaben“.
--   2. Eine andere Person mit Vollzugriff (zweiter Admin oder Vorstand) gibt frei: decide_approval (unverändert; die
--      eigene Vorlage freizugeben verhindern decide_approval und der CHECK in approvals).
--   3. Die vorlegende Person führt innerhalb von 24 Stunden genau einmal aus: execute_deletion(freigabe).
-- Die bisherige execute_deletion(antrag) ohne Freigabe entfällt; claim_approval gibt Lösch-Freigaben nicht heraus
-- (sonst ließe sich eine Freigabe verbrauchen, ohne zu löschen). Was gelöscht bzw. behalten wird, bleibt unverändert.
-- Bestehende Daten: keine Änderung (nur Funktionen).

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
  sprache text;
  anzahl_tr integer;
  antrag public.deletion_requests%ROWTYPE;
  person public.participants%ROWTYPE;
BEGIN
  IF NOT public.has_full_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required'; END IF;
  IF p_action = 'nachricht' THEN
    sprache := coalesce(nullif(inhalt ->> 'sprache', ''), 'de');
    IF sprache NOT IN ('de', 'tr', 'konto') THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    -- Deutsch braucht den deutschen Text, Türkisch den türkischen, „nach Kontosprache“ beide
    IF sprache IN ('de', 'konto') AND (coalesce(trim(inhalt ->> 'betreff'), '') = '' OR coalesce(trim(inhalt ->> 'text'), '') = '') THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    IF sprache IN ('tr', 'konto') AND (coalesce(trim(inhalt ->> 'betreff_tr'), '') = '' OR coalesce(trim(inhalt ->> 'text_tr'), '') = '') THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    f := coalesce(inhalt -> 'filter', '{}');
    -- Ausgewählte Personen (z. B. aus der Teilnehmendenliste): nur gültige IDs, ohne Doppelte, höchstens 3000
    IF f ? 'participant_ids' THEN
      IF jsonb_typeof(f -> 'participant_ids') <> 'array' OR jsonb_array_length(f -> 'participant_ids') > 3000
         OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(f -> 'participant_ids') x
                     WHERE x !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
        RAISE EXCEPTION 'invalid_payload';
      END IF;
      f := jsonb_set(f, '{participant_ids}', (SELECT coalesce(jsonb_agg(DISTINCT x), '[]') FROM jsonb_array_elements_text(f -> 'participant_ids') x));
    END IF;
    SELECT count(*), count(*) FILTER (WHERE e.preferred_language = 'tr') INTO anzahl, anzahl_tr FROM public.broadcast_recipients(f) e;
    IF anzahl = 0 THEN RAISE EXCEPTION 'no_recipients'; END IF;
    IF f ? 'cohort_id' THEN teile := teile || ('Generation ' || coalesce((SELECT name FROM public.cohorts WHERE id = (f ->> 'cohort_id')::uuid), '?')); END IF;
    IF f ? 'region_id' THEN teile := teile || ('Region ' || coalesce((SELECT name FROM public.regions WHERE id = (f ->> 'region_id')::int), '?')); END IF;
    IF f ? 'mentor_id' THEN teile := teile || ('Sorumlu ' || coalesce((SELECT name FROM public.mentors WHERE id = (f ->> 'mentor_id')::uuid), '?')); END IF;
    IF f ? 'module_id' THEN teile := teile || ('angemeldet für ' || coalesce((SELECT title FROM public.modules WHERE id = (f ->> 'module_id')::uuid), '?')); END IF;
    IF f ? 'group_id' THEN teile := teile || ('Gruppe ' || coalesce((SELECT name FROM public.module_groups WHERE id = (f ->> 'group_id')::uuid), '?')); END IF;
    IF f ? 'participant_ids' THEN
      teile := teile || format('Auswahl aus Teilnehmende: %s Personen%s', jsonb_array_length(f -> 'participant_ids'),
                               coalesce(' (' || nullif(left(trim(inhalt ->> 'auswahl'), 300), '') || ')', ''));
    END IF;
    inhalt := jsonb_build_object('betreff', left(trim(coalesce(inhalt ->> 'betreff', '')), 200), 'text', left(coalesce(inhalt ->> 'text', ''), 10000),
                                 'betreff_tr', left(trim(coalesce(inhalt ->> 'betreff_tr', '')), 200), 'text_tr', left(coalesce(inhalt ->> 'text_tr', ''), 10000),
                                 'sprache', sprache, 'filter', f, 'anzahl', anzahl, 'anzahl_tr', anzahl_tr);
    -- Deutsch wie bisher ohne Zusatz; Türkisch bzw. nach Kontosprache wird genannt
    beschreibung := format('Nachricht „%s“ an %s Personen (%s)%s',
                           CASE WHEN sprache = 'tr' THEN inhalt ->> 'betreff_tr' ELSE inhalt ->> 'betreff' END, anzahl,
                           CASE WHEN cardinality(teile) = 0 THEN 'alle aktiven mit E-Mail' ELSE array_to_string(teile, ', ') END,
                           CASE sprache WHEN 'de' THEN '' WHEN 'tr' THEN ' · auf Türkisch'
                                ELSE format(' · nach Kontosprache: %s auf Türkisch, %s auf Deutsch', anzahl_tr, anzahl - anzahl_tr) END);
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
  ELSIF p_action = 'person_loeschen' THEN
    -- Löschantrag aus „Mein Bereich“: nur Admins legen vor; je Antrag höchstens eine offene bzw. gültige Vorlage.
    -- Die Vorschau (was gelöscht, was anonymisiert wird) wird festgehalten, damit die zweite Person sie sieht.
    IF NOT public.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required'; END IF;
    SELECT * INTO antrag FROM public.deletion_requests WHERE id = (inhalt ->> 'antrag')::uuid;
    IF NOT FOUND OR antrag.participant_id IS NULL THEN RAISE EXCEPTION 'invalid_payload'; END IF;
    IF antrag.status <> 'offen' THEN RAISE EXCEPTION 'request_not_open'; END IF;
    IF EXISTS (SELECT 1 FROM public.approvals x WHERE x.action = 'person_loeschen' AND x.payload ->> 'antrag' = antrag.id::text
                AND (x.status = 'offen' OR (x.status = 'freigegeben' AND x.decided_at >= now() - interval '24 hours'))) THEN
      RAISE EXCEPTION 'already_requested';
    END IF;
    SELECT * INTO person FROM public.participants WHERE id = antrag.participant_id;
    inhalt := jsonb_build_object('antrag', antrag.id, 'name', public.display_name(person), 'email', person.email,
                                 'beantragt_am', antrag.requested_at, 'grund', antrag.reason, 'zahlen', public.deletion_counts(person.id));
    beschreibung := format('Person löschen: %s (Löschantrag vom %s)', public.display_name(person),
                           to_char(antrag.requested_at AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY'));
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
  INSERT INTO public.approvals (action, summary, payload, requested_by) VALUES (p_action, beschreibung, inhalt, auth.uid()) RETURNING id INTO aid;
  RETURN aid;
END $$;


-- Ausführen einer freigegebenen Aktion: Team-Zugänge und Löschungen haben eigene Funktionen
CREATE OR REPLACE FUNCTION public.claim_approval(p_id uuid, p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.approvals%ROWTYPE;
BEGIN
  IF NOT public.has_full_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required'; END IF;
  SELECT * INTO a FROM public.approvals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR a.action <> p_action OR a.action IN ('team_zugang', 'person_loeschen') THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF a.requested_by <> auth.uid() THEN RETURN jsonb_build_object('result', 'not_requester'); END IF;
  IF a.status <> 'freigegeben' THEN RETURN jsonb_build_object('result', a.status); END IF;
  IF a.decided_at < now() - interval '24 hours' THEN RETURN jsonb_build_object('result', 'expired'); END IF;
  UPDATE public.approvals SET status = 'ausgefuehrt', executed_at = now() WHERE id = p_id;
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'approval_executed', 'approval', p_id, jsonb_build_object('action', a.action));
  RETURN jsonb_build_object('result', 'ok', 'payload', a.payload);
END $$;

DROP FUNCTION public.execute_deletion(uuid, text);

-- Löschung ausführen: nur mit freigegebener Vorlage (andere Person hat freigegeben), nur die vorlegende Person,
-- innerhalb von 24 Stunden, genau einmal. Liefert den Pfad des Fotos (die Datei entfernt der Server).
CREATE FUNCTION public.execute_deletion(p_approval_id uuid, p_note text DEFAULT NULL)
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
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'approval_executed', 'approval', f.id, jsonb_build_object('action', f.action));
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p.id, 'participant_anonymized', 'deletion_request', d.id, zahlen || jsonb_build_object('freigabe', f.id, 'freigegeben_von', f.decided_by));
  RETURN jsonb_build_object('result', 'ok', 'photo_path', p.photo_path, 'konto_geloescht', konto_geloescht);
END $$;

REVOKE ALL ON FUNCTION public.execute_deletion(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_deletion(uuid, text) TO authenticated;

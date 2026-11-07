-- Rundmails (Wünsche aus dem Gesamttest 02.11.2026): Vorlagen, Deutsch/Türkisch, Auswahl aus der Teilnehmendenliste.
--
--   message_templates            = Vorlagen für Rundmails (Betreff und Text auf Deutsch und Türkisch), nur Admin/Vorstand
--   broadcast_recipients(filter) = zusätzlich „participant_ids“: genau diese Personen (Mehrfachauswahl in Teilnehmende),
--                                  weiterhin nur aktive mit E-Mail und nur für Admin/Vorstand ohne Modulbegrenzung
--   create_approval('nachricht') = zusätzlich betreff_tr/text_tr und sprache: 'de', 'tr' oder 'konto' (je Person nach
--                                  ihrer Kontosprache; dafür müssen beide Texte da sein). Die Beschreibung für die zweite
--                                  Person nennt Sprache und Anzahl je Sprache. Ältere Anträge ohne „sprache“ gelten als Deutsch.
-- Bestehende Daten bleiben unverändert (nur neue Tabelle und ersetzte Funktionen).

CREATE TABLE public.message_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  subject_de text NOT NULL DEFAULT '' CHECK (length(subject_de) <= 200),
  body_de    text NOT NULL DEFAULT '' CHECK (length(body_de) <= 10000),
  subject_tr text NOT NULL DEFAULT '' CHECK (length(subject_tr) <= 200),
  body_tr    text NOT NULL DEFAULT '' CHECK (length(body_tr) <= 10000),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(subject_de)) > 0 OR length(trim(subject_tr)) > 0)
);
CREATE UNIQUE INDEX message_templates_name ON public.message_templates (lower(trim(name)));
CREATE TRIGGER message_templates_touch BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY message_templates_full ON public.message_templates FOR ALL TO authenticated
  USING (public.has_full_access()) WITH CHECK (public.has_full_access());
REVOKE ALL ON public.message_templates FROM anon;

-- Empfänger: wie bisher, dazu die ausdrückliche Auswahl
CREATE OR REPLACE FUNCTION public.broadcast_recipients(p_filter jsonb)
RETURNS TABLE (participant_id uuid, email text, first_name text, preferred_language text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, p.email, p.first_name, p.preferred_language
    FROM public.participants p
   WHERE public.has_full_access() AND p.active AND p.email IS NOT NULL
     AND (p_filter ->> 'cohort_id' IS NULL OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.participant_id = p.id
            AND m.cohort_id = (p_filter ->> 'cohort_id')::uuid AND m.role IN ('teilnehmende', 'sorumlu')
            AND (m.valid_until IS NULL OR m.valid_until >= current_date)))
     AND (p_filter ->> 'region_id' IS NULL OR p.region_id = (p_filter ->> 'region_id')::int)
     AND (p_filter ->> 'mentor_id' IS NULL OR p.mentor_id = (p_filter ->> 'mentor_id')::uuid)
     AND (p_filter ->> 'module_id' IS NULL OR EXISTS (SELECT 1 FROM public.registrations r WHERE r.participant_id = p.id
            AND r.module_id = (p_filter ->> 'module_id')::uuid AND r.status = 'confirmed'))
     AND (p_filter ->> 'group_id' IS NULL OR EXISTS (SELECT 1 FROM public.group_members g WHERE g.participant_id = p.id
            AND g.group_id = (p_filter ->> 'group_id')::uuid))
     AND (NOT coalesce(p_filter ? 'participant_ids', false)
          OR p.id::text IN (SELECT jsonb_array_elements_text(p_filter -> 'participant_ids')))
   ORDER BY p.last_name, p.first_name
$$;

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
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
  INSERT INTO public.approvals (action, summary, payload, requested_by) VALUES (p_action, beschreibung, inhalt, auth.uid()) RETURNING id INTO aid;
  RETURN aid;
END $$;


-- SES Academy: Step 2 — harte Deadlines, Entschuldigungen, Engagement, Speaker.
--
--   assignments.due_at    = harte Frist (timestamptz); aus due_date abgeleitet (23:59 Berlin),
--                           manuell setzbar für abweichende Uhrzeiten
--   assignment_excusals   = Entschuldigung pro Person und Aufgabe (Hausaufgaben-Status „entschuldigt“)
--   engagements           = außercurriculare Aktivitäten (Kommunalpolitik, Parteiarbeit, Vereine, Projekte)
--   module_day_speakers   = Gastredner, Politiker, Ehrengäste je Modultag — bewusst KEINE participants/
--                           registrations: sie tauchen in keinen Hausaufgaben-Pflichten, Quoten,
--                           Serien oder Kennzahlen auf.
--
-- Status-Logik je Person und Aufgabe (analog zur Anwesenheitslogik):
--   puenktlich  = abgegeben, Frist eingehalten
--   verspaetet  = abgegeben, nach der Frist
--   offen       = noch nichts abgegeben, Frist läuft noch (oder keine Frist gesetzt)
--   fehlt       = nichts abgegeben und Frist abgelaufen (zählt in die Quote, wie ein No-Show)
--   entschuldigt= befreit (zählt nicht in die Quote)
--
-- Rechte: Hausaufgaben-Status ab orga_team (Bewertungsteam); Engagement, Speaker und
-- Gesamt-Kennzahlen wie interne Notizen/Auswertung — Lesen ab orga_team, Schreiben admin/vorstand.

-- ---------------------------------------------------------------------------
-- 1) Harte Frist für Hausaufgaben
-- ---------------------------------------------------------------------------
ALTER TABLE public.assignments ADD COLUMN due_at timestamptz;

-- Bestand: Frist-Tage gelten als 23:59 Berliner Zeit
UPDATE public.assignments
   SET due_at = (due_date + time '23:59') AT TIME ZONE 'Europe/Berlin'
 WHERE due_date IS NOT NULL;

-- Künftig genügt die Tagesfrist im Formular: due_at wird daraus abgeleitet, sofern nicht
-- ausdrücklich selbst gesetzt. Ändert sich das Frist-Datum, wird die abgeleitete Frist mitgezogen.
CREATE FUNCTION public.assignments_sync_frist() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.due_date IS NOT NULL
     AND (NEW.due_at IS NULL
          OR (OLD.due_date IS DISTINCT FROM NEW.due_date AND NEW.due_at IS NOT DISTINCT FROM OLD.due_at)) THEN
    NEW.due_at := (NEW.due_date + time '23:59') AT TIME ZONE 'Europe/Berlin';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assignments_frist BEFORE INSERT OR UPDATE OF due_date, due_at ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.assignments_sync_frist();

-- ---------------------------------------------------------------------------
-- 2) Entschuldigungen je Aufgabe
-- ---------------------------------------------------------------------------
CREATE TABLE public.assignment_excusals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  note           text NOT NULL DEFAULT '',
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, participant_id)
);

-- ---------------------------------------------------------------------------
-- 3) Außercurriculares Engagement
-- ---------------------------------------------------------------------------
CREATE TYPE public.engagement_kind AS ENUM
  ('kommunalpolitik', 'partei', 'jugendrat', 'verein', 'projekt', 'sonstiges');

CREATE TABLE public.engagements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  kind           public.engagement_kind NOT NULL,
  role           text NOT NULL DEFAULT '',        -- z. B. „Fraktionsvorsitzende“
  organization   text NOT NULL DEFAULT '',        -- z. B. „Stadtrat Köln“
  started_on     date,
  ended_on       date,                            -- NULL = läuft noch
  note           text NOT NULL DEFAULT '',
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_on IS NULL OR started_on IS NULL OR ended_on >= started_on)
);
CREATE INDEX engagements_participant_idx ON public.engagements (participant_id);
CREATE TRIGGER engagements_touch BEFORE UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Speaker und Ehrengäste an Modultagen
-- ---------------------------------------------------------------------------
CREATE TABLE public.module_day_speakers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_day_id  uuid NOT NULL REFERENCES public.module_days(id) ON DELETE CASCADE,
  display_name   text NOT NULL,
  affiliation    text NOT NULL DEFAULT '',        -- z. B. „Bürgermeisterin von Köln“
  kind           text NOT NULL DEFAULT 'speaker' CHECK (kind IN ('speaker', 'politiker', 'ehrengast')),
  topic          text NOT NULL DEFAULT '',        -- Worüber hat die Person gesprochen?
  participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,  -- nur falls intern trotzdem verknüpft
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX speakers_day_idx ON public.module_day_speakers (module_day_id);

-- ---------------------------------------------------------------------------
-- 5) Status je Person und Aufgabe. Erwartet werden die aktiven Academy-Teilnehmenden des
--    Jahrgangs; zusätzlich erscheinen alle, die trotzdem abgegeben oder eine Entschuldigung haben.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.get_assignment_status(p_assignment_id uuid)
RETURNS TABLE (participant_id uuid, display_name text, status text, submitted_on date, review_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_orga_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required';
  END IF;
  RETURN QUERY
  WITH frist AS (
    SELECT a.id, a.cohort_id, a.due_at FROM public.assignments a WHERE a.id = p_assignment_id
  ),
  abgabe AS (
    SELECT sp.participant_id, min(s.submitted_on) AS submitted_on
      FROM public.submissions s
      JOIN public.submission_participants sp ON sp.submission_id = s.id
     WHERE s.assignment_id = p_assignment_id
     GROUP BY sp.participant_id
  ),
  basis AS (
    SELECT p.id AS participant_id, public.display_name(p) AS display_name
      FROM public.participants p
     WHERE p.cohort_id = (SELECT cohort_id FROM frist)
       AND p.active AND p.affiliation_status = 'academy_student'
    UNION
    SELECT p.id, public.display_name(p) FROM abgabe ab JOIN public.participants p ON p.id = ab.participant_id
    UNION
    SELECT p.id, public.display_name(p)
      FROM public.assignment_excusals e JOIN public.participants p ON p.id = e.participant_id
     WHERE e.assignment_id = p_assignment_id
  )
  SELECT b.participant_id, b.display_name,
    CASE
      WHEN ab.submitted_on IS NOT NULL OR ab.participant_id IS NOT NULL THEN
        -- Abgabe ohne Datum (z. B. Listenimport) gilt als pünktlich
        CASE WHEN f.due_at IS NULL OR ab.submitted_on IS NULL
                  OR ab.submitted_on <= (f.due_at AT TIME ZONE 'Europe/Berlin')::date
             THEN 'puenktlich' ELSE 'verspaetet' END
      WHEN e.participant_id IS NOT NULL                        THEN 'entschuldigt'
      WHEN f.due_at IS NOT NULL AND f.due_at < now()           THEN 'fehlt'
      ELSE 'offen'
    END,
    ab.submitted_on,
    (SELECT count(*)::int
       FROM public.reviews r
       JOIN public.submissions s ON s.id = r.submission_id
       JOIN public.submission_participants sp ON sp.submission_id = s.id
      WHERE s.assignment_id = p_assignment_id AND sp.participant_id = b.participant_id) AS review_count
    FROM basis b
    CROSS JOIN frist f
    LEFT JOIN abgabe ab ON ab.participant_id = b.participant_id
    LEFT JOIN public.assignment_excusals e
      ON e.assignment_id = p_assignment_id AND e.participant_id = b.participant_id
   ORDER BY b.display_name;
END $$;

-- ---------------------------------------------------------------------------
-- 6) Hausaufgaben- und Engagement-Kennzahlen pro Person (Dossier / Detailseite)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.get_participant_homework_analytics(p_participant_id uuid)
RETURNS TABLE (
  hw_expected integer, hw_on_time integer, hw_late integer, hw_missing integer,
  hw_excused integer, hw_open integer, homework_rate numeric, grade_avg numeric,
  engagement_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_full_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required';
  END IF;
  RETURN QUERY
  WITH kenn AS (
    SELECT
      CASE
        WHEN ab.submitted_on IS NOT NULL OR ab.assignment_id IS NOT NULL THEN
          CASE WHEN f.due_at IS NULL OR ab.submitted_on IS NULL
                    OR ab.submitted_on <= (f.due_at AT TIME ZONE 'Europe/Berlin')::date
               THEN 'puenktlich' ELSE 'verspaetet' END
        WHEN ex.assignment_id IS NOT NULL                    THEN 'entschuldigt'
        WHEN f.due_at IS NOT NULL AND f.due_at < now()       THEN 'fehlt'
        ELSE 'offen'
      END AS einordnung
      FROM public.assignments f
      LEFT JOIN (
        SELECT s.assignment_id, min(s.submitted_on) AS submitted_on
          FROM public.submissions s
          JOIN public.submission_participants sp ON sp.submission_id = s.id
         WHERE sp.participant_id = p_participant_id
         GROUP BY s.assignment_id
      ) ab ON ab.assignment_id = f.id
      LEFT JOIN public.assignment_excusals ex
        ON ex.assignment_id = f.id AND ex.participant_id = p_participant_id
     WHERE f.cohort_id = (SELECT cohort_id FROM public.participants WHERE id = p_participant_id)
  )
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE kenn.einordnung = 'puenktlich')::int,
    count(*) FILTER (WHERE kenn.einordnung = 'verspaetet')::int,
    count(*) FILTER (WHERE kenn.einordnung = 'fehlt')::int,
    count(*) FILTER (WHERE kenn.einordnung = 'entschuldigt')::int,
    count(*) FILTER (WHERE kenn.einordnung = 'offen')::int,
    round((count(*) FILTER (WHERE kenn.einordnung IN ('puenktlich', 'verspaetet')))::numeric
          / nullif(count(*) FILTER (WHERE kenn.einordnung <> 'entschuldigt'), 0) * 100, 1),
    (SELECT round(avg(wert), 1)
       FROM (
         SELECT unnest(ARRAY[r.content, r.structure, r.body_language, r.facial_expression, r.voice,
                             r.language, r.presence, r.impact, r.overall]) AS wert
           FROM public.reviews r
           JOIN public.submission_participants sp ON sp.submission_id = r.submission_id
          WHERE sp.participant_id = p_participant_id
       ) kriterien WHERE wert IS NOT NULL),
    (SELECT count(*)::int FROM public.engagements g WHERE g.participant_id = p_participant_id)
    FROM kenn;
END $$;

-- ---------------------------------------------------------------------------
-- 7) Zeilenschutz und Rechte
-- ---------------------------------------------------------------------------
ALTER TABLE public.assignment_excusals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_day_speakers   ENABLE ROW LEVEL SECURITY;

CREATE POLICY excusals_orga ON public.assignment_excusals FOR ALL TO authenticated
  USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());

CREATE POLICY engagements_orga_read ON public.engagements FOR SELECT TO authenticated
  USING (public.has_orga_access() OR participant_id = public.my_participant_id());
CREATE POLICY engagements_full_write ON public.engagements FOR ALL TO authenticated
  USING (public.has_full_access()) WITH CHECK (public.has_full_access());

CREATE POLICY speakers_orga_read ON public.module_day_speakers FOR SELECT TO authenticated
  USING (public.has_orga_access());
CREATE POLICY speakers_full_write ON public.module_day_speakers FOR ALL TO authenticated
  USING (public.has_full_access()) WITH CHECK (public.has_full_access());

REVOKE ALL ON FUNCTION public.get_assignment_status(uuid), public.get_participant_homework_analytics(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignment_status(uuid), public.get_participant_homework_analytics(uuid)
  TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.assignment_excusals, public.engagements, public.module_day_speakers FROM anon;

-- Kennzahlen für die Auswertung (/team/auswertung/) und die Teilnehmer-Detailseite.
-- Ändert nur Lesefunktionen; keine Tabellen.

-- ---------------------------------------------------------------------------
-- Pro Person: wie bisher, zusätzlich trailing_misses (verpasste Serientage seit dem letzten Besuch)
-- und possible_days (vergangene Tage, an denen die Person angemeldet war). Gezählt wird pro Modultag.
-- ---------------------------------------------------------------------------
DROP FUNCTION public.get_participant_analytics(timestamptz, timestamptz);

CREATE FUNCTION public.get_participant_analytics(
  timeframe_start timestamptz DEFAULT '-infinity', timeframe_end timestamptz DEFAULT 'infinity')
RETURNS TABLE (
  participant_id uuid, total_registered integer, total_attended integer, total_no_shows integer,
  total_cancelled_or_excused integer, last_attended_at timestamptz, last_attended_title text,
  attendance_rate numeric, current_streak integer, longest_streak integer, trailing_misses integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_full_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required';
  END IF;
  RETURN QUERY
  WITH days AS (
    SELECT d.id, d.module_id, d.starts_at, d.ends_at, m.title, m.counts_for_streak
      FROM public.module_days d JOIN public.modules m ON m.id = d.module_id
     WHERE m.status = 'published' AND m.cancelled_at IS NULL
       AND d.starts_at >= timeframe_start AND d.starts_at < timeframe_end
  ),
  per_day AS (
    SELECT r.participant_id, r.module_id, r.status, dy.id AS day_id, dy.starts_at, dy.ends_at,
           dy.title, dy.counts_for_streak, a.checked_in_at
      FROM public.registrations r
      JOIN days dy ON dy.module_id = r.module_id
      LEFT JOIN public.attendances a ON a.registration_id = r.id AND a.module_day_id = dy.id
     WHERE r.status IN ('confirmed', 'cancelled', 'excused')
  ),
  counts AS (
    SELECT pd.participant_id,
      count(DISTINCT pd.module_id) FILTER (WHERE pd.status = 'confirmed')::int                AS reg,
      count(*) FILTER (WHERE pd.checked_in_at IS NOT NULL)::int                               AS att,
      count(*) FILTER (WHERE pd.status = 'confirmed' AND pd.checked_in_at IS NULL
                         AND pd.ends_at < now())::int                                         AS miss,
      count(DISTINCT pd.module_id) FILTER (WHERE pd.status IN ('cancelled', 'excused'))::int  AS exc
      FROM per_day pd GROUP BY pd.participant_id
  ),
  last_visit AS (
    SELECT DISTINCT ON (pd.participant_id) pd.participant_id, pd.checked_in_at, pd.title
      FROM per_day pd WHERE pd.checked_in_at IS NOT NULL
     ORDER BY pd.participant_id, pd.checked_in_at DESC
  ),
  first_module AS (
    SELECT r.participant_id, min(d.starts_at) AS since
      FROM public.registrations r JOIN public.module_days d ON d.module_id = r.module_id
     GROUP BY r.participant_id
  ),
  grid AS (
    SELECT fm.participant_id, dy.starts_at,
      CASE WHEN pd.checked_in_at IS NOT NULL THEN 'hit'
           WHEN pd.status IN ('cancelled', 'excused') THEN 'skip'
           ELSE 'miss' END AS outcome
      FROM first_module fm
      JOIN days dy ON dy.counts_for_streak AND dy.ends_at < now() AND dy.starts_at >= fm.since
      LEFT JOIN per_day pd ON pd.participant_id = fm.participant_id AND pd.day_id = dy.id
  ),
  islands AS (
    SELECT g.participant_id, g.outcome, g.starts_at,
           count(*) FILTER (WHERE g.outcome = 'miss') OVER (PARTITION BY g.participant_id ORDER BY g.starts_at) AS island
      FROM grid g WHERE g.outcome <> 'skip'
  ),
  streaks AS (
    SELECT i.participant_id, i.island, count(*) FILTER (WHERE i.outcome = 'hit')::int AS len
      FROM islands i GROUP BY i.participant_id, i.island
  ),
  streak_summary AS (
    SELECT s.participant_id, (array_agg(s.len ORDER BY s.island DESC))[1] AS cur, max(s.len) AS best
      FROM streaks s GROUP BY s.participant_id
  ),
  zuletzt_verpasst AS (   -- verpasste Tage nach dem letzten Besuch
    SELECT i.participant_id,
           count(*) FILTER (WHERE i.outcome = 'miss' AND i.starts_at > coalesce(
             (SELECT max(j.starts_at) FROM islands j WHERE j.participant_id = i.participant_id AND j.outcome = 'hit'),
             '-infinity'))::int AS n
      FROM islands i GROUP BY i.participant_id
  )
  SELECT c.participant_id, c.reg, c.att, c.miss, c.exc, lv.checked_in_at, lv.title,
         round(c.att::numeric / nullif(c.att + c.miss, 0) * 100, 1),
         coalesce(ss.cur, 0), coalesce(ss.best, 0), coalesce(tr.n, 0)
    FROM counts c
    LEFT JOIN last_visit lv ON lv.participant_id = c.participant_id
    LEFT JOIN streak_summary ss ON ss.participant_id = c.participant_id
    LEFT JOIN zuletzt_verpasst tr ON tr.participant_id = c.participant_id;
END $$;

-- ---------------------------------------------------------------------------
-- Pro Modultag: erwartet (bestätigt angemeldet) und eingecheckt. Für den Verlauf und den Event-Vergleich.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.get_day_stats(
  timeframe_start timestamptz DEFAULT '-infinity', timeframe_end timestamptz DEFAULT 'infinity')
RETURNS TABLE (
  module_id uuid, module_title text, counts_for_streak boolean, day_id uuid,
  starts_at timestamptz, ends_at timestamptz, expected integer, checked_in integer, walk_ins integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_full_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required';
  END IF;
  RETURN QUERY
  SELECT m.id, m.title, m.counts_for_streak, d.id, d.starts_at, d.ends_at,
         (SELECT count(*) FROM public.registrations r WHERE r.module_id = m.id AND r.status = 'confirmed')::int,
         (SELECT count(*) FROM public.attendances a WHERE a.module_day_id = d.id)::int,
         (SELECT count(*) FROM public.attendances a WHERE a.module_day_id = d.id AND a.method = 'walk_in')::int
    FROM public.module_days d JOIN public.modules m ON m.id = d.module_id
   WHERE m.status = 'published' AND m.cancelled_at IS NULL
     AND d.starts_at >= timeframe_start AND d.starts_at < timeframe_end
   ORDER BY d.starts_at;
END $$;

-- Pro Modul: Anmeldungen, wer mindestens einmal da war, No-Shows (angemeldet, kein einziger Tag besucht),
-- Abmeldungen und Quote über alle vergangenen Tage.
CREATE FUNCTION public.get_module_stats(
  timeframe_start timestamptz DEFAULT '-infinity', timeframe_end timestamptz DEFAULT 'infinity')
RETURNS TABLE (
  module_id uuid, title text, first_day timestamptz, days_total integer, days_past integer,
  registered integer, attended_people integer, no_shows integer, cancelled_or_excused integer,
  person_days_attended integer, person_days_possible integer, attendance_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_full_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required';
  END IF;
  RETURN QUERY
  WITH mods AS (
    SELECT m.id, m.title,
           min(d.starts_at) AS first_day,
           count(d.id)::int AS days_total,
           count(d.id) FILTER (WHERE d.ends_at < now())::int AS days_past
      FROM public.modules m JOIN public.module_days d ON d.module_id = m.id
     WHERE m.status = 'published' AND m.cancelled_at IS NULL
     GROUP BY m.id, m.title
    HAVING min(d.starts_at) >= timeframe_start AND min(d.starts_at) < timeframe_end
  ),
  regs AS (
    SELECT r.module_id, r.id, r.status,
           (SELECT count(*) FROM public.attendances a JOIN public.module_days d ON d.id = a.module_day_id
             WHERE a.registration_id = r.id AND d.ends_at < now())::int AS besucht
      FROM public.registrations r WHERE r.module_id IN (SELECT id FROM mods)
  )
  SELECT mo.id, mo.title, mo.first_day, mo.days_total, mo.days_past,
         count(r.id) FILTER (WHERE r.status = 'confirmed')::int,
         count(r.id) FILTER (WHERE r.status = 'confirmed' AND r.besucht > 0)::int,
         CASE WHEN mo.days_past = mo.days_total
              THEN count(r.id) FILTER (WHERE r.status = 'confirmed' AND r.besucht = 0)::int ELSE 0 END,
         count(r.id) FILTER (WHERE r.status IN ('cancelled', 'excused'))::int,
         coalesce(sum(r.besucht) FILTER (WHERE r.status = 'confirmed'), 0)::int,
         (count(r.id) FILTER (WHERE r.status = 'confirmed') * mo.days_past)::int,
         round(coalesce(sum(r.besucht) FILTER (WHERE r.status = 'confirmed'), 0)::numeric
               / nullif(count(r.id) FILTER (WHERE r.status = 'confirmed') * mo.days_past, 0) * 100, 1)
    FROM mods mo LEFT JOIN regs r ON r.module_id = mo.id
   GROUP BY mo.id, mo.title, mo.first_day, mo.days_total, mo.days_past
   ORDER BY mo.first_day;
END $$;

REVOKE ALL ON FUNCTION public.get_participant_analytics(timestamptz, timestamptz),
  public.get_day_stats(timestamptz, timestamptz), public.get_module_stats(timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_participant_analytics(timestamptz, timestamptz),
  public.get_day_stats(timestamptz, timestamptz), public.get_module_stats(timestamptz, timestamptz)
  TO authenticated;

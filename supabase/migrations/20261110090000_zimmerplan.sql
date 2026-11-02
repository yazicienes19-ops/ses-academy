-- Zimmerplan: Zimmerwünsche verstehen, Vorschlag mit Durchmischung, Verlauf „wer war wann mit wem im Zimmer“.
-- Den Vorschlag rechnet die Seite (src/lib/zimmerplan.ts); die Datenbank liefert die Grundlage und speichert ihn.
--
--   room_assignments.source = 'manual' (von Hand, bleibt bei jedem Vorschlag stehen) oder 'auto' (aus dem Vorschlag)
--   room_wish_overrides     = Korrektur der Wunsch-Erkennung je Person und Namensteil: richtige Person oder ignorieren
--   get_room_planning()     = Angemeldete eines Moduls mit Geschlecht, Region, Nächten, Wunsch und Zimmer
--   get_room_history()      = mit wem die Angemeldeten in anderen Modulen schon im Zimmer waren
--   get_person_rooms()      = Zimmer einer Person über alle Module, mit Mitbewohner:innen
--   apply_room_plan()       = Vorschlag übernehmen: bisherige Vorschlags-Zuteilungen ersetzen, Handzuteilungen bleiben

ALTER TABLE public.room_assignments ADD COLUMN source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto'));

CREATE TABLE public.room_wish_overrides (
  module_id      uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  token          text NOT NULL CHECK (length(token) BETWEEN 1 AND 100),         -- Namensteil, vereinfacht geschrieben
  wished_id      uuid REFERENCES public.participants(id) ON DELETE CASCADE,       -- NULL = Namensteil ignorieren
  created_by     uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module_id, participant_id, token)
);

ALTER TABLE public.room_wish_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY wish_overrides_orga ON public.room_wish_overrides FOR ALL TO authenticated
  USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());
REVOKE ALL ON public.room_wish_overrides FROM anon;

CREATE FUNCTION public.get_room_planning(p_module_id uuid)
RETURNS TABLE (participant_id uuid, name text, gender text, region text, registration_status public.registration_status,
               answered boolean, nights date[], room_wish text, room_id uuid, room_label text, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), p.gender, rg.name, r.status, s.registration_id IS NOT NULL, coalesce(s.nights, '{}'),
         coalesce(s.room_wish, ''), ro.id, ro.label, ra.source
    FROM public.registrations r
    JOIN public.participants p ON p.id = r.participant_id
    LEFT JOIN public.regions rg ON rg.id = p.region_id
    LEFT JOIN public.stay_requests s ON s.registration_id = r.id
    LEFT JOIN public.room_assignments ra ON ra.participant_id = p.id
      AND ra.hotel_id IN (SELECT h.id FROM public.hotels h WHERE h.module_id = p_module_id)
    LEFT JOIN public.rooms ro ON ro.id = ra.room_id
   WHERE r.module_id = p_module_id AND r.status IN ('confirmed', 'waitlist') AND public.has_orga_access()
   ORDER BY p.last_name, p.first_name
$$;

CREATE FUNCTION public.get_room_history(p_module_id uuid)
RETURNS TABLE (participant_id uuid, mate_id uuid, mate_name text, module_title text, module_start date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.participant_id, b.participant_id, public.display_name(pb), m.title,
         (SELECT min(d.day) FROM public.module_days d WHERE d.module_id = m.id)
    FROM public.room_assignments a
    JOIN public.room_assignments b ON b.room_id = a.room_id AND b.participant_id <> a.participant_id
    JOIN public.participants pb ON pb.id = b.participant_id
    JOIN public.hotels h ON h.id = a.hotel_id
    JOIN public.modules m ON m.id = h.module_id
   WHERE h.module_id <> p_module_id AND public.has_orga_access()
     AND a.participant_id IN (SELECT r.participant_id FROM public.registrations r WHERE r.module_id = p_module_id)
   ORDER BY 5 DESC NULLS LAST, 3
$$;

CREATE FUNCTION public.get_person_rooms(p_participant_id uuid)
RETURNS TABLE (module_id uuid, module_title text, module_start date, room_label text, mates text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.id, m.title, (SELECT min(d.day) FROM public.module_days d WHERE d.module_id = m.id), ro.label,
         coalesce((SELECT array_agg(public.display_name(pb) ORDER BY pb.last_name)
                     FROM public.room_assignments b JOIN public.participants pb ON pb.id = b.participant_id
                    WHERE b.room_id = a.room_id AND b.participant_id <> a.participant_id), '{}')
    FROM public.room_assignments a
    JOIN public.rooms ro ON ro.id = a.room_id
    JOIN public.hotels h ON h.id = a.hotel_id
    JOIN public.modules m ON m.id = h.module_id
   WHERE a.participant_id = p_participant_id AND public.has_orga_access()
   ORDER BY 3 DESC NULLS LAST
$$;

-- Läuft mit den Rechten der aufrufenden Person (RLS: ab Orga-Team); room_assignments_check verhindert Überbelegung,
-- dann scheitert der ganze Vorschlag und es bleibt beim alten Stand.
CREATE FUNCTION public.apply_room_plan(p_hotel_id uuid, p_plan jsonb)
RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_orga_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required'; END IF;
  DELETE FROM public.room_assignments WHERE hotel_id = p_hotel_id AND source = 'auto';
  INSERT INTO public.room_assignments (room_id, participant_id, hotel_id, source)
  SELECT ro.id, (e ->> 'participant_id')::uuid, p_hotel_id, 'auto'
    FROM jsonb_array_elements(coalesce(p_plan, '[]')) e
    JOIN public.rooms ro ON ro.id = (e ->> 'room_id')::uuid AND ro.hotel_id = p_hotel_id
  ON CONFLICT DO NOTHING;   -- wer von Hand zugeteilt ist, behält sein Zimmer
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.get_room_planning(uuid), public.get_room_history(uuid), public.get_person_rooms(uuid),
  public.apply_room_plan(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_room_planning(uuid), public.get_room_history(uuid), public.get_person_rooms(uuid),
  public.apply_room_plan(uuid, jsonb) TO authenticated;

-- Übernachtungsabfrage (Gesamttest 02.11.2026): „Abreise vor Ankunft“ wurde angenommen. save_my_stay lehnt das jetzt
-- ab ('departure_before_arrival'), und die Tabelle prüft es selbst. NOT VALID: bereits gespeicherte Angaben bleiben
-- unangetastet, jede neue oder geänderte Zeile wird geprüft.

ALTER TABLE public.stay_requests ADD CONSTRAINT stay_requests_abreise_nach_ankunft
  CHECK (arrival_at IS NULL OR departure_at IS NULL OR departure_at >= arrival_at) NOT VALID;

CREATE OR REPLACE FUNCTION public.save_my_stay(p_module_id uuid, p_nights date[], p_arrival_at timestamptz, p_arrival_by text,
                                    p_departure_at timestamptz, p_room_wish text, p_notes text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  reg uuid;
  erste date;
  letzte date;
  saubere date[];
BEGIN
  SELECT r.id INTO reg FROM public.registrations r
    JOIN public.participants p ON p.id = r.participant_id
   WHERE r.module_id = p_module_id AND p.user_id = auth.uid() AND r.status IN ('confirmed', 'waitlist', 'pending');
  IF reg IS NULL THEN RETURN 'not_registered'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.modules WHERE id = p_module_id AND stay_form_open) THEN RETURN 'closed'; END IF;
  -- Abreise vor Ankunft nicht annehmen (bisher wurde das gespeichert und mit „Danke“ bestätigt)
  IF p_arrival_at IS NOT NULL AND p_departure_at IS NOT NULL AND p_departure_at < p_arrival_at THEN
    RETURN 'departure_before_arrival';
  END IF;
  SELECT min(day), max(day) INTO erste, letzte FROM public.module_days WHERE module_id = p_module_id;
  -- erlaubt: Nacht vor dem ersten Tag bis Nacht vor dem letzten Tag
  SELECT coalesce(array_agg(DISTINCT n ORDER BY n), '{}') INTO saubere
    FROM unnest(coalesce(p_nights, '{}')) n WHERE n BETWEEN erste - 1 AND letzte - 1;
  INSERT INTO public.stay_requests (registration_id, nights, arrival_at, arrival_by, departure_at, room_wish, notes)
  VALUES (reg, saubere, p_arrival_at, nullif(p_arrival_by, ''), p_departure_at, left(coalesce(trim(p_room_wish), ''), 300), left(coalesce(trim(p_notes), ''), 1000))
  ON CONFLICT (registration_id) DO UPDATE SET nights = excluded.nights, arrival_at = excluded.arrival_at, arrival_by = excluded.arrival_by,
    departure_at = excluded.departure_at, room_wish = excluded.room_wish, notes = excluded.notes;
  RETURN 'saved';
END $$;

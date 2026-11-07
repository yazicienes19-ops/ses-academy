-- Mehrere Hotels je Modul (Wunsch aus dem Gesamttest 02.11.2026), z. B. Hotel und Pension.
--
-- Die Tabellen konnten das schon (hotels.module_id ist nicht eindeutig, rooms gehören zu einem Hotel); die App nahm
-- bisher nur das erste Hotel. Neu ist nur die Regel „eine Person schläft je Modul in genau einem Hotel“ und dass die
-- Funktionen das Hotel mitliefern bzw. ein bestimmtes Hotel bedienen.
--
-- KEINE Datenmigration: Es wird nichts verschoben, umbenannt oder gelöscht. Bestehende Zuteilungen bleiben, wie sie sind.
-- Die neue Regel prüft nur neue bzw. geänderte Zuteilungen (Trigger). Eine Person, die (aus alter Zeit) in zwei Hotels
-- desselben Moduls stünde, erscheint in den Übersichten einmal (mit dem zuerst angelegten Hotel); unten wird gezählt.
--
--   room_assignments_check()   zusätzlich: nicht in zwei Hotels desselben Moduls (person_in_other_hotel)
--   assign_room(person, zimmer) Umzug in einem Schritt, auch von einem Hotel ins andere; volles Zimmer: alles bleibt
--   get_room_planning / get_stay_overview  liefern hotel_id (eine Zeile je Person)
--   apply_room_plan            übergeht Personen, die schon in einem anderen Hotel des Moduls sind
--   apply_probe_rooms          optional für ein bestimmtes (noch leeres) Hotel

CREATE OR REPLACE FUNCTION public.room_assignments_check() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE r public.rooms%ROWTYPE; modul uuid;
BEGIN
  SELECT * INTO r FROM public.rooms WHERE id = NEW.room_id FOR UPDATE;
  NEW.hotel_id := r.hotel_id;
  SELECT module_id INTO modul FROM public.hotels WHERE id = r.hotel_id;
  -- je Person und Modul nacheinander, damit zwei gleichzeitige Zuteilungen in verschiedene Hotels nicht beide durchgehen
  PERFORM pg_advisory_xact_lock(hashtextextended('room_assignment:' || NEW.participant_id::text || ':' || modul::text, 0));
  IF EXISTS (SELECT 1 FROM public.room_assignments ra JOIN public.hotels h ON h.id = ra.hotel_id
              WHERE ra.participant_id = NEW.participant_id AND ra.hotel_id <> NEW.hotel_id AND h.module_id = modul) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'person_in_other_hotel';
  END IF;
  IF (SELECT count(*) FROM public.room_assignments WHERE room_id = NEW.room_id AND participant_id <> NEW.participant_id) >= r.capacity THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'room_full';
  END IF;
  RETURN NEW;
END $$;

-- Person in ein Zimmer setzen (von Hand, bleibt bei Vorschlägen stehen). Ein Umzug aus einem anderen Hotel des Moduls
-- geschieht im selben Schritt; ist das Zimmer voll, bleibt alles beim alten Stand. Rechte wie die Tabellen (ab Orga-Team).
CREATE FUNCTION public.assign_room(p_participant_id uuid, p_room_id uuid)
RETURNS text LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE modul uuid; hotel uuid;
BEGIN
  IF NOT public.has_orga_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required'; END IF;
  SELECT h.module_id, h.id INTO modul, hotel FROM public.rooms r JOIN public.hotels h ON h.id = r.hotel_id WHERE r.id = p_room_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  BEGIN
    DELETE FROM public.room_assignments ra USING public.hotels h
     WHERE h.id = ra.hotel_id AND h.module_id = modul AND ra.participant_id = p_participant_id AND ra.hotel_id <> hotel;
    INSERT INTO public.room_assignments (room_id, participant_id, hotel_id, source)
    VALUES (p_room_id, p_participant_id, hotel, 'manual')
    ON CONFLICT (hotel_id, participant_id) DO UPDATE SET room_id = excluded.room_id, source = 'manual';
  EXCEPTION WHEN check_violation THEN
    RETURN 'room_full';   -- der Block wird zurückgerollt, die bisherige Zuteilung bleibt
  END;
  RETURN 'ok';
END $$;

DROP FUNCTION public.get_room_planning(uuid);
CREATE FUNCTION public.get_room_planning(p_module_id uuid)
RETURNS TABLE (participant_id uuid, name text, gender text, region text, registration_status public.registration_status,
               answered boolean, nights date[], room_wish text, room_id uuid, room_label text, source text, hotel_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), p.gender, rg.name, r.status, s.registration_id IS NOT NULL, coalesce(s.nights, '{}'),
         coalesce(s.room_wish, ''), z.room_id, z.label, z.source, z.hotel_id
    FROM public.registrations r
    JOIN public.participants p ON p.id = r.participant_id
    LEFT JOIN public.regions rg ON rg.id = p.region_id
    LEFT JOIN public.stay_requests s ON s.registration_id = r.id
    LEFT JOIN LATERAL (
      SELECT ra.room_id, ro.label, ra.source, ra.hotel_id
        FROM public.room_assignments ra JOIN public.rooms ro ON ro.id = ra.room_id JOIN public.hotels h ON h.id = ra.hotel_id
       WHERE ra.participant_id = p.id AND h.module_id = p_module_id
       ORDER BY h.created_at, h.id LIMIT 1) z ON true
   WHERE r.module_id = p_module_id AND r.status IN ('confirmed', 'waitlist') AND public.has_orga_access()
   ORDER BY p.last_name, p.first_name
$$;

DROP FUNCTION public.get_stay_overview(uuid);
CREATE FUNCTION public.get_stay_overview(p_module_id uuid)
RETURNS TABLE (participant_id uuid, name text, registration_status public.registration_status, nights date[],
               arrival_at timestamptz, arrival_by text, departure_at timestamptz, room_wish text, notes text,
               room_id uuid, room_label text, answered boolean, gender text, hotel_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), r.status, coalesce(s.nights, '{}'), s.arrival_at, s.arrival_by, s.departure_at,
         coalesce(s.room_wish, ''), coalesce(s.notes, ''), z.room_id, z.label, s.registration_id IS NOT NULL, p.gender, z.hotel_id
    FROM public.registrations r
    JOIN public.participants p ON p.id = r.participant_id
    LEFT JOIN public.stay_requests s ON s.registration_id = r.id
    LEFT JOIN LATERAL (
      SELECT ra.room_id, ro.label, ra.hotel_id
        FROM public.room_assignments ra JOIN public.rooms ro ON ro.id = ra.room_id JOIN public.hotels h ON h.id = ra.hotel_id
       WHERE ra.participant_id = p.id AND h.module_id = p_module_id
       ORDER BY h.created_at, h.id LIMIT 1) z ON true
   WHERE r.module_id = p_module_id AND r.status IN ('confirmed', 'waitlist') AND public.has_orga_access()
   ORDER BY p.last_name, p.first_name
$$;

CREATE OR REPLACE FUNCTION public.apply_room_plan(p_hotel_id uuid, p_plan jsonb)
RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE n integer; modul uuid;
BEGIN
  IF NOT public.has_orga_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required'; END IF;
  SELECT module_id INTO modul FROM public.hotels WHERE id = p_hotel_id;
  DELETE FROM public.room_assignments WHERE hotel_id = p_hotel_id AND source = 'auto';
  INSERT INTO public.room_assignments (room_id, participant_id, hotel_id, source)
  SELECT ro.id, (e ->> 'participant_id')::uuid, p_hotel_id, 'auto'
    FROM jsonb_array_elements(coalesce(p_plan, '[]')) e
    JOIN public.rooms ro ON ro.id = (e ->> 'room_id')::uuid AND ro.hotel_id = p_hotel_id
   -- wer schon in einem anderen Hotel des Moduls schläft, bleibt dort
   WHERE NOT EXISTS (SELECT 1 FROM public.room_assignments x JOIN public.hotels hx ON hx.id = x.hotel_id
                      WHERE x.participant_id = (e ->> 'participant_id')::uuid AND x.hotel_id <> p_hotel_id AND hx.module_id = modul)
  ON CONFLICT DO NOTHING;   -- wer von Hand zugeteilt ist, behält sein Zimmer
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

DROP FUNCTION public.apply_probe_rooms(uuid, integer, jsonb);
-- p_hotel_id leer: wie bisher (erstes Hotel des Moduls, sonst „Hotel (Name folgt)“; nur solange das Modul noch gar keine
-- Zimmer hat). p_hotel_id gesetzt: genau dieses Hotel des Moduls, solange es noch keine Zimmer hat.
CREATE FUNCTION public.apply_probe_rooms(p_module_id uuid, p_capacity integer, p_zimmer jsonb, p_hotel_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  hotel uuid;
  z jsonb;
  zimmer uuid;
  n integer := 0;
BEGIN
  IF NOT public.has_orga_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required'; END IF;
  IF p_capacity NOT IN (2, 3) THEN RETURN jsonb_build_object('result', 'invalid'); END IF;
  -- je Modul nur eine Übernahme gleichzeitig
  PERFORM pg_advisory_xact_lock(hashtextextended('apply_probe_rooms:' || p_module_id::text, 0));
  IF p_hotel_id IS NOT NULL THEN
    SELECT id INTO hotel FROM public.hotels WHERE id = p_hotel_id AND module_id = p_module_id;
    IF hotel IS NULL THEN RETURN jsonb_build_object('result', 'invalid'); END IF;
    IF EXISTS (SELECT 1 FROM public.rooms WHERE hotel_id = hotel) THEN RETURN jsonb_build_object('result', 'already_applied'); END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.rooms r JOIN public.hotels h ON h.id = r.hotel_id WHERE h.module_id = p_module_id) THEN
      RETURN jsonb_build_object('result', 'already_applied');
    END IF;
    SELECT id INTO hotel FROM public.hotels WHERE module_id = p_module_id ORDER BY created_at, id LIMIT 1;
    IF hotel IS NULL THEN
      INSERT INTO public.hotels (module_id, name) VALUES (p_module_id, 'Hotel (Name folgt)') RETURNING id INTO hotel;
    END IF;
  END IF;
  FOR z IN SELECT * FROM jsonb_array_elements(coalesce(p_zimmer, '[]')) LOOP
    INSERT INTO public.rooms (hotel_id, label, capacity, section)
    VALUES (hotel, z ->> 'label', p_capacity, nullif(z ->> 'section', '')) RETURNING id INTO zimmer;
    INSERT INTO public.room_assignments (room_id, participant_id, hotel_id, source)
    SELECT zimmer, p::uuid, hotel, 'auto' FROM jsonb_array_elements_text(coalesce(z -> 'personen', '[]')) p
     WHERE NOT EXISTS (SELECT 1 FROM public.room_assignments x JOIN public.hotels hx ON hx.id = x.hotel_id
                        WHERE x.participant_id = p::uuid AND hx.module_id = p_module_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  SELECT count(*) INTO n FROM public.room_assignments WHERE hotel_id = hotel;
  RETURN jsonb_build_object('result', 'applied', 'assigned', n, 'hotel_id', hotel);
END $$;

REVOKE ALL ON FUNCTION public.assign_room(uuid, uuid), public.get_room_planning(uuid), public.get_stay_overview(uuid),
  public.apply_probe_rooms(uuid, integer, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_room(uuid, uuid), public.get_room_planning(uuid), public.get_stay_overview(uuid),
  public.apply_probe_rooms(uuid, integer, jsonb, uuid) TO authenticated;

-- Hinweis für den Betrieb: Gibt es aus alter Zeit Personen mit Zimmern in zwei Hotels desselben Moduls? (Nur Meldung.)
DO $$
DECLARE doppelt integer;
BEGIN
  SELECT count(*) INTO doppelt FROM (
    SELECT ra.participant_id, h.module_id FROM public.room_assignments ra JOIN public.hotels h ON h.id = ra.hotel_id
     GROUP BY 1, 2 HAVING count(DISTINCT ra.hotel_id) > 1) x;
  IF doppelt > 0 THEN RAISE NOTICE 'Mehrere Hotels: % Personen haben Zimmer in zwei Hotels desselben Moduls (bitte unter Logistik prüfen).', doppelt; END IF;
END $$;

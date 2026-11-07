-- Zimmerplan „So übernehmen“ (Gesamttest 02.11.2026): Ein Doppelklick schickte zwei Anfragen. Beide fanden noch
-- keine Zimmer, legten Hotel und Zimmer an, die zweite scheiterte mit einer verwirrenden Meldung (oder es entstand
-- ein zweites Hotel). Jetzt geschieht alles in einer Transaktion, je Modul nacheinander: Die zweite Anfrage wartet
-- und meldet dann „schon übernommen“.
--
-- p_zimmer: [{ "label": "0001", "section": "Frauen", "personen": ["<participant_id>", …] }, …]
CREATE FUNCTION public.apply_probe_rooms(p_module_id uuid, p_capacity integer, p_zimmer jsonb)
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
  IF EXISTS (SELECT 1 FROM public.rooms r JOIN public.hotels h ON h.id = r.hotel_id WHERE h.module_id = p_module_id) THEN
    RETURN jsonb_build_object('result', 'already_applied');
  END IF;
  SELECT id INTO hotel FROM public.hotels WHERE module_id = p_module_id ORDER BY created_at, id LIMIT 1;   -- wie die App (hotels[0])
  IF hotel IS NULL THEN
    INSERT INTO public.hotels (module_id, name) VALUES (p_module_id, 'Hotel (Name folgt)') RETURNING id INTO hotel;
  END IF;
  FOR z IN SELECT * FROM jsonb_array_elements(coalesce(p_zimmer, '[]')) LOOP
    INSERT INTO public.rooms (hotel_id, label, capacity, section)
    VALUES (hotel, z ->> 'label', p_capacity, nullif(z ->> 'section', '')) RETURNING id INTO zimmer;
    INSERT INTO public.room_assignments (room_id, participant_id, hotel_id, source)
    SELECT zimmer, p::uuid, hotel, 'auto' FROM jsonb_array_elements_text(coalesce(z -> 'personen', '[]')) p
    ON CONFLICT DO NOTHING;
    n := n + (SELECT count(*) FROM jsonb_array_elements_text(coalesce(z -> 'personen', '[]')));
  END LOOP;
  RETURN jsonb_build_object('result', 'applied', 'assigned', n);
END $$;

REVOKE ALL ON FUNCTION public.apply_probe_rooms(uuid, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_probe_rooms(uuid, integer, jsonb) TO authenticated;

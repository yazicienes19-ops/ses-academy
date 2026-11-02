-- Nachbesserungen aus dem Gesamttest vom 02.11. (Eventtag):
--   1. Walk-in legt nichts mehr an, wenn der Einlass ohnehin abgelehnt würde (Zeitfenster, Modul abgesagt).
--      Der Admin-Haken „auch außerhalb des Zeitfensters“ gilt jetzt auch für Walk-ins.
--   2. Walk-in mit der E-Mail einer anderen Person checkt diese nicht mehr still ein (Tippfehler = falsche Person).
--   3. Walk-in ohne E-Mail mit einem Namen, der im Modul schon angemeldet ist, fragt erst nach (keine Doppelten).
--   4. Zimmer erscheinen in „Mein Bereich“ erst, wenn das Orga-Team sie je Hotel freigibt.

-- Namen vergleichbar machen: Groß/Klein, türkische und deutsche Sonderzeichen egal
CREATE FUNCTION public.name_key(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT lower(translate(trim(coalesce(p, '')), 'İIıÇçĞğÖöŞşÜüÄäÂâÊêÎîÛû', 'iiiccggoossuuaaaaeeiiuu'))
$$;

DROP FUNCTION public.create_walk_in(uuid, text, text, text, public.affiliation_status, boolean);

CREATE FUNCTION public.create_walk_in(
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
  IF NOT public.has_orga_access() THEN
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

REVOKE ALL ON FUNCTION public.create_walk_in(uuid, text, text, text, public.affiliation_status, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_walk_in(uuid, text, text, text, public.affiliation_status, boolean, boolean, boolean) TO authenticated;

-- Zimmer für Teilnehmende erst nach Freigabe zeigen. Bestehende Hotels mit Zuteilungen bleiben sichtbar wie bisher.
ALTER TABLE public.hotels ADD COLUMN rooms_visible boolean NOT NULL DEFAULT false;
UPDATE public.hotels h SET rooms_visible = true WHERE EXISTS (SELECT 1 FROM public.room_assignments ra WHERE ra.hotel_id = h.id);

CREATE OR REPLACE FUNCTION public.get_my_rooms()
RETURNS TABLE (module_id uuid, hotel_name text, hotel_address text, room_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT h.module_id, h.name, h.address, ro.label
    FROM public.room_assignments ra
    JOIN public.rooms ro ON ro.id = ra.room_id
    JOIN public.hotels h ON h.id = ra.hotel_id
   WHERE ra.participant_id = public.my_participant_id() AND h.rooms_visible
$$;

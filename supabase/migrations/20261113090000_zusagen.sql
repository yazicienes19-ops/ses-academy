-- Zusagen: Angemeldet ist der ganze Jahrgang automatisch. Ob jemand wirklich kommt, sagt erst die Zusage
-- (Formular-Antworten per Import, Anruf, Team), und am Ende der Einlass.
--   registrations.rsvp = 'zugesagt' | 'abgesagt' | NULL (noch keine Rückmeldung)
--   set_rsvp()         = Zusage setzen oder zurücknehmen (ab Orga-Team, z. B. nach einem Anruf)
--   get_call_list()    = liefert die Zusage mit, damit die Anrufliste „noch keine Zusage“ filtern kann

ALTER TABLE public.registrations
  ADD COLUMN rsvp text CHECK (rsvp IN ('zugesagt', 'abgesagt')),
  ADD COLUMN rsvp_at timestamptz,
  ADD COLUMN rsvp_source text CHECK (rsvp_source IN ('import', 'team', 'selbst'));

CREATE FUNCTION public.set_rsvp(p_module_id uuid, p_participant_id uuid, p_rsvp text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_orga_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required'; END IF;
  IF p_rsvp IS NOT NULL AND p_rsvp NOT IN ('zugesagt', 'abgesagt') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_rsvp'; END IF;
  UPDATE public.registrations
     SET rsvp = p_rsvp, rsvp_at = CASE WHEN p_rsvp IS NULL THEN NULL ELSE now() END,
         rsvp_source = CASE WHEN p_rsvp IS NULL THEN NULL ELSE 'team' END
   WHERE module_id = p_module_id AND participant_id = p_participant_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'registration_not_found'; END IF;
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_participant_id, 'rsvp_gesetzt', 'module', p_module_id, jsonb_build_object('rsvp', p_rsvp));
END $$;

REVOKE ALL ON FUNCTION public.set_rsvp(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_rsvp(uuid, uuid, text) TO authenticated;

DROP FUNCTION public.get_call_list(uuid);
CREATE FUNCTION public.get_call_list(p_module_id uuid)
RETURNS TABLE (participant_id uuid, name text, phone text, region text, mentor_name text,
               registration_status public.registration_status, stay_answered boolean, nights date[],
               contacts integer, last_at timestamptz, last_channel text, last_outcome text, last_note text, last_by text,
               rsvp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), p.phone, rg.name, m.name, r.status, s.registration_id IS NOT NULL, s.nights,
         (SELECT count(*)::integer FROM public.contact_log c WHERE c.participant_id = p.id AND c.module_id = p_module_id),
         l.created_at, l.channel, l.outcome, l.note, l.by_name, r.rsvp
    FROM public.registrations r
    JOIN public.participants p ON p.id = r.participant_id
    LEFT JOIN public.regions rg ON rg.id = p.region_id
    LEFT JOIN public.mentors m ON m.id = p.mentor_id
    LEFT JOIN public.stay_requests s ON s.registration_id = r.id
    LEFT JOIN LATERAL (
      SELECT c.created_at, c.channel, c.outcome, c.note, sm.display_name AS by_name
        FROM public.contact_log c LEFT JOIN public.staff_members sm ON sm.user_id = c.created_by
       WHERE c.participant_id = p.id AND c.module_id = p_module_id
       ORDER BY c.created_at DESC LIMIT 1) l ON true
   WHERE r.module_id = p_module_id AND r.status IN ('confirmed', 'waitlist') AND public.has_orga_access()
   ORDER BY p.last_name, p.first_name
$$;

REVOKE ALL ON FUNCTION public.get_call_list(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_call_list(uuid) TO authenticated;

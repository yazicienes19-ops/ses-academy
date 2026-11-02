-- Nachschärfung get_people() (Sicherheitsprüfung): Geschlecht nur für Admin/Vorstand, und auch der Abruf einer
-- einzelnen Person liefert nur Jahrgang und Personen mit einer Anmeldung.
CREATE OR REPLACE FUNCTION public.get_people(p_module_id uuid DEFAULT NULL, p_participant_id uuid DEFAULT NULL)
RETURNS TABLE (participant_id uuid, name text, email text, phone text, region text, mentor_name text, branch text,
               active boolean, affiliation_status public.affiliation_status, gender text, modules jsonb,
               registration_status public.registration_status, rsvp text, stay_answered boolean, nights date[],
               module_contacts integer, last_at timestamptz, last_channel text, last_outcome text, last_note text, last_by text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), CASE WHEN public.has_full_access() THEN p.email END, p.phone, rg.name, m.name,
         p.branch, p.active, p.affiliation_status, CASE WHEN public.has_full_access() THEN p.gender END,
         coalesce((SELECT jsonb_agg(jsonb_build_object('m', r2.module_id, 's', r2.status, 'r', r2.rsvp,
                    'd', (SELECT count(*) FROM public.attendances a WHERE a.registration_id = r2.id)))
                     FROM public.registrations r2 WHERE r2.participant_id = p.id), '[]'::jsonb),
         r.status, r.rsvp, s.registration_id IS NOT NULL, s.nights,
         (SELECT count(*)::integer FROM public.contact_log c WHERE c.participant_id = p.id AND c.module_id = p_module_id AND c.channel <> 'notiz'),
         l.created_at, l.channel, l.outcome, l.note, l.by_name
    FROM public.participants p
    LEFT JOIN public.regions rg ON rg.id = p.region_id
    LEFT JOIN public.mentors m ON m.id = p.mentor_id
    LEFT JOIN public.registrations r ON r.participant_id = p.id AND r.module_id = p_module_id
    LEFT JOIN public.stay_requests s ON s.registration_id = r.id
    LEFT JOIN LATERAL (
      SELECT c.created_at, c.channel, c.outcome, c.note, sm.display_name AS by_name
        FROM public.contact_log c LEFT JOIN public.staff_members sm ON sm.user_id = c.created_by
       WHERE c.participant_id = p.id
       ORDER BY c.created_at DESC LIMIT 1) l ON true
   WHERE public.has_orga_access()
     AND (p_participant_id IS NULL OR p.id = p_participant_id)
     -- nur Jahrgang und Angemeldete; auch beim Abruf einer einzelnen Person (keine Bewerbenden, keine Fremden)
     AND (p.affiliation_status = 'academy_student' OR r.id IS NOT NULL
          OR EXISTS (SELECT 1 FROM public.registrations r3 WHERE r3.participant_id = p.id))
   ORDER BY p.first_name, p.last_name
$$;


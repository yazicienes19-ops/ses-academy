-- Teilnehmende und Anrufliste werden eine Seite; Notizen werden ein Verlauf wie bei den Anrufen.
--   contact_log     = Anrufe, WhatsApp, Mails, persönliche Kontakte UND Notizen (channel 'notiz', ohne Ergebnis)
--   participant_notes (eine Notiz je Person) wandert als erster Eintrag in den Verlauf; die Tabelle bleibt als Archiv
--   get_people()    = Liste für die Teilnehmendenseite (ab Orga-Team): Kontaktdaten zum Telefonieren, Module mit
--                     Zusage und Anwesenheit, für ein gewähltes Modul Übernachtung und Kontaktstand. E-Mail nur für
--                     Admin/Vorstand.

ALTER TABLE public.contact_log DROP CONSTRAINT contact_log_channel_check;
ALTER TABLE public.contact_log DROP CONSTRAINT contact_log_outcome_check;
ALTER TABLE public.contact_log DROP CONSTRAINT contact_log_note_check;
ALTER TABLE public.contact_log ALTER COLUMN outcome DROP NOT NULL;
ALTER TABLE public.contact_log
  ADD CONSTRAINT contact_log_channel_check CHECK (channel IN ('anruf', 'whatsapp', 'mail', 'persoenlich', 'notiz')),
  ADD CONSTRAINT contact_log_outcome_check CHECK (
    (channel = 'notiz' AND outcome IS NULL) OR (channel <> 'notiz' AND outcome IN ('erreicht', 'nicht_erreicht', 'rueckruf'))),
  ADD CONSTRAINT contact_log_note_check CHECK (length(note) <= 2000 AND (channel <> 'notiz' OR length(trim(note)) > 0));

INSERT INTO public.contact_log (participant_id, channel, outcome, note, created_by, created_at)
SELECT participant_id, 'notiz', NULL, left(trim(body), 2000), NULL, updated_at
  FROM public.participant_notes
 WHERE trim(body) <> '';

CREATE FUNCTION public.get_people(p_module_id uuid DEFAULT NULL, p_participant_id uuid DEFAULT NULL)
RETURNS TABLE (participant_id uuid, name text, email text, phone text, region text, mentor_name text, branch text,
               active boolean, affiliation_status public.affiliation_status, gender text, modules jsonb,
               registration_status public.registration_status, rsvp text, stay_answered boolean, nights date[],
               module_contacts integer, last_at timestamptz, last_channel text, last_outcome text, last_note text, last_by text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), CASE WHEN public.has_full_access() THEN p.email END, p.phone, rg.name, m.name,
         p.branch, p.active, p.affiliation_status, p.gender,
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
     AND (p_participant_id IS NOT NULL OR p.affiliation_status = 'academy_student' OR r.id IS NOT NULL)
   ORDER BY p.first_name, p.last_name
$$;

REVOKE ALL ON FUNCTION public.get_people(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_people(uuid, uuid) TO authenticated;

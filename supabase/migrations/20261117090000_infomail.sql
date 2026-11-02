-- Eine Info-Mail je Modul statt getrennter Mails: Ticket (QR, Kurzcode), Ort, Übernachtung mit Hotel und Zimmer,
-- Tagesordnung. email_log merkt sich das Modul; damit zählt der Versand je Modul (kein Doppelversand bei weit
-- entfernten Modulen mehr wie beim 30-Tage-Fenster der Ticket-Mail).
--   get_info_status() = je angemeldeter Person: E-Mail da?, Zusage, Info-Mail gesendet/fehlgeschlagen/offen

ALTER TABLE public.email_log ADD COLUMN module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;
CREATE INDEX email_log_module_idx ON public.email_log (module_id, kind, participant_id);

CREATE FUNCTION public.get_info_status(p_module_id uuid)
RETURNS TABLE (participant_id uuid, name text, email text, rsvp text, info_status text, last_attempt_at timestamptz, last_error text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), p.email, r.rsvp,
         CASE WHEN p.email IS NULL THEN 'keine_mail'
              WHEN l.status = 'sent' THEN 'gesendet'
              WHEN l.status = 'failed' THEN 'fehlgeschlagen'
              ELSE 'offen' END,
         l.created_at, l.error
    FROM public.registrations r
    JOIN public.participants p ON p.id = r.participant_id
    LEFT JOIN LATERAL (
      SELECT e.status, e.error, e.created_at FROM public.email_log e
       WHERE e.participant_id = p.id AND e.kind = 'info' AND e.module_id = p_module_id
       ORDER BY e.created_at DESC LIMIT 1) l ON true
   WHERE r.module_id = p_module_id AND r.status = 'confirmed' AND public.has_full_access()
   ORDER BY p.first_name, p.last_name
$$;

REVOKE ALL ON FUNCTION public.get_info_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_info_status(uuid) TO authenticated;

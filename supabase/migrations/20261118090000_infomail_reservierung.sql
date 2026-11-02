-- Info-Mail: kein Doppelversand, wenn zwei Teammitglieder gleichzeitig „senden“ drücken. Wer eine Person zuerst
-- reserviert, verschickt; die andere Sitzung überspringt sie. Schlägt der Versand fehl, wird die Reservierung frei.
-- Eine hängengebliebene Reservierung (Absturz mitten im Versand) wird nach 10 Minuten wieder frei.
-- Außerdem: Ausgeschiedene (participants.active = false) bekommen keine Info-Mail.

CREATE TABLE public.info_mail_claims (
  module_id      uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  claimed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module_id, participant_id)
);
ALTER TABLE public.info_mail_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.info_mail_claims FROM anon, authenticated;

CREATE FUNCTION public.claim_info_mail(p_module_id uuid, p_participant_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE ok boolean;
BEGIN
  IF NOT public.has_full_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required'; END IF;
  INSERT INTO public.info_mail_claims (module_id, participant_id) VALUES (p_module_id, p_participant_id)
  ON CONFLICT (module_id, participant_id) DO UPDATE SET claimed_at = now()
    WHERE public.info_mail_claims.claimed_at < now() - interval '10 minutes'
  RETURNING true INTO ok;
  RETURN coalesce(ok, false);
END $$;

CREATE FUNCTION public.release_info_mail(p_module_id uuid, p_participant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_full_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required'; END IF;
  DELETE FROM public.info_mail_claims WHERE module_id = p_module_id AND participant_id = p_participant_id;
END $$;

REVOKE ALL ON FUNCTION public.claim_info_mail(uuid, uuid), public.release_info_mail(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_info_mail(uuid, uuid), public.release_info_mail(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_info_status(p_module_id uuid)
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
   WHERE r.module_id = p_module_id AND r.status = 'confirmed' AND p.active AND public.has_full_access()
   ORDER BY p.first_name, p.last_name
$$;

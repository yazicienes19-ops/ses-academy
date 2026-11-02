-- Kontakt-Protokoll: wer hat wen wann angerufen (oder per WhatsApp, Mail, persönlich erreicht), mit Ergebnis und Notiz.
-- Damit sieht das Team bei Telefonaktionen (Übernachtung nachfragen, „Fehlt noch“ am Eventtag), wer schon dran war.
--
--   contact_log     = ein Eintrag je Kontaktversuch; Anlass optional ein Modul. Lesen und eintragen ab Orga-Team,
--                     eigene Einträge 24 Stunden lang löschbar (Vertipper), Admin/Vorstand immer.
--   get_call_list() = Anrufliste eines Moduls: Angemeldete mit Telefon, Region, Sorumlu, Übernachtung, letztem Kontakt
--   get_contacts()  = Verlauf eines Moduls oder einer Person, mit Namen der Teammitglieder

CREATE TABLE public.contact_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  module_id      uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  channel        text NOT NULL DEFAULT 'anruf' CHECK (channel IN ('anruf', 'whatsapp', 'mail', 'persoenlich')),
  outcome        text NOT NULL CHECK (outcome IN ('erreicht', 'nicht_erreicht', 'rueckruf')),
  note           text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  created_by     uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_log_person_idx ON public.contact_log (participant_id, created_at DESC);
CREATE INDEX contact_log_module_idx ON public.contact_log (module_id, created_at DESC);

ALTER TABLE public.contact_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_read   ON public.contact_log FOR SELECT TO authenticated USING (public.has_orga_access());
CREATE POLICY contact_insert ON public.contact_log FOR INSERT TO authenticated
  WITH CHECK (public.has_orga_access() AND created_by = auth.uid() AND created_at = now());   -- nicht zurückdatieren
CREATE POLICY contact_delete ON public.contact_log FOR DELETE TO authenticated
  USING (public.has_full_access() OR (public.has_orga_access() AND created_by = auth.uid() AND created_at > now() - interval '24 hours'));
REVOKE ALL ON public.contact_log FROM anon;
REVOKE UPDATE ON public.contact_log FROM authenticated;

-- Anrufliste: Orga-Team darf participants nicht direkt lesen, bekommt hier nur, was zum Telefonieren nötig ist
CREATE FUNCTION public.get_call_list(p_module_id uuid)
RETURNS TABLE (participant_id uuid, name text, phone text, region text, mentor_name text,
               registration_status public.registration_status, stay_answered boolean, nights date[],
               contacts integer, last_at timestamptz, last_channel text, last_outcome text, last_note text, last_by text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), p.phone, rg.name, m.name, r.status, s.registration_id IS NOT NULL, s.nights,
         (SELECT count(*)::integer FROM public.contact_log c WHERE c.participant_id = p.id AND c.module_id = p_module_id),
         l.created_at, l.channel, l.outcome, l.note, l.by_name
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

-- Verlauf: eines Moduls (Anrufliste, Eventtag) oder einer Person (alle Module)
CREATE FUNCTION public.get_contacts(p_module_id uuid DEFAULT NULL, p_participant_id uuid DEFAULT NULL)
RETURNS TABLE (id uuid, participant_id uuid, module_id uuid, module_title text, channel text, outcome text, note text,
               created_at timestamptz, by_name text, mine boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.id, c.participant_id, c.module_id, mo.title, c.channel, c.outcome, c.note, c.created_at, sm.display_name,
         c.created_by = auth.uid()
    FROM public.contact_log c
    LEFT JOIN public.modules mo ON mo.id = c.module_id
    LEFT JOIN public.staff_members sm ON sm.user_id = c.created_by
   WHERE public.has_orga_access()
     AND (p_module_id IS NOT NULL OR p_participant_id IS NOT NULL)
     AND (p_module_id IS NULL OR c.module_id = p_module_id)
     AND (p_participant_id IS NULL OR c.participant_id = p_participant_id)
   ORDER BY c.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_call_list(uuid), public.get_contacts(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_call_list(uuid), public.get_contacts(uuid, uuid) TO authenticated;

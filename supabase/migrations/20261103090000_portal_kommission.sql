-- SES Academy: Kommission ↔ Teilnehmende — Abgaben hochladen, Material, Regieplan, Hotelzimmer.
--
-- Rollen (unverändert, nur konsequent angewandt):
--   Kommission  = Teamkonten in staff_members (admin, vorstand, orga_team, checkin_helper)
--   Teilnehmer  = participants mit verknüpftem Login (user_id), siehe link_my_account()
--
-- Rechte der neuen Bereiche:
--   Hausaufgaben-Formate, Material, Regieplan  → ab orga_team (has_orga_access)
--   Hotelzimmer + Türcodes                      → nur admin/vorstand (has_full_access): Namensliste + Zugangscodes
--   Teilnehmende sehen ausschließlich eigene bzw. freigegebene Daten ihres Jahrgangs/ihrer Module.
--
-- Interne Felder liegen wie bei participant_notes in eigenen Tabellen, weil RLS Zeilen schützt, nicht Spalten.

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------
-- Jahrgang der angemeldeten Teilnehmerin / des angemeldeten Teilnehmers
CREATE FUNCTION public.my_cohort_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT cohort_id FROM public.participants WHERE user_id = auth.uid() AND active
$$;

-- Ist die angemeldete Person für dieses Modul angemeldet (nicht abgesagt/abgelehnt)?
CREATE FUNCTION public.am_registered_for_module(p_module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations r
      JOIN public.participants p ON p.id = r.participant_id
     WHERE r.module_id = p_module_id AND p.user_id = auth.uid() AND p.active
       AND r.status IN ('confirmed', 'pending', 'waitlist', 'excused'))
$$;

-- ---------------------------------------------------------------------------
-- 1) Hausaufgaben: erlaubte Formate + Abgaben durch Teilnehmende
-- ---------------------------------------------------------------------------
ALTER TABLE public.assignments
  ADD COLUMN allowed_formats text[] NOT NULL DEFAULT ARRAY['pdf', 'docx', 'text', 'link']
    CHECK (cardinality(allowed_formats) > 0 AND allowed_formats <@ ARRAY['pdf', 'docx', 'text', 'link']);

ALTER TABLE public.submissions
  ADD COLUMN content      text,                       -- Textabgabe
  ADD COLUMN upload_path  text,                       -- Pfad im Bucket „abgaben“
  ADD COLUMN upload_name  text,                       -- Originaler Dateiname
  ADD COLUMN submitted_by uuid REFERENCES public.participants(id) ON DELETE CASCADE,
  ADD COLUMN submitted_at timestamptz;
ALTER TABLE public.submissions DROP CONSTRAINT submissions_source_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_source_check
  CHECK (source IN ('staff', 'list', 'review_sheet', 'participant'));
-- Eine eigene Abgabe pro Person und Aufgabe (Nachbessern überschreibt sie)
CREATE UNIQUE INDEX submissions_participant_unique ON public.submissions (assignment_id, submitted_by) WHERE source = 'participant';

-- Abgabe einreichen oder nachbessern. Prüft Jahrgang, erlaubte Formate und den Dateipfad.
-- Nach der ersten Bewertung ist die Abgabe gesperrt.
CREATE FUNCTION public.submit_assignment(
  p_assignment_id uuid, p_text text DEFAULT NULL, p_link text DEFAULT NULL,
  p_upload_path text DEFAULT NULL, p_upload_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.my_participant_id();
  a public.assignments;
  sub_id uuid;
  txt text := nullif(btrim(p_text), '');
  lnk text := nullif(btrim(p_link), '');
  ext text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'participant_required'; END IF;
  SELECT * INTO a FROM public.assignments WHERE id = p_assignment_id;
  IF a.id IS NULL OR a.cohort_id IS DISTINCT FROM public.my_cohort_id() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'assignment_not_mine';
  END IF;
  IF txt IS NULL AND lnk IS NULL AND p_upload_path IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'empty_submission';
  END IF;
  IF txt IS NOT NULL AND NOT 'text' = ANY (a.allowed_formats) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'format_not_allowed:text';
  END IF;
  IF lnk IS NOT NULL THEN
    IF NOT 'link' = ANY (a.allowed_formats) THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'format_not_allowed:link'; END IF;
    IF lnk !~* '^https?://[^\s]+$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_link'; END IF;
  END IF;
  IF p_upload_path IS NOT NULL THEN
    ext := lower(substring(p_upload_path FROM '\.([a-z0-9]+)$'));
    IF ext IS NULL OR NOT ext = ANY (a.allowed_formats) OR ext NOT IN ('pdf', 'docx') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'format_not_allowed:file';
    END IF;
    -- Nur der eigene Ordner dieser Aufgabe, und die Datei muss wirklich hochgeladen sein
    IF p_upload_path <> format('%s/%s/abgabe.%s', a.id, me, ext)
       OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'abgaben' AND o.name = p_upload_path) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'invalid_upload_path';
    END IF;
  END IF;

  SELECT s.id INTO sub_id FROM public.submissions s
   WHERE s.assignment_id = a.id AND s.submitted_by = me AND s.source = 'participant';
  IF sub_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.submission_id = sub_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'already_reviewed';
  END IF;

  IF sub_id IS NULL THEN
    INSERT INTO public.submissions (assignment_id, label, source, submitted_by, content, link, upload_path, upload_name, submitted_on, submitted_at)
    SELECT a.id, public.display_name(p), 'participant', me, txt, lnk, p_upload_path, nullif(btrim(p_upload_name), ''),
           (now() AT TIME ZONE 'Europe/Berlin')::date, now()
      FROM public.participants p WHERE p.id = me
    RETURNING id INTO sub_id;
    INSERT INTO public.submission_participants (submission_id, participant_id) VALUES (sub_id, me);
  ELSE
    UPDATE public.submissions
       SET content = txt, link = lnk, upload_path = p_upload_path, upload_name = nullif(btrim(p_upload_name), ''),
           submitted_on = (now() AT TIME ZONE 'Europe/Berlin')::date, submitted_at = now()
     WHERE id = sub_id;
  END IF;
  RETURN sub_id;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Material (Reader, Präsentationen, Handouts)
-- ---------------------------------------------------------------------------
CREATE TABLE public.resources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id    uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  module_id    uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  title        text NOT NULL CHECK (btrim(title) <> ''),
  description  text NOT NULL DEFAULT '',
  storage_path text NOT NULL UNIQUE,              -- Pfad im Bucket „material“
  file_name    text NOT NULL,
  size_bytes   bigint,
  published    boolean NOT NULL DEFAULT false,    -- erst sichtbar, wenn freigeschaltet
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resources_cohort_idx ON public.resources (cohort_id);

-- ---------------------------------------------------------------------------
-- 3) Regieplan / Tagesordnung
-- ---------------------------------------------------------------------------
CREATE TABLE public.agenda_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_day_id uuid NOT NULL REFERENCES public.module_days(id) ON DELETE CASCADE,
  starts_at     time NOT NULL,
  ends_at       time CHECK (ends_at IS NULL OR ends_at > starts_at),
  title         text NOT NULL CHECK (btrim(title) <> ''),
  description   text NOT NULL DEFAULT '',          -- für Teilnehmende sichtbar
  location      text,                              -- Raum
  published     boolean NOT NULL DEFAULT false,    -- in der Tagesordnung der Teilnehmenden sichtbar
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agenda_items_day_idx ON public.agenda_items (module_day_id, starts_at);
CREATE TRIGGER agenda_items_touch BEFORE UPDATE ON public.agenda_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Interne Orga-Spalten des Regieplans – nie für Teilnehmende lesbar
CREATE TABLE public.agenda_item_internal (
  item_id     uuid PRIMARY KEY REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  responsible text NOT NULL DEFAULT '',
  note        text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER agenda_internal_touch BEFORE UPDATE ON public.agenda_item_internal FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Hotel & Zimmerverteilung
-- ---------------------------------------------------------------------------
CREATE TABLE public.room_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id      uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  hotel_name     text NOT NULL CHECK (btrim(hotel_name) <> ''),
  room_number    text NOT NULL CHECK (btrim(room_number) <> ''),
  room_pin_code  text,
  check_in_info  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, participant_id)
);
CREATE INDEX room_assignments_room_idx ON public.room_assignments (module_id, hotel_name, room_number);
CREATE TRIGGER room_assignments_touch BEFORE UPDATE ON public.room_assignments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Freigabe je Modul: erst danach sehen Teilnehmende ihr Zimmer
CREATE TABLE public.accommodation_releases (
  module_id    uuid PRIMARY KEY REFERENCES public.modules(id) ON DELETE CASCADE,
  published    boolean NOT NULL DEFAULT false,
  published_at timestamptz
);

-- Ist die Zimmerverteilung dieses Moduls freigegeben? (Teilnehmende dürfen accommodation_releases nicht lesen)
CREATE FUNCTION public.accommodation_published(p_module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT published FROM public.accommodation_releases WHERE module_id = p_module_id), false)
$$;

-- Eigene, freigegebene Zimmer inkl. Vornamen der Mitbewohner:innen (gleiches Modul, Hotel, Zimmer).
-- Teilnehmende dürfen fremde Zuweisungen nicht lesen; deshalb liefert nur diese Funktion die Vornamen.
CREATE FUNCTION public.my_rooms()
RETURNS TABLE (module_id uuid, module_title text, hotel_name text, room_number text, room_pin_code text,
               check_in_info text, roommates text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT ra.module_id, m.title, ra.hotel_name, ra.room_number, ra.room_pin_code, ra.check_in_info,
         coalesce((SELECT array_agg(split_part(p.first_name, ' ', 1) ORDER BY p.first_name)
                     FROM public.room_assignments o
                     JOIN public.participants p ON p.id = o.participant_id
                    WHERE o.module_id = ra.module_id AND o.hotel_name = ra.hotel_name
                      AND o.room_number = ra.room_number AND o.participant_id <> ra.participant_id), '{}')
    FROM public.room_assignments ra
    JOIN public.modules m ON m.id = ra.module_id
   WHERE ra.participant_id = public.my_participant_id() AND public.accommodation_published(ra.module_id)
$$;

-- ---------------------------------------------------------------------------
-- Zeilenschutz
-- ---------------------------------------------------------------------------
ALTER TABLE public.resources              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_item_internal   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY resources_orga ON public.resources FOR ALL TO authenticated
  USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());
CREATE POLICY resources_self ON public.resources FOR SELECT TO authenticated
  USING (published AND cohort_id = public.my_cohort_id());

CREATE POLICY agenda_orga ON public.agenda_items FOR ALL TO authenticated
  USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());
CREATE POLICY agenda_self ON public.agenda_items FOR SELECT TO authenticated
  USING (published AND EXISTS (SELECT 1 FROM public.module_days d WHERE d.id = module_day_id
                                  AND public.am_registered_for_module(d.module_id)));
CREATE POLICY agenda_internal_orga ON public.agenda_item_internal FOR ALL TO authenticated
  USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());

CREATE POLICY rooms_full ON public.room_assignments FOR ALL TO authenticated
  USING (public.has_full_access()) WITH CHECK (public.has_full_access());
CREATE POLICY rooms_self ON public.room_assignments FOR SELECT TO authenticated
  USING (participant_id = public.my_participant_id() AND public.accommodation_published(module_id));
CREATE POLICY releases_full ON public.accommodation_releases FOR ALL TO authenticated
  USING (public.has_full_access()) WITH CHECK (public.has_full_access());

REVOKE ALL ON FUNCTION public.my_cohort_id(), public.am_registered_for_module(uuid),
  public.submit_assignment(uuid, text, text, text, text), public.my_rooms(), public.accommodation_published(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_cohort_id(), public.am_registered_for_module(uuid),
  public.submit_assignment(uuid, text, text, text, text), public.my_rooms(), public.accommodation_published(uuid) TO authenticated;
REVOKE ALL ON public.resources, public.agenda_items, public.agenda_item_internal,
  public.room_assignments, public.accommodation_releases FROM anon;

-- ---------------------------------------------------------------------------
-- Dateispeicher (privat; Zugriff nur über signierte Links)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('abgaben', 'abgaben', false, 20971520,
   ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('material', 'material', false, 52428800,
   ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
ON CONFLICT (id) DO NOTHING;

-- Abgaben: Pfad = <assignment_id>/<participant_id>/abgabe.<pdf|docx>
-- Teilnehmende: nur der eigene Ordner bei Aufgaben des eigenen Jahrgangs; Kommission (ab orga_team): lesen.
CREATE POLICY abgaben_self_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'abgaben'
    AND (storage.foldername(name))[2] = public.my_participant_id()::text
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.assignments WHERE cohort_id = public.my_cohort_id()));
CREATE POLICY abgaben_self_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'abgaben' AND (storage.foldername(name))[2] = public.my_participant_id()::text)
  WITH CHECK (bucket_id = 'abgaben'
    AND (storage.foldername(name))[2] = public.my_participant_id()::text
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.assignments WHERE cohort_id = public.my_cohort_id()));
CREATE POLICY abgaben_self_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'abgaben' AND (storage.foldername(name))[2] = public.my_participant_id()::text);
CREATE POLICY abgaben_orga_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'abgaben' AND public.has_orga_access());

-- Material: Kommission (ab orga_team) verwaltet; Teilnehmende lesen nur freigeschaltete Dateien ihres Jahrgangs.
CREATE POLICY material_orga ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'material' AND public.has_orga_access())
  WITH CHECK (bucket_id = 'material' AND public.has_orga_access());
CREATE POLICY material_self_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'material' AND EXISTS (
    SELECT 1 FROM public.resources r
     WHERE r.storage_path = name AND r.published AND r.cohort_id = public.my_cohort_id()));

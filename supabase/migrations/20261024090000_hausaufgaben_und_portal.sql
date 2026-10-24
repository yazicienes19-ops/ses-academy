-- SES Academy: Ergänzung zum Grundmodell.
--
--   regions                 = Region (Bölge) mit Land, einheitliche Schreibweise
--   mentors                 = Verantwortliche (Sorumlu Kişi) für eine Gruppe von Teilnehmenden; Login optional
--   participants            + Region, Land, GT/KGT, Verantwortliche:r, aktiv
--   assignments             = Hausaufgabe eines Jahrgangs (z. B. Rhetorik-Video)
--   submissions             = Abgabe; kann von mehreren Personen stammen (Gruppenvideo)
--   reviews                 = Bewertung nach dem Rhetorik-Bogen: 9 Kriterien je 1–5 Punkte, gleich gewichtet
--   contributions           = Stimmen: Artikel, Reden, Videos … der Teilnehmenden, mit der Person verknüpft
--
-- Rechte: Hausaufgaben und Bewertungen ab orga_team (Bewertungsteam), Stammdaten und Importe nur admin/vorstand.
-- Teilnehmende lesen ihre eigenen Abgaben, Bewertungen und Beiträge (Portal „Mein Bereich“).

-- ---------------------------------------------------------------------------
-- Regionen und Verantwortliche
-- ---------------------------------------------------------------------------
CREATE TABLE public.regions (
  id      serial PRIMARY KEY,
  name    text NOT NULL UNIQUE,
  country text NOT NULL CHECK (country IN ('DE', 'AT', 'FR', 'CH', 'NL', 'BE', 'other'))
);

CREATE TABLE public.mentors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE CHECK (length(trim(name)) > 1),
  email      text UNIQUE CHECK (email IS NULL OR email = lower(trim(email))),
  user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.participants
  ADD COLUMN region_id integer REFERENCES public.regions(id) ON DELETE SET NULL,
  ADD COLUMN country   text CHECK (country IS NULL OR country IN ('DE', 'AT', 'FR', 'CH', 'NL', 'BE', 'other')),
  ADD COLUMN branch    text CHECK (branch IS NULL OR branch IN ('GT', 'KGT')),
  ADD COLUMN mentor_id uuid REFERENCES public.mentors(id) ON DELETE SET NULL,
  ADD COLUMN active    boolean NOT NULL DEFAULT true;
CREATE INDEX participants_mentor_idx ON public.participants (mentor_id);
CREATE INDEX participants_region_idx ON public.participants (region_id);

-- ---------------------------------------------------------------------------
-- Hausaufgaben, Abgaben, Bewertungen
-- ---------------------------------------------------------------------------
CREATE TABLE public.assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id   uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  module_id   uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  number      integer NOT NULL CHECK (number > 0),
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, number)
);

CREATE TABLE public.submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  label         text NOT NULL,                 -- z. B. Name(n) aus dem Bewertungsbogen
  file_name     text,                          -- Dateiname des Videos; Schlüssel für wiederholte Importe
  link          text,
  submitted_on  date,
  note          text,
  -- 'list' = nur als abgegeben markiert (Hausaufgabenliste), wird durch das echte Video ersetzt
  source        text NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'list', 'review_sheet')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX submissions_file_unique ON public.submissions (assignment_id, file_name) WHERE file_name IS NOT NULL;

CREATE TABLE public.submission_participants (
  submission_id  uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  PRIMARY KEY (submission_id, participant_id)
);
CREATE INDEX submission_participants_participant_idx ON public.submission_participants (participant_id);

CREATE TABLE public.reviews (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id      uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  reviewer_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name      text,                     -- bei Importen: „Bewertet von“ aus dem Excel-Bogen
  content            smallint CHECK (content BETWEEN 1 AND 5),            -- Inhalt
  structure          smallint CHECK (structure BETWEEN 1 AND 5),          -- Aufbau & Struktur
  body_language      smallint CHECK (body_language BETWEEN 1 AND 5),      -- Körpersprache
  facial_expression  smallint CHECK (facial_expression BETWEEN 1 AND 5),  -- Mimik & Blickkontakt
  voice              smallint CHECK (voice BETWEEN 1 AND 5),              -- Stimme & Sprechweise
  language           smallint CHECK (language BETWEEN 1 AND 5),           -- Ausdruck & Sprache
  presence           smallint CHECK (presence BETWEEN 1 AND 5),           -- Auftreten & Sicherheit
  impact             smallint CHECK (impact BETWEEN 1 AND 5),             -- Publikumswirkung
  overall            smallint CHECK (overall BETWEEN 1 AND 5),            -- Gesamteindruck
  strengths          text,                     -- Das war besonders gut
  improvements       text,                     -- Das könnte verbessert werden
  tip                text,                     -- Konkreter Tipp für das nächste Video
  reviewed_on        date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_submission_idx ON public.reviews (submission_id);
-- Pro Person im Team höchstens eine Bewertung je Abgabe (Importe ohne reviewer_id ausgenommen)
CREATE UNIQUE INDEX reviews_one_per_reviewer ON public.reviews (submission_id, reviewer_id) WHERE reviewer_id IS NOT NULL;
CREATE TRIGGER reviews_touch BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Interne Notizen zu Teilnehmenden – eigene Tabelle, weil Teilnehmende ihre participants-Zeile
-- komplett lesen dürfen (participants_self) und dort nichts Internes stehen soll.
-- ---------------------------------------------------------------------------
CREATE TABLE public.participant_notes (
  participant_id uuid PRIMARY KEY REFERENCES public.participants(id) ON DELETE CASCADE,
  body           text NOT NULL DEFAULT '',
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER participant_notes_touch BEFORE UPDATE ON public.participant_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Stimmen-Beiträge
-- ---------------------------------------------------------------------------
CREATE TABLE public.contributions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind IN ('kommentar', 'video', 'grafik', 'podcast', 'rede', 'artikel')),
  title          text NOT NULL,
  url            text,
  outlet         text,                         -- Medium, z. B. „Perspektif“
  website_slug   text CHECK (website_slug IS NULL OR website_slug ~ '^[a-z0-9-]+$'),
  published_on   date,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contributions_participant_idx ON public.contributions (participant_id);

-- ---------------------------------------------------------------------------
-- Funktionen
-- ---------------------------------------------------------------------------
-- Eigene participant-ID der angemeldeten Person (für Zugriffsregeln des Portals)
CREATE FUNCTION public.my_participant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.participants WHERE user_id = auth.uid()
$$;

-- Nach dem Login per E-Mail-Code: Konto mit Teilnehmer- bzw. Verantwortlichen-Datensatz verknüpfen.
-- Nur, wenn die Sitzung über Code/Link aus der E-Mail entstanden ist (Besitz des Postfachs bewiesen) und die
-- Adresse bestätigt ist. Sonst könnte sich jemand per Passwort-Registrierung mit fremder Adresse ein Profil holen.
CREATE FUNCTION public.link_my_account()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  mail text;
  via_mail boolean := EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) a
     WHERE a ->> 'method' IN ('otp', 'magiclink'));
  found_as text := 'none';
BEGIN
  IF auth.uid() IS NULL OR NOT via_mail THEN RETURN found_as; END IF;
  SELECT public.normalize_email(u.email) INTO mail FROM auth.users u
   WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL;
  IF mail IS NULL THEN RETURN found_as; END IF;
  UPDATE public.participants SET user_id = auth.uid() WHERE email = mail AND user_id IS NULL AND active;
  IF EXISTS (SELECT 1 FROM public.participants WHERE user_id = auth.uid()) THEN found_as := 'participant'; END IF;
  UPDATE public.mentors SET user_id = auth.uid() WHERE email = mail AND user_id IS NULL;
  RETURN found_as;
END $$;

-- Namensliste ohne Kontaktdaten für das Bewertungsteam (orga_team darf participants nicht direkt lesen)
CREATE FUNCTION public.get_participant_directory()
RETURNS TABLE (id uuid, display_name text, region text, country text, branch text, mentor text, active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_orga_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required';
  END IF;
  RETURN QUERY
  SELECT p.id, public.display_name(p), r.name, coalesce(p.country, r.country), p.branch, m.name, p.active
    FROM public.participants p
    LEFT JOIN public.regions r ON r.id = p.region_id
    LEFT JOIN public.mentors m ON m.id = p.mentor_id
   WHERE p.affiliation_status IN ('academy_student', 'alumni')
   ORDER BY p.first_name, p.last_name;
END $$;

-- Neues Modul im Jahrgang: alle Teilnehmenden des Jahrgangs anmelden – auch die, die per Liste
-- importiert wurden und deshalb keine Bewerbung im System haben.
CREATE OR REPLACE FUNCTION public.register_cohort_for_module(p_module_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE added integer;
BEGIN
  IF NOT public.has_full_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required';
  END IF;
  INSERT INTO public.registrations (module_id, participant_id, status, source)
  SELECT m.id, x.participant_id, 'confirmed', 'cohort'
    FROM public.modules m
    JOIN (
      SELECT a.cohort_id, a.participant_id FROM public.applications a
       WHERE a.status = 'angenommen' AND a.participant_id IS NOT NULL
      UNION
      SELECT p.cohort_id, p.id FROM public.participants p
       WHERE p.affiliation_status = 'academy_student' AND p.active AND p.cohort_id IS NOT NULL
    ) x ON x.cohort_id = m.cohort_id
   WHERE m.id = p_module_id
  ON CONFLICT (module_id, participant_id) DO NOTHING;
  GET DIAGNOSTICS added = ROW_COUNT;
  RETURN added;
END $$;

-- ---------------------------------------------------------------------------
-- Zeilenschutz
-- ---------------------------------------------------------------------------
ALTER TABLE public.regions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_notes       ENABLE ROW LEVEL SECURITY;

CREATE POLICY regions_read        ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY regions_full_write  ON public.regions FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());

CREATE POLICY mentors_orga_read   ON public.mentors FOR SELECT TO authenticated USING (public.has_orga_access() OR user_id = auth.uid());
CREATE POLICY mentors_full_write  ON public.mentors FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());

CREATE POLICY assignments_read    ON public.assignments FOR SELECT TO authenticated
  USING (public.has_orga_access() OR cohort_id = (SELECT cohort_id FROM public.participants WHERE user_id = auth.uid()));
CREATE POLICY assignments_orga    ON public.assignments FOR ALL TO authenticated USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());

CREATE POLICY submissions_orga    ON public.submissions FOR ALL TO authenticated USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());
CREATE POLICY submissions_self    ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.submission_participants sp WHERE sp.submission_id = submissions.id AND sp.participant_id = public.my_participant_id()));

CREATE POLICY sub_part_orga       ON public.submission_participants FOR ALL TO authenticated USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());
CREATE POLICY sub_part_self       ON public.submission_participants FOR SELECT TO authenticated USING (participant_id = public.my_participant_id());

CREATE POLICY reviews_orga        ON public.reviews FOR ALL TO authenticated USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());
CREATE POLICY reviews_self        ON public.reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.submission_participants sp WHERE sp.submission_id = reviews.submission_id AND sp.participant_id = public.my_participant_id()));

CREATE POLICY contributions_full  ON public.contributions FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());
CREATE POLICY contributions_orga  ON public.contributions FOR SELECT TO authenticated USING (public.has_orga_access());
CREATE POLICY contributions_self  ON public.contributions FOR SELECT TO authenticated USING (participant_id = public.my_participant_id());
CREATE POLICY notes_full         ON public.participant_notes FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());

-- Funktionen wie im Grundmodell: erst allen entziehen, dann gezielt freigeben
REVOKE ALL ON FUNCTION public.my_participant_id(), public.link_my_account(), public.get_participant_directory(),
  public.register_cohort_for_module(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_participant_id(), public.link_my_account(), public.get_participant_directory(),
  public.register_cohort_for_module(uuid) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.regions, public.mentors, public.assignments, public.submissions,
  public.submission_participants, public.reviews, public.contributions, public.participant_notes FROM anon;

-- ---------------------------------------------------------------------------
-- Regionen (vereinheitlichte Schreibweise der bisherigen Listen)
-- ---------------------------------------------------------------------------
INSERT INTO public.regions (name, country) VALUES
  ('Berlin', 'DE'), ('Bremen', 'DE'), ('Düsseldorf', 'DE'), ('Freiburg-Donau', 'DE'), ('Güney Bavyera', 'DE'),
  ('Hamburg', 'DE'), ('Hannover', 'DE'), ('Hessen', 'DE'), ('Köln', 'DE'), ('Kuzey Ruhr', 'DE'),
  ('R.-N.-Saar', 'DE'), ('Ruhr A', 'DE'), ('Schwaben', 'DE'), ('Württemberg', 'DE'),
  ('A-Arlberg', 'AT'), ('A-Linz', 'AT'), ('A-Viyana', 'AT'),
  ('Lyon', 'FR'), ('Paris', 'FR'), ('D. Fransa', 'FR'), ('G.B. Fransa', 'FR'),
  ('İsviçre', 'CH');

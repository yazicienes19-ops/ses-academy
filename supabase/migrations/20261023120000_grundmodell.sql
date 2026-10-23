-- SES Academy: Grundmodell für Bewerbung, Teilnahme, Check-in und Kennzahlen.
--
-- Begriffe
--   participant  = eine Person, dauerhaft und über alle Jahrgänge hinweg (mit oder ohne Login)
--   cohort       = Jahrgang (z. B. 2026); eine angenommene Bewerbung meldet für alle Module des Jahrgangs an
--   module       = Veranstaltung (Auftakt, Seminar, Workshop, Winter School), meist mehrtägig
--   module_day   = ein Tag eines Moduls; eingecheckt wird pro Tag
--   registration = Anmeldung einer Person zu einem Modul
--   attendance   = Anwesenheit an einem Modultag
--
-- Eine Person hat EINEN persönlichen QR-Code (participants.checkin_token), der für alle Module gilt.

-- ---------------------------------------------------------------------------
-- Aufzählungen
-- ---------------------------------------------------------------------------
CREATE TYPE public.staff_role AS ENUM ('admin', 'vorstand', 'orga_team', 'checkin_helper');
CREATE TYPE public.affiliation_status AS ENUM ('member', 'academy_student', 'guest', 'alumni');
CREATE TYPE public.application_status AS ENUM
  ('eingegangen', 'in_pruefung', 'angenommen', 'warteliste', 'abgelehnt', 'zurueckgezogen');
CREATE TYPE public.module_kind AS ENUM ('auftakt', 'seminar', 'workshop', 'winterschool', 'sonstiges');
CREATE TYPE public.module_status AS ENUM ('draft', 'published', 'archived');
-- pending   = wartet auf Freigabe
-- confirmed = darf teilnehmen (nur dieser Status darf einchecken)
-- cancelled = selbst abgemeldet, excused = entschuldigt (beides neutral für die Serie)
CREATE TYPE public.registration_status AS ENUM
  ('pending', 'confirmed', 'waitlist', 'cancelled', 'excused', 'rejected');
CREATE TYPE public.registration_source AS ENUM ('cohort', 'public', 'staff', 'walk_in');
CREATE TYPE public.checkin_method AS ENUM ('qr', 'short_code', 'manual', 'walk_in', 'offline_sync');

-- ---------------------------------------------------------------------------
-- Team und Rollen (Teilnehmende sind hier nicht eingetragen)
-- ---------------------------------------------------------------------------
CREATE TABLE public.staff_members (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         public.staff_role NOT NULL,
  display_name text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.current_staff_role()
RETURNS public.staff_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.staff_members WHERE user_id = auth.uid()
$$;

-- admin, vorstand: alles inkl. Kontaktdaten, Kennzahlen, Export
CREATE FUNCTION public.has_full_access()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(public.current_staff_role() IN ('admin', 'vorstand'), false)
$$;

-- zusätzlich orga_team: Anwesenheitsliste mit Namen, manuell abhaken, Walk-in
CREATE FUNCTION public.has_orga_access()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(public.current_staff_role() IN ('admin', 'vorstand', 'orga_team'), false)
$$;

-- zusätzlich checkin_helper: nur Scanner, Codeeingabe, Zähler
CREATE FUNCTION public.has_checkin_access()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT public.current_staff_role() IS NOT NULL
$$;

-- ---------------------------------------------------------------------------
-- Jahrgänge
-- ---------------------------------------------------------------------------
CREATE TABLE public.cohorts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  year       integer NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cohorts_one_current ON public.cohorts (is_current) WHERE is_current;

-- ---------------------------------------------------------------------------
-- Teilnehmende
-- ---------------------------------------------------------------------------
CREATE TABLE public.participants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email              text UNIQUE CHECK (email IS NULL OR email = lower(trim(email))),
  first_name         text NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name          text NOT NULL DEFAULT '',
  phone              text,
  affiliation_status public.affiliation_status NOT NULL DEFAULT 'guest',
  cohort_id          uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  preferred_language text NOT NULL DEFAULT 'de' CHECK (preferred_language IN ('de', 'tr', 'en', 'fr', 'nl')),
  notes              text NOT NULL DEFAULT '',
  privacy_consent_at timestamptz,
  checkin_token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  short_code         text GENERATED ALWAYS AS (upper(left(checkin_token::text, 8))) STORED UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX participants_name_idx ON public.participants (last_name, first_name);

-- ---------------------------------------------------------------------------
-- Bewerbungen (ersetzt das bisherige mailto-Formular)
-- ---------------------------------------------------------------------------
CREATE TABLE public.applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id      uuid NOT NULL REFERENCES public.cohorts(id),
  participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,  -- gesetzt bei Annahme
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  email          text NOT NULL CHECK (email = lower(trim(email))),
  phone          text,
  birth_year     integer,
  country        text,
  city           text,
  languages      text[] NOT NULL DEFAULT '{}',
  motivation     text NOT NULL DEFAULT '',
  source         text,
  language       text NOT NULL DEFAULT 'de',
  consent_at     timestamptz NOT NULL,
  status         public.application_status NOT NULL DEFAULT 'eingegangen',
  review_note    text NOT NULL DEFAULT '',
  reviewed_by    uuid REFERENCES auth.users(id),
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX applications_status_idx ON public.applications (cohort_id, status);
CREATE UNIQUE INDEX applications_one_open_per_email
  ON public.applications (cohort_id, email) WHERE status NOT IN ('abgelehnt', 'zurueckgezogen');

-- ---------------------------------------------------------------------------
-- Module und Modultage
-- ---------------------------------------------------------------------------
CREATE TABLE public.modules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id           uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  slug                text NOT NULL UNIQUE,   -- entspricht den Slugs der Website (z. B. "demokratie")
  title               text NOT NULL,
  kind                public.module_kind NOT NULL DEFAULT 'seminar',
  description         text NOT NULL DEFAULT '',
  location            text,
  status              public.module_status NOT NULL DEFAULT 'draft',
  ticket_required     boolean NOT NULL DEFAULT true,
  counts_for_streak   boolean NOT NULL DEFAULT true,
  open_registration   boolean NOT NULL DEFAULT false,  -- true: auch Gäste ohne Bewerbung können sich anmelden
  capacity            integer CHECK (capacity IS NULL OR capacity > 0),
  cancelled_at        timestamptz,
  cancellation_reason text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.module_days (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id  uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  day        date NOT NULL,
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz NOT NULL,
  label      text,
  UNIQUE (module_id, day),
  CHECK (ends_at > starts_at)
);
CREATE INDEX module_days_starts_idx ON public.module_days (starts_at);

-- ---------------------------------------------------------------------------
-- Anmeldungen und Anwesenheit
-- ---------------------------------------------------------------------------
CREATE TABLE public.registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id         uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  participant_id    uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  status            public.registration_status NOT NULL DEFAULT 'confirmed',
  source            public.registration_source NOT NULL,
  excuse_note       text,
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, participant_id)
);
CREATE INDEX registrations_participant_idx ON public.registrations (participant_id);
CREATE INDEX registrations_module_status_idx ON public.registrations (module_id, status);

CREATE TABLE public.attendances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  module_day_id   uuid NOT NULL REFERENCES public.module_days(id) ON DELETE CASCADE,
  checked_in_at   timestamptz NOT NULL,
  checked_in_by   uuid REFERENCES auth.users(id),
  method          public.checkin_method NOT NULL,
  UNIQUE (registration_id, module_day_id)
);
CREATE INDEX attendances_day_idx ON public.attendances (module_day_id);

-- ---------------------------------------------------------------------------
-- Audit-Log und Mail-Protokoll
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id              uuid REFERENCES auth.users(id),        -- wer gehandelt hat
  target_participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,  -- wen es betrifft
  action                text NOT NULL,
  entity_type           text NOT NULL,
  entity_id             uuid,
  metadata              jsonb NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON public.audit_log (created_at DESC);

CREATE TABLE public.email_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  kind           text NOT NULL,   -- ticket, application_received, application_accepted, ...
  recipient      text NOT NULL,
  status         text NOT NULL CHECK (status IN ('sent', 'failed')),
  error          text,
  triggered_by   uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.normalize_email(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT nullif(lower(trim(value)), '')
$$;

-- Liest QR-Inhalt, volle UUID oder 8-stelligen Kurzcode; Leerzeichen und Bindestriche egal.
CREATE FUNCTION public.normalize_checkin_code(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT upper(regexp_replace(regexp_replace(coalesce(value, ''), '^\s*ses:checkin:', '', 'i'), '[\s-]', '', 'g'))
$$;

CREATE FUNCTION public.display_name(p public.participants)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT trim(p.first_name || ' ' || p.last_name)
$$;

-- Findet eine Person über user_id oder E-Mail oder legt sie an. Keine Dubletten.
-- Bei der (extrem seltenen) Kollision des Kurzcodes wird ein neuer Token gewürfelt.
CREATE FUNCTION public.upsert_participant(
  p_first_name text, p_last_name text, p_email text,
  p_user_id uuid DEFAULT NULL,
  p_affiliation public.affiliation_status DEFAULT 'guest',
  p_language text DEFAULT 'de',
  p_privacy_consent boolean DEFAULT false,
  p_phone text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  pid uuid;
  mail text := public.normalize_email(p_email);
BEGIN
  SELECT id INTO pid FROM public.participants
   WHERE (p_user_id IS NOT NULL AND user_id = p_user_id) OR (mail IS NOT NULL AND email = mail)
   ORDER BY (user_id IS NOT DISTINCT FROM p_user_id) DESC
   LIMIT 1;

  IF pid IS NOT NULL THEN
    UPDATE public.participants SET
      user_id = coalesce(user_id, p_user_id),
      phone = coalesce(phone, nullif(trim(p_phone), '')),
      privacy_consent_at = coalesce(privacy_consent_at, CASE WHEN p_privacy_consent THEN now() END),
      -- Zugehörigkeit nur "aufwerten", nie z. B. von academy_student auf guest zurücksetzen
      affiliation_status = CASE WHEN affiliation_status = 'guest' THEN p_affiliation ELSE affiliation_status END,
      updated_at = now()
    WHERE id = pid;
    RETURN pid;
  END IF;

  FOR attempt IN 1..5 LOOP
    BEGIN
      INSERT INTO public.participants
        (first_name, last_name, email, user_id, affiliation_status, preferred_language, privacy_consent_at, phone)
      VALUES (trim(p_first_name), trim(coalesce(p_last_name, '')), mail, p_user_id, p_affiliation,
              coalesce(nullif(p_language, ''), 'de'), CASE WHEN p_privacy_consent THEN now() END,
              nullif(trim(p_phone), ''))
      RETURNING id INTO pid;
      RETURN pid;
    EXCEPTION WHEN unique_violation THEN
      -- Gleichzeitige Anmeldung mit derselben E-Mail: vorhandene Person nehmen
      SELECT id INTO pid FROM public.participants WHERE mail IS NOT NULL AND email = mail;
      IF pid IS NOT NULL THEN RETURN pid; END IF;
      -- sonst war es der Kurzcode: nächster Versuch mit neuem Token (DEFAULT)
    END;
  END LOOP;
  RAISE EXCEPTION 'participant_insert_failed';
END $$;

-- ---------------------------------------------------------------------------
-- Bewerbung annehmen: Person anlegen/finden und für alle offenen Module des Jahrgangs anmelden
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.accept_application(p_application_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  app public.applications%ROWTYPE;
  pid uuid;
  added integer;
BEGIN
  IF NOT public.has_full_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required';
  END IF;
  SELECT * INTO app FROM public.applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'application_not_found'; END IF;

  pid := public.upsert_participant(app.first_name, app.last_name, app.email, NULL,
                                   'academy_student', app.language, true, app.phone);
  UPDATE public.participants SET affiliation_status = 'academy_student', cohort_id = app.cohort_id, updated_at = now()
   WHERE id = pid AND affiliation_status IN ('guest', 'academy_student');

  UPDATE public.applications SET status = 'angenommen', participant_id = pid,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = coalesce(p_note, review_note)
   WHERE id = app.id;

  -- Nur Module, die noch nicht vorbei und nicht abgesagt sind
  INSERT INTO public.registrations (module_id, participant_id, status, source)
  SELECT m.id, pid, 'confirmed', 'cohort'
    FROM public.modules m
   WHERE m.cohort_id = app.cohort_id AND m.status = 'published' AND m.cancelled_at IS NULL
     AND EXISTS (SELECT 1 FROM public.module_days d WHERE d.module_id = m.id AND d.ends_at > now())
  ON CONFLICT (module_id, participant_id) DO UPDATE
    SET status = 'confirmed', status_changed_at = now()
    WHERE public.registrations.status IN ('pending', 'waitlist', 'rejected');
  GET DIAGNOSTICS added = ROW_COUNT;

  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), pid, 'application_accepted', 'application', app.id, jsonb_build_object('modules', added));

  RETURN jsonb_build_object('participant_id', pid, 'modules_registered', added);
END $$;

-- Neues Modul im Jahrgang: alle angenommenen Teilnehmenden automatisch anmelden.
CREATE FUNCTION public.register_cohort_for_module(p_module_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE added integer;
BEGIN
  IF NOT public.has_full_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required';
  END IF;
  INSERT INTO public.registrations (module_id, participant_id, status, source)
  SELECT m.id, a.participant_id, 'confirmed', 'cohort'
    FROM public.modules m JOIN public.applications a ON a.cohort_id = m.cohort_id
   WHERE m.id = p_module_id AND a.status = 'angenommen' AND a.participant_id IS NOT NULL
  ON CONFLICT (module_id, participant_id) DO NOTHING;
  GET DIAGNOSTICS added = ROW_COUNT;
  RETURN added;
END $$;

-- ---------------------------------------------------------------------------
-- Öffentliche Anmeldung zu einem offenen Modul (läuft serverseitig mit service_role)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.register_public(
  p_module_slug text, p_first_name text, p_last_name text, p_email text,
  p_language text DEFAULT 'de', p_phone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  m public.modules%ROWTYPE;
  pid uuid;
  reg public.registrations%ROWTYPE;
  taken integer;
  new_status public.registration_status;
BEGIN
  SELECT * INTO m FROM public.modules WHERE slug = p_module_slug FOR NO KEY UPDATE;
  IF NOT FOUND OR m.status <> 'published' OR NOT m.open_registration THEN
    RETURN jsonb_build_object('result', 'registration_closed');
  END IF;
  IF m.cancelled_at IS NOT NULL THEN RETURN jsonb_build_object('result', 'module_cancelled'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.module_days d WHERE d.module_id = m.id AND d.starts_at > now()) THEN
    RETURN jsonb_build_object('result', 'registration_closed');
  END IF;

  pid := public.upsert_participant(p_first_name, p_last_name, p_email, NULL, 'guest', p_language, true, p_phone);

  SELECT * INTO reg FROM public.registrations WHERE module_id = m.id AND participant_id = pid FOR UPDATE;
  IF FOUND AND reg.status IN ('confirmed', 'pending', 'waitlist') THEN
    RETURN jsonb_build_object('result', 'already_registered', 'participant_id', pid, 'status', reg.status);
  END IF;

  SELECT count(*) INTO taken FROM public.registrations WHERE module_id = m.id AND status = 'confirmed';
  new_status := CASE WHEN m.capacity IS NOT NULL AND taken >= m.capacity THEN 'waitlist' ELSE 'confirmed' END;

  INSERT INTO public.registrations (module_id, participant_id, status, source)
  VALUES (m.id, pid, new_status, 'public')
  ON CONFLICT (module_id, participant_id) DO UPDATE SET status = new_status, status_changed_at = now();

  RETURN jsonb_build_object('result', 'registered', 'participant_id', pid, 'status', new_status);
END $$;

-- Abmelden bzw. Entschuldigen über den persönlichen Ticket-Link (serverseitig mit service_role)
CREATE FUNCTION public.withdraw_by_token(p_token uuid, p_module_id uuid, p_excuse_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p public.participants%ROWTYPE;
  reg public.registrations%ROWTYPE;
  first_start timestamptz;
  new_status public.registration_status;
  promoted uuid;
BEGIN
  SELECT * INTO p FROM public.participants WHERE checkin_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  PERFORM 1 FROM public.modules WHERE id = p_module_id FOR NO KEY UPDATE;
  SELECT * INTO reg FROM public.registrations WHERE module_id = p_module_id AND participant_id = p.id FOR UPDATE;
  IF NOT FOUND OR reg.status NOT IN ('confirmed', 'pending', 'waitlist') THEN
    RETURN jsonb_build_object('result', 'not_registered');
  END IF;
  SELECT min(starts_at) INTO first_start FROM public.module_days WHERE module_id = p_module_id;
  IF first_start <= now() THEN RETURN jsonb_build_object('result', 'too_late'); END IF;

  -- Jahrgang entschuldigt sich (zählt neutral), Gäste melden sich ab
  new_status := CASE WHEN reg.source = 'cohort' THEN 'excused' ELSE 'cancelled' END;
  UPDATE public.registrations SET status = new_status, excuse_note = nullif(trim(p_excuse_note), ''),
         status_changed_at = now() WHERE id = reg.id;

  IF reg.status = 'confirmed' THEN
    UPDATE public.registrations SET status = 'confirmed', status_changed_at = now()
     WHERE id = (SELECT id FROM public.registrations WHERE module_id = p_module_id AND status = 'waitlist'
                 ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id INTO promoted;
  END IF;

  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (NULL, p.id, 'registration_withdrawn', 'registration', reg.id,
          jsonb_build_object('status', new_status, 'promoted_registration_id', promoted));
  RETURN jsonb_build_object('result', 'withdrawn', 'status', new_status, 'promoted_registration_id', promoted);
END $$;

-- ---------------------------------------------------------------------------
-- Check-in
-- ---------------------------------------------------------------------------
-- Gemeinsamer Kern: prüft Zeitfenster, Status und schreibt die Anwesenheit.
-- Gibt immer jsonb mit "result" zurück, damit die Oberfläche jeden Fall klar anzeigen kann.
CREATE FUNCTION public.checkin_core(
  p_day public.module_days, p_participant public.participants, p_method public.checkin_method,
  p_allow_off_window boolean, p_scanned_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  m public.modules%ROWTYPE;
  reg public.registrations%ROWTYPE;
  att public.attendances%ROWTYPE;
  at_time timestamptz := coalesce(p_scanned_at, clock_timestamp());
  person jsonb;
BEGIN
  SELECT * INTO m FROM public.modules WHERE id = p_day.module_id FOR NO KEY UPDATE;
  person := jsonb_build_object(
    'participant_id', p_participant.id,
    'display_name', public.display_name(p_participant),
    'affiliation_status', p_participant.affiliation_status,
    'module_title', m.title,
    'day', p_day.day);

  IF m.status <> 'published' THEN RETURN person || jsonb_build_object('result', 'module_not_available'); END IF;
  IF m.cancelled_at IS NOT NULL THEN RETURN person || jsonb_build_object('result', 'module_cancelled'); END IF;
  IF NOT m.ticket_required AND p_method IN ('qr', 'short_code') THEN
    RETURN person || jsonb_build_object('result', 'ticket_not_required');
  END IF;
  -- Zeitfenster: 4 Stunden vor bis 6 Stunden nach dem Modultag. Abweichen dürfen nur admin/vorstand.
  IF NOT (p_allow_off_window AND public.has_full_access())
     AND at_time NOT BETWEEN p_day.starts_at - interval '4 hours' AND p_day.ends_at + interval '6 hours' THEN
    RETURN person || jsonb_build_object('result', 'outside_checkin_window',
      'window_start', p_day.starts_at - interval '4 hours', 'window_end', p_day.ends_at + interval '6 hours');
  END IF;

  SELECT * INTO reg FROM public.registrations
   WHERE module_id = m.id AND participant_id = p_participant.id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN person || jsonb_build_object('result', 'not_registered');
  END IF;
  person := person || jsonb_build_object('registration_id', reg.id, 'registration_status', reg.status);

  IF reg.status <> 'confirmed' THEN
    INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), p_participant.id, 'checkin_rejected', 'registration', reg.id,
            jsonb_build_object('module_day_id', p_day.id, 'status', reg.status, 'method', p_method));
    RETURN person || jsonb_build_object('result', 'not_eligible');
  END IF;

  INSERT INTO public.attendances (registration_id, module_day_id, checked_in_at, checked_in_by, method)
  VALUES (reg.id, p_day.id, at_time, auth.uid(), p_method)
  ON CONFLICT (registration_id, module_day_id) DO NOTHING
  RETURNING * INTO att;

  IF att.id IS NULL THEN   -- schon eingecheckt: ursprünglichen Zeitpunkt zurückgeben
    SELECT * INTO att FROM public.attendances WHERE registration_id = reg.id AND module_day_id = p_day.id;
    INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), p_participant.id, 'checkin_duplicate', 'attendance', att.id,
            jsonb_build_object('module_day_id', p_day.id, 'method', p_method));
    RETURN person || jsonb_build_object('result', 'already_checked_in', 'checked_in_at', att.checked_in_at);
  END IF;

  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_participant.id, 'checked_in', 'attendance', att.id,
          jsonb_build_object('module_day_id', p_day.id, 'method', p_method));
  RETURN person || jsonb_build_object('result', 'checked_in', 'checked_in_at', att.checked_in_at);
END $$;

-- Scan oder Codeeingabe. Sucht die Person per Token (Index) oder Kurzcode (Index).
CREATE FUNCTION public.check_in_by_code(
  p_module_day_id uuid, p_code text,
  p_method public.checkin_method DEFAULT 'qr',
  p_allow_off_window boolean DEFAULT false,
  p_scanned_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  d public.module_days%ROWTYPE;
  p public.participants%ROWTYPE;
  code text := public.normalize_checkin_code(p_code);
BEGIN
  IF NOT public.has_checkin_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'checkin_access_required';
  END IF;
  -- Offline-Nachträge dürfen nicht in der Zukunft liegen und nicht älter als 24 Stunden sein
  IF p_scanned_at IS NOT NULL AND (p_method <> 'offline_sync'
     OR p_scanned_at > clock_timestamp() + interval '5 minutes'
     OR p_scanned_at < clock_timestamp() - interval '24 hours') THEN
    RETURN jsonb_build_object('result', 'invalid_scan_time');
  END IF;

  SELECT * INTO d FROM public.module_days WHERE id = p_module_day_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'day_not_found'); END IF;

  IF code ~ '^[0-9A-F]{32}$' THEN
    SELECT * INTO p FROM public.participants WHERE checkin_token = code::uuid;
  ELSIF code ~ '^[0-9A-F]{8}$' THEN
    SELECT * INTO p FROM public.participants WHERE short_code = code;
  ELSE
    RETURN jsonb_build_object('result', 'invalid_code');
  END IF;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;

  RETURN public.checkin_core(d, p, p_method, p_allow_off_window, p_scanned_at);
END $$;

-- Manuell abhaken aus der Anwesenheitsliste (orga_team und höher); auch bei Modulen ohne Ticket.
CREATE FUNCTION public.check_in_manual(
  p_module_day_id uuid, p_participant_id uuid, p_allow_off_window boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  d public.module_days%ROWTYPE;
  p public.participants%ROWTYPE;
BEGIN
  IF NOT public.has_orga_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required';
  END IF;
  SELECT * INTO d FROM public.module_days WHERE id = p_module_day_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'day_not_found'); END IF;
  SELECT * INTO p FROM public.participants WHERE id = p_participant_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  RETURN public.checkin_core(d, p, 'manual', p_allow_off_window, NULL);
END $$;

-- Check-in zurücknehmen (Fehlscan), nur orga_team und höher
CREATE FUNCTION public.undo_check_in(p_attendance_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE att public.attendances%ROWTYPE; pid uuid;
BEGIN
  IF NOT public.has_orga_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required';
  END IF;
  DELETE FROM public.attendances WHERE id = p_attendance_id RETURNING * INTO att;
  IF att.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  SELECT participant_id INTO pid FROM public.registrations WHERE id = att.registration_id;
  INSERT INTO public.audit_log (actor_id, target_participant_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), pid, 'checkin_undone', 'attendance', att.id,
          jsonb_build_object('module_day_id', att.module_day_id, 'checked_in_at', att.checked_in_at));
  RETURN jsonb_build_object('result', 'undone');
END $$;

-- Walk-in: Person vor Ort erfassen, anmelden und direkt einchecken (orga_team und höher).
CREATE FUNCTION public.create_walk_in(
  p_module_day_id uuid, p_first_name text, p_last_name text, p_email text DEFAULT NULL,
  p_affiliation public.affiliation_status DEFAULT 'guest', p_privacy_consent boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  d public.module_days%ROWTYPE;
  p public.participants%ROWTYPE;
  pid uuid;
BEGIN
  IF NOT public.has_orga_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required';
  END IF;
  IF NOT p_privacy_consent THEN RETURN jsonb_build_object('result', 'consent_required'); END IF;
  SELECT * INTO d FROM public.module_days WHERE id = p_module_day_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'day_not_found'); END IF;

  pid := public.upsert_participant(p_first_name, p_last_name, p_email, NULL, p_affiliation, 'de', true);
  INSERT INTO public.registrations (module_id, participant_id, status, source)
  VALUES (d.module_id, pid, 'confirmed', 'walk_in')
  ON CONFLICT (module_id, participant_id) DO UPDATE
    SET status = 'confirmed', status_changed_at = now()
    WHERE public.registrations.status IN ('cancelled', 'excused', 'waitlist', 'pending');
  SELECT * INTO p FROM public.participants WHERE id = pid;
  RETURN public.checkin_core(d, p, 'walk_in', false, NULL);
END $$;

-- Datensparsame Liste für den Einlass (auch Offline-Zwischenspeicher):
-- nur Name, Zugehörigkeit, Kurzcode, Token-Hash, Status. Keine Kontaktdaten, keine Historie.
CREATE FUNCTION public.get_checkin_list(p_module_day_id uuid)
RETURNS TABLE (participant_id uuid, display_name text, affiliation_status public.affiliation_status,
               short_code text, token_hash text, registration_status public.registration_status,
               attendance_id uuid, checked_in_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, public.display_name(p), p.affiliation_status, p.short_code,
         encode(extensions.digest(replace(p.checkin_token::text, '-', ''), 'sha256'), 'hex'),
         r.status, a.id, a.checked_in_at
    FROM public.module_days d
    JOIN public.registrations r ON r.module_id = d.module_id
    JOIN public.participants p ON p.id = r.participant_id
    LEFT JOIN public.attendances a ON a.registration_id = r.id AND a.module_day_id = d.id
   WHERE d.id = p_module_day_id AND public.has_checkin_access()
   ORDER BY p.last_name, p.first_name
$$;

-- Zähler für den Einlass (für alle Check-in-Rollen)
CREATE FUNCTION public.get_day_counts(p_module_day_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN public.has_checkin_access() THEN jsonb_build_object(
    'checked_in', count(a.id),
    'expected', count(*) FILTER (WHERE r.status = 'confirmed'),
    'waitlist', count(*) FILTER (WHERE r.status = 'waitlist'),
    'excused', count(*) FILTER (WHERE r.status IN ('excused', 'cancelled')))
  END
    FROM public.module_days d
    JOIN public.registrations r ON r.module_id = d.module_id
    LEFT JOIN public.attendances a ON a.registration_id = r.id AND a.module_day_id = d.id
   WHERE d.id = p_module_day_id
$$;

-- ---------------------------------------------------------------------------
-- Kennzahlen
-- ---------------------------------------------------------------------------
-- Gezählt wird pro Modultag. Ein Tag gilt für eine angemeldete Person als
--   besucht      = Anwesenheit vorhanden
--   entschuldigt = Anmeldung cancelled/excused
--   verpasst     = Tag vorbei, Anmeldung confirmed, keine Anwesenheit (No-Show)
-- Serie: alle vergangenen Tage von Modulen mit counts_for_streak, ab dem ersten Modul der Person.
--   besucht +1, entschuldigt neutral, verpasst oder nicht angemeldet bricht die Serie.
CREATE FUNCTION public.get_participant_analytics(
  timeframe_start timestamptz DEFAULT '-infinity', timeframe_end timestamptz DEFAULT 'infinity')
RETURNS TABLE (
  participant_id uuid, total_registered integer, total_attended integer, total_no_shows integer,
  total_cancelled_or_excused integer, last_attended_at timestamptz, last_attended_title text,
  attendance_rate numeric, current_streak integer, longest_streak integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_full_access() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'full_access_required';
  END IF;
  RETURN QUERY
  WITH days AS (
    SELECT d.id, d.module_id, d.starts_at, d.ends_at, m.title, m.counts_for_streak
      FROM public.module_days d JOIN public.modules m ON m.id = d.module_id
     WHERE m.status = 'published' AND m.cancelled_at IS NULL
       AND d.starts_at >= timeframe_start AND d.starts_at < timeframe_end
  ),
  per_day AS (   -- eine Zeile je Anmeldung und Modultag
    SELECT r.participant_id, r.module_id, r.status, dy.id AS day_id, dy.starts_at, dy.ends_at,
           dy.title, dy.counts_for_streak, a.checked_in_at
      FROM public.registrations r
      JOIN days dy ON dy.module_id = r.module_id
      LEFT JOIN public.attendances a ON a.registration_id = r.id AND a.module_day_id = dy.id
     WHERE r.status IN ('confirmed', 'cancelled', 'excused')
  ),
  counts AS (
    SELECT pd.participant_id,
      count(DISTINCT pd.module_id) FILTER (WHERE pd.status = 'confirmed')::int                AS reg,
      count(*) FILTER (WHERE pd.checked_in_at IS NOT NULL)::int                               AS att,
      count(*) FILTER (WHERE pd.status = 'confirmed' AND pd.checked_in_at IS NULL
                         AND pd.ends_at < now())::int                                         AS miss,
      count(DISTINCT pd.module_id) FILTER (WHERE pd.status IN ('cancelled', 'excused'))::int  AS exc
      FROM per_day pd GROUP BY pd.participant_id
  ),
  last_visit AS (
    SELECT DISTINCT ON (pd.participant_id) pd.participant_id, pd.checked_in_at, pd.title
      FROM per_day pd WHERE pd.checked_in_at IS NOT NULL
     ORDER BY pd.participant_id, pd.checked_in_at DESC
  ),
  first_module AS (
    SELECT r.participant_id, min(d.starts_at) AS since
      FROM public.registrations r JOIN public.module_days d ON d.module_id = r.module_id
     GROUP BY r.participant_id
  ),
  grid AS (      -- jede Person x jeder vergangene Serientag seit ihrem ersten Modul
    SELECT fm.participant_id, dy.starts_at,
      CASE WHEN pd.checked_in_at IS NOT NULL THEN 'hit'
           WHEN pd.status IN ('cancelled', 'excused') THEN 'skip'
           ELSE 'miss' END AS outcome
      FROM first_module fm
      JOIN days dy ON dy.counts_for_streak AND dy.ends_at < now() AND dy.starts_at >= fm.since
      LEFT JOIN per_day pd ON pd.participant_id = fm.participant_id AND pd.day_id = dy.id
  ),
  islands AS (   -- Gaps-and-Islands: jeder verpasste Tag beginnt eine neue Insel
    SELECT g.participant_id, g.outcome,
           count(*) FILTER (WHERE g.outcome = 'miss') OVER (PARTITION BY g.participant_id ORDER BY g.starts_at) AS island
      FROM grid g WHERE g.outcome <> 'skip'
  ),
  streaks AS (
    SELECT i.participant_id, i.island, count(*) FILTER (WHERE i.outcome = 'hit')::int AS len
      FROM islands i GROUP BY i.participant_id, i.island
  ),
  streak_summary AS (
    SELECT s.participant_id,
           (array_agg(s.len ORDER BY s.island DESC))[1] AS cur,
           max(s.len) AS best
      FROM streaks s GROUP BY s.participant_id
  )
  SELECT c.participant_id, c.reg, c.att, c.miss, c.exc, lv.checked_in_at, lv.title,
         round(c.att::numeric / nullif(c.att + c.miss, 0) * 100, 1),
         coalesce(ss.cur, 0), coalesce(ss.best, 0)
    FROM counts c
    LEFT JOIN last_visit lv ON lv.participant_id = c.participant_id
    LEFT JOIN streak_summary ss ON ss.participant_id = c.participant_id;
END $$;

-- ---------------------------------------------------------------------------
-- updated_at automatisch pflegen
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER participants_touch BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER modules_touch BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Zeilenschutz (RLS): alles zu; Lesen/Schreiben nur nach Rolle, Check-in nur über Funktionen
-- ---------------------------------------------------------------------------
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_days   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log     ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_read         ON public.staff_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_full_access());
CREATE POLICY staff_admin_write  ON public.staff_members FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');

CREATE POLICY cohorts_staff_read ON public.cohorts FOR SELECT TO authenticated USING (public.has_checkin_access());
CREATE POLICY cohorts_full_write ON public.cohorts FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());

CREATE POLICY modules_public_read ON public.modules FOR SELECT USING (status = 'published' OR public.has_checkin_access());
CREATE POLICY modules_full_write  ON public.modules FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());
CREATE POLICY days_public_read    ON public.module_days FOR SELECT
  USING (public.has_checkin_access() OR EXISTS (SELECT 1 FROM public.modules m WHERE m.id = module_id AND m.status = 'published'));
CREATE POLICY days_full_write     ON public.module_days FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());

-- Kontaktdaten und Historie nur für admin/vorstand; Teilnehmende sehen sich selbst (späteres Portal)
CREATE POLICY participants_full   ON public.participants FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());
CREATE POLICY participants_self   ON public.participants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY applications_full   ON public.applications FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());
CREATE POLICY registrations_full  ON public.registrations FOR ALL TO authenticated USING (public.has_full_access()) WITH CHECK (public.has_full_access());
CREATE POLICY registrations_self  ON public.registrations FOR SELECT TO authenticated
  USING (participant_id IN (SELECT id FROM public.participants WHERE user_id = auth.uid()));
CREATE POLICY attendances_full    ON public.attendances FOR SELECT TO authenticated USING (public.has_full_access());
CREATE POLICY attendances_self    ON public.attendances FOR SELECT TO authenticated
  USING (registration_id IN (SELECT r.id FROM public.registrations r JOIN public.participants p ON p.id = r.participant_id WHERE p.user_id = auth.uid()));
CREATE POLICY audit_full_read     ON public.audit_log FOR SELECT TO authenticated USING (public.has_full_access());
CREATE POLICY email_log_full_read ON public.email_log FOR SELECT TO authenticated USING (public.has_full_access());

-- Funktionen: standardmäßig niemandem erlaubt, dann gezielt freigeben
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.current_staff_role(), public.has_full_access(), public.has_orga_access(), public.has_checkin_access(),
  public.normalize_checkin_code(text), public.display_name(public.participants),
  public.accept_application(uuid, text), public.register_cohort_for_module(uuid),
  public.check_in_by_code(uuid, text, public.checkin_method, boolean, timestamptz),
  public.check_in_manual(uuid, uuid, boolean), public.undo_check_in(uuid),
  public.create_walk_in(uuid, text, text, text, public.affiliation_status, boolean),
  public.get_checkin_list(uuid), public.get_day_counts(uuid),
  public.get_participant_analytics(timestamptz, timestamptz)
TO authenticated;
-- Die Rollenprüfungen stecken in RLS-Regeln, die auch für nicht eingeloggte Besucher laufen
GRANT EXECUTE ON FUNCTION
  public.current_staff_role(), public.has_full_access(), public.has_orga_access(), public.has_checkin_access()
TO anon;
-- Öffentliche Wege (Bewerbung, offene Anmeldung, Ticket-Link) laufen nur serverseitig
GRANT EXECUTE ON FUNCTION
  public.upsert_participant(text, text, text, uuid, public.affiliation_status, text, boolean, text),
  public.register_public(text, text, text, text, text, text),
  public.withdraw_by_token(uuid, uuid, text)
TO service_role;
-- Diese Tabellen schreibt die öffentliche Seite nie direkt
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;

-- Nur für die lokale Entwicklung (supabase db reset). Niemals in Produktion einspielen.
-- Team-Konten, Passwort jeweils: test1234
--   admin@ses.test (admin), vorstand@ses.test (vorstand), orga@ses.test (orga_team), helfer@ses.test (checkin_helper)

DO $$
DECLARE
  staff record;
  uid uuid;
BEGIN
  FOR staff IN SELECT * FROM (VALUES
    ('admin@ses.test', 'admin'::public.staff_role, 'Admin Test'),
    ('vorstand@ses.test', 'vorstand', 'Vorstand Test'),
    ('orga@ses.test', 'orga_team', 'Orga Test'),
    ('helfer@ses.test', 'checkin_helper', 'Helfer Test')) AS s(email, role, name)
  LOOP
    uid := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', staff.email,
      extensions.crypt('test1234', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', staff.email),
      'email', now(), now(), now());
    INSERT INTO public.staff_members (user_id, role, display_name) VALUES (uid, staff.role, staff.name);
  END LOOP;
END $$;

INSERT INTO public.cohorts (id, name, year, is_current)
VALUES ('00000000-0000-4000-8000-000000002026', 'Jahrgang 2026', 2026, true);

-- Module wie in src/i18n/daten.ts (Uhrzeiten angenommen: 10 bis 18 Uhr)
INSERT INTO public.modules (slug, title, kind, location, status, cohort_id, open_registration) VALUES
  ('auftakt',         'Auftakt',                  'auftakt',      'Colonia-Allee 3, 51067 Köln', 'published', '00000000-0000-4000-8000-000000002026', true),
  ('verfassungen',    'Verfassungen',             'seminar',      'Colonia-Allee 3, 51067 Köln', 'published', '00000000-0000-4000-8000-000000002026', false),
  ('skills-workshop', 'Skills-Workshop',          'workshop',     'Colonia-Allee 3, 51067 Köln', 'published', '00000000-0000-4000-8000-000000002026', false),
  ('demokratie',      'Demokratie',               'seminar',      'Colonia-Allee 3, 51067 Köln', 'published', '00000000-0000-4000-8000-000000002026', false),
  ('winter-school',   'Winter School',            'winterschool', NULL,                          'published', '00000000-0000-4000-8000-000000002026', false),
  ('probe-einlass',   'Probe-Einlass (lokal)',    'sonstiges',    'Testraum',                    'published', '00000000-0000-4000-8000-000000002026', true);

INSERT INTO public.modules (slug, title, kind, location, status, cohort_id, ticket_required, counts_for_streak)
VALUES ('probe-ohne-ticket', 'Probe ohne Ticket (lokal)', 'sonstiges', 'Testraum', 'published',
        '00000000-0000-4000-8000-000000002026', false, false);

INSERT INTO public.module_days (module_id, day, starts_at, ends_at)
SELECT m.id, d::date,
       (d::date + time '10:00') AT TIME ZONE 'Europe/Berlin',
       (d::date + time '18:00') AT TIME ZONE 'Europe/Berlin'
  FROM (VALUES ('auftakt', '2026-04-11', '2026-04-12'), ('verfassungen', '2026-06-13', '2026-06-14'),
               ('skills-workshop', '2026-09-12', '2026-09-13'), ('demokratie', '2026-11-14', '2026-11-15'),
               ('winter-school', '2026-12-18', '2026-12-23')) AS t(slug, von, bis)
  JOIN public.modules m ON m.slug = t.slug
  CROSS JOIN LATERAL generate_series(t.von::date, t.bis::date, interval '1 day') AS d;

-- Probe-Module: heute, von jetzt minus 1 Stunde bis jetzt plus 5 Stunden
INSERT INTO public.module_days (module_id, day, starts_at, ends_at)
SELECT id, (now() AT TIME ZONE 'Europe/Berlin')::date, now() - interval '1 hour', now() + interval '5 hours'
  FROM public.modules WHERE slug IN ('probe-einlass', 'probe-ohne-ticket');

-- Bewerbungen; angenommen werden sie unten wie über die Oberfläche
INSERT INTO public.applications (cohort_id, first_name, last_name, email, birth_year, country, city, languages, motivation, consent_at, status, created_at)
VALUES
  ('00000000-0000-4000-8000-000000002026', 'Amina',  'Yilmaz', 'amina@example.test',  2003, 'Deutschland', 'Köln',      '{Deutsch,Türkisch}', 'Testbewerbung', now(), 'eingegangen', '2026-03-01'),
  ('00000000-0000-4000-8000-000000002026', 'Yusuf',  'Demir',  'yusuf@example.test',  2001, 'Niederlande', 'Rotterdam', '{Niederländisch}',   'Testbewerbung', now(), 'eingegangen', '2026-03-02'),
  ('00000000-0000-4000-8000-000000002026', 'Leila',  'Haddad', 'leila@example.test',  2004, 'Frankreich',  'Lyon',      '{Französisch}',      'Testbewerbung', now(), 'eingegangen', '2026-03-03'),
  ('00000000-0000-4000-8000-000000002026', 'Omar',   'Kaya',   'omar@example.test',   2002, 'Deutschland', 'Berlin',    '{Deutsch}',          'Testbewerbung', now(), 'in_pruefung', '2026-03-04');

-- Bewerbungen 1 bis 3 annehmen, als wäre der Admin angemeldet (meldet für alle Module an)
DO $$
DECLARE app record;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT user_id FROM public.staff_members WHERE role = 'admin'), 'role', 'authenticated')::text, true);
  FOR app IN SELECT id FROM public.applications WHERE status = 'eingegangen' LOOP
    PERFORM public.accept_application(app.id);
  END LOOP;
END $$;

-- accept_application meldet nur für künftige Module an; vergangene Module für die Historie nachtragen
INSERT INTO public.registrations (module_id, participant_id, status, source, created_at)
SELECT m.id, a.participant_id, 'confirmed', 'cohort', '2026-03-10'
  FROM public.applications a CROSS JOIN public.modules m
 WHERE a.status = 'angenommen' AND m.slug IN ('auftakt', 'verfassungen', 'skills-workshop')
ON CONFLICT DO NOTHING;

-- Historie: Amina war immer da, Yusuf hat Juni verpasst, Leila war im September entschuldigt
INSERT INTO public.attendances (registration_id, module_day_id, checked_in_at, method)
SELECT r.id, d.id, d.starts_at + interval '15 minutes', 'qr'
  FROM public.registrations r
  JOIN public.participants p ON p.id = r.participant_id
  JOIN public.modules m ON m.id = r.module_id
  JOIN public.module_days d ON d.module_id = m.id
 WHERE m.slug IN ('auftakt', 'verfassungen', 'skills-workshop')
   AND NOT (p.email = 'yusuf@example.test' AND m.slug = 'verfassungen')
   AND NOT (p.email = 'leila@example.test' AND m.slug = 'skills-workshop');
UPDATE public.registrations r SET status = 'excused', excuse_note = 'Prüfungszeit'
  FROM public.participants p, public.modules m
 WHERE p.id = r.participant_id AND m.id = r.module_id AND p.email = 'leila@example.test' AND m.slug = 'skills-workshop';

-- Gäste für das Probe-Modul: einer bestätigt, einer auf der Warteliste.
-- (Direkt eingetragen: register_public nimmt keine Anmeldungen mehr an, wenn der letzte Tag schon begonnen hat.)
INSERT INTO public.registrations (module_id, participant_id, status, source)
SELECT m.id, public.upsert_participant('Gast', g.last_name, g.email, NULL, 'guest', 'de', true), g.status, 'public'
  FROM public.modules m
 CROSS JOIN (VALUES ('Bestätigt', 'gast1@example.test', 'confirmed'::public.registration_status),
                    ('Warteliste', 'gast2@example.test', 'waitlist')) AS g(last_name, email, status)
 WHERE m.slug = 'probe-einlass';

-- Logistik (Wünsche aus dem Gesamttest 02.11.2026): Kostenübersicht, Materialliste, Zimmerliste per Mail ans Hotel.
--
--   module_costs      = sonstige Posten eines Moduls (Verpflegung, Raum, Technik, Reise, Material, Sonstiges).
--                       Hotel (Zimmer × Nächte × Preis) und Honorare/Reisekosten der Referenten rechnet die Seite aus
--                       den vorhandenen Daten (hotels/rooms/room_assignments/stay_requests bzw. module_speakers).
--   module_materials  = Materialliste zum Abhaken (Beamer, Namensschilder, Technik …) mit Menge und Zuständigen.
-- Rechte wie Hotel und Zimmer: ab Orga-Team, nicht für auf ein Modul begrenzte Konten (has_orga_access()).
-- Nur neue Tabellen; bestehende Daten bleiben unverändert.

CREATE TABLE public.module_costs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id  uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  label      text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 200),
  category   text NOT NULL DEFAULT 'sonstiges' CHECK (category IN ('verpflegung', 'raum', 'technik', 'reise', 'material', 'sonstiges')),
  amount     numeric(10, 2) NOT NULL CHECK (amount >= 0),
  note       text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX module_costs_module_idx ON public.module_costs (module_id);

CREATE TABLE public.module_materials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  label       text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 200),
  quantity    text NOT NULL DEFAULT '' CHECK (length(quantity) <= 50),
  responsible text NOT NULL DEFAULT '' CHECK (length(responsible) <= 100),
  note        text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  done_at     timestamptz,
  done_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX module_materials_module_idx ON public.module_materials (module_id);

ALTER TABLE public.module_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY module_costs_orga ON public.module_costs FOR ALL TO authenticated USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());
CREATE POLICY module_materials_orga ON public.module_materials FOR ALL TO authenticated USING (public.has_orga_access()) WITH CHECK (public.has_orga_access());
REVOKE ALL ON public.module_costs, public.module_materials FROM anon;

-- Materialliste aus einem früheren Modul übernehmen (ohne Haken), z. B. die Packliste vom letzten Mal
CREATE FUNCTION public.copy_materials(p_from uuid, p_to uuid)
RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_orga_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required'; END IF;
  INSERT INTO public.module_materials (module_id, label, quantity, responsible, note)
  SELECT p_to, m.label, m.quantity, m.responsible, m.note FROM public.module_materials m
   WHERE m.module_id = p_from AND p_from <> p_to
     AND NOT EXISTS (SELECT 1 FROM public.module_materials x WHERE x.module_id = p_to AND lower(x.label) = lower(m.label))
   ORDER BY m.created_at;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.copy_materials(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copy_materials(uuid, uuid) TO authenticated;

-- Zimmerliste ans Hotel per Mail: wann und an wen zuletzt verschickt (sichtbar unter Logistik).
-- Zwei neue, leere Spalten an hotels; vorhandene Hotels bleiben unverändert.
ALTER TABLE public.hotels
  ADD COLUMN room_list_sent_at timestamptz,
  ADD COLUMN room_list_sent_to text CHECK (room_list_sent_to IS NULL OR length(room_list_sent_to) <= 200);

-- Regieplan als PDF: Je Modultag lässt sich ein Dokument aus der Ablage festlegen (z. B. „Regieplan Orga und Tutoren“).
-- Der Regieplan zeigt dann die PDF, die Programmliste wird aufklappbar. Festlegen ab Orga-Team (module_days selbst
-- dürfen nur Admin/Vorstand ändern, daher über set_day_document).

ALTER TABLE public.module_days ADD COLUMN regieplan_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE FUNCTION public.set_day_document(p_day_id uuid, p_document_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_orga_access() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'orga_access_required'; END IF;
  IF p_document_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.documents WHERE id = p_document_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'document_not_found';
  END IF;
  UPDATE public.module_days SET regieplan_document_id = p_document_id WHERE id = p_day_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'day_not_found'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.set_day_document(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_day_document(uuid, uuid) TO authenticated;

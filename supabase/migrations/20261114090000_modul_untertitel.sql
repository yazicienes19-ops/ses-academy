-- Untertitel eines Moduls für Tagesordnung und Deckblatt, z. B. „Modelle, Chancen und Belastungsproben“.
ALTER TABLE public.modules ADD COLUMN subtitle text NOT NULL DEFAULT '' CHECK (length(subtitle) <= 200);

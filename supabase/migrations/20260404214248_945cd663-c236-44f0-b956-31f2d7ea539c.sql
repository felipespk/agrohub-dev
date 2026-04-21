
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS idade_bezerro_meses INTEGER DEFAULT 8;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS idade_jovem_meses INTEGER DEFAULT 24;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reclassificacao_automatica BOOLEAN DEFAULT true;

ALTER TABLE public.animais ADD COLUMN IF NOT EXISTS categoria_atualizada_em TIMESTAMPTZ;

ALTER TABLE public.animais DROP CONSTRAINT IF EXISTS animais_categoria_check;

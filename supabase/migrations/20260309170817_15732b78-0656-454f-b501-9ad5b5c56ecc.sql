
-- Add taxa_agio and taxa_desagio columns to tipos_grao
ALTER TABLE public.tipos_grao 
  ADD COLUMN IF NOT EXISTS taxa_agio numeric NOT NULL DEFAULT 1.3,
  ADD COLUMN IF NOT EXISTS taxa_desagio numeric NOT NULL DEFAULT 1.5;

-- Add new tracking columns to saidas
ALTER TABLE public.saidas
  ADD COLUMN IF NOT EXISTS recebimento_id uuid REFERENCES public.recebimentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS umidade_combinada numeric NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS peso_ajustado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_armazenados integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quinzenas_cobradas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_armazenamento_exp numeric NOT NULL DEFAULT 0;


-- Add saldo_restante_kg to recebimentos (initialized to peso_liquido)
ALTER TABLE public.recebimentos ADD COLUMN saldo_restante_kg numeric NOT NULL DEFAULT 0;

-- Initialize existing rows: saldo = peso_liquido - sum of peso_ajustado from linked saidas
UPDATE public.recebimentos r
SET saldo_restante_kg = r.peso_liquido - COALESCE(
  (SELECT SUM(s.peso_ajustado) FROM public.saidas s WHERE s.recebimento_id = r.id), 0
);

-- Add composicao_peps JSONB to saidas for FIFO traceability
ALTER TABLE public.saidas ADD COLUMN composicao_peps jsonb DEFAULT '[]'::jsonb;

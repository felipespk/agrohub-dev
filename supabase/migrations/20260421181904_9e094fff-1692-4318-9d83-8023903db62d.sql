-- Remover unique global de brinco para permitir bezerro herdar brinco da mãe
ALTER TABLE public.animais DROP CONSTRAINT IF EXISTS animais_brinco_user_id_key;

-- Recriar como índice parcial: brinco único apenas entre animais que NÃO estão aguardando troca de brinco
-- Assim, mãe (precisa_trocar_brinco=false) e bezerro herdeiro (precisa_trocar_brinco=true) podem coexistir.
-- Quando o bezerro tiver o brinco trocado, voltará a respeitar a unicidade.
CREATE UNIQUE INDEX IF NOT EXISTS animais_brinco_user_unique_active
  ON public.animais (brinco, user_id)
  WHERE precisa_trocar_brinco = false;
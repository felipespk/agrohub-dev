ALTER TABLE public.recebimentos 
  ADD COLUMN taxa_secagem_percentual numeric NOT NULL DEFAULT 0,
  ADD COLUMN desconto_secagem_kg numeric NOT NULL DEFAULT 0;
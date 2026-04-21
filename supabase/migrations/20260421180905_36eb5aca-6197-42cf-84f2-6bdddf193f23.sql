-- Add config for when to alert tag swap
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS momento_troca_brinco text NOT NULL DEFAULT 'adulto';

-- Add flag on animais
ALTER TABLE public.animais
  ADD COLUMN IF NOT EXISTS precisa_trocar_brinco boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS brinco_anterior text;
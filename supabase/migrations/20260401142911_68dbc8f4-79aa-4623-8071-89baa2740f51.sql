
CREATE TABLE public.racas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.racas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own racas" ON public.racas
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add gado settings columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rendimento_carcaca NUMERIC DEFAULT 52,
  ADD COLUMN IF NOT EXISTS unidade_peso TEXT DEFAULT 'KG',
  ADD COLUMN IF NOT EXISTS exibir_conversao BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS formato_numero TEXT DEFAULT 'br';

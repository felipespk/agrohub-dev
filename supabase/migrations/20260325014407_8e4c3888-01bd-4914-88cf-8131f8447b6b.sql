
-- 1. Create variedades_grao table
CREATE TABLE public.variedades_grao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grao_id UUID NOT NULL REFERENCES public.tipos_grao(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.variedades_grao ENABLE ROW LEVEL SECURITY;

-- 3. RLS policy
CREATE POLICY "Users manage own variedades" ON public.variedades_grao
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Add variedade_id to recebimentos
ALTER TABLE public.recebimentos ADD COLUMN variedade_id UUID REFERENCES public.variedades_grao(id) ON DELETE SET NULL;

-- 5. Add variedade_id to saidas
ALTER TABLE public.saidas ADD COLUMN variedade_id UUID REFERENCES public.variedades_grao(id) ON DELETE SET NULL;

-- 6. Updated_at trigger for variedades_grao
CREATE TRIGGER update_variedades_grao_updated_at
  BEFORE UPDATE ON public.variedades_grao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

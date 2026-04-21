CREATE TABLE public.racas_cores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raca_id UUID NOT NULL REFERENCES public.racas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_racas_cores_raca_id ON public.racas_cores(raca_id);

ALTER TABLE public.racas_cores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own racas_cores"
ON public.racas_cores FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_read_racas_cores"
ON public.racas_cores FOR SELECT
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

-- Trigger: garantir apenas uma cor principal por raça
CREATE OR REPLACE FUNCTION public.ensure_single_principal_cor()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.principal = true THEN
    UPDATE public.racas_cores
    SET principal = false
    WHERE raca_id = NEW.raca_id
      AND id <> NEW.id
      AND principal = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_principal_cor
BEFORE INSERT OR UPDATE ON public.racas_cores
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_principal_cor();
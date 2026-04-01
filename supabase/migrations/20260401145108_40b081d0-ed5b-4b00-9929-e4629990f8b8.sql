
-- Pastos
CREATE TABLE IF NOT EXISTS public.pastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  area_hectares DECIMAL(10,2),
  capacidade_cabecas INTEGER,
  ativo BOOLEAN DEFAULT true,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pastos" ON public.pastos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lotes
CREATE TABLE IF NOT EXISTS public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  pasto_id UUID REFERENCES public.pastos(id),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lotes" ON public.lotes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Animais
CREATE TABLE IF NOT EXISTS public.animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brinco TEXT NOT NULL,
  nome TEXT,
  sexo TEXT NOT NULL CHECK (sexo IN ('macho','femea')),
  raca_id UUID REFERENCES public.racas(id),
  cor TEXT,
  data_nascimento DATE,
  data_entrada DATE DEFAULT CURRENT_DATE,
  categoria TEXT NOT NULL CHECK (categoria IN ('vaca','touro','bezerro','bezerra','novilha','boi')),
  origem TEXT DEFAULT 'nascido' CHECK (origem IN ('nascido','comprado')),
  pai_brinco TEXT,
  mae_brinco TEXT,
  pasto_id UUID REFERENCES public.pastos(id),
  lote_id UUID REFERENCES public.lotes(id),
  peso_atual DECIMAL(10,2),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','vendido','morto','transferido')),
  foto_url TEXT,
  observacoes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brinco, user_id)
);
ALTER TABLE public.animais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own animais" ON public.animais FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pesagens
CREATE TABLE IF NOT EXISTS public.pesagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID REFERENCES public.animais(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg DECIMAL(10,2) NOT NULL,
  gmd DECIMAL(10,4),
  observacao TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pesagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pesagens" ON public.pesagens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Medicamentos
CREATE TABLE IF NOT EXISTS public.medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('vacina','medicamento','vermifugo')),
  fabricante TEXT,
  carencia_dias INTEGER DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.medicamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own medicamentos" ON public.medicamentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Aplicações Sanitárias
CREATE TABLE IF NOT EXISTS public.aplicacoes_sanitarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID REFERENCES public.animais(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES public.lotes(id),
  medicamento_id UUID REFERENCES public.medicamentos(id) NOT NULL,
  data_aplicacao DATE NOT NULL DEFAULT CURRENT_DATE,
  dose TEXT,
  proxima_dose DATE,
  observacao TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aplicacoes_sanitarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own aplicacoes_sanitarias" ON public.aplicacoes_sanitarias FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Movimentações de Gado
CREATE TABLE IF NOT EXISTS public.movimentacoes_gado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('compra','venda','nascimento','morte','transferencia')),
  animal_id UUID REFERENCES public.animais(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER DEFAULT 1,
  peso_kg DECIMAL(10,2),
  valor_unitario DECIMAL(15,2),
  valor_total DECIMAL(15,2),
  contato_id UUID,
  causa_morte TEXT,
  pasto_origem_id UUID REFERENCES public.pastos(id),
  pasto_destino_id UUID REFERENCES public.pastos(id),
  observacao TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.movimentacoes_gado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own movimentacoes_gado" ON public.movimentacoes_gado FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reprodução
CREATE TABLE IF NOT EXISTS public.reproducao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  femea_id UUID REFERENCES public.animais(id) NOT NULL,
  macho_id UUID REFERENCES public.animais(id),
  semen_info TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('monta_natural','inseminacao')),
  data_cobertura DATE NOT NULL,
  diagnostico TEXT DEFAULT 'pendente' CHECK (diagnostico IN ('prenha','vazia','pendente')),
  data_diagnostico DATE,
  data_parto_prevista DATE,
  data_parto_real DATE,
  bezerro_id UUID REFERENCES public.animais(id),
  observacao TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reproducao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reproducao" ON public.reproducao FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

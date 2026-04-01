
-- Talhões
CREATE TABLE public.talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  area_hectares DECIMAL(10,2) NOT NULL,
  tipo_solo TEXT CHECK (tipo_solo IN ('argiloso','arenoso','misto','outro')),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.talhoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own talhoes" ON public.talhoes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Culturas
CREATE TABLE public.culturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  unidade_colheita TEXT DEFAULT 'sacas/ha' CHECK (unidade_colheita IN ('sacas/ha','ton/ha','arrobas/ha','kg/ha')),
  ciclo_medio_dias INTEGER,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.culturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own culturas" ON public.culturas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Variedades de cultura
CREATE TABLE public.variedades_cultura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultura_id UUID REFERENCES public.culturas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.variedades_cultura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own variedades_cultura" ON public.variedades_cultura FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Safras
CREATE TABLE public.safras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  status TEXT DEFAULT 'planejamento' CHECK (status IN ('planejamento','andamento','finalizada')),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.safras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own safras" ON public.safras FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Safra-Talhões (vínculo)
CREATE TABLE public.safra_talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_id UUID REFERENCES public.safras(id) ON DELETE CASCADE NOT NULL,
  talhao_id UUID REFERENCES public.talhoes(id) NOT NULL,
  cultura_id UUID REFERENCES public.culturas(id) NOT NULL,
  variedade_id UUID REFERENCES public.variedades_cultura(id),
  data_plantio_prevista DATE,
  data_colheita_prevista DATE,
  meta_produtividade DECIMAL(10,2),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(safra_id, talhao_id)
);
ALTER TABLE public.safra_talhoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own safra_talhoes" ON public.safra_talhoes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Insumos
CREATE TABLE public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('semente','fertilizante','defensivo','combustivel','outro')),
  unidade_medida TEXT NOT NULL CHECK (unidade_medida IN ('litros','kg','sacas','unidade','tonelada')),
  preco_unitario DECIMAL(15,2) DEFAULT 0,
  estoque_atual DECIMAL(15,2) DEFAULT 0,
  estoque_minimo DECIMAL(15,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own insumos" ON public.insumos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Movimentações de Insumo
CREATE TABLE public.movimentacoes_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID REFERENCES public.insumos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade DECIMAL(15,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  atividade_id UUID,
  fornecedor_id UUID REFERENCES public.contatos_financeiros(id),
  valor_total DECIMAL(15,2),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.movimentacoes_insumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own movimentacoes_insumo" ON public.movimentacoes_insumo FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Máquinas
CREATE TABLE public.maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('trator','colheitadeira','pulverizador','plantadeira','outro')),
  modelo TEXT,
  ano INTEGER,
  placa_chassi TEXT,
  valor_aquisicao DECIMAL(15,2),
  custo_hora DECIMAL(10,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own maquinas" ON public.maquinas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Manutenções
CREATE TABLE public.manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES public.maquinas(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK (tipo IN ('preventiva','corretiva')),
  descricao TEXT,
  custo DECIMAL(15,2) DEFAULT 0,
  proxima_manutencao DATE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own manutencoes" ON public.manutencoes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atividades de Campo
CREATE TABLE public.atividades_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_talhao_id UUID REFERENCES public.safra_talhoes(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('plantio','adubacao','pulverizacao','irrigacao','capina','colheita','outro')),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  area_coberta_ha DECIMAL(10,2),
  insumo_id UUID REFERENCES public.insumos(id),
  quantidade_insumo DECIMAL(15,2),
  maquina_id UUID REFERENCES public.maquinas(id),
  horas_maquina DECIMAL(10,2),
  operador TEXT,
  custo_total DECIMAL(15,2) DEFAULT 0,
  observacao TEXT,
  condicao_climatica TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.atividades_campo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own atividades_campo" ON public.atividades_campo FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ocorrências MIP (Pragas/Doenças/Daninhas)
CREATE TABLE public.ocorrencias_mip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_talhao_id UUID REFERENCES public.safra_talhoes(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK (tipo IN ('praga','doenca','daninha')),
  nome_ocorrencia TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('baixo','medio','alto','critico')),
  decisao TEXT DEFAULT 'monitorar' CHECK (decisao IN ('monitorar','aplicar','nenhuma')),
  foto_url TEXT,
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ocorrencias_mip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ocorrencias_mip" ON public.ocorrencias_mip FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Colheitas
CREATE TABLE public.colheitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_talhao_id UUID REFERENCES public.safra_talhoes(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade DECIMAL(15,2) NOT NULL,
  umidade_percentual DECIMAL(5,2),
  produtividade_calculada DECIMAL(10,2),
  destino TEXT DEFAULT 'silo' CHECK (destino IN ('silo','venda_direta','cooperativa')),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.colheitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own colheitas" ON public.colheitas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comercialização
CREATE TABLE public.comercializacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_id UUID REFERENCES public.safras(id),
  cultura_id UUID REFERENCES public.culturas(id),
  comprador_id UUID REFERENCES public.contatos_financeiros(id),
  quantidade DECIMAL(15,2) NOT NULL,
  preco_unitario DECIMAL(15,2) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_contrato TEXT DEFAULT 'avista' CHECK (tipo_contrato IN ('avista','prazo','barter')),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.comercializacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own comercializacao" ON public.comercializacao FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add farm_name_lavoura to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS farm_name_lavoura TEXT DEFAULT '';

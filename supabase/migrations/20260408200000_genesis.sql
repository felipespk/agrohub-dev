-- AGRIX — Complete Database Schema
-- Run this in Supabase SQL Editor to create all tables at once

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  farm_name TEXT DEFAULT '',
  farm_name_financeiro TEXT DEFAULT '',
  farm_name_gado TEXT DEFAULT '',
  farm_name_lavoura TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT false,
  fazenda_lat DECIMAL(10,7),
  fazenda_lng DECIMAL(10,7),
  fazenda_zoom INTEGER DEFAULT 15,
  fazenda_lat_lavoura DECIMAL(10,7),
  fazenda_lng_lavoura DECIMAL(10,7),
  fazenda_lat_gado DECIMAL(10,7),
  fazenda_lng_gado DECIMAL(10,7),
  fazenda_lat_secador DECIMAL(10,7),
  fazenda_lng_secador DECIMAL(10,7),
  rendimento_carcaca DECIMAL(5,2) DEFAULT 52,
  unidade_peso TEXT DEFAULT 'kg',
  exibir_conversao BOOLEAN DEFAULT true,
  valor_arroba DECIMAL(10,2) DEFAULT 300.00,
  data_cotacao_arroba DATE,
  idade_bezerro_meses INTEGER DEFAULT 8,
  idade_jovem_meses INTEGER DEFAULT 24,
  reclassificacao_automatica BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- SECADOR / SILO MODULE
-- ============================================
CREATE TABLE public.tipos_grao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.variedades_grao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_grao_id UUID REFERENCES public.tipos_grao(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.produtores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.compradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.recebimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  produtor_id UUID REFERENCES public.produtores(id),
  tipo_grao_id UUID REFERENCES public.tipos_grao(id),
  variedade_id UUID REFERENCES public.variedades_grao(id),
  placa_veiculo TEXT,
  nota_fiscal TEXT,
  peso_bruto DECIMAL(15,2),
  tara DECIMAL(15,2),
  peso_liquido DECIMAL(15,2),
  umidade_percentual DECIMAL(5,2),
  impureza_percentual DECIMAL(5,2),
  desconto_umidade DECIMAL(15,2) DEFAULT 0,
  desconto_impureza DECIMAL(15,2) DEFAULT 0,
  peso_ajustado DECIMAL(15,2),
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.saidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK (tipo IN ('venda', 'transferencia', 'amostra', 'outro')),
  comprador_id UUID REFERENCES public.compradores(id),
  tipo_grao_id UUID REFERENCES public.tipos_grao(id),
  variedade_id UUID REFERENCES public.variedades_grao(id),
  peso_bruto DECIMAL(15,2),
  tara DECIMAL(15,2),
  peso_liquido DECIMAL(15,2),
  preco_saca DECIMAL(15,2),
  valor_total DECIMAL(15,2),
  nota_fiscal TEXT,
  placa_veiculo TEXT,
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.quebras_tecnicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_grao_id UUID REFERENCES public.tipos_grao(id),
  peso_kg DECIMAL(15,2) NOT NULL,
  motivo TEXT,
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FINANCEIRO MODULE
-- ============================================
CREATE TABLE public.centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6B7280',
  icone TEXT,
  ativo BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo TEXT DEFAULT 'corrente',
  saldo_atual DECIMAL(15,2) DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'investimento')),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.contatos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fornecedor', 'cliente', 'ambos')),
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.contas_pr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  descricao TEXT NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_pago DECIMAL(15,2) DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido', 'cancelado')),
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  contato_id UUID REFERENCES public.contatos_financeiros(id),
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  valor DECIMAL(15,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  conta_destino_id UUID REFERENCES public.contas_bancarias(id),
  contato_id UUID REFERENCES public.contatos_financeiros(id),
  conta_pr_id UUID REFERENCES public.contas_pr(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- GADO (CATTLE) MODULE
-- ============================================
CREATE TABLE public.racas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  area_hectares DECIMAL(10,2),
  capacidade_cabecas INTEGER,
  coordenadas JSONB,
  centro_lat DECIMAL(10,7),
  centro_lng DECIMAL(10,7),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  pasto_id UUID REFERENCES public.pastos(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brinco TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK (sexo IN ('macho', 'femea')),
  categoria TEXT NOT NULL CHECK (categoria IN ('vaca', 'touro', 'bezerro', 'bezerra', 'novilha', 'garrote', 'boi')),
  raca_id UUID REFERENCES public.racas(id),
  cor TEXT,
  data_nascimento DATE,
  data_entrada DATE,
  origem TEXT CHECK (origem IN ('nascido', 'comprado')),
  pai_brinco TEXT,
  mae_brinco TEXT,
  pasto_id UUID REFERENCES public.pastos(id),
  lote_id UUID REFERENCES public.lotes(id),
  peso_atual DECIMAL(10,2),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'vendido', 'morto')),
  foto_url TEXT,
  observacoes TEXT,
  categoria_atualizada_em TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pesagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID REFERENCES public.animais(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg DECIMAL(10,2) NOT NULL,
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('vacina', 'vermifugo', 'medicamento', 'suplemento')),
  fabricante TEXT,
  carencia_dias INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.aplicacoes_sanitarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID REFERENCES public.animais(id) ON DELETE CASCADE NOT NULL,
  medicamento_id UUID REFERENCES public.medicamentos(id) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  dose TEXT,
  proxima_dose DATE,
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.movimentacoes_gado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venda', 'nascimento', 'morte', 'transferencia')),
  animal_id UUID REFERENCES public.animais(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER DEFAULT 1,
  peso_kg DECIMAL(10,2),
  valor_unitario DECIMAL(15,2),
  valor_total DECIMAL(15,2),
  pasto_origem_id UUID REFERENCES public.pastos(id),
  pasto_destino_id UUID REFERENCES public.pastos(id),
  causa_morte TEXT,
  brinco_bezerro TEXT,
  sexo_bezerro TEXT,
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.reproducao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matriz_id UUID REFERENCES public.animais(id),
  touro_id UUID REFERENCES public.animais(id),
  data_cobertura DATE,
  previsao_parto DATE,
  data_parto DATE,
  resultado TEXT,
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- LAVOURA (CROP) MODULE
-- ============================================
CREATE TABLE public.talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  area_hectares DECIMAL(10,2) NOT NULL,
  tipo_solo TEXT CHECK (tipo_solo IN ('argiloso', 'arenoso', 'misto', 'outro')),
  coordenadas JSONB,
  centro_lat DECIMAL(10,7),
  centro_lng DECIMAL(10,7),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.culturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  unidade_colheita TEXT DEFAULT 'sacas/ha' CHECK (unidade_colheita IN ('sacas/ha', 'ton/ha', 'arrobas/ha', 'kg/ha')),
  ciclo_medio_dias INTEGER,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.variedades_cultura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultura_id UUID REFERENCES public.culturas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.safras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  status TEXT DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'andamento', 'finalizada')),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('semente', 'fertilizante', 'defensivo', 'combustivel', 'outro')),
  unidade_medida TEXT NOT NULL CHECK (unidade_medida IN ('litros', 'kg', 'sacas', 'unidade', 'tonelada')),
  preco_unitario DECIMAL(15,2) DEFAULT 0,
  estoque_atual DECIMAL(15,2) DEFAULT 0,
  estoque_minimo DECIMAL(15,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.movimentacoes_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID REFERENCES public.insumos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade DECIMAL(15,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  atividade_id UUID,
  fornecedor_id UUID REFERENCES public.contatos_financeiros(id),
  valor_total DECIMAL(15,2),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('trator', 'colheitadeira', 'pulverizador', 'plantadeira', 'outro')),
  modelo TEXT,
  ano INTEGER,
  placa_chassi TEXT,
  valor_aquisicao DECIMAL(15,2),
  custo_hora DECIMAL(10,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES public.maquinas(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK (tipo IN ('preventiva', 'corretiva')),
  descricao TEXT,
  custo DECIMAL(15,2) DEFAULT 0,
  proxima_manutencao DATE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.atividades_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_talhao_id UUID REFERENCES public.safra_talhoes(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('plantio', 'adubacao', 'pulverizacao', 'irrigacao', 'capina', 'colheita', 'outro')),
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

CREATE TABLE public.ocorrencias_mip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_talhao_id UUID REFERENCES public.safra_talhoes(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK (tipo IN ('praga', 'doenca', 'daninha')),
  nome_ocorrencia TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('baixo', 'medio', 'alto', 'critico')),
  decisao TEXT DEFAULT 'monitorar' CHECK (decisao IN ('monitorar', 'aplicar', 'nenhuma')),
  foto_url TEXT,
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.colheitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_talhao_id UUID REFERENCES public.safra_talhoes(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade DECIMAL(15,2) NOT NULL,
  umidade_percentual DECIMAL(5,2),
  produtividade_calculada DECIMAL(10,2),
  destino TEXT DEFAULT 'silo' CHECK (destino IN ('silo', 'venda_direta', 'cooperativa')),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.comercializacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safra_id UUID REFERENCES public.safras(id),
  cultura_id UUID REFERENCES public.culturas(id),
  comprador_id UUID REFERENCES public.contatos_financeiros(id),
  quantidade DECIMAL(15,2) NOT NULL,
  preco_unitario DECIMAL(15,2) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_contrato TEXT DEFAULT 'avista' CHECK (tipo_contrato IN ('avista', 'prazo', 'barter')),
  observacao TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ADMIN VIEW
-- ============================================
CREATE OR REPLACE VIEW public.all_users AS
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as account_created_at,
  u.last_sign_in_at,
  p.farm_name,
  p.is_admin,
  p.display_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC;

GRANT SELECT ON public.all_users TO authenticated;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'tipos_grao','variedades_grao','produtores','compradores','recebimentos','saidas','quebras_tecnicas',
      'centros_custo','contas_bancarias','categorias_financeiras','contatos_financeiros','contas_pr','lancamentos',
      'racas','pastos','lotes','animais','pesagens','medicamentos','aplicacoes_sanitarias','movimentacoes_gado','reproducao',
      'talhoes','culturas','variedades_cultura','safras','safra_talhoes','insumos','movimentacoes_insumo',
      'maquinas','manutencoes','atividades_campo','ocorrencias_mip','colheitas','comercializacao'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "users_manage_%s" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "admin_read_%s" ON public.%I FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true))', t, t);
  END LOOP;
END $$;
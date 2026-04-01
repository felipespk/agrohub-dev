
-- 1. centros_custo
CREATE TABLE public.centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  icone TEXT DEFAULT 'circle',
  cor TEXT DEFAULT '#16A34A',
  ativo BOOLEAN DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own centros_custo" ON public.centros_custo FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. contas_bancarias
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  banco TEXT,
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  saldo_atual DECIMAL(15,2) DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contas_bancarias" ON public.contas_bancarias FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. categorias_financeiras
CREATE TABLE public.categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa','investimento')),
  pai_id UUID REFERENCES public.categorias_financeiras(id),
  cor TEXT DEFAULT '#6B7280',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categorias_financeiras" ON public.categorias_financeiras FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. contatos_financeiros
CREATE TABLE public.contatos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fornecedor','cliente','ambos')),
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  observacao TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contatos_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contatos_financeiros" ON public.contatos_financeiros FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. contas_pr
CREATE TABLE public.contas_pr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('pagar','receber')),
  descricao TEXT NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_pago DECIMAL(15,2) DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto','pago','vencido','parcial')),
  contato_id UUID REFERENCES public.contatos_financeiros(id),
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  centro_custo_id UUID NOT NULL REFERENCES public.centros_custo(id),
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  recorrente BOOLEAN DEFAULT false,
  observacao TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contas_pr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contas_pr" ON public.contas_pr FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. lancamentos
CREATE TABLE public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa','transferencia')),
  valor DECIMAL(15,2) NOT NULL,
  data DATE NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  centro_custo_id UUID NOT NULL REFERENCES public.centros_custo(id),
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  conta_destino_id UUID REFERENCES public.contas_bancarias(id),
  conta_pr_id UUID REFERENCES public.contas_pr(id),
  contato_id UUID REFERENCES public.contatos_financeiros(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lancamentos" ON public.lancamentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

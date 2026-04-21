
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Produtores
CREATE TABLE public.produtores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL DEFAULT 'CPF',
  documento TEXT NOT NULL,
  nome TEXT NOT NULL,
  fazenda TEXT DEFAULT '',
  endereco_fazenda TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  inscricao_estadual TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.produtores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own produtores" ON public.produtores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_produtores_updated_at BEFORE UPDATE ON public.produtores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tipos de Grão
CREATE TABLE public.tipos_grao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  umidade_padrao NUMERIC NOT NULL DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tipos_grao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tipos_grao" ON public.tipos_grao FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_tipos_grao_updated_at BEFORE UPDATE ON public.tipos_grao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Compradores
CREATE TABLE public.compradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  contato TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own compradores" ON public.compradores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_compradores_updated_at BEFORE UPDATE ON public.compradores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recebimentos
CREATE TABLE public.recebimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  placa_caminhao TEXT NOT NULL,
  produtor_id UUID NOT NULL REFERENCES public.produtores(id) ON DELETE CASCADE,
  tipo_grao_id UUID NOT NULL REFERENCES public.tipos_grao(id) ON DELETE CASCADE,
  peso_bruto NUMERIC NOT NULL,
  umidade_inicial NUMERIC NOT NULL,
  umidade_final_alvo NUMERIC NOT NULL DEFAULT 12,
  impureza NUMERIC NOT NULL DEFAULT 0,
  desconto_umidade_percent NUMERIC NOT NULL DEFAULT 0,
  desconto_umidade_kg NUMERIC NOT NULL DEFAULT 0,
  desconto_impureza_kg NUMERIC NOT NULL DEFAULT 0,
  peso_liquido NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recebimentos" ON public.recebimentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_recebimentos_updated_at BEFORE UPDATE ON public.recebimentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saídas
CREATE TABLE public.saidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  placa_caminhao TEXT NOT NULL,
  comprador_id UUID NOT NULL REFERENCES public.compradores(id) ON DELETE CASCADE,
  classificacao TEXT DEFAULT '',
  kgs_expedidos NUMERIC NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Venda',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.saidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saidas" ON public.saidas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_saidas_updated_at BEFORE UPDATE ON public.saidas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quebras Técnicas
CREATE TABLE public.quebras_tecnicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  kg_ajuste NUMERIC NOT NULL,
  justificativa TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.quebras_tecnicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quebras_tecnicas" ON public.quebras_tecnicas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_quebras_tecnicas_updated_at BEFORE UPDATE ON public.quebras_tecnicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

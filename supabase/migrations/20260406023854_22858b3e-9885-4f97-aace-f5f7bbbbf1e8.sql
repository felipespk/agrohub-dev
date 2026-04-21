
-- Create a security definer function to check admin status (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = check_user_id AND is_admin = true
  );
$$;

-- Admin read policies for all tables with user_id
DROP POLICY IF EXISTS "admin_read_animais" ON public.animais;
CREATE POLICY "admin_read_animais" ON public.animais FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_pastos" ON public.pastos;
CREATE POLICY "admin_read_pastos" ON public.pastos FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_lotes" ON public.lotes;
CREATE POLICY "admin_read_lotes" ON public.lotes FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_pesagens" ON public.pesagens;
CREATE POLICY "admin_read_pesagens" ON public.pesagens FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_medicamentos" ON public.medicamentos;
CREATE POLICY "admin_read_medicamentos" ON public.medicamentos FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_aplicacoes_sanitarias" ON public.aplicacoes_sanitarias;
CREATE POLICY "admin_read_aplicacoes_sanitarias" ON public.aplicacoes_sanitarias FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_movimentacoes_gado" ON public.movimentacoes_gado;
CREATE POLICY "admin_read_movimentacoes_gado" ON public.movimentacoes_gado FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_reproducao" ON public.reproducao;
CREATE POLICY "admin_read_reproducao" ON public.reproducao FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_racas" ON public.racas;
CREATE POLICY "admin_read_racas" ON public.racas FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- talhoes already has admin policy, drop and recreate with function
DROP POLICY IF EXISTS "Admins can read all talhoes" ON public.talhoes;
DROP POLICY IF EXISTS "admin_read_talhoes" ON public.talhoes;
CREATE POLICY "admin_read_talhoes" ON public.talhoes FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_culturas" ON public.culturas;
CREATE POLICY "admin_read_culturas" ON public.culturas FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_variedades_cultura" ON public.variedades_cultura;
CREATE POLICY "admin_read_variedades_cultura" ON public.variedades_cultura FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_safras" ON public.safras;
CREATE POLICY "admin_read_safras" ON public.safras FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_safra_talhoes" ON public.safra_talhoes;
CREATE POLICY "admin_read_safra_talhoes" ON public.safra_talhoes FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_insumos" ON public.insumos;
CREATE POLICY "admin_read_insumos" ON public.insumos FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_movimentacoes_insumo" ON public.movimentacoes_insumo;
CREATE POLICY "admin_read_movimentacoes_insumo" ON public.movimentacoes_insumo FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_maquinas" ON public.maquinas;
CREATE POLICY "admin_read_maquinas" ON public.maquinas FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_manutencoes" ON public.manutencoes;
CREATE POLICY "admin_read_manutencoes" ON public.manutencoes FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_atividades_campo" ON public.atividades_campo;
CREATE POLICY "admin_read_atividades_campo" ON public.atividades_campo FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_ocorrencias_mip" ON public.ocorrencias_mip;
CREATE POLICY "admin_read_ocorrencias_mip" ON public.ocorrencias_mip FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_colheitas" ON public.colheitas;
CREATE POLICY "admin_read_colheitas" ON public.colheitas FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_comercializacao" ON public.comercializacao;
CREATE POLICY "admin_read_comercializacao" ON public.comercializacao FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_centros_custo" ON public.centros_custo;
CREATE POLICY "admin_read_centros_custo" ON public.centros_custo FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_contas_bancarias" ON public.contas_bancarias;
CREATE POLICY "admin_read_contas_bancarias" ON public.contas_bancarias FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_categorias_financeiras" ON public.categorias_financeiras;
CREATE POLICY "admin_read_categorias_financeiras" ON public.categorias_financeiras FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_contatos_financeiros" ON public.contatos_financeiros;
CREATE POLICY "admin_read_contatos_financeiros" ON public.contatos_financeiros FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_contas_pr" ON public.contas_pr;
CREATE POLICY "admin_read_contas_pr" ON public.contas_pr FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_lancamentos" ON public.lancamentos;
CREATE POLICY "admin_read_lancamentos" ON public.lancamentos FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_recebimentos" ON public.recebimentos;
CREATE POLICY "admin_read_recebimentos" ON public.recebimentos FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_saidas" ON public.saidas;
CREATE POLICY "admin_read_saidas" ON public.saidas FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_produtores" ON public.produtores;
CREATE POLICY "admin_read_produtores" ON public.produtores FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_compradores" ON public.compradores;
CREATE POLICY "admin_read_compradores" ON public.compradores FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_tipos_grao" ON public.tipos_grao;
CREATE POLICY "admin_read_tipos_grao" ON public.tipos_grao FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_variedades_grao" ON public.variedades_grao;
CREATE POLICY "admin_read_variedades_grao" ON public.variedades_grao FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_quebras_tecnicas" ON public.quebras_tecnicas;
CREATE POLICY "admin_read_quebras_tecnicas" ON public.quebras_tecnicas FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Also drop the old animais admin policy that used inline subquery
DROP POLICY IF EXISTS "Admins can read all animais" ON public.animais;

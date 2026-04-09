/**
 * Financeiro integration helpers.
 * Used by Gado, Lavoura, and Secador modules to create financial entries
 * when sales/purchases occur.
 */
import { supabase } from './supabase'

/** Find first active cost center whose name matches a pattern (case-insensitive). */
export async function buscarCentroCusto(userId: string, nomePattern: string) {
  const { data } = await supabase
    .from('centros_custo')
    .select('*')
    .eq('user_id', userId)
    .ilike('nome', `%${nomePattern}%`)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()
  return data
}

/** Find first active bank account for the user. */
export async function buscarContaBancaria(userId: string) {
  const { data } = await supabase
    .from('contas_bancarias')
    .select('*')
    .eq('user_id', userId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()
  return data
}

/**
 * Create a revenue lancamento and update the bank account balance.
 * Used when other modules register cash sales.
 */
export async function criarLancamentoReceita(
  userId: string,
  valor: number,
  data: string,
  descricao: string,
  centroCustoId: string,
  contaPrId?: string
): Promise<{ data?: { id: string }; error?: string }> {
  const conta = await buscarContaBancaria(userId)
  if (!conta) return { error: 'Nenhuma conta bancária ativa encontrada' }

  const { data: lancamento, error } = await supabase
    .from('lancamentos')
    .insert({
      user_id: userId,
      tipo: 'receita',
      valor,
      data,
      descricao,
      centro_custo_id: centroCustoId,
      conta_bancaria_id: conta.id,
      conta_pr_id: contaPrId ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Update bank balance
  await supabase
    .from('contas_bancarias')
    .update({ saldo_atual: (conta.saldo_atual ?? 0) + valor })
    .eq('id', conta.id)

  return { data: lancamento }
}

/**
 * Create a payable (contas_pr tipo=pagar) for a purchase.
 * Used when Gado/Lavoura registers a buy.
 */
export async function criarContaPagar(
  userId: string,
  descricao: string,
  valorTotal: number,
  dataVencimento: string,
  centroCustoId: string,
  categoriaId?: string,
  contatoId?: string
): Promise<{ data?: { id: string }; error?: string }> {
  const { data, error } = await supabase
    .from('contas_pr')
    .insert({
      user_id: userId,
      tipo: 'pagar',
      descricao,
      valor_total: valorTotal,
      valor_pago: 0,
      data_vencimento: dataVencimento,
      status: 'aberto',
      centro_custo_id: centroCustoId,
      categoria_id: categoriaId ?? null,
      contato_id: contatoId ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { data }
}

/**
 * Create a receivable (contas_pr tipo=receber) for a sale.
 * Used when Gado/Lavoura registers an "a prazo" sale.
 */
export async function criarContaReceber(
  userId: string,
  descricao: string,
  valorTotal: number,
  dataVencimento: string,
  centroCustoId: string,
  categoriaId?: string,
  contatoId?: string
): Promise<{ data?: { id: string }; error?: string }> {
  const { data, error } = await supabase
    .from('contas_pr')
    .insert({
      user_id: userId,
      tipo: 'receber',
      descricao,
      valor_total: valorTotal,
      valor_pago: 0,
      data_vencimento: dataVencimento,
      status: 'aberto',
      centro_custo_id: centroCustoId,
      categoria_id: categoriaId ?? null,
      contato_id: contatoId ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { data }
}

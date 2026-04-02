import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a revenue entry (lancamento tipo='receita') and updates bank balance.
 * Used for cash sales across modules (Lavoura, Gado).
 */
export async function criarLancamentoReceita(
  userId: string,
  valor: number,
  data: string,
  descricao: string,
  centroCustoId: string,
  contaPrId?: string
) {
  try {
    // Find first active bank account
    const { data: contas } = await supabase
      .from("contas_bancarias")
      .select("id")
      .eq("user_id", userId)
      .eq("ativa", true)
      .limit(1);

    if (!contas || contas.length === 0) return;

    const contaId = contas[0].id;

    // Create lancamento
    await supabase.from("lancamentos").insert({
      tipo: "receita",
      valor,
      data,
      descricao,
      centro_custo_id: centroCustoId,
      conta_bancaria_id: contaId,
      conta_pr_id: contaPrId || null,
      user_id: userId,
    } as any);

    // Update bank balance
    const { data: conta } = await supabase
      .from("contas_bancarias")
      .select("saldo_atual")
      .eq("id", contaId)
      .single();

    if (conta) {
      await supabase
        .from("contas_bancarias")
        .update({ saldo_atual: Number(conta.saldo_atual) + valor } as any)
        .eq("id", contaId);
    }
  } catch {
    // Silently skip
  }
}

/**
 * Find a cost center by name pattern (ilike).
 */
export async function buscarCentroCusto(userId: string, nomePattern: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("centros_custo")
      .select("id")
      .eq("user_id", userId)
      .ilike("nome", `%${nomePattern}%`)
      .limit(1);
    return data && data.length > 0 ? data[0].id : null;
  } catch {
    return null;
  }
}

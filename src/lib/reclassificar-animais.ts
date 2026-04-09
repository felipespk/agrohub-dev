/**
 * Automatic age-based cattle reclassification.
 * Called on Gado module load when auto-reclassification is enabled.
 *
 * Rules:
 * - age < idadeBezerroMeses  → bezerro (M) / bezerra (F)
 * - idadeBezerroMeses ≤ age < idadeJovemMeses → garrote (M) / novilha (F)
 * - age ≥ idadeJovemMeses   → boi (M) / vaca (F)
 * - EXCEPTION: touro is NEVER auto-reclassified
 */
import { supabase } from './supabase'
import { differenceInMonths, parseISO } from 'date-fns'

export interface ReclassifyConfig {
  idadeBezerroMeses: number   // default 8
  idadeJovemMeses: number     // default 24
  habilitado: boolean
}

export interface ReclassifyResult {
  total: number
  detalhes: string[]  // "brinco: categoria_antiga → nova_categoria"
}

export async function reclassificarAnimais(
  userId: string,
  config: ReclassifyConfig
): Promise<ReclassifyResult> {
  if (!config.habilitado) return { total: 0, detalhes: [] }

  const { data: animais } = await supabase
    .from('animais')
    .select('id, brinco, sexo, categoria, data_nascimento')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .not('data_nascimento', 'is', null)
    .neq('categoria', 'touro')   // never reclassify bulls

  if (!animais?.length) return { total: 0, detalhes: [] }

  const hoje = new Date()
  const updates: Array<{ id: string; categoria: string }> = []
  const detalhes: string[] = []

  for (const animal of animais) {
    const idadeMeses = differenceInMonths(hoje, parseISO(animal.data_nascimento))
    const isMacho = animal.sexo === 'macho'
    let novaCategoria: string

    if (idadeMeses < config.idadeBezerroMeses) {
      novaCategoria = isMacho ? 'bezerro' : 'bezerra'
    } else if (idadeMeses < config.idadeJovemMeses) {
      novaCategoria = isMacho ? 'garrote' : 'novilha'
    } else {
      novaCategoria = isMacho ? 'boi' : 'vaca'
    }

    if (novaCategoria !== animal.categoria) {
      updates.push({ id: animal.id, categoria: novaCategoria })
      detalhes.push(`${animal.brinco}: ${animal.categoria} → ${novaCategoria}`)
    }
  }

  // Batch update (one by one since Supabase doesn't support batch upsert with different values easily)
  for (const { id, categoria } of updates) {
    await supabase
      .from('animais')
      .update({
        categoria,
        categoria_atualizada_em: new Date().toISOString(),
      })
      .eq('id', id)
  }

  return { total: updates.length, detalhes }
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  user_id: string
  email: string | null
  display_name: string | null
  farm_name: string | null
  farm_name_financeiro: string | null
  farm_name_gado: string | null
  farm_name_lavoura: string | null
  is_admin: boolean
  fazenda_lat: number | null
  fazenda_lng: number | null
  fazenda_zoom: number | null
  fazenda_lat_lavoura: number | null
  fazenda_lng_lavoura: number | null
  fazenda_lat_gado: number | null
  fazenda_lng_gado: number | null
  fazenda_lat_secador: number | null
  fazenda_lng_secador: number | null
  rendimento_carcaca: number
  unidade_peso: string
  exibir_conversao: boolean
  valor_arroba: number
  data_cotacao_arroba: string | null
  idade_bezerro_meses: number
  idade_jovem_meses: number
  reclassificacao_automatica: boolean
  created_at: string
}

export interface Animal {
  id: string
  brinco: string
  sexo: 'macho' | 'femea'
  categoria: 'vaca' | 'touro' | 'bezerro' | 'bezerra' | 'novilha' | 'garrote' | 'boi'
  raca_id: string | null
  cor: string | null
  data_nascimento: string | null
  data_entrada: string | null
  origem: 'nascido' | 'comprado' | null
  pai_brinco: string | null
  mae_brinco: string | null
  pasto_id: string | null
  lote_id: string | null
  peso_atual: number | null
  status: 'ativo' | 'vendido' | 'morto'
  foto_url: string | null
  observacoes: string | null
  categoria_atualizada_em: string | null
  user_id: string
  created_at: string
}

export interface Pasto {
  id: string
  nome: string
  area_hectares: number | null
  capacidade_cabecas: number | null
  coordenadas: unknown
  centro_lat: number | null
  centro_lng: number | null
  user_id: string
  created_at: string
}

export interface Raca {
  id: string
  nome: string
  user_id: string
  created_at: string
}

export interface Pesagem {
  id: string
  animal_id: string
  data: string
  peso_kg: number
  observacao: string | null
  user_id: string
  created_at: string
}

export interface Medicamento {
  id: string
  nome: string
  tipo: 'vacina' | 'vermifugo' | 'medicamento' | 'suplemento' | null
  fabricante: string | null
  carencia_dias: number
  user_id: string
  created_at: string
}

export interface AplicacaoSanitaria {
  id: string
  animal_id: string
  medicamento_id: string
  data: string
  dose: string | null
  proxima_dose: string | null
  observacao: string | null
  user_id: string
  created_at: string
}

export interface MovimentacaoGado {
  id: string
  tipo: 'compra' | 'venda' | 'nascimento' | 'morte' | 'transferencia'
  animal_id: string | null
  data: string
  quantidade: number
  peso_kg: number | null
  valor_unitario: number | null
  valor_total: number | null
  pasto_origem_id: string | null
  pasto_destino_id: string | null
  causa_morte: string | null
  brinco_bezerro: string | null
  sexo_bezerro: string | null
  observacao: string | null
  user_id: string
  created_at: string
}

export interface Lancamento {
  id: string
  tipo: 'receita' | 'despesa' | 'transferencia'
  valor: number
  data: string
  descricao: string | null
  categoria_id: string | null
  centro_custo_id: string | null
  conta_bancaria_id: string | null
  conta_destino_id: string | null
  contato_id: string | null
  conta_pr_id: string | null
  user_id: string
  created_at: string
}

export interface ContaBancaria {
  id: string
  nome: string
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo: string
  saldo_atual: number
  ativa: boolean
  user_id: string
  created_at: string
}

export interface CentroCusto {
  id: string
  nome: string
  cor: string
  icone: string | null
  ativo: boolean
  user_id: string
  created_at: string
}

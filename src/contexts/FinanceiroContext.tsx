import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CentroCusto {
  id: string
  user_id: string
  nome: string
  cor: string
  icone: string | null
  ativo: boolean
  created_at?: string
}

export interface ContaBancaria {
  id: string
  user_id: string
  nome: string
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo: 'corrente' | 'poupanca' | 'investimento'
  saldo_atual: number
  ativa: boolean
  created_at?: string
}

export interface CategoriaFinanceira {
  id: string
  user_id: string
  nome: string
  tipo: 'receita' | 'despesa' | 'investimento'
  created_at?: string
}

export interface ContatoFinanceiro {
  id: string
  user_id: string
  nome: string
  tipo: 'fornecedor' | 'cliente' | 'ambos'
  cpf_cnpj: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  created_at?: string
}

// ─── Context Shape ────────────────────────────────────────────────────────────

interface FinanceiroContextValue {
  centrosCusto: CentroCusto[]
  contasBancarias: ContaBancaria[]
  categorias: CategoriaFinanceira[]
  contatos: ContatoFinanceiro[]
  loading: boolean
  reload: () => void
}

export const FinanceiroContext = createContext<FinanceiroContextValue | undefined>(undefined)

// ─── Default cost centers ────────────────────────────────────────────────────

const DEFAULT_CENTROS = [
  { nome: 'Secador / Silo', cor: '#f97316' },
  { nome: 'Pecuária',       cor: '#22c55e' },
  { nome: 'Lavoura',        cor: '#eab308' },
  { nome: 'Administrativo', cor: '#6366f1' },
]

// ─── Provider ────────────────────────────────────────────────────────────────

export function FinanceiroProvider({ children }: { children: ReactNode }) {
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()

  const [centrosCusto,   setCentrosCusto]   = useState<CentroCusto[]>([])
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])
  const [categorias,     setCategorias]     = useState<CategoriaFinanceira[]>([])
  const [contatos,       setContatos]       = useState<ContatoFinanceiro[]>([])
  const [loading,        setLoading]        = useState(true)
  const [tick,           setTick]           = useState(0)

  const reload = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [centrosRes, contasRes, categoriasRes, contatosRes] = await Promise.all([
          supabase.from('centros_custo').select('*').eq('user_id', userId).order('nome'),
          supabase.from('contas_bancarias').select('*').eq('user_id', userId).order('nome'),
          supabase.from('categorias_financeiras').select('*').eq('user_id', userId).order('nome'),
          supabase.from('contatos_financeiros').select('*').eq('user_id', userId).order('nome'),
        ])

        if (cancelled) return

        const centros = (centrosRes.data ?? []) as CentroCusto[]

        // Auto-seed default cost centers on first load
        if (centros.length === 0) {
          const seeds = DEFAULT_CENTROS.map(c => ({
            user_id: userId,
            nome: c.nome,
            cor: c.cor,
            icone: null,
            ativo: true,
          }))
          const { data: seeded } = await supabase
            .from('centros_custo')
            .insert(seeds)
            .select('*')
          if (!cancelled) {
            setCentrosCusto((seeded ?? []) as CentroCusto[])
          }
        } else {
          setCentrosCusto(centros)
        }

        if (!cancelled) {
          setContasBancarias((contasRes.data ?? []) as ContaBancaria[])
          setCategorias((categoriasRes.data ?? []) as CategoriaFinanceira[])
          setContatos((contatosRes.data ?? []) as ContatoFinanceiro[])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, tick])

  return (
    <FinanceiroContext.Provider value={{
      centrosCusto,
      contasBancarias,
      categorias,
      contatos,
      loading,
      reload,
    }}>
      {children}
    </FinanceiroContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFinanceiro() {
  const ctx = useContext(FinanceiroContext)
  if (!ctx) throw new Error('useFinanceiro must be used inside FinanceiroProvider')
  return ctx
}

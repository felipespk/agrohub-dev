import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { useFinanceiro } from '@/contexts/FinanceiroContext'
import { useCountUp } from '@/hooks/useCountUp'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Calendar, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Legend,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, parseISO, addDays, startOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Lancamento {
  id: string
  tipo: 'receita' | 'despesa' | 'transferencia'
  valor: number
  data: string
  descricao: string | null
  categoria_id: string | null
  centro_custo_id: string | null
  conta_bancaria_id: string | null
}

interface ContaPR {
  id: string
  tipo: string
  descricao: string
  valor_total: number
  valor_pago: number
  data_vencimento: string
  status: string
  categoria_id: string | null
  contato_id: string | null
}

type Periodo = 'mes' | '3meses' | '6meses' | 'ano' | 'personalizado'

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '12px',
    boxShadow: 'var(--shadow-2)',
  },
}

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function FinanceiroDashboard() {
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()
  const { centrosCusto, contasBancarias, loading: ctxLoading } = useFinanceiro()

  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [centroCustoFiltro, setCentroCustoFiltro] = useState<string>('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [contasVencidas, setContasVencidas] = useState<ContaPR[]>([])
  const [proximosVencimentos, setProximosVencimentos] = useState<ContaPR[]>([])
  const [loading, setLoading] = useState(true)

  const getDateRange = useCallback(() => {
    const hoje = new Date()
    if (periodo === 'mes') {
      return { from: format(startOfMonth(hoje), 'yyyy-MM-dd'), to: format(endOfMonth(hoje), 'yyyy-MM-dd') }
    } else if (periodo === '3meses') {
      return { from: format(startOfMonth(subMonths(hoje, 2)), 'yyyy-MM-dd'), to: format(endOfMonth(hoje), 'yyyy-MM-dd') }
    } else if (periodo === '6meses') {
      return { from: format(startOfMonth(subMonths(hoje, 5)), 'yyyy-MM-dd'), to: format(endOfMonth(hoje), 'yyyy-MM-dd') }
    } else if (periodo === 'ano') {
      return { from: format(startOfYear(hoje), 'yyyy-MM-dd'), to: format(endOfMonth(hoje), 'yyyy-MM-dd') }
    } else {
      return { from: dataInicio || format(startOfMonth(hoje), 'yyyy-MM-dd'), to: dataFim || format(endOfMonth(hoje), 'yyyy-MM-dd') }
    }
  }, [periodo, dataInicio, dataFim])

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { from, to } = getDateRange()
      const hoje = format(new Date(), 'yyyy-MM-dd')
      const em7Dias = format(addDays(new Date(), 7), 'yyyy-MM-dd')

      let query = supabase
        .from('lancamentos')
        .select('*')
        .eq('user_id', userId)
        .gte('data', from)
        .lte('data', to)

      if (centroCustoFiltro !== 'todos') {
        query = query.eq('centro_custo_id', centroCustoFiltro)
      }

      const [lancRes, vencidasRes, proximasRes] = await Promise.all([
        query,
        supabase.from('contas_pr').select('*').eq('user_id', userId).eq('status', 'aberto').lt('data_vencimento', hoje),
        supabase.from('contas_pr').select('*').eq('user_id', userId).eq('status', 'aberto')
          .gte('data_vencimento', hoje).lte('data_vencimento', em7Dias),
      ])

      setLancamentos((lancRes.data ?? []) as Lancamento[])
      setContasVencidas((vencidasRes.data ?? []) as ContaPR[])
      setProximosVencimentos((proximasRes.data ?? []) as ContaPR[])
    } finally {
      setLoading(false)
    }
  }, [userId, getDateRange, centroCustoFiltro])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const saldoContas = contasBancarias.filter(c => c.ativa).reduce((s, c) => s + (c.saldo_atual ?? 0), 0)
  const receitas = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const despesas = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const resultado = receitas - despesas

  const countedSaldo    = useCountUp(saldoContas)
  const countedReceitas = useCountUp(receitas)
  const countedDespesas = useCountUp(despesas)
  const countedResultado = useCountUp(Math.abs(resultado))

  // ─── BarChart: receitas vs despesas por mês ────────────────────────────────
  const barData = Array.from({ length: 6 }, (_, i) => {
    const ref = subMonths(new Date(), 5 - i)
    const mesStr = format(ref, 'yyyy-MM')
    const rec = lancamentos.filter(l => l.tipo === 'receita' && l.data.startsWith(mesStr)).reduce((s, l) => s + l.valor, 0)
    const desp = lancamentos.filter(l => l.tipo === 'despesa' && l.data.startsWith(mesStr)).reduce((s, l) => s + l.valor, 0)
    return { mes: MESES_PT[ref.getMonth()], Receitas: rec, Despesas: desp }
  })

  // ─── Resultado por atividade ───────────────────────────────────────────────
  const atividadeData = centrosCusto.map(cc => {
    const rec = lancamentos.filter(l => l.tipo === 'receita' && l.centro_custo_id === cc.id).reduce((s, l) => s + l.valor, 0)
    const desp = lancamentos.filter(l => l.tipo === 'despesa' && l.centro_custo_id === cc.id).reduce((s, l) => s + l.valor, 0)
    return { ...cc, resultado: rec - desp }
  }).filter(a => a.resultado !== 0).sort((a, b) => b.resultado - a.resultado)

  // ─── Fluxo de caixa (últimos 30 dias) ─────────────────────────────────────
  const fluxoData = (() => {
    const hoje = new Date()
    const dias: { data: string; saldo: number; receita: number; despesa: number }[] = []
    let saldoAcc = 0
    for (let i = 29; i >= 0; i--) {
      const d = addDays(hoje, -i)
      const dStr = format(d, 'yyyy-MM-dd')
      const rec = lancamentos.filter(l => l.tipo === 'receita' && l.data === dStr).reduce((s, l) => s + l.valor, 0)
      const desp = lancamentos.filter(l => l.tipo === 'despesa' && l.data === dStr).reduce((s, l) => s + l.valor, 0)
      saldoAcc += rec - desp
      dias.push({ data: format(d, 'dd/MM'), saldo: saldoAcc, receita: rec, despesa: desp })
    }
    return dias
  })()

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading || ctxLoading) return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-40" /></div>
      <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <div className="grid grid-cols-2 gap-4"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="t-heading-lg text-t1">Dashboard Financeiro</h1>
          <p className="text-sm text-t3 mt-0.5">Visão geral das suas finanças</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="3meses">3 Meses</SelectItem>
              <SelectItem value="6meses">6 Meses</SelectItem>
              <SelectItem value="ano">Ano</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {periodo === 'personalizado' && (
            <>
              <Input type="date" className="h-9 w-36 text-sm" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              <span className="text-t3 text-sm">até</span>
              <Input type="date" className="h-9 w-36 text-sm" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </>
          )}
          <Select value={centroCustoFiltro} onValueChange={setCentroCustoFiltro}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Centro de Custo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Centros</SelectItem>
              {centrosCusto.map(cc => (
                <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          style={{ animationDelay: '0ms', background: 'linear-gradient(135deg, #78FC90 0%, #2DD264 100%)' } as React.CSSProperties}
          className="animate-fade-up rounded-xl p-5 overflow-hidden relative shadow-[0_4px_16px_rgba(120,252,144,0.3)]"
        >
          <div className="absolute top-0 bottom-0 w-[80px] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-sweep pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#111110]/60 uppercase tracking-wider">Saldo em Contas</span>
            <div className="w-8 h-8 rounded-md bg-[#111110]/10 flex items-center justify-center">
              <DollarSign size={15} className="text-[#111110]" />
            </div>
          </div>
          <p className="t-display-sm tabular text-[#111110]">{formatCurrency(countedSaldo)}</p>
          <p className="text-xs text-[#111110]/55 mt-1">{contasBancarias.filter(c => c.ativa).length} conta(s) ativa(s)</p>
        </div>

        <Card style={{ animationDelay: '50ms' } as React.CSSProperties} className="animate-fade-up">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-t3 uppercase tracking-wider">Receitas</span>
              <div className="w-8 h-8 rounded-md bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={15} className="text-emerald-600" />
              </div>
            </div>
            <p className="t-display-sm tabular text-emerald-600">{formatCurrency(countedReceitas)}</p>
            <p className="text-xs text-t3 mt-1">No período selecionado</p>
          </CardContent>
        </Card>

        <Card style={{ animationDelay: '100ms' } as React.CSSProperties} className="animate-fade-up">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-t3 uppercase tracking-wider">Despesas</span>
              <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center">
                <TrendingDown size={15} className="text-red-600" />
              </div>
            </div>
            <p className="t-display-sm tabular text-red-600">{formatCurrency(countedDespesas)}</p>
            <p className="text-xs text-t3 mt-1">No período selecionado</p>
          </CardContent>
        </Card>

        <Card style={{ animationDelay: '150ms' } as React.CSSProperties} className="animate-fade-up">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-t3 uppercase tracking-wider">Resultado</span>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${resultado >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {resultado >= 0
                  ? <ArrowUpCircle size={15} className="text-emerald-600" />
                  : <ArrowDownCircle size={15} className="text-red-600" />}
              </div>
            </div>
            <p className={`t-display-sm tabular ${resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {resultado < 0 ? '-' : ''}{formatCurrency(countedResultado)}
            </p>
            <p className="text-xs text-t3 mt-1">{resultado >= 0 ? 'Superávit' : 'Déficit'} no período</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart: Receitas vs Despesas */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-t1">Receitas vs Despesas</CardTitle>
            <p className="text-xs text-t3">Últimos 6 meses</p>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--t3)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Receitas" fill="#78FC90" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Area chart: Fluxo de caixa */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-t1">Fluxo de Caixa</CardTitle>
            <p className="text-xs text-t3">Saldo acumulado — últimos 30 dias</p>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={fluxoData}>
                <defs>
                  <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="saldo" stroke="#6366f1" fill="url(#gradSaldo)" strokeWidth={2} name="Saldo Acumulado" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resultado por Atividade */}
      {atividadeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-t1">Resultado por Centro de Custo</CardTitle>
            <p className="text-xs text-t3">Receitas menos despesas por atividade no período</p>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            {atividadeData.map(cc => {
              const max = Math.max(...atividadeData.map(a => Math.abs(a.resultado)))
              const pct = max > 0 ? (Math.abs(cc.resultado) / max) * 100 : 0
              return (
                <div key={cc.id} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cc.cor }} />
                  <span className="text-sm text-t2 w-36 flex-shrink-0 truncate">{cc.nome}</span>
                  <div className="flex-1 bg-[var(--surface-raised)] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cc.resultado >= 0 ? '#78FC90' : '#ef4444' }}
                    />
                  </div>
                  <span className={`text-sm font-medium tabular w-28 text-right ${cc.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(cc.resultado)}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Contas Vencidas + Próximos 7 Dias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contas Vencidas */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <CardTitle className="text-sm font-semibold text-t1">Contas Vencidas</CardTitle>
              {contasVencidas.length > 0 && (
                <Badge className="bg-red-50 text-red-600 border-red-100 text-xs">{contasVencidas.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {contasVencidas.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-t3">Nenhuma conta vencida. </p>
              </div>
            ) : (
              <div className="space-y-2">
                {contasVencidas.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-t1 truncate max-w-[180px]">{c.descricao}</p>
                      <p className="text-xs text-red-500">Venceu em {formatDate(c.data_vencimento)}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600">{formatCurrency(c.valor_total - c.valor_pago)}</span>
                  </div>
                ))}
                {contasVencidas.length > 5 && (
                  <p className="text-xs text-t3 text-center pt-1">+{contasVencidas.length - 5} outras contas vencidas</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos 7 Dias */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-amber-500" />
              <CardTitle className="text-sm font-semibold text-t1">Próximos 7 Dias</CardTitle>
              {proximosVencimentos.length > 0 && (
                <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-xs">{proximosVencimentos.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {proximosVencimentos.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-t3">Nenhum vencimento nos próximos 7 dias.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {proximosVencimentos.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-t1 truncate max-w-[180px]">{c.descricao}</p>
                      <p className="text-xs text-t3">Vence em {formatDate(c.data_vencimento)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-t1">{formatCurrency(c.valor_total - c.valor_pago)}</span>
                      <Badge className={`ml-2 text-xs ${c.tipo === 'pagar' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {c.tipo === 'pagar' ? 'Pagar' : 'Receber'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

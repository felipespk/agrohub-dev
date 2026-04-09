import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { useFinanceiro } from '@/contexts/FinanceiroContext'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  parseISO, startOfWeek, endOfWeek, eachWeekOfInterval, addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCountUp } from '@/hooks/useCountUp'

interface Lancamento {
  id: string
  tipo: 'receita' | 'despesa' | 'transferencia'
  valor: number
  data: string
}

type Periodo = 'mes' | '3meses' | '6meses' | 'personalizado'

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '12px',
    boxShadow: 'var(--shadow-2)',
  },
}

export function FluxoCaixa() {
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()
  const { contasBancarias } = useFinanceiro()

  const [periodo, setPeriodo]     = useState<Periodo>('mes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]     = useState('')
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading]     = useState(true)

  const getDateRange = useCallback(() => {
    const hoje = new Date()
    if (periodo === 'mes')    return { from: format(startOfMonth(hoje), 'yyyy-MM-dd'), to: format(endOfMonth(hoje), 'yyyy-MM-dd') }
    if (periodo === '3meses') return { from: format(startOfMonth(subMonths(hoje, 2)), 'yyyy-MM-dd'), to: format(endOfMonth(hoje), 'yyyy-MM-dd') }
    if (periodo === '6meses') return { from: format(startOfMonth(subMonths(hoje, 5)), 'yyyy-MM-dd'), to: format(endOfMonth(hoje), 'yyyy-MM-dd') }
    return { from: dataInicio || format(startOfMonth(hoje), 'yyyy-MM-dd'), to: dataFim || format(endOfMonth(hoje), 'yyyy-MM-dd') }
  }, [periodo, dataInicio, dataFim])

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { from, to } = getDateRange()
      const { data } = await supabase
        .from('lancamentos').select('*').eq('user_id', userId)
        .gte('data', from).lte('data', to)
      setLancamentos((data ?? []) as Lancamento[])
    } finally { setLoading(false) }
  }, [userId, getDateRange])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Daily chart data ────────────────────────────────────────────────────
  const { from: fromStr, to: toStr } = getDateRange()
  const days = eachDayOfInterval({
    start: parseISO(fromStr),
    end: parseISO(toStr),
  })
  let saldoAcc = 0
  const dailyData = days.map(d => {
    const dStr = format(d, 'yyyy-MM-dd')
    const rec  = lancamentos.filter(l => l.tipo === 'receita'  && l.data === dStr).reduce((s, l) => s + l.valor, 0)
    const desp = lancamentos.filter(l => l.tipo === 'despesa'  && l.data === dStr).reduce((s, l) => s + l.valor, 0)
    saldoAcc  += rec - desp
    return { data: format(d, 'dd/MM'), receita: rec, despesa: desp, saldo: saldoAcc }
  })

  // ─── Weekly summary ───────────────────────────────────────────────────────
  const weeks = eachWeekOfInterval(
    { start: parseISO(fromStr), end: parseISO(toStr) },
    { weekStartsOn: 1 }
  )
  const weeklyData = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const rec  = lancamentos.filter(l => l.tipo === 'receita' && l.data >= format(weekStart, 'yyyy-MM-dd') && l.data <= format(weekEnd, 'yyyy-MM-dd')).reduce((s, l) => s + l.valor, 0)
    const desp = lancamentos.filter(l => l.tipo === 'despesa' && l.data >= format(weekStart, 'yyyy-MM-dd') && l.data <= format(weekEnd, 'yyyy-MM-dd')).reduce((s, l) => s + l.valor, 0)
    return {
      semana: `${format(weekStart, 'dd/MM')} – ${format(weekEnd, 'dd/MM')}`,
      receita: rec,
      despesa: desp,
      resultado: rec - desp,
    }
  })

  const totalReceitas = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const netoCaixa     = totalReceitas - totalDespesas
  const saldoContas   = contasBancarias.filter(c => c.ativa).reduce((s, c) => s + (c.saldo_atual ?? 0), 0)

  const countedReceitas = useCountUp(totalReceitas)
  const countedDespesas = useCountUp(totalDespesas)
  const countedNeto     = useCountUp(Math.abs(netoCaixa))
  const countedSaldo    = useCountUp(saldoContas)

  if (loading) return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-40" /></div>
      <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" /><Skeleton className="h-48 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="t-heading-lg text-t1">Fluxo de Caixa</h1>
          <p className="text-sm text-t3 mt-0.5">Entradas e saídas no período</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="3meses">3 Meses</SelectItem>
              <SelectItem value="6meses">6 Meses</SelectItem>
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
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Entradas', value: countedReceitas, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingUp, iconColor: 'text-emerald-600' },
          { label: 'Total Saídas', value: countedDespesas, color: 'text-red-600', bg: 'bg-red-50', icon: TrendingDown, iconColor: 'text-red-600' },
          { label: 'Fluxo Líquido', value: countedNeto, color: netoCaixa >= 0 ? 'text-emerald-600' : 'text-red-600', bg: netoCaixa >= 0 ? 'bg-emerald-50' : 'bg-red-50', icon: netoCaixa >= 0 ? TrendingUp : TrendingDown, iconColor: netoCaixa >= 0 ? 'text-emerald-600' : 'text-red-600', prefix: netoCaixa < 0 ? '-' : '' },
          { label: 'Saldo em Contas', value: countedSaldo, color: 'text-t1', bg: 'bg-blue-50', icon: DollarSign, iconColor: 'text-blue-600' },
        ].map(({ label, value, color, bg, icon: Icon, iconColor, prefix = '' }, i) => (
          <Card key={i} style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties} className="animate-fade-up">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-t3 uppercase tracking-wider">{label}</span>
                <div className={`w-8 h-8 rounded-md ${bg} flex items-center justify-center`}>
                  <Icon size={15} className={iconColor} />
                </div>
              </div>
              <p className={`t-display-sm tabular ${color}`}>{prefix}{formatCurrency(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Area Chart */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-t1">Entradas e Saídas Diárias</CardTitle>
          <p className="text-xs text-t3">Linha de saldo acumulado no período</p>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDesp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="data" tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} interval={Math.floor(dailyData.length / 8)} />
              <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} width={55} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="receita" name="Entradas" stroke="#22c55e" fill="url(#gradRec)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="despesa" name="Saídas" stroke="#ef4444" fill="url(#gradDesp)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="saldo" name="Saldo Acumulado" stroke="#6366f1" fill="url(#gradSaldo)" strokeWidth={2} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly summary table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-t1">Resumo por Semana</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {weeklyData.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm text-t3">Nenhum dado disponível.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Semana</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Entradas</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Saídas</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((w, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-raised)] transition-colors duration-100">
                      <td className="py-3 px-4 text-t2">{w.semana}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 tabular">{formatCurrency(w.receita)}</td>
                      <td className="py-3 px-4 text-right text-red-600 tabular">{formatCurrency(w.despesa)}</td>
                      <td className={`py-3 px-4 text-right tabular font-medium ${w.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {w.resultado < 0 ? '-' : ''}{formatCurrency(Math.abs(w.resultado))}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[var(--surface-raised)] font-semibold">
                    <td className="py-3 px-4 text-t1">Total</td>
                    <td className="py-3 px-4 text-right text-emerald-600 tabular">{formatCurrency(totalReceitas)}</td>
                    <td className="py-3 px-4 text-right text-red-600 tabular">{formatCurrency(totalDespesas)}</td>
                    <td className={`py-3 px-4 text-right tabular ${netoCaixa >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {netoCaixa < 0 ? '-' : ''}{formatCurrency(Math.abs(netoCaixa))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

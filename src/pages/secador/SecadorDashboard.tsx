import { useEffect, useState, useCallback } from 'react'
import {
  Warehouse, TrendingUp, TrendingDown, PackageCheck, Wrench,
  RefreshCw, Calendar,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/useCountUp'
import { formatNumber } from '@/lib/utils'

type Period = '1m' | '3m' | '6m' | '1y'

interface KPIs {
  estoqueAtual: number
  volumeBruto: number
  pesoAjustado: number
  expedido: number
  quebraTecnica: number
}

interface BarData { mes: string; recebido: number }
interface PieData { name: string; value: number; color: string }

const GRAIN_COLORS: Record<string, string> = {
  Soja: '#22c55e',
  Milho: '#eab308',
  Trigo: '#f59e0b',
  Arroz: '#06b6d4',
}
function grainColor(name: string) {
  return GRAIN_COLORS[name] ?? '#6b7280'
}

const PERIOD_LABELS: Record<Period, string> = {
  '1m': 'Este Mês',
  '3m': '3 Meses',
  '6m': '6 Meses',
  '1y': 'Ano',
}

function KPICard({
  icon: Icon, label, value, unit, color, loading, accent,
}: {
  icon: React.ElementType; label: string; value: number; unit: string; color: string; loading: boolean; accent?: boolean
}) {
  const animated = useCountUp(Math.round(value * 10), 900)

  if (accent && !loading) {
    return (
      <div
        className="rounded-xl p-5 overflow-hidden relative shadow-[0_4px_16px_rgba(120,252,144,0.3)]"
        style={{ background: 'linear-gradient(135deg, #78FC90 0%, #2DD264 100%)' }}
      >
        <div className="absolute top-0 bottom-0 w-[80px] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-sweep pointer-events-none" />
        <div className="w-8 h-8 rounded-md bg-[#111110]/10 flex items-center justify-center mb-3">
          <Icon size={18} className="text-[#111110]" />
        </div>
        <p className="text-2xl font-bold text-[#111110] tabular-nums">
          {formatNumber(animated / 10, 1)}<span className="text-sm font-semibold text-[#111110]/70 ml-1">{unit}</span>
        </p>
        <p className="text-xs font-semibold text-[#111110]/70 mt-1">{label}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-elev-1">
      {loading ? (
        <>
          <Skeleton className="w-8 h-8 rounded-md mb-3" />
          <Skeleton className="h-7 w-16 mb-2" />
          <Skeleton className="h-4 w-24" />
        </>
      ) : (
        <>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
            <Icon size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold text-t1 tabular-nums">
            {formatNumber(animated / 10, 1)}<span className="text-sm font-normal text-t3 ml-1">{unit}</span>
          </p>
          <p className="text-xs text-t3 mt-1">{label}</p>
        </>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-elev-1">
            <Skeleton className="w-8 h-8 rounded-md mb-3" />
            <Skeleton className="h-7 w-14 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export function SecadorDashboard() {
  const { user } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId() ?? user?.id

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('1m')
  const [kpis, setKpis] = useState<KPIs>({ estoqueAtual: 0, volumeBruto: 0, pesoAjustado: 0, expedido: 0, quebraTecnica: 0 })
  const [barData, setBarData] = useState<BarData[]>([])
  const [pieData, setPieData] = useState<PieData[]>([])
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const getDateRange = useCallback((p: Period): { start: string; end: string } => {
    const now = new Date()
    const end = format(now, 'yyyy-MM-dd')
    let start: string
    if (p === '1m') start = format(startOfMonth(now), 'yyyy-MM-dd')
    else if (p === '3m') start = format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd')
    else if (p === '6m') start = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd')
    else start = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd')
    return { start, end }
  }, [])

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { start, end } = getDateRange(period)

      const [recRes, saidaRes, quebraRes, tiposRes] = await Promise.all([
        supabase.from('recebimentos').select('*').eq('user_id', userId).gte('data', start).lte('data', end),
        supabase.from('saidas').select('*').eq('user_id', userId),
        supabase.from('quebras_tecnicas').select('*').eq('user_id', userId),
        supabase.from('tipos_grao').select('*').eq('user_id', userId),
      ])

      const recs = recRes.data ?? []
      const saidas = saidaRes.data ?? []
      const quebras = quebraRes.data ?? []
      const tipos = tiposRes.data ?? []

      const allRecs = (await supabase.from('recebimentos').select('*').eq('user_id', userId)).data ?? []
      const totalRecebido = allRecs.reduce((s, r) => s + (r.peso_descontado ?? 0), 0)
      const totalSaido = saidas.reduce((s, x) => s + (x.peso_liquido ?? 0), 0)
      const totalQuebra = quebras.reduce((s, q) => s + (q.peso_kg ?? 0), 0)

      const volumeBruto = recs.reduce((s, r) => s + (r.peso_bruto ?? 0), 0)
      const pesoAjustado = recs.reduce((s, r) => s + (r.peso_descontado ?? 0), 0)
      const expedidoPeriod = saidas
        .filter(x => x.tipo === 'venda' && x.data >= start && x.data <= end)
        .reduce((s, x) => s + (x.peso_liquido ?? 0), 0)
      const quebraPeriod = quebras
        .filter(q => q.data >= start && q.data <= end)
        .reduce((s, q) => s + (q.peso_kg ?? 0), 0)

      setKpis({
        estoqueAtual: (totalRecebido - totalSaido - totalQuebra) / 1000,
        volumeBruto: volumeBruto / 1000,
        pesoAjustado: pesoAjustado / 1000,
        expedido: expedidoPeriod / 1000,
        quebraTecnica: quebraPeriod / 1000,
      })

      // Bar chart: last 6 months
      const barMonths = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i)
        return { start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd'), label: format(d, 'MMM', { locale: ptBR }) }
      })
      const bar = barMonths.map(m => {
        const recMes = allRecs.filter(r => r.data >= m.start && r.data <= m.end)
        return { mes: m.label, recebido: recMes.reduce((s, r) => s + (r.peso_descontado ?? 0), 0) / 1000 }
      })
      setBarData(bar)

      // Pie by grain type
      const pieMap: Record<string, number> = {}
      for (const r of allRecs) {
        if (!r.tipo_grao_id) continue
        pieMap[r.tipo_grao_id] = (pieMap[r.tipo_grao_id] ?? 0) + (r.peso_descontado ?? 0)
      }
      for (const s of saidas) {
        if (!s.tipo_grao_id) continue
        pieMap[s.tipo_grao_id] = (pieMap[s.tipo_grao_id] ?? 0) - (s.peso_liquido ?? 0)
      }
      for (const q of quebras) {
        if (!q.tipo_grao_id) continue
        pieMap[q.tipo_grao_id] = (pieMap[q.tipo_grao_id] ?? 0) - (q.peso_kg ?? 0)
      }
      const pie: PieData[] = Object.entries(pieMap)
        .filter(([, v]) => v > 0)
        .map(([id, v]) => {
          const t = tipos.find(t => t.id === id)
          const nome = t?.nome ?? 'Outros'
          return { name: nome, value: Math.round(v / 100) / 10, color: grainColor(nome) }
        })
      setPieData(pie)
    } finally {
      setLoading(false)
      setLastUpdated(new Date())
    }
  }, [userId, period, getDateRange])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-t1">Dashboard · Secador / Silo</h1>
          <p className="text-sm text-t3">Estoque atual, volume recebido, expedido e quebra técnica</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[var(--border)] rounded-lg overflow-hidden text-xs">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 transition-colors ${period === p ? 'bg-[var(--primary)] text-black font-medium' : 'text-t2 hover:bg-[var(--surface-raised)]'}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={loadData} className="gap-1.5">
            <RefreshCw size={13} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard icon={Warehouse} label="Estoque Atual" value={kpis.estoqueAtual} unit="t" color="bg-[var(--primary-dark)]" loading={false} accent />
        <KPICard icon={TrendingUp} label="Vol. Bruto Recebido" value={kpis.volumeBruto} unit="t" color="bg-blue-500" loading={false} />
        <KPICard icon={PackageCheck} label="Peso Ajustado" value={kpis.pesoAjustado} unit="t" color="bg-violet-500" loading={false} />
        <KPICard icon={TrendingDown} label="Expedido (Venda)" value={kpis.expedido} unit="t" color="bg-emerald-500" loading={false} />
        <KPICard icon={Wrench} label="Quebra Técnica" value={kpis.quebraTecnica} unit="t" color="bg-red-500" loading={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-elev-1 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-t2 flex items-center gap-2">
              <Calendar size={14} />
              Recebimento por Mês (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--color-t3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-t3)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}t`} />
                <Tooltip
                  formatter={(v: number) => [`${formatNumber(v, 1)} t`, 'Recebido']}
                  contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="recebido" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-elev-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-t2">Estoque por Tipo de Grão</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-t3 text-sm gap-2">
                <Warehouse size={28} className="animate-float opacity-40" />
                <span>Nenhum estoque registrado</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${formatNumber(v, 1)} t`, '']}
                      contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }} />
                        <span className="text-t2">{d.name}</span>
                      </div>
                      <span className="text-t1 font-medium">{formatNumber(d.value, 1)} t</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-t4 text-right">
        Atualizado às {format(lastUpdated, 'HH:mm:ss')}
      </p>
    </div>
  )
}

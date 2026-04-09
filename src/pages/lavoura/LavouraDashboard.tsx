import { useEffect, useState, useCallback } from 'react'
import {
  Sprout, MapPin, Activity, TrendingUp, AlertTriangle, RefreshCw, Calendar,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { format, subMonths, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useCountUp } from '@/hooks/useCountUp'
import { formatNumber, formatDate } from '@/lib/utils'

type Period = '1m' | '3m' | '6m' | '12m'

interface KPIs {
  areaPlantada: number
  talhoesAtivos: number
  atividadesMes: number
  produtividadeMedia: number
}

interface ProdTalhao { nome: string; produtividade: number }
interface CulturaDistrib { name: string; value: number }
interface AlertaPraga { id: string; nome: string; tipo: string; severidade: string; talhao: string; data: string }

const SEVERIDADE_COLOR: Record<string, string> = {
  critico: 'bg-red-100 text-red-700',
  alto: 'bg-orange-100 text-orange-700',
  medio: 'bg-yellow-100 text-yellow-700',
  baixo: 'bg-green-100 text-green-700',
}

const CULTURA_COLORS = ['#78FC90', '#34d399', '#60a5fa', '#f97316', '#a78bfa', '#f472b6']

const PERIOD_MONTHS: Record<Period, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }

function DashSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-elev-1">
            <Skeleton className="w-8 h-8 rounded-md mb-3" />
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-elev-1">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color ?? 'bg-[var(--primary-bg)]'}`}>
        <Icon className="w-4 h-4 text-[var(--primary-dark)]" />
      </div>
      <p className="text-2xl font-semibold text-t1">{value}</p>
      <p className="text-sm text-t2 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-t3 mt-0.5">{sub}</p>}
    </div>
  )
}

export function LavouraDashboard() {
  const { session } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('1m')
  const [kpis, setKpis] = useState<KPIs>({ areaPlantada: 0, talhoesAtivos: 0, atividadesMes: 0, produtividadeMedia: 0 })
  const [prodTalhoes, setProdTalhoes] = useState<ProdTalhao[]>([])
  const [culturaDistrib, setCulturaDistrib] = useState<CulturaDistrib[]>([])
  const [alertas, setAlertas] = useState<AlertaPraga[]>([])

  const areaPlantadaAnim = useCountUp(Math.round(kpis.areaPlantada))
  const talhoesAtivosAnim = useCountUp(kpis.talhoesAtivos)
  const atividadesMesAnim = useCountUp(kpis.atividadesMes)
  const produtividadeAnim = useCountUp(Math.round(kpis.produtividadeMedia * 10) / 10)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const months = PERIOD_MONTHS[period]
      const since = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd')

      const [safrasRes, talhoesRes, atividadesRes, colheitasRes, safTalhoesRes, pragas] = await Promise.all([
        supabase.from('safras').select('*').eq('user_id', userId).eq('status', 'andamento'),
        supabase.from('talhoes').select('*').eq('user_id', userId).eq('ativo', true),
        supabase.from('atividades_campo').select('*').eq('user_id', userId).gte('data', since),
        supabase.from('colheitas').select('*').eq('user_id', userId).gte('data', since),
        supabase.from('safra_talhoes').select('*').eq('user_id', userId),
        supabase.from('ocorrencias_mip').select('*').eq('user_id', userId)
          .in('severidade', ['alto', 'critico']).order('data', { ascending: false }).limit(10),
      ])

      const talhoes = talhoesRes.data ?? []
      const atividades = atividadesRes.data ?? []
      const colheitas = colheitasRes.data ?? []
      const safTalhoes = safTalhoesRes.data ?? []
      const safrasAtivas = safrasRes.data ?? []

      const safTalhaoIds = new Set(safrasAtivas.map((s: { id: string }) => s.id))
      const linkedST = safTalhoes.filter((st: { safra_id: string }) => safTalhaoIds.has(st.safra_id))
      const linkedTalhaoIds = new Set(linkedST.map((st: { talhao_id: string }) => st.talhao_id))
      const activeTalhoes = talhoes.filter((t: { id: string }) => linkedTalhaoIds.has(t.id))
      const areaTotal = activeTalhoes.reduce((s: number, t: { area_hectares: number | null }) => s + (t.area_hectares ?? 0), 0)

      const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const atividadesMes = atividades.filter((a: { data: string }) => a.data >= currentMonthStart).length

      const colheitasByST: Record<string, number[]> = {}
      for (const c of colheitas as { safra_talhao_id: string; quantidade: number }[]) {
        if (!colheitasByST[c.safra_talhao_id]) colheitasByST[c.safra_talhao_id] = []
        colheitasByST[c.safra_talhao_id].push(c.quantidade)
      }

      const prodData: ProdTalhao[] = []
      for (const st of linkedST as { id: string; talhao_id: string }[]) {
        const talhao = talhoes.find((t: { id: string }) => t.id === st.talhao_id)
        if (!talhao) continue
        const qtds = colheitasByST[st.id] ?? []
        if (qtds.length === 0) continue
        const total = qtds.reduce((s, v) => s + v, 0)
        const area = (talhao as { area_hectares: number | null }).area_hectares ?? 1
        prodData.push({ nome: (talhao as { nome: string }).nome, produtividade: Math.round(total / area) })
      }
      setProdTalhoes(prodData.slice(0, 8))

      const prodVals = prodData.map(p => p.produtividade)
      const prodMedia = prodVals.length ? prodVals.reduce((a, b) => a + b, 0) / prodVals.length : 0

      const culturaCount: Record<string, number> = {}
      for (const st of linkedST as { cultura_id: string }[]) {
        culturaCount[st.cultura_id] = (culturaCount[st.cultura_id] ?? 0) + 1
      }
      const culturasRes = await supabase.from('culturas').select('*').eq('user_id', userId)
      const culturas = culturasRes.data ?? []
      const distribData = Object.entries(culturaCount).map(([cid, cnt]) => {
        const c = (culturas as { id: string; nome: string }[]).find(x => x.id === cid)
        return { name: c?.nome ?? 'Desconhecida', value: cnt }
      })
      setCulturaDistrib(distribData)

      const alertasData: AlertaPraga[] = ((pragas.data ?? []) as {
        id: string; nome: string; tipo: string; severidade: string; safra_talhao_id: string; data: string
      }[]).map(p => {
        const st = safTalhoes.find((s: { id: string }) => s.id === p.safra_talhao_id)
        const talhao = st ? talhoes.find((t: { id: string }) => t.id === (st as { talhao_id: string }).talhao_id) : null
        return {
          id: p.id,
          nome: p.nome,
          tipo: p.tipo,
          severidade: p.severidade,
          talhao: (talhao as { nome: string } | null)?.nome ?? '–',
          data: p.data,
        }
      })
      setAlertas(alertasData)

      setKpis({
        areaPlantada: areaTotal,
        talhoesAtivos: activeTalhoes.length,
        atividadesMes,
        produtividadeMedia: prodMedia,
      })
    } finally {
      setLoading(false)
    }
  }, [userId, period])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <DashSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-t1">Dashboard · Lavoura</h1>
          <p className="text-sm text-t3">Visão geral da sua operação de lavoura</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {(['1m', '3m', '6m', '12m'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p
                  ? 'bg-[var(--primary)] text-black'
                  : 'text-t2 hover:bg-[var(--surface-raised)]'}`}
              >
                {p === '1m' ? 'Este Mês' : p === '3m' ? '3 Meses' : p === '6m' ? '6 Meses' : 'Ano'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={MapPin} label="Área Plantada" value={`${formatNumber(areaPlantadaAnim, 0)} ha`} />
        <KpiCard icon={Sprout} label="Talhões Ativos" value={String(talhoesAtivosAnim)} />
        <KpiCard icon={Activity} label="Atividades este Mês" value={String(atividadesMesAnim)} />
        <KpiCard icon={TrendingUp} label="Produtividade Média" value={`${formatNumber(produtividadeAnim, 0)} sc/ha`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 shadow-elev-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-t2">Produtividade por Talhão (sc/ha)</CardTitle>
          </CardHeader>
          <CardContent>
            {prodTalhoes.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-t3">Sem dados de colheita no período</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={prodTalhoes} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'var(--text-t3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-t3)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v} sc/ha`, 'Produtividade']}
                  />
                  <Bar dataKey="produtividade" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elev-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-t2">Distribuição de Culturas</CardTitle>
          </CardHeader>
          <CardContent>
            {culturaDistrib.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-t3">Sem safras ativas</div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={culturaDistrib}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                    >
                      {culturaDistrib.map((_, i) => (
                        <Cell key={i} fill={CULTURA_COLORS[i % CULTURA_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  {culturaDistrib.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-t2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CULTURA_COLORS[i % CULTURA_COLORS.length] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-elev-1">
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <CardTitle className="text-sm font-medium text-t2">Alertas de Pragas e Doenças</CardTitle>
        </CardHeader>
        <CardContent>
          {alertas.length === 0 ? (
            <p className="text-sm text-t3 py-2">Nenhum alerta de praga crítico ou alto.</p>
          ) : (
            <div className="space-y-2">
              {alertas.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    {a.severidade === 'critico' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                    <div>
                      <span className="text-sm font-medium text-t1">{a.nome}</span>
                      <span className="text-xs text-t3 ml-2">{a.talhao}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${SEVERIDADE_COLOR[a.severidade] ?? ''}`}>{a.severidade}</Badge>
                    <span className="text-xs text-t3">
                      <Calendar className="w-3 h-3 inline mr-1" />{formatDate(a.data)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

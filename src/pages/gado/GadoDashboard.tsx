import { useEffect, useState, useCallback } from 'react'
import {
  PawPrint, TrendingUp, Baby, Skull, AlertTriangle,
  ChevronRight, RefreshCw, Calendar,
} from 'lucide-react'
import { differenceInDays, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip,
} from 'recharts'
import { supabase, Animal, AplicacaoSanitaria, Medicamento } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/useCountUp'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

// Chart colors — category differentiation
const CATEGORIA_COLORS: Record<string, string> = {
  vaca:    '#ec4899',
  touro:   '#3b82f6',
  bezerro: '#22c55e',
  bezerra: '#a855f7',
  novilha: '#8b5cf6',
  garrote: '#f97316',
  boi:     '#06b6d4',
}

const CATEGORIA_LABELS: Record<string, string> = {
  vaca: 'Vaca', touro: 'Touro', bezerro: 'Bezerro',
  bezerra: 'Bezerra', novilha: 'Novilha', garrote: 'Garrote', boi: 'Boi',
}

interface KPIData {
  totalCabecas: number
  pesoMedio: number
  nascimentos: number
  mortes: number
  valorEstimado: number
}

interface ProximaVacina {
  animal: Animal
  aplicacao: AplicacaoSanitaria & { medicamento?: Medicamento }
  diasRestantes: number
}

type CategoryCount = { name: string; value: number; color: string }

// ── Skeleton placeholders ────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-elev-1">
            <Skeleton className="w-8 h-8 rounded-md mb-3" />
            <Skeleton className="h-7 w-14 mb-2" />
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function GadoDashboard() {
  const { user } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPIData>({
    totalCabecas: 0, pesoMedio: 0, nascimentos: 0, mortes: 0, valorEstimado: 0,
  })
  const [composicao, setComposicao] = useState<CategoryCount[]>([])
  const [proximasVacinas, setProximasVacinas] = useState<ProximaVacina[]>([])
  const [recentMovimentos, setRecentMovimentos] = useState<{
    tipo: string; descricao: string; data: string; valor?: number
  }[]>([])
  const [profile, setProfile] = useState<{
    valor_arroba: number; rendimento_carcaca: number; data_cotacao_arroba: string | null
  } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const userId = getEffectiveUserId() ?? user?.id

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [animaisRes, profileRes, aplicacoesRes, medicamentosRes, movimentosRes] =
        await Promise.all([
          supabase.from('animais').select('*').eq('user_id', userId).eq('status', 'ativo'),
          supabase.from('profiles').select('valor_arroba, rendimento_carcaca, data_cotacao_arroba').eq('user_id', userId).single(),
          supabase.from('aplicacoes_sanitarias').select('*').eq('user_id', userId).not('proxima_dose', 'is', null).order('proxima_dose', { ascending: true }).limit(20),
          supabase.from('medicamentos').select('*').eq('user_id', userId),
          supabase.from('movimentacoes_gado').select('*').eq('user_id', userId).order('data', { ascending: false }).limit(5),
        ])

      const animais: Animal[] = animaisRes.data ?? []
      const prof = profileRes.data
      const aplicacoes = aplicacoesRes.data ?? []
      const medicamentos: Medicamento[] = medicamentosRes.data ?? []
      const movimentos = movimentosRes.data ?? []

      setProfile(prof)

      const totalCabecas = animais.length
      const withWeight = animais.filter(a => a.peso_atual)
      const pesoMedio = withWeight.length > 0
        ? withWeight.reduce((s, a) => s + (a.peso_atual ?? 0), 0) / withWeight.length
        : 0

      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const nascimentos = animais.filter(a =>
        a.origem === 'nascido' && a.data_nascimento &&
        new Date(a.data_nascimento + 'T00:00:00') >= inicioMes
      ).length
      const mortesMes = movimentos.filter(m =>
        m.tipo === 'morte' && new Date(m.data + 'T00:00:00') >= inicioMes
      ).length

      const rendimento = prof?.rendimento_carcaca ?? 52
      const valorArroba = prof?.valor_arroba ?? 300
      const valorEstimado = animais.reduce((s, a) =>
        a.peso_atual ? s + (a.peso_atual * rendimento / 100 / 15 * valorArroba) : s, 0)

      setKpis({ totalCabecas, pesoMedio, nascimentos, mortes: mortesMes, valorEstimado })

      const categoryCounts = animais.reduce((acc, a) => {
        acc[a.categoria] = (acc[a.categoria] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)

      setComposicao(
        Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, count]) => ({
            name: CATEGORIA_LABELS[cat] ?? cat,
            value: count,
            color: CATEGORIA_COLORS[cat] ?? '#6b7280',
          }))
      )

      const medMap = new Map(medicamentos.map(m => [m.id, m]))
      const animaisMap = new Map(animais.map(a => [a.id, a]))
      const upcoming: ProximaVacina[] = []

      for (const ap of aplicacoes) {
        if (!ap.proxima_dose) continue
        const dias = differenceInDays(parseISO(ap.proxima_dose), hoje)
        if (dias > 30) break
        const animal = animaisMap.get(ap.animal_id)
        if (!animal) continue
        upcoming.push({
          animal,
          aplicacao: { ...ap, medicamento: medMap.get(ap.medicamento_id) },
          diasRestantes: dias,
        })
      }
      setProximasVacinas(upcoming.slice(0, 6))

      const tipoLabel: Record<string, string> = {
        compra: 'Compra', venda: 'Venda', nascimento: 'Nascimento',
        morte: 'Morte', transferencia: 'Transferência',
      }
      setRecentMovimentos(movimentos.map(m => ({
        tipo: m.tipo,
        descricao: tipoLabel[m.tipo] ?? m.tipo,
        data: m.data,
        valor: m.valor_total ?? undefined,
      })))

      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const arrobaOld = profile?.data_cotacao_arroba
    ? differenceInDays(new Date(), parseISO(profile.data_cotacao_arroba)) > 7
    : false

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-heading-lg text-t1">Dashboard</h1>
          <p className="text-sm text-t3 mt-0.5">
            Atualizado {formatDistanceToNow(lastUpdated, { locale: ptBR, addSuffix: true })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadData} className="gap-1.5 text-t3 hover:text-t1">
          <RefreshCw size={13} className="transition-transform duration-300 hover:rotate-180" />
          Atualizar
        </Button>
      </div>

      {/* ── Arroba alert ── */}
      {arrobaOld && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-bg)] px-4 py-3 animate-fade-up">
          <AlertTriangle size={15} className="text-[var(--warning)] shrink-0" />
          <p className="text-sm text-t2">
            Cotação da arroba desatualizada (mais de 7 dias).{' '}
            <button
              onClick={() => navigate('/gado/configuracoes')}
              className="text-[var(--warning)] underline underline-offset-2 hover:no-underline"
            >
              Atualizar agora
            </button>
          </p>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<PawPrint size={16} className="text-[var(--primary-dark)]" />}
          iconBg="bg-[var(--primary-bg)]"
          label="Cabeças Ativas"
          rawValue={kpis.totalCabecas}
          format={n => n.toString()}
          sub="animais no rebanho"
          delay={0}
        />
        <KpiCard
          icon={<TrendingUp size={16} className="text-blue-500" />}
          iconBg="bg-blue-50"
          label="Peso Médio"
          rawValue={Math.round(kpis.pesoMedio)}
          format={n => `${formatNumber(n, 0)} kg`}
          sub={`${formatNumber(kpis.pesoMedio / 15, 1)} arrobas`}
          delay={60}
        />
        <KpiCard
          icon={<Baby size={16} className="text-[var(--success)]" />}
          iconBg="bg-[var(--success-bg)]"
          label="Nascimentos"
          rawValue={kpis.nascimentos}
          format={n => n.toString()}
          sub="neste mês"
          positive
          delay={120}
        />
        <KpiCard
          icon={<Skull size={16} className="text-[var(--danger)]" />}
          iconBg="bg-[var(--danger-bg)]"
          label="Mortes"
          rawValue={kpis.mortes}
          format={n => n.toString()}
          sub="neste mês"
          negative={kpis.mortes > 0}
          delay={180}
        />
      </div>

      {/* ── Herd value banner — with shimmer overlay ── */}
      <div
        className="rounded-xl border border-[var(--primary)]/20 bg-[var(--surface)] shadow-elev-1 px-5 py-4 flex items-center justify-between overflow-hidden relative animate-fade-up"
        style={{ animationDelay: '220ms' }}
      >
        {/* Subtle shimmer sweep — very gentle */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 bottom-0 w-[60px] bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine-sweep" />
        </div>
        <div className="relative">
          <p className="text-xs font-medium text-t3 uppercase tracking-wider mb-1">
            Valor estimado do rebanho
          </p>
          <HerdValue value={kpis.valorEstimado} />
          {profile && (
            <p className="text-sm text-t3 mt-1">
              @ {formatCurrency(profile.valor_arroba)} / arroba · {profile.rendimento_carcaca}% rendimento
              {arrobaOld && (
                <span className="text-[var(--warning)] ml-2">· desatualizado</span>
              )}
            </p>
          )}
        </div>
        <div className="w-14 h-14 rounded-xl bg-[var(--primary-bg)] flex items-center justify-center shrink-0 relative">
          <span className="text-2xl font-black text-[var(--primary-dark)] leading-none">@</span>
        </div>
      </div>

      {/* ── Charts + lists row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Composição */}
        <Card className="animate-fade-up" style={{ animationDelay: '260ms' } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Composição do Rebanho</CardTitle>
          </CardHeader>
          <CardContent>
            {composicao.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={composicao}
                      cx="50%" cy="50%"
                      innerRadius={52} outerRadius={78}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {composicao.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={0.9} />
                      ))}
                    </Pie>
                    <RechartTooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '12px',
                        boxShadow: 'var(--shadow-2)',
                      }}
                      formatter={(v: number, name: string) => [`${v} cabeças`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {composicao.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between animate-fade-up"
                      style={{ animationDelay: `${300 + i * 40}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-sm text-t2">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-t1 tabular">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="Nenhum animal cadastrado" />
            )}
          </CardContent>
        </Card>

        {/* Próximas vacinas */}
        <Card className="animate-fade-up" style={{ animationDelay: '300ms' } as React.CSSProperties}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Próximas Vacinas</CardTitle>
            <button
              onClick={() => navigate('/gado/sanidade')}
              className="flex items-center gap-1 text-xs text-t3 hover:text-[var(--primary-dark)] transition-colors"
            >
              Ver todas <ChevronRight size={12} />
            </button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {proximasVacinas.length > 0 ? (
              proximasVacinas.map(({ animal, aplicacao, diasRestantes }, i) => {
                const overdue  = diasRestantes < 0
                const soon     = !overdue && diasRestantes <= 7
                const rowBg    = overdue ? 'border-[var(--danger)]/20 bg-[var(--danger-bg)]'
                               : soon    ? 'border-[var(--warning)]/20 bg-[var(--warning-bg)]'
                               : 'border-[var(--border)] bg-[var(--surface-raised)]'
                const dayColor = overdue ? 'text-[var(--danger)]'
                               : soon    ? 'text-[var(--warning)]'
                               : 'text-t2'
                return (
                  <div
                    key={aplicacao.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2.5 transition-all duration-150 hover:shadow-elev-1 animate-fade-up ${rowBg}`}
                    style={{ animationDelay: `${320 + i * 50}ms` }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-t1 truncate">
                        {animal.brinco}
                        <span className="text-t3 font-normal ml-1.5 text-xs">
                          {CATEGORIA_LABELS[animal.categoria]}
                        </span>
                      </p>
                      <p className="text-xs text-t3 truncate">{aplicacao.medicamento?.nome ?? 'Vacina'}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-xs font-semibold tabular ${dayColor}`}>
                        {overdue ? `${Math.abs(diasRestantes)}d atraso`
                        : diasRestantes === 0 ? 'Hoje'
                        : `${diasRestantes}d`}
                      </p>
                      <p className="text-xs text-t4">{formatDate(aplicacao.proxima_dose!)}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState message="Nenhuma vacina nos próximos 30 dias" />
            )}
          </CardContent>
        </Card>

        {/* Movimentações recentes */}
        <Card className="animate-fade-up" style={{ animationDelay: '340ms' } as React.CSSProperties}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Movimentações Recentes</CardTitle>
            <button
              onClick={() => navigate('/gado/movimentacoes')}
              className="flex items-center gap-1 text-xs text-t3 hover:text-[var(--primary-dark)] transition-colors"
            >
              Ver todas <ChevronRight size={12} />
            </button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentMovimentos.length > 0 ? (
              recentMovimentos.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 transition-all duration-150 hover:bg-[var(--surface)] hover:shadow-elev-1 animate-fade-up"
                  style={{ animationDelay: `${360 + i * 50}ms` }}
                >
                  <div className="flex items-center gap-2.5">
                    <MovimentoIcon tipo={m.tipo} />
                    <div>
                      <p className="text-sm font-medium text-t1">{m.descricao}</p>
                      <p className="flex items-center gap-1 text-xs text-t3 mt-0.5">
                        <Calendar size={10} />
                        {formatDate(m.data)}
                      </p>
                    </div>
                  </div>
                  {m.valor != null && (
                    <p className={`text-sm font-semibold tabular ${
                      m.tipo === 'venda'  ? 'text-[var(--primary-dark)]'
                    : m.tipo === 'compra' ? 'text-[var(--danger)]'
                    : 'text-t2'
                    }`}>
                      {m.tipo === 'venda' ? '+' : m.tipo === 'compra' ? '-' : ''}
                      {formatCurrency(m.valor)}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <EmptyState message="Nenhuma movimentação registrada" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick actions ── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up"
        style={{ animationDelay: '380ms' }}
      >
        {[
          { label: 'Novo Animal',       to: '/gado/animais',        color: 'text-[var(--primary-dark)]' },
          { label: 'Registrar Pesagem', to: '/gado/pesagens',       color: 'text-blue-500' },
          { label: 'Aplicar Vacina',    to: '/gado/sanidade',       color: 'text-[var(--warning)]' },
          { label: 'Movimentação',      to: '/gado/movimentacoes',  color: 'text-purple-500' },
        ].map(({ label, to, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={[
              'rounded-lg border border-[var(--border)] bg-[var(--surface)]',
              'px-4 py-3.5 text-left shadow-elev-1',
              'transition-all duration-150 hover:-translate-y-px hover:bg-[var(--surface-raised)] hover:shadow-elev-2',
              'active:scale-[0.97]',
            ].join(' ')}
          >
            <span className={`t-micro uppercase tracking-wider ${color} block mb-1.5`}>
              Ação rápida
            </span>
            <span className="text-sm font-medium text-t1">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon, iconBg, label, rawValue, format, sub, positive, negative, delay = 0,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  rawValue: number
  format: (n: number) => string
  sub: string
  positive?: boolean
  negative?: boolean
  delay?: number
}) {
  const counted = useCountUp(rawValue, 900)
  const valueColor = negative ? 'text-[var(--danger)]'
    : positive ? 'text-[var(--success)]'
    : 'text-t1'

  return (
    <Card
      className="animate-fade-up"
      style={{ animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      <CardContent className="p-5">
        <div className={`w-8 h-8 rounded-md ${iconBg} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <p className={`t-display-sm tabular ${valueColor} transition-all duration-100`}>
          {format(counted)}
        </p>
        <p className="text-sm font-medium text-t2 mt-1">{label}</p>
        <p className="text-xs text-t3 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

function HerdValue({ value }: { value: number }) {
  const counted = useCountUp(Math.round(value), 900)
  return (
    <p className="t-display-sm text-t1 tabular">{formatCurrency(counted)}</p>
  )
}

function MovimentoIcon({ tipo }: { tipo: string }) {
  const cfg: Record<string, { bg: string; text: string; abbr: string }> = {
    compra:       { bg: 'bg-blue-50',                  text: 'text-blue-500',             abbr: 'C' },
    venda:        { bg: 'bg-[var(--primary-bg)]',      text: 'text-[var(--primary-dark)]', abbr: 'V' },
    nascimento:   { bg: 'bg-[var(--success-bg)]',      text: 'text-[var(--success)]',     abbr: 'N' },
    morte:        { bg: 'bg-[var(--danger-bg)]',       text: 'text-[var(--danger)]',      abbr: 'M' },
    transferencia:{ bg: 'bg-purple-50',                text: 'text-purple-500',           abbr: 'T' },
  }
  const { bg, text, abbr } = cfg[tipo] ?? { bg: 'bg-[var(--surface-overlay)]', text: 'text-t3', abbr: '?' }
  return (
    <div className={`w-7 h-7 rounded-md ${bg} flex items-center justify-center shrink-0`}>
      <span className={`text-xs font-bold ${text}`}>{abbr}</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-sm text-t4">{message}</p>
    </div>
  )
}

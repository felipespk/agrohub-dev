import { useState, useCallback } from 'react'
import { BarChart2, Download, ChevronRight, Loader2 } from 'lucide-react'
import { format, subMonths, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { exportToExcel, ExcelColumn } from '@/lib/export-excel'

type Period = '1m' | '3m' | '6m' | '12m'
const PERIOD_LABELS: Record<Period, string> = { '1m': 'Este Mês', '3m': '3 Meses', '6m': '6 Meses', '12m': 'Ano' }

interface ReportRow { [key: string]: string | number }

interface ReportDef {
  key: string
  title: string
  description: string
  columns: ExcelColumn[]
  loader: (userId: string, since: string) => Promise<ReportRow[]>
}

function makeReports(): ReportDef[] {
  return [
    {
      key: 'custo_talhao',
      title: 'Custo por Talhão',
      description: 'Soma dos custos de atividades agrupada por talhão',
      columns: [
        { key: 'talhao', header: 'Talhão', width: 20 },
        { key: 'atividades', header: 'Atividades', type: 'number', width: 14 },
        { key: 'custo_total', header: 'Custo Total', type: 'currency', width: 16 },
      ],
      loader: async (userId, since) => {
        const [at, st, t] = await Promise.all([
          supabase.from('atividades_campo').select('*').eq('user_id', userId).gte('data', since),
          supabase.from('safra_talhoes').select('*').eq('user_id', userId),
          supabase.from('talhoes').select('*').eq('user_id', userId),
        ])
        const atividades = at.data ?? []
        const safTalhoes = st.data ?? []
        const talhoes = t.data ?? []
        const map: Record<string, { nome: string; custo: number; count: number }> = {}
        for (const a of atividades as { safra_talhao_id: string; custo_total: number | null }[]) {
          const stItem = safTalhoes.find((x: { id: string }) => x.id === a.safra_talhao_id)
          if (!stItem) continue
          const talhaoId = (stItem as { talhao_id: string }).talhao_id
          if (!map[talhaoId]) {
            const t = talhoes.find((x: { id: string }) => x.id === talhaoId)
            map[talhaoId] = { nome: (t as { nome: string } | null)?.nome ?? '–', custo: 0, count: 0 }
          }
          map[talhaoId].custo += a.custo_total ?? 0
          map[talhaoId].count++
        }
        return Object.values(map).map(r => ({ talhao: r.nome, atividades: r.count, custo_total: r.custo }))
          .sort((a, b) => (b.custo_total as number) - (a.custo_total as number))
      },
    },
    {
      key: 'produtividade_safra',
      title: 'Produtividade por Safra',
      description: 'Colheitas agrupadas por safra — meta vs realizado',
      columns: [
        { key: 'safra', header: 'Safra', width: 20 },
        { key: 'talhao', header: 'Talhão', width: 18 },
        { key: 'meta', header: 'Meta (sc/ha)', type: 'number', width: 14 },
        { key: 'realizado', header: 'Realizado (sc/ha)', type: 'number', width: 16 },
        { key: 'diferenca', header: 'Diferença', type: 'number', width: 14 },
      ],
      loader: async (userId, since) => {
        const [col, st, t, s] = await Promise.all([
          supabase.from('colheitas').select('*').eq('user_id', userId).gte('data', since),
          supabase.from('safra_talhoes').select('*').eq('user_id', userId),
          supabase.from('talhoes').select('*').eq('user_id', userId),
          supabase.from('safras').select('*').eq('user_id', userId),
        ])
        const colheitas = col.data ?? []
        const safTalhoes = st.data ?? []
        const talhoes = t.data ?? []
        const safras = s.data ?? []
        return (colheitas as { safra_talhao_id: string; quantidade: number; produtividade: number | null }[]).map(c => {
          const stItem = safTalhoes.find((x: { id: string }) => x.id === c.safra_talhao_id)
          const talhao = stItem ? talhoes.find((x: { id: string }) => x.id === (stItem as { talhao_id: string }).talhao_id) : null
          const safra = stItem ? safras.find((x: { id: string }) => x.id === (stItem as { safra_id: string }).safra_id) : null
          const meta = (stItem as { meta_produtividade: number | null } | null)?.meta_produtividade ?? 0
          const real = c.produtividade ?? 0
          return {
            safra: (safra as { nome: string } | null)?.nome ?? '–',
            talhao: (talhao as { nome: string } | null)?.nome ?? '–',
            meta, realizado: real, diferenca: real - meta,
          }
        })
      },
    },
    {
      key: 'consumo_insumos',
      title: 'Consumo de Insumos',
      description: 'Saídas de estoque agrupadas por insumo',
      columns: [
        { key: 'insumo', header: 'Insumo', width: 22 },
        { key: 'unidade', header: 'Unidade', width: 12 },
        { key: 'quantidade', header: 'Quantidade', type: 'number', width: 14 },
        { key: 'valor_total', header: 'Valor Total', type: 'currency', width: 16 },
      ],
      loader: async (userId, since) => {
        const [mov, ins] = await Promise.all([
          supabase.from('movimentacoes_insumo').select('*').eq('user_id', userId).eq('tipo', 'saida').gte('data', since),
          supabase.from('insumos').select('*').eq('user_id', userId),
        ])
        const movs = mov.data ?? []
        const insumos = ins.data ?? []
        const map: Record<string, { nome: string; unidade: string; qtd: number; valor: number }> = {}
        for (const m of movs as { insumo_id: string; quantidade: number; valor_total: number | null }[]) {
          const ins = insumos.find((x: { id: string }) => x.id === m.insumo_id)
          if (!map[m.insumo_id]) {
            map[m.insumo_id] = {
              nome: (ins as { nome: string } | null)?.nome ?? '–',
              unidade: (ins as { unidade: string } | null)?.unidade ?? '–',
              qtd: 0, valor: 0,
            }
          }
          map[m.insumo_id].qtd += m.quantidade
          map[m.insumo_id].valor += m.valor_total ?? 0
        }
        return Object.values(map).map(r => ({ insumo: r.nome, unidade: r.unidade, quantidade: r.qtd, valor_total: r.valor }))
          .sort((a, b) => (b.valor_total as number) - (a.valor_total as number))
      },
    },
    {
      key: 'uso_maquinas',
      title: 'Uso de Máquinas',
      description: 'Horas de uso de máquinas por atividade de campo',
      columns: [
        { key: 'maquina', header: 'Máquina', width: 22 },
        { key: 'atividades', header: 'Atividades', type: 'number', width: 14 },
        { key: 'horas_total', header: 'Horas Totais', type: 'number', width: 14 },
        { key: 'custo_total', header: 'Custo Total', type: 'currency', width: 16 },
      ],
      loader: async (userId, since) => {
        const [at, maq] = await Promise.all([
          supabase.from('atividades_campo').select('*').eq('user_id', userId).gte('data', since),
          supabase.from('maquinas').select('*').eq('user_id', userId),
        ])
        const atividades = at.data ?? []
        const maquinas = maq.data ?? []
        const map: Record<string, { nome: string; horas: number; custo: number; count: number }> = {}
        for (const a of atividades as { maquina_id: string | null; horas_maquina: number | null; custo_total: number | null }[]) {
          if (!a.maquina_id) continue
          const m = maquinas.find((x: { id: string }) => x.id === a.maquina_id)
          if (!map[a.maquina_id]) {
            map[a.maquina_id] = { nome: (m as { nome: string } | null)?.nome ?? '–', horas: 0, custo: 0, count: 0 }
          }
          map[a.maquina_id].horas += a.horas_maquina ?? 0
          map[a.maquina_id].custo += a.custo_total ?? 0
          map[a.maquina_id].count++
        }
        return Object.values(map).map(r => ({ maquina: r.nome, atividades: r.count, horas_total: r.horas, custo_total: r.custo }))
          .sort((a, b) => (b.horas_total as number) - (a.horas_total as number))
      },
    },
  ]
}

interface ReportState { rows: ReportRow[] | null; loading: boolean }

export function Relatorios() {
  const { } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()

  const [periods, setPeriods] = useState<Record<string, Period>>({})
  const [states, setStates] = useState<Record<string, ReportState>>({})

  const reports = makeReports()

  function getPeriod(key: string): Period { return periods[key] ?? '3m' }

  const runReport = useCallback(async (report: ReportDef) => {
    if (!userId) return
    const period = getPeriod(report.key)
    const months = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[period]
    const since = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd')
    setStates(s => ({ ...s, [report.key]: { rows: null, loading: true } }))
    try {
      const rows = await report.loader(userId, since)
      setStates(s => ({ ...s, [report.key]: { rows, loading: false } }))
    } catch {
      setStates(s => ({ ...s, [report.key]: { rows: [], loading: false } }))
    }
  }, [userId, periods])

  async function handleExport(report: ReportDef) {
    const state = states[report.key]
    if (!state?.rows) return
    await exportToExcel(`relatorio_${report.key}`, report.title, report.columns, state.rows)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-t1">Relatórios</h1>
        <p className="text-sm text-t3">Análises e relatórios da operação de lavoura</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reports.map(report => {
          const state = states[report.key]
          const period = getPeriod(report.key)
          return (
            <Card key={report.key} className="shadow-elev-1">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold text-t1">{report.title}</CardTitle>
                    <p className="text-xs text-t3 mt-0.5">{report.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={v => setPeriods(p => ({ ...p, [report.key]: v as Period }))}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                          <SelectItem key={p} value={p} className="text-xs">{PERIOD_LABELS[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {state?.rows && state.rows.length > 0 && (
                      <button
                        onClick={() => handleExport(report)}
                        className="p-1.5 rounded text-t3 hover:text-[var(--primary-dark)] hover:bg-[var(--primary-bg)] transition-colors"
                        title="Exportar Excel"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => runReport(report)}
                  disabled={state?.loading}
                >
                  {state?.loading ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Carregando...</>
                  ) : (
                    <><ChevronRight className="w-3.5 h-3.5 mr-1" /> Gerar Relatório</>
                  )}
                </Button>
              </CardHeader>
              {state?.rows && (
                <CardContent className="pt-0">
                  {state.rows.length === 0 ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-t3 text-sm">
                      <BarChart2 className="w-4 h-4" /> Sem dados no período selecionado
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                            {report.columns.map(col => (
                              <th key={col.key} className={`py-2 pr-4 ${col.type === 'currency' || col.type === 'number' ? 'text-right' : 'text-left'}`}>
                                {col.header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {state.rows.map((row, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-raised)] transition-colors">
                              {report.columns.map(col => (
                                <td key={col.key} className={`py-2 pr-4 text-t2 ${col.type === 'currency' || col.type === 'number' ? 'text-right' : ''}`}>
                                  {col.type === 'currency'
                                    ? formatCurrency(row[col.key] as number)
                                    : col.type === 'number'
                                    ? formatNumber(row[col.key] as number, 2)
                                    : String(row[col.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

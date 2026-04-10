import { useEffect, useState, useCallback } from 'react'
import { Warehouse } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/utils'

interface TipoGrao { id: string; nome: string }
interface StockEntry {
  tipoGraoId: string
  nome: string
  totalRecebido: number
  totalSaido: number
  quebra: number
  estoque: number
  color: string
}

const GRAIN_COLORS: Record<string, string> = {
  Soja: '#22c55e',
  Milho: '#eab308',
  Trigo: '#f59e0b',
  Arroz: '#06b6d4',
}

function grainColor(nome: string) {
  return GRAIN_COLORS[nome] ?? '#6b7280'
}

export function Armazenamento() {
  const { session } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId() ?? session?.user?.id

  const [loading, setLoading] = useState(true)
  const [stocks, setStocks] = useState<StockEntry[]>([])

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [tRes, rRes, sRes, qRes] = await Promise.all([
      supabase.from('tipos_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('recebimentos').select('*').eq('user_id', userId),
      supabase.from('saidas').select('*').eq('user_id', userId),
      supabase.from('quebras_tecnicas').select('*').eq('user_id', userId),
    ])
    const tipos: TipoGrao[] = tRes.data ?? []
    const recs = rRes.data ?? []
    const saidas = sRes.data ?? []
    const quebras = qRes.data ?? []

    const map: Record<string, { rec: number; saida: number; quebra: number }> = {}
    for (const t of tipos) {
      map[t.id] = { rec: 0, saida: 0, quebra: 0 }
    }
    for (const r of recs) {
      if (r.tipo_grao_id && map[r.tipo_grao_id] !== undefined) {
        map[r.tipo_grao_id].rec += r.peso_descontado ?? 0
      }
    }
    for (const s of saidas) {
      if (s.tipo_grao_id && map[s.tipo_grao_id] !== undefined) {
        map[s.tipo_grao_id].saida += s.peso_liquido ?? 0
      }
    }
    for (const q of quebras) {
      if (q.tipo_grao_id && map[q.tipo_grao_id] !== undefined) {
        map[q.tipo_grao_id].quebra += q.peso_kg ?? 0
      }
    }

    const entries: StockEntry[] = tipos.map(t => {
      const d = map[t.id] ?? { rec: 0, saida: 0, quebra: 0 }
      return {
        tipoGraoId: t.id,
        nome: t.nome,
        totalRecebido: d.rec,
        totalSaido: d.saida,
        quebra: d.quebra,
        estoque: Math.max(0, d.rec - d.saida - d.quebra),
        color: grainColor(t.nome),
      }
    }).filter(e => e.totalRecebido > 0 || e.estoque > 0)

    setStocks(entries)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const totalEstoque = stocks.reduce((s, e) => s + e.estoque, 0)
  const pieData = stocks.filter(e => e.estoque > 0).map(e => ({
    name: e.nome, value: Math.round(e.estoque / 100) / 10, color: e.color,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-t1">Armazenamento</h1>
        <p className="text-sm text-t3">Estoque atual por tipo de grão — cálculo: recebido − saído − quebra</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : stocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-t3 gap-2">
          <Warehouse size={32} className="animate-float opacity-40" />
          <p className="text-sm">Nenhum grão em estoque</p>
          <p className="text-xs text-t4">Registre recebimentos para visualizar o armazenamento</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stocks.map(e => (
              <div key={e.tipoGraoId} className="rounded-xl glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.color }} />
                  <span className="text-xs font-medium text-t2">{e.nome}</span>
                </div>
                <p className="text-xl font-bold text-t1">{formatNumber(e.estoque / 1000, 1)} t</p>
                <p className="text-xs text-t3 mt-0.5">
                  {totalEstoque > 0 ? `${formatNumber(e.estoque / totalEstoque * 100, 1)}% do total` : '—'}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="glass-card lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-t2">Balanço por Tipo de Grão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                        <th className="text-left py-2 px-3">Tipo de Grão</th>
                        <th className="text-right py-2 px-3">Total Recebido</th>
                        <th className="text-right py-2 px-3">Total Saído</th>
                        <th className="text-right py-2 px-3">Quebra</th>
                        <th className="text-right py-2 px-3">Estoque Atual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map(e => (
                        <tr key={e.tipoGraoId} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-sm" style={{ background: e.color }} />
                              <span className="text-t1 font-medium">{e.nome}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-t2">{formatNumber(e.totalRecebido / 1000, 2)} t</td>
                          <td className="py-2.5 px-3 text-right text-t2">{formatNumber(e.totalSaido / 1000, 2)} t</td>
                          <td className="py-2.5 px-3 text-right text-amber-500">{formatNumber(e.quebra / 1000, 2)} t</td>
                          <td className="py-2.5 px-3 text-right font-bold text-[var(--primary)]">{formatNumber(e.estoque / 1000, 2)} t</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--border)]">
                        <td className="py-2.5 px-3 font-semibold text-t1 text-xs">TOTAL</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-t1">{formatNumber(stocks.reduce((s, e) => s + e.totalRecebido, 0) / 1000, 2)} t</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-t1">{formatNumber(stocks.reduce((s, e) => s + e.totalSaido, 0) / 1000, 2)} t</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-500">{formatNumber(stocks.reduce((s, e) => s + e.quebra, 0) / 1000, 2)} t</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[var(--primary)]">{formatNumber(totalEstoque / 1000, 2)} t</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-t2">Distribuição do Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-t3 text-xs">Sem estoque atual</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={2}>
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
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
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
        </>
      )}
    </div>
  )
}

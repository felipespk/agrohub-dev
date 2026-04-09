import { useEffect, useState, useCallback, useMemo } from 'react'
import { FileBarChart, Download } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'

interface TipoGrao { id: string; nome: string }
interface Produtor { id: string; nome: string }
interface Comprador { id: string; nome: string }

export function Relatorio() {
  const { session } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId() ?? session?.user?.id

  const [loading, setLoading] = useState(true)
  const [tipos, setTipos] = useState<TipoGrao[]>([])
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [compradores, setCompradores] = useState<Comprador[]>([])
  const [recs, setRecs] = useState<Record<string, unknown>[]>([])
  const [saidas, setSaidas] = useState<Record<string, unknown>[]>([])
  const [quebras, setQuebras] = useState<Record<string, unknown>[]>([])
  const [dateStart, setDateStart] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'))
  const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'))

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [tRes, pRes, cRes, rRes, sRes, qRes] = await Promise.all([
      supabase.from('tipos_grao').select('*').eq('user_id', userId),
      supabase.from('produtores').select('*').eq('user_id', userId),
      supabase.from('compradores').select('*').eq('user_id', userId),
      supabase.from('recebimentos').select('*').eq('user_id', userId),
      supabase.from('saidas').select('*').eq('user_id', userId),
      supabase.from('quebras_tecnicas').select('*').eq('user_id', userId),
    ])
    setTipos(tRes.data ?? [])
    setProdutores(pRes.data ?? [])
    setCompradores(cRes.data ?? [])
    setRecs(rRes.data ?? [])
    setSaidas(sRes.data ?? [])
    setQuebras(qRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  const filteredRecs = useMemo(() => recs.filter(r => {
    const d = r.data as string
    return d >= dateStart && d <= dateEnd
  }), [recs, dateStart, dateEnd])

  const filteredSaidas = useMemo(() => saidas.filter(s => {
    const d = s.data as string
    return d >= dateStart && d <= dateEnd
  }), [saidas, dateStart, dateEnd])

  const filteredQuebras = useMemo(() => quebras.filter(q => {
    const d = q.data as string
    return d >= dateStart && d <= dateEnd
  }), [quebras, dateStart, dateEnd])

  // Report 1: Recebimento por Produtor
  const recByProdutor = useMemo(() => {
    const map: Record<string, { nome: string; qtd: number; total: number }> = {}
    for (const r of filteredRecs) {
      const pid = (r.produtor_id as string) ?? '__none__'
      const nome = produtores.find(p => p.id === pid)?.nome ?? '(Sem produtor)'
      if (!map[pid]) map[pid] = { nome, qtd: 0, total: 0 }
      map[pid].qtd += 1
      map[pid].total += (r.peso_descontado as number) ?? 0
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [filteredRecs, produtores])

  // Report 2: Expedição por Comprador
  const expByComprador = useMemo(() => {
    const map: Record<string, { nome: string; qtd: number; peso: number; valor: number }> = {}
    for (const s of filteredSaidas) {
      if ((s.tipo as string) !== 'venda') continue
      const cid = (s.comprador_id as string) ?? '__none__'
      const nome = compradores.find(c => c.id === cid)?.nome ?? '(Sem comprador)'
      if (!map[cid]) map[cid] = { nome, qtd: 0, peso: 0, valor: 0 }
      map[cid].qtd += 1
      map[cid].peso += (s.peso_liquido as number) ?? 0
      map[cid].valor += (s.valor_total as number) ?? 0
    }
    return Object.values(map).sort((a, b) => b.valor - a.valor)
  }, [filteredSaidas, compradores])

  // Report 3: Balanço por Tipo de Grão
  const balanceByTipo = useMemo(() => {
    return tipos.map(t => {
      const entrada = filteredRecs
        .filter(r => r.tipo_grao_id === t.id)
        .reduce((s, r) => s + ((r.peso_descontado as number) ?? 0), 0)
      const saida = filteredSaidas
        .filter(s => s.tipo_grao_id === t.id)
        .reduce((s, r) => s + ((r.peso_liquido as number) ?? 0), 0)
      const q = filteredQuebras
        .filter(q => q.tipo_grao_id === t.id)
        .reduce((s, r) => s + ((r.peso_kg as number) ?? 0), 0)
      const estoque = Math.max(0, entrada - saida - q)
      return { nome: t.nome, entrada, saida, quebra: q, estoque }
    }).filter(b => b.entrada > 0 || b.estoque > 0)
  }, [filteredRecs, filteredSaidas, filteredQuebras, tipos])

  async function exportPorProdutor() {
    await exportToExcel('rec_por_produtor', 'Rec. por Produtor', [
      { key: 'nome', header: 'Produtor', width: 24 },
      { key: 'qtd', header: 'Recebimentos', width: 16, type: 'number' },
      { key: 'total_kg', header: 'Total (kg)', width: 16, type: 'number' },
      { key: 'total_t', header: 'Total (t)', width: 14, type: 'number' },
    ], recByProdutor.map(r => ({ nome: r.nome, qtd: r.qtd, total_kg: r.total, total_t: r.total / 1000 })))
  }

  async function exportPorComprador() {
    await exportToExcel('exp_por_comprador', 'Exp. por Comprador', [
      { key: 'nome', header: 'Comprador', width: 24 },
      { key: 'qtd', header: 'Expedições', width: 14, type: 'number' },
      { key: 'peso_t', header: 'Peso (t)', width: 14, type: 'number' },
      { key: 'valor', header: 'Valor Total', width: 16, type: 'currency' },
    ], expByComprador.map(r => ({ nome: r.nome, qtd: r.qtd, peso_t: r.peso / 1000, valor: r.valor })), {
      valor: expByComprador.reduce((s, r) => s + r.valor, 0),
    })
  }

  async function exportBalanco() {
    await exportToExcel('balanco_tipo_grao', 'Balanço por Grão', [
      { key: 'nome', header: 'Tipo de Grão', width: 18 },
      { key: 'entrada', header: 'Entrada (kg)', width: 16, type: 'number' },
      { key: 'saida', header: 'Saída (kg)', width: 16, type: 'number' },
      { key: 'quebra', header: 'Quebra (kg)', width: 16, type: 'number' },
      { key: 'estoque', header: 'Estoque (kg)', width: 16, type: 'number' },
    ], balanceByTipo)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-t1">Relatórios · Secador / Silo</h1>
        <p className="text-sm text-t3">Relatórios gerenciais por produtor, comprador e tipo de grão</p>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Data Início</Label>
          <Input type="date" className="h-8 text-xs w-36" value={dateStart} onChange={e => setDateStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Fim</Label>
          <Input type="date" className="h-8 text-xs w-36" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="produtor">
          <TabsList className="mb-4">
            <TabsTrigger value="produtor">Por Produtor</TabsTrigger>
            <TabsTrigger value="comprador">Por Comprador</TabsTrigger>
            <TabsTrigger value="balanco">Balanço por Grão</TabsTrigger>
          </TabsList>

          <TabsContent value="produtor">
            <Card className="shadow-elev-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-t2 flex items-center gap-2">
                    <FileBarChart size={14} />
                    Recebimento por Produtor
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={exportPorProdutor} className="gap-1.5 text-xs">
                    <Download size={12} />
                    Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recByProdutor.length === 0 ? (
                  <p className="text-sm text-t3 py-6 text-center">Nenhum recebimento no período</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                        <th className="text-left py-2 px-3">Produtor</th>
                        <th className="text-right py-2 px-3">Recebimentos</th>
                        <th className="text-right py-2 px-3">Total (kg)</th>
                        <th className="text-right py-2 px-3">Total (t)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recByProdutor.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                          <td className="py-2.5 px-3 text-t1 font-medium">{r.nome}</td>
                          <td className="py-2.5 px-3 text-right text-t2">{r.qtd}</td>
                          <td className="py-2.5 px-3 text-right text-t2">{formatNumber(r.total, 0)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-t1">{formatNumber(r.total / 1000, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--border)]">
                        <td className="py-2 px-3 text-xs font-semibold text-t1">TOTAL</td>
                        <td className="py-2 px-3 text-right font-semibold text-t1">{recByProdutor.reduce((s, r) => s + r.qtd, 0)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-t1">{formatNumber(recByProdutor.reduce((s, r) => s + r.total, 0), 0)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-[var(--primary)]">{formatNumber(recByProdutor.reduce((s, r) => s + r.total, 0) / 1000, 2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comprador">
            <Card className="shadow-elev-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-t2 flex items-center gap-2">
                    <FileBarChart size={14} />
                    Expedição por Comprador
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={exportPorComprador} className="gap-1.5 text-xs">
                    <Download size={12} />
                    Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {expByComprador.length === 0 ? (
                  <p className="text-sm text-t3 py-6 text-center">Nenhuma venda no período</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                        <th className="text-left py-2 px-3">Comprador</th>
                        <th className="text-right py-2 px-3">Expedições</th>
                        <th className="text-right py-2 px-3">Peso (t)</th>
                        <th className="text-right py-2 px-3">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expByComprador.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                          <td className="py-2.5 px-3 text-t1 font-medium">{r.nome}</td>
                          <td className="py-2.5 px-3 text-right text-t2">{r.qtd}</td>
                          <td className="py-2.5 px-3 text-right text-t2">{formatNumber(r.peso / 1000, 2)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-[var(--primary)]">{formatCurrency(r.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--border)]">
                        <td className="py-2 px-3 text-xs font-semibold text-t1">TOTAL</td>
                        <td className="py-2 px-3 text-right font-semibold text-t1">{expByComprador.reduce((s, r) => s + r.qtd, 0)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-t1">{formatNumber(expByComprador.reduce((s, r) => s + r.peso, 0) / 1000, 2)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-[var(--primary)]">{formatCurrency(expByComprador.reduce((s, r) => s + r.valor, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balanco">
            <Card className="shadow-elev-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-t2 flex items-center gap-2">
                    <FileBarChart size={14} />
                    Balanço por Tipo de Grão
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={exportBalanco} className="gap-1.5 text-xs">
                    <Download size={12} />
                    Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {balanceByTipo.length === 0 ? (
                  <p className="text-sm text-t3 py-6 text-center">Nenhum movimento no período</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                        <th className="text-left py-2 px-3">Tipo de Grão</th>
                        <th className="text-right py-2 px-3">Entrada (t)</th>
                        <th className="text-right py-2 px-3">Saída (t)</th>
                        <th className="text-right py-2 px-3">Quebra (t)</th>
                        <th className="text-right py-2 px-3">Estoque (t)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceByTipo.map((b, i) => (
                        <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                          <td className="py-2.5 px-3 text-t1 font-medium">{b.nome}</td>
                          <td className="py-2.5 px-3 text-right text-t2">{formatNumber(b.entrada / 1000, 2)}</td>
                          <td className="py-2.5 px-3 text-right text-t2">{formatNumber(b.saida / 1000, 2)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-500">{formatNumber(b.quebra / 1000, 2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-[var(--primary)]">{formatNumber(b.estoque / 1000, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--border)]">
                        <td className="py-2 px-3 text-xs font-semibold text-t1">TOTAL</td>
                        <td className="py-2 px-3 text-right font-semibold text-t1">{formatNumber(balanceByTipo.reduce((s, b) => s + b.entrada, 0) / 1000, 2)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-t1">{formatNumber(balanceByTipo.reduce((s, b) => s + b.saida, 0) / 1000, 2)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-amber-500">{formatNumber(balanceByTipo.reduce((s, b) => s + b.quebra, 0) / 1000, 2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-[var(--primary)]">{formatNumber(balanceByTipo.reduce((s, b) => s + b.estoque, 0) / 1000, 2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

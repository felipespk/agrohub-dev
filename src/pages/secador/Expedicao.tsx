import { useEffect, useState, useCallback } from 'react'
import { Truck, Plus, Download } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'
import { criarLancamentoReceita, criarContaReceber, buscarCentroCusto } from '@/lib/financeiro-integration'

interface TipoGrao { id: string; nome: string }
interface VariedadeGrao { id: string; tipo_grao_id: string; nome: string }
interface Comprador { id: string; nome: string }
interface SaidaRow {
  id: string; data: string; tipo: string; comprador_id: string | null
  tipo_grao_id: string | null; variedade_id: string | null
  peso_bruto: number | null; tara: number | null; peso_liquido: number | null
  preco_saca: number | null; valor_total: number | null; nota_fiscal: string | null
  tipo_pagamento: string | null; observacao: string | null
  user_id: string; created_at: string
}

const TIPO_BADGE: Record<string, string> = {
  venda: 'bg-green-500/15 text-green-600 border-green-500/30',
  transferencia: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  amostra: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  outro: 'bg-gray-500/15 text-gray-600 border-gray-500/30',
}
const TIPO_LABELS: Record<string, string> = {
  venda: 'Venda', transferencia: 'Transferência', amostra: 'Amostra', outro: 'Outro',
}

const EMPTY_FORM = {
  data: format(new Date(), 'yyyy-MM-dd'),
  tipo: 'venda' as 'venda' | 'transferencia' | 'amostra' | 'outro',
  comprador_id: '',
  tipo_grao_id: '',
  variedade_id: '',
  peso_bruto: '',
  tara: '',
  preco_saca: '',
  tipo_pagamento: 'avista' as 'avista' | 'prazo',
  nota_fiscal: '',
  observacao: '',
}

export function Expedicao() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId() ?? session?.user?.id

  const [tipos, setTipos] = useState<TipoGrao[]>([])
  const [variedades, setVariedades] = useState<VariedadeGrao[]>([])
  const [compradores, setCompradores] = useState<Comprador[]>([])
  const [rows, setRows] = useState<SaidaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const calcLiquido = (() => {
    const bruto = parseFloat(form.peso_bruto) || 0
    const tara = parseFloat(form.tara) || 0
    return Math.max(0, bruto - tara)
  })()

  const calcValorTotal = (() => {
    const saca = parseFloat(form.preco_saca) || 0
    return calcLiquido > 0 && saca > 0 ? (calcLiquido / 60) * saca : 0
  })()

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [tRes, vRes, cRes, sRes] = await Promise.all([
      supabase.from('tipos_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('variedades_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('compradores').select('*').eq('user_id', userId).order('nome'),
      supabase.from('saidas').select('*').eq('user_id', userId).order('data', { ascending: false }),
    ])
    setTipos(tRes.data ?? [])
    setVariedades(vRes.data ?? [])
    setCompradores(cRes.data ?? [])
    setRows(sRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está no modo impersonação.' })
      return
    }
    if (!session?.user?.id) return
    if (!form.data || !form.tipo_grao_id) {
      toast.error('Campos obrigatórios', { description: 'Data e Tipo de Grão são obrigatórios.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('saidas').insert({
      user_id: session.user.id,
      tipo: form.tipo,
      data: form.data,
      comprador_id: form.comprador_id || null,
      tipo_grao_id: form.tipo_grao_id || null,
      variedade_id: form.variedade_id || null,
      peso_bruto: parseFloat(form.peso_bruto) || null,
      tara: parseFloat(form.tara) || null,
      peso_liquido: calcLiquido || null,
      preco_saca: parseFloat(form.preco_saca) || null,
      valor_total: calcValorTotal || null,
      tipo_pagamento: form.tipo === 'venda' ? form.tipo_pagamento : null,
      nota_fiscal: form.nota_fiscal || null,
      observacao: form.observacao || null,
    })

    if (!error && form.tipo === 'venda' && calcValorTotal > 0) {
      const comprador = compradores.find(c => c.id === form.comprador_id)
      const tipoGrao = tipos.find(t => t.id === form.tipo_grao_id)
      const descricao = `Venda${tipoGrao ? ` — ${tipoGrao.nome}` : ''}${comprador ? ` p/ ${comprador.nome}` : ''}`
      const centro = await buscarCentroCusto(session.user.id, 'Secador')
      if (form.tipo_pagamento === 'avista' && centro) {
        await criarLancamentoReceita(session.user.id, calcValorTotal, form.data, descricao, centro.id)
      } else if (form.tipo_pagamento === 'prazo' && centro) {
        await criarContaReceber(session.user.id, descricao, calcValorTotal, form.data, centro.id)
      }
    }

    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar', { description: error.message })
    } else {
      toast.success('Expedição registrada!')
      setOpen(false)
      setForm(EMPTY_FORM)
      loadAll()
    }
  }

  async function handleExport() {
    await exportToExcel('expedicao', 'Expedição', [
      { key: 'data', header: 'Data', width: 12, type: 'date' },
      { key: 'tipo', header: 'Tipo', width: 14 },
      { key: 'destino', header: 'Destino', width: 22 },
      { key: 'grao', header: 'Grão', width: 14 },
      { key: 'peso_liquido', header: 'Peso Líq. (kg)', width: 16, type: 'number' },
      { key: 'valor_total', header: 'Valor Total', width: 16, type: 'currency' },
      { key: 'nota_fiscal', header: 'NF', width: 14 },
    ], rows.map(r => ({
      data: r.data,
      tipo: TIPO_LABELS[r.tipo] ?? r.tipo,
      destino: compradores.find(c => c.id === r.comprador_id)?.nome ?? r.observacao ?? '—',
      grao: tipos.find(t => t.id === r.tipo_grao_id)?.nome ?? '',
      peso_liquido: r.peso_liquido,
      valor_total: r.valor_total,
      nota_fiscal: r.nota_fiscal,
    })))
  }

  const variedadesFiltradas = variedades.filter(v => v.tipo_grao_id === form.tipo_grao_id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-t1">Expedição</h1>
          <p className="text-sm text-t3">Todas as saídas de grãos — vendas, transferências e amostras</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
            <Download size={13} />
            Excel
          </Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus size={14} />
            Nova Expedição
          </Button>
        </div>
      </div>

      <Card className="shadow-elev-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-t2">Registro de Expedições</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-t3 gap-2">
              <Truck size={28} className="animate-float opacity-40" />
              <p className="text-sm">Nenhuma expedição registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3">Data</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-left py-2 px-3">Destino</th>
                    <th className="text-left py-2 px-3">Grão</th>
                    <th className="text-right py-2 px-3">Peso (kg)</th>
                    <th className="text-right py-2 px-3">Valor Total</th>
                    <th className="text-left py-2 px-3">NF</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const comp = compradores.find(c => c.id === r.comprador_id)?.nome
                    const tipo = tipos.find(t => t.id === r.tipo_grao_id)?.nome ?? '—'
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                        <td className="py-2.5 px-3 text-t2">{formatDate(r.data)}</td>
                        <td className="py-2.5 px-3">
                          <Badge className={`text-xs ${TIPO_BADGE[r.tipo] ?? TIPO_BADGE.outro}`}>
                            {TIPO_LABELS[r.tipo] ?? r.tipo}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-t1">{comp ?? r.observacao ?? '—'}</td>
                        <td className="py-2.5 px-3 text-t2">{tipo}</td>
                        <td className="py-2.5 px-3 text-right text-t2">
                          {r.peso_liquido != null ? formatNumber(r.peso_liquido, 0) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-t1">
                          {r.valor_total != null ? formatCurrency(r.valor_total) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-t3 text-xs">{r.nota_fiscal ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck size={16} />
              Nova Expedição
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={form.data} onChange={e => setField('data', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Saída</Label>
                <Select value={form.tipo} onValueChange={v => setField('tipo', v as never)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="amostra">Amostra</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.tipo === 'venda' && (
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Comprador</Label>
                  <Select value={form.comprador_id} onValueChange={v => setField('comprador_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {compradores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Grão *</Label>
                <Select value={form.tipo_grao_id} onValueChange={v => { setField('tipo_grao_id', v); setField('variedade_id', '') }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Variedade</Label>
                <Select value={form.variedade_id} onValueChange={v => setField('variedade_id', v)} disabled={!form.tipo_grao_id}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {variedadesFiltradas.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Peso Bruto (kg)</Label>
                <Input type="number" step="0.01" min="0" value={form.peso_bruto} onChange={e => setField('peso_bruto', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tara (kg)</Label>
                <Input type="number" step="0.01" min="0" value={form.tara} onChange={e => setField('tara', e.target.value)} placeholder="0" />
              </div>
              {form.tipo === 'venda' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Preço por Saca (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={form.preco_saca} onChange={e => setField('preco_saca', e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Total</Label>
                    <div className="h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] flex items-center text-sm font-semibold text-[var(--primary)]">
                      {formatCurrency(calcValorTotal)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pagamento</Label>
                    <Select value={form.tipo_pagamento} onValueChange={v => setField('tipo_pagamento', v as never)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avista">À Vista</SelectItem>
                        <SelectItem value="prazo">A Prazo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Nota Fiscal</Label>
                <Input value={form.nota_fiscal} onChange={e => setField('nota_fiscal', e.target.value)} placeholder="NF-001" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observação</Label>
              <Textarea rows={2} value={form.observacao} onChange={e => setField('observacao', e.target.value)} placeholder="Observações..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

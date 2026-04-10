import { useEffect, useState, useCallback } from 'react'
import { Plus, Download, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'
import { buscarCentroCusto, criarLancamentoReceita, criarContaReceber } from '@/lib/financeiro-integration'
import { useCountUp } from '@/hooks/useCountUp'

interface Safra { id: string; nome: string }
interface Cultura { id: string; nome: string }
interface Comercializacao {
  id: string; safra_id: string | null; cultura_id: string | null; comprador: string | null
  quantidade: number; preco_unitario: number; valor_total: number
  data_venda: string; tipo_contrato: string; user_id: string
}

const CONTRATO_COLORS: Record<string, string> = {
  avista: 'bg-green-100 text-green-700',
  prazo: 'bg-blue-100 text-blue-700',
  barter: 'bg-purple-100 text-purple-700',
}
const CONTRATO_LABELS: Record<string, string> = { avista: 'À Vista', prazo: 'A Prazo', barter: 'Barter' }

interface FormData {
  safra_id: string; cultura_id: string; comprador: string
  quantidade: string; preco_unitario: string; data_venda: string; tipo_contrato: string
}
const EMPTY_FORM: FormData = {
  safra_id: '', cultura_id: '', comprador: '',
  quantidade: '', preco_unitario: '', data_venda: format(new Date(), 'yyyy-MM-dd'), tipo_contrato: 'avista',
}

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-56" /></div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="rounded-xl glass-card overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Comercializacao() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vendas, setVendas] = useState<Comercializacao[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [culturas, setCulturas] = useState<Cultura[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [filterSafra, setFilterSafra] = useState('todos')
  const [filterContrato, setFilterContrato] = useState('todos')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [v, s, c] = await Promise.all([
        supabase.from('comercializacao').select('*').eq('user_id', userId).order('data_venda', { ascending: false }),
        supabase.from('safras').select('*').eq('user_id', userId).order('nome'),
        supabase.from('culturas').select('*').eq('user_id', userId).order('nome'),
      ])
      setVendas(v.data ?? [])
      setSafras(s.data ?? [])
      setCulturas(c.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const filtered = vendas.filter(v => {
    if (filterSafra !== 'todos' && v.safra_id !== filterSafra) return false
    if (filterContrato !== 'todos' && v.tipo_contrato !== filterContrato) return false
    if (filterDateFrom && v.data_venda < filterDateFrom) return false
    if (filterDateTo && v.data_venda > filterDateTo) return false
    return true
  })

  const totalVendido = filtered.reduce((s, v) => s + v.valor_total, 0)
  const qtdTotal = filtered.reduce((s, v) => s + v.quantidade, 0)
  const totalVendidoAnim = useCountUp(Math.round(totalVendido))

  async function handleSave() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!form.quantidade || !form.preco_unitario || !form.data_venda || !form.tipo_contrato) {
      toast.error('Campos obrigatórios', { description: 'Quantidade, Preço, Data e Tipo de Contrato são obrigatórios.' }); return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      const qtd = parseFloat(form.quantidade)
      const preco = parseFloat(form.preco_unitario)
      const valorTotal = qtd * preco
      const { error } = await supabase.from('comercializacao').insert({
        user_id: uid,
        safra_id: form.safra_id || null,
        cultura_id: form.cultura_id || null,
        comprador: form.comprador || null,
        quantidade: qtd,
        preco_unitario: preco,
        valor_total: valorTotal,
        data_venda: form.data_venda,
        tipo_contrato: form.tipo_contrato,
      })
      if (error) throw error

      const centro = await buscarCentroCusto(uid, 'Lavoura')
      const cultura = culturas.find(c => c.id === form.cultura_id)
      const descricao = `Venda ${CONTRATO_LABELS[form.tipo_contrato]} — ${cultura?.nome ?? 'Lavoura'}${form.comprador ? ` — ${form.comprador}` : ''}`

      if (centro) {
        if (form.tipo_contrato === 'avista') {
          await criarLancamentoReceita(uid, valorTotal, form.data_venda, descricao, centro.id)
        } else {
          await criarContaReceber(uid, descricao, valorTotal, form.data_venda, centro.id)
        }
      }

      toast.success('Venda registrada!')
      setDialogOpen(false); setForm(EMPTY_FORM); loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleExport() {
    const rows = filtered.map(v => ({
      data: v.data_venda,
      safra: safras.find(s => s.id === v.safra_id)?.nome ?? '–',
      cultura: culturas.find(c => c.id === v.cultura_id)?.nome ?? '–',
      comprador: v.comprador ?? '–',
      quantidade: v.quantidade,
      preco_unitario: v.preco_unitario,
      valor_total: v.valor_total,
      tipo: CONTRATO_LABELS[v.tipo_contrato] ?? v.tipo_contrato,
    }))
    await exportToExcel('comercializacao', 'Comercialização', [
      { key: 'data', header: 'Data', type: 'date', width: 12 },
      { key: 'safra', header: 'Safra', width: 18 },
      { key: 'cultura', header: 'Cultura', width: 16 },
      { key: 'comprador', header: 'Comprador', width: 20 },
      { key: 'quantidade', header: 'Quantidade', type: 'number', width: 14 },
      { key: 'preco_unitario', header: 'Preço Unit.', type: 'currency', width: 14 },
      { key: 'valor_total', header: 'Valor Total', type: 'currency', width: 16 },
      { key: 'tipo', header: 'Contrato', width: 12 },
    ], rows, { valor_total: totalVendido })
  }

  if (loading) return <PageSkeleton />

  const valorTotal = form.quantidade && form.preco_unitario
    ? parseFloat(form.quantidade) * parseFloat(form.preco_unitario) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Comercialização</h1>
          <p className="text-sm text-t3">Registro de vendas de commodities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Nova Venda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl glass-card p-5">
          <p className="text-2xl font-semibold text-t1">{formatCurrency(totalVendidoAnim)}</p>
          <p className="text-sm text-t2 mt-0.5">Total Vendido</p>
        </div>
        <div className="rounded-xl glass-card p-5">
          <p className="text-2xl font-semibold text-t1">{formatNumber(qtdTotal, 0)}</p>
          <p className="text-sm text-t2 mt-0.5">Quantidade Total</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterSafra} onValueChange={setFilterSafra}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todas as safras" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as safras</SelectItem>
            {safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterContrato} onValueChange={setFilterContrato}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Contrato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="avista">À Vista</SelectItem>
            <SelectItem value="prazo">A Prazo</SelectItem>
            <SelectItem value="barter">Barter</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-36" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} placeholder="De" />
        <Input type="date" className="w-36" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} placeholder="Até" />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-float"><ShoppingCart className="w-12 h-12 text-t3" /></div>
          <p className="text-sm text-t3">Nenhuma venda registrada</p>
          <Button size="sm" variant="outline" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>Registrar Venda</Button>
        </div>
      ) : (
        <div className="rounded-xl glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Safra</th>
                <th className="text-left px-4 py-3">Cultura</th>
                <th className="text-left px-4 py-3">Comprador</th>
                <th className="text-left px-4 py-3">Quantidade</th>
                <th className="text-left px-4 py-3">Preço Unit.</th>
                <th className="text-left px-4 py-3">Valor Total</th>
                <th className="text-left px-4 py-3">Contrato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr
                  key={v.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-4 py-3 text-t2">{formatDate(v.data_venda)}</td>
                  <td className="px-4 py-3 text-t2">{safras.find(s => s.id === v.safra_id)?.nome ?? '–'}</td>
                  <td className="px-4 py-3 text-t2">{culturas.find(c => c.id === v.cultura_id)?.nome ?? '–'}</td>
                  <td className="px-4 py-3 text-t1 font-medium">{v.comprador ?? '–'}</td>
                  <td className="px-4 py-3 text-t2">{formatNumber(v.quantidade, 0)}</td>
                  <td className="px-4 py-3 text-t2">{formatCurrency(v.preco_unitario)}</td>
                  <td className="px-4 py-3 text-t1 font-medium">{formatCurrency(v.valor_total)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${CONTRATO_COLORS[v.tipo_contrato] ?? ''}`}>{CONTRATO_LABELS[v.tipo_contrato] ?? v.tipo_contrato}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nova Venda</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Safra</Label>
                <Select value={form.safra_id} onValueChange={v => setForm(f => ({ ...f, safra_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cultura</Label>
                <Select value={form.cultura_id} onValueChange={v => setForm(f => ({ ...f, cultura_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {culturas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Comprador</Label>
              <Input placeholder="Nome do comprador" value={form.comprador} onChange={e => setForm(f => ({ ...f, comprador: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade *</Label>
                <Input type="number" placeholder="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Preço Unit. *</Label>
                <Input type="number" placeholder="0.00" value={form.preco_unitario} onChange={e => setForm(f => ({ ...f, preco_unitario: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Venda *</Label>
                <Input type="date" value={form.data_venda} onChange={e => setForm(f => ({ ...f, data_venda: e.target.value }))} />
              </div>
            </div>
            {valorTotal > 0 && (
              <p className="text-sm text-t2">Valor Total: <span className="font-semibold text-t1">{formatCurrency(valorTotal)}</span></p>
            )}
            <div className="space-y-1.5">
              <Label>Tipo de Contrato *</Label>
              <Select value={form.tipo_contrato} onValueChange={v => setForm(f => ({ ...f, tipo_contrato: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avista">À Vista</SelectItem>
                  <SelectItem value="prazo">A Prazo</SelectItem>
                  <SelectItem value="barter">Barter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

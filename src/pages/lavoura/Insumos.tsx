import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Package, ArrowDownToLine } from 'lucide-react'
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
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'

interface Insumo {
  id: string; nome: string; categoria: string; unidade: string
  preco_unitario: number; estoque_atual: number; estoque_minimo: number; user_id: string
}

const CAT_COLORS: Record<string, string> = {
  semente: 'bg-green-100 text-green-700',
  fertilizante: 'bg-lime-100 text-lime-700',
  defensivo: 'bg-orange-100 text-orange-700',
  combustivel: 'bg-yellow-100 text-yellow-700',
  outro: 'bg-gray-100 text-gray-600',
}
const CAT_LABELS: Record<string, string> = {
  semente: 'Semente', fertilizante: 'Fertilizante', defensivo: 'Defensivo',
  combustivel: 'Combustível', outro: 'Outro',
}
const CATEGORIAS = ['semente', 'fertilizante', 'defensivo', 'combustivel', 'outro']

function stockStatus(i: Insumo) {
  if (i.estoque_atual === 0) return { label: 'Crítico', cls: 'bg-red-100 text-red-700' }
  if (i.estoque_atual < i.estoque_minimo) return { label: 'Baixo', cls: 'bg-yellow-100 text-yellow-700' }
  return { label: 'OK', cls: 'bg-green-100 text-green-700' }
}

interface FormData {
  nome: string; categoria: string; unidade: string
  preco_unitario: string; estoque_atual: string; estoque_minimo: string
}
const EMPTY_FORM: FormData = { nome: '', categoria: 'outro', unidade: '', preco_unitario: '', estoque_atual: '0', estoque_minimo: '0' }

interface EntradaForm { quantidade: string; data: string; fornecedor: string; valor_total: string }
const EMPTY_ENTRADA: EntradaForm = { quantidade: '', data: format(new Date(), 'yyyy-MM-dd'), fornecedor: '', valor_total: '' }

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Insumos() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [entradaDialogOpen, setEntradaDialogOpen] = useState(false)
  const [entradaInsumo, setEntradaInsumo] = useState<Insumo | null>(null)
  const [entradaForm, setEntradaForm] = useState<EntradaForm>(EMPTY_ENTRADA)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase.from('insumos').select('*').eq('user_id', userId).order('nome')
      setInsumos(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const totalItens = insumos.length
  const emEstoqueBaixo = insumos.filter(i => i.estoque_atual < i.estoque_minimo).length
  const valorEstoque = insumos.reduce((s, i) => s + i.estoque_atual * i.preco_unitario, 0)

  const totalItensAnim = useCountUp(totalItens)
  const baixoAnim = useCountUp(emEstoqueBaixo)

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setDialogOpen(true) }
  function openEdit(i: Insumo) {
    setEditId(i.id)
    setForm({ nome: i.nome, categoria: i.categoria, unidade: i.unidade, preco_unitario: String(i.preco_unitario), estoque_atual: String(i.estoque_atual), estoque_minimo: String(i.estoque_minimo) })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!form.nome.trim() || !form.unidade.trim() || !form.categoria) {
      toast.error('Campos obrigatórios', { description: 'Nome, Categoria e Unidade são obrigatórios.' }); return
    }
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria,
        unidade: form.unidade.trim(),
        preco_unitario: parseFloat(form.preco_unitario) || 0,
        estoque_atual: parseFloat(form.estoque_atual) || 0,
        estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      }
      if (editId) {
        const { error } = await supabase.from('insumos').update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('insumos').insert({ ...payload, user_id: session!.user.id })
        if (error) throw error
      }
      toast.success(editId ? 'Insumo atualizado!' : 'Insumo criado!')
      setDialogOpen(false)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    const { error } = await supabase.from('insumos').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir', { description: error.message })
    else { toast.success('Insumo excluído.'); loadData() }
    setConfirmDeleteId(null)
  }

  function openEntrada(i: Insumo) { setEntradaInsumo(i); setEntradaForm(EMPTY_ENTRADA); setEntradaDialogOpen(true) }

  async function handleEntrada() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!entradaForm.quantidade || !entradaInsumo) { toast.error('Quantidade obrigatória'); return }
    setSaving(true)
    try {
      const qtd = parseFloat(entradaForm.quantidade)
      await Promise.all([
        supabase.from('movimentacoes_insumo').insert({
          user_id: session!.user.id,
          insumo_id: entradaInsumo.id,
          tipo: 'entrada',
          quantidade: qtd,
          data: entradaForm.data,
          fornecedor: entradaForm.fornecedor || null,
          valor_total: entradaForm.valor_total ? parseFloat(entradaForm.valor_total) : null,
        }),
        supabase.from('insumos').update({ estoque_atual: entradaInsumo.estoque_atual + qtd }).eq('id', entradaInsumo.id),
      ])
      toast.success('Entrada registrada!')
      setEntradaDialogOpen(false)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao registrar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Insumos</h1>
          <p className="text-sm text-t3">Controle de estoque de insumos agrícolas</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Novo Insumo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total de Itens', value: String(totalItensAnim), sub: 'insumos cadastrados' },
          { label: 'Estoque Baixo', value: String(baixoAnim), sub: 'abaixo do mínimo', alert: emEstoqueBaixo > 0 },
          { label: 'Valor do Estoque', value: formatCurrency(valorEstoque), sub: 'valor total em estoque' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl border bg-[var(--surface)] p-5 shadow-elev-1 ${kpi.alert ? 'border-yellow-300' : 'border-[var(--border)]'}`}>
            <p className="text-2xl font-semibold text-t1">{kpi.value}</p>
            <p className="text-sm text-t2 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-t3">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {insumos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-float"><Package className="w-12 h-12 text-t3" /></div>
          <p className="text-sm text-t3">Nenhum insumo cadastrado</p>
          <Button size="sm" variant="outline" onClick={openCreate}>Cadastrar Insumo</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">Unidade</th>
                <th className="text-left px-4 py-3">Preço Unit.</th>
                <th className="text-left px-4 py-3">Estoque Atual</th>
                <th className="text-left px-4 py-3">Mínimo</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {insumos.map((item, i) => {
                const st = stockStatus(item)
                return (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors animate-fade-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-4 py-3 font-medium text-t1">{item.nome}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${CAT_COLORS[item.categoria] ?? 'bg-gray-100 text-gray-600'}`}>{CAT_LABELS[item.categoria] ?? item.categoria}</Badge>
                    </td>
                    <td className="px-4 py-3 text-t2">{item.unidade}</td>
                    <td className="px-4 py-3 text-t2">{formatCurrency(item.preco_unitario)}</td>
                    <td className="px-4 py-3 text-t2">{formatNumber(item.estoque_atual)}</td>
                    <td className="px-4 py-3 text-t2">{formatNumber(item.estoque_minimo)}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${st.cls}`}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button title="Registrar entrada" onClick={() => openEntrada(item)} className="p-1.5 rounded text-t3 hover:text-[var(--primary-dark)] hover:bg-[var(--primary-bg)] transition-colors">
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded text-t3 hover:text-t1 hover:bg-[var(--surface-raised)] transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(item.id)} className="p-1.5 rounded text-t3 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Editar Insumo' : 'Novo Insumo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Glifosato" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CAT_LABELS[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unidade *</Label>
                <Input placeholder="Ex: L, kg, sc" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Preço Unitário</Label>
                <Input type="number" placeholder="0.00" value={form.preco_unitario} onChange={e => setForm(f => ({ ...f, preco_unitario: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Estoque Inicial</Label>
                <Input type="number" placeholder="0" value={form.estoque_atual} onChange={e => setForm(f => ({ ...f, estoque_atual: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Estoque Mínimo</Label>
                <Input type="number" placeholder="0" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entradaDialogOpen} onOpenChange={setEntradaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Entrada — {entradaInsumo?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade * ({entradaInsumo?.unidade})</Label>
                <Input type="number" placeholder="0" value={entradaForm.quantidade} onChange={e => setEntradaForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={entradaForm.data} onChange={e => setEntradaForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input placeholder="Nome do fornecedor" value={entradaForm.fornecedor} onChange={e => setEntradaForm(f => ({ ...f, fornecedor: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Total (R$)</Label>
              <Input type="number" placeholder="0.00" value={entradaForm.valor_total} onChange={e => setEntradaForm(f => ({ ...f, valor_total: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntradaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEntrada} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir este insumo?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

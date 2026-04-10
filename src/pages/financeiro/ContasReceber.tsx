import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { useFinanceiro } from '@/contexts/FinanceiroContext'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2, CheckCircle2, Search, X, ArrowUpCircle } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { format } from 'date-fns'

interface ContaPR {
  id: string
  tipo: string
  descricao: string
  valor_total: number
  valor_pago: number
  data_vencimento: string
  data_pagamento: string | null
  status: 'aberto' | 'pago' | 'vencido' | 'cancelado'
  categoria_id: string | null
  centro_custo_id: string | null
  contato_id: string | null
  conta_bancaria_id: string | null
  user_id: string
  created_at: string
}

const statusColors = {
  aberto: 'bg-blue-50 text-blue-600 border-blue-100',
  pago: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]',
  vencido: 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]',
  cancelado: 'bg-[var(--surface-raised)] text-t3 border-[var(--border)]',
}

const statusLabels: Record<string, string> = {
  aberto: 'Aberto', pago: 'Recebido', vencido: 'Vencido', cancelado: 'Cancelado',
}

const EMPTY_FORM = {
  descricao: '', valor_total: '', data_vencimento: '',
  categoria_id: '', centro_custo_id: '', contato_id: '',
}

const EMPTY_RECEBER = {
  data_pagamento: format(new Date(), 'yyyy-MM-dd'),
  conta_bancaria_id: '',
  valor_pago: '',
}

export function ContasReceber() {
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()
  const { categorias, centrosCusto, contatos, contasBancarias, reload: ctxReload } = useFinanceiro()

  const [contas, setContas]             = useState<ContaPR[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [dataDeFilter, setDataDeFilter] = useState('')
  const [dataAteFilter, setDataAteFilter] = useState('')

  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<ContaPR | null>(null)
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [saving, setSaving]         = useState(false)

  const [receberModal, setReceberModal]     = useState<ContaPR | null>(null)
  const [receberForm, setReceberForm]       = useState({ ...EMPTY_RECEBER })
  const [savingReceber, setSavingReceber]   = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ContaPR | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const fetchContas = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      await supabase
        .from('contas_pr')
        .update({ status: 'vencido' })
        .eq('user_id', userId)
        .eq('tipo', 'receber')
        .eq('status', 'aberto')
        .lt('data_vencimento', hoje)

      const { data } = await supabase
        .from('contas_pr')
        .select('*')
        .eq('user_id', userId)
        .eq('tipo', 'receber')
        .order('data_vencimento', { ascending: true })

      setContas((data ?? []) as ContaPR[])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchContas() }, [fetchContas])

  const filtered = contas.filter(c => {
    const matchSearch = !search || c.descricao.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    const matchDe = !dataDeFilter || c.data_vencimento >= dataDeFilter
    const matchAte = !dataAteFilter || c.data_vencimento <= dataAteFilter
    return matchSearch && matchStatus && matchDe && matchAte
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  function openEdit(c: ContaPR) {
    setEditing(c)
    setForm({
      descricao: c.descricao,
      valor_total: String(c.valor_total),
      data_vencimento: c.data_vencimento,
      categoria_id: c.categoria_id ?? '',
      centro_custo_id: c.centro_custo_id ?? '',
      contato_id: c.contato_id ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.descricao.trim() || !form.valor_total || !form.data_vencimento) {
      toast.error('Campos obrigatórios', { description: 'Preencha descrição, valor e vencimento.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        tipo: 'receber',
        descricao: form.descricao.trim(),
        valor_total: parseFloat(form.valor_total),
        data_vencimento: form.data_vencimento,
        categoria_id: form.categoria_id || null,
        centro_custo_id: form.centro_custo_id || null,
        contato_id: form.contato_id || null,
        status: 'aberto',
        valor_pago: 0,
      }
      if (editing) {
        const { error } = await supabase.from('contas_pr').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Conta atualizada com sucesso.')
      } else {
        const { error } = await supabase.from('contas_pr').insert(payload)
        if (error) throw error
        toast.success('Conta criada com sucesso.')
      }
      setShowModal(false)
      fetchContas()
      ctxReload()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  function openReceber(c: ContaPR) {
    setReceberModal(c)
    setReceberForm({
      data_pagamento: format(new Date(), 'yyyy-MM-dd'),
      conta_bancaria_id: contasBancarias.find(cb => cb.ativa)?.id ?? '',
      valor_pago: String(c.valor_total - c.valor_pago),
    })
  }

  async function handleReceber() {
    if (!receberModal) return
    if (!receberForm.conta_bancaria_id || !receberForm.valor_pago) {
      toast.error('Campos obrigatórios', { description: 'Informe a conta bancária e o valor.' })
      return
    }
    const valorRecebido = parseFloat(receberForm.valor_pago)
    if (isNaN(valorRecebido) || valorRecebido <= 0) {
      toast.error('Valor inválido')
      return
    }
    setSavingReceber(true)
    try {
      const novoValorPago = receberModal.valor_pago + valorRecebido
      const novoStatus = novoValorPago >= receberModal.valor_total ? 'pago' : 'aberto'
      const { error: updateErr } = await supabase.from('contas_pr').update({
        status: novoStatus,
        valor_pago: novoValorPago,
        data_pagamento: receberForm.data_pagamento,
        conta_bancaria_id: receberForm.conta_bancaria_id,
      }).eq('id', receberModal.id)
      if (updateErr) throw updateErr

      const { error: lancErr } = await supabase.from('lancamentos').insert({
        user_id: userId,
        tipo: 'receita',
        valor: valorRecebido,
        data: receberForm.data_pagamento,
        descricao: receberModal.descricao,
        conta_bancaria_id: receberForm.conta_bancaria_id,
        categoria_id: receberModal.categoria_id,
        centro_custo_id: receberModal.centro_custo_id,
        contato_id: receberModal.contato_id,
        conta_pr_id: receberModal.id,
      })
      if (lancErr) throw lancErr

      const conta = contasBancarias.find(cb => cb.id === receberForm.conta_bancaria_id)
      if (conta) {
        await supabase.from('contas_bancarias').update({
          saldo_atual: (conta.saldo_atual ?? 0) + valorRecebido,
        }).eq('id', conta.id)
      }

      toast.success('Recebimento registrado com sucesso.')
      setReceberModal(null)
      fetchContas()
      ctxReload()
    } catch (e: unknown) {
      toast.error('Erro ao registrar recebimento', { description: (e as Error).message })
    } finally {
      setSavingReceber(false)
    }
  }

  async function handleCancel(c: ContaPR) {
    const { error } = await supabase.from('contas_pr').update({ status: 'cancelado' }).eq('id', c.id)
    if (error) {
      toast.error('Erro ao cancelar')
    } else {
      toast.success('Conta cancelada.')
      fetchContas()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('contas_pr').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Conta excluída.')
      setDeleteTarget(null)
      fetchContas()
    } catch (e: unknown) {
      toast.error('Erro ao excluir', { description: (e as Error).message })
    } finally {
      setDeleting(false)
    }
  }

  const catReceita = categorias.filter(c => c.tipo === 'receita')

  if (loading) return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-32" /></div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-heading-lg text-t1">Contas a Receber</h1>
          <p className="text-sm text-t3 mt-0.5">{contas.filter(c => c.status !== 'cancelado').length} conta(s) ativa(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus size={15} /> Nova Conta</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <Input className="pl-9 h-9 text-sm" placeholder="Buscar por descrição..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="pago">Recebido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="h-9 w-36 text-sm" value={dataDeFilter} onChange={e => setDataDeFilter(e.target.value)} />
        <Input type="date" className="h-9 w-36 text-sm" value={dataAteFilter} onChange={e => setDataAteFilter(e.target.value)} />
        {(search || statusFilter !== 'todos' || dataDeFilter || dataAteFilter) && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-t3" onClick={() => { setSearch(''); setStatusFilter('todos'); setDataDeFilter(''); setDataAteFilter('') }}>
            <X size={13} /> Limpar
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={ArrowUpCircle} title="Nenhuma conta encontrada" compact />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Descrição</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Vencimento</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Valor Total</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Recebido</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Contato</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Categoria</th>
                    <th className="py-3 px-4 w-44" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const contato = contatos.find(ct => ct.id === c.contato_id)
                    const categoria = catReceita.find(cat => cat.id === c.categoria_id)
                    return (
                      <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-raised)] transition-colors duration-100">
                        <td className="py-3 px-4 font-medium text-t1 max-w-[180px] truncate">{c.descricao}</td>
                        <td className="py-3 px-4 text-t2 whitespace-nowrap">{formatDate(c.data_vencimento)}</td>
                        <td className="py-3 px-4 text-right text-t1 tabular font-medium">{formatCurrency(c.valor_total)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 tabular">{formatCurrency(c.valor_pago)}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs border ${statusColors[c.status]}`}>{statusLabels[c.status]}</Badge>
                        </td>
                        <td className="py-3 px-4 text-t2 truncate max-w-[120px]">{contato?.nome ?? '—'}</td>
                        <td className="py-3 px-4 text-t2 truncate max-w-[120px]">{categoria?.nome ?? '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 justify-end">
                            {(c.status === 'aberto' || c.status === 'vencido') && (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => openReceber(c)}>
                                <CheckCircle2 size={12} /> Receber
                              </Button>
                            )}
                            {c.status !== 'pago' && c.status !== 'cancelado' && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                                <Pencil size={12} />
                              </Button>
                            )}
                            {(c.status === 'aberto' || c.status === 'vencido') && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-t3 hover:text-red-500" onClick={() => handleCancel(c)}>
                                <X size={12} />
                              </Button>
                            )}
                            {c.status === 'cancelado' && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(c)}>
                                <Trash2 size={12} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Venda de soja" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor Total *</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Vencimento *</Label>
                <Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoria_id} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar categoria..." /></SelectTrigger>
                <SelectContent>
                  {catReceita.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Centro de Custo</Label>
              <Select value={form.centro_custo_id} onValueChange={v => setForm(f => ({ ...f, centro_custo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar centro..." /></SelectTrigger>
                <SelectContent>
                  {centrosCusto.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Select value={form.contato_id} onValueChange={v => setForm(f => ({ ...f, contato_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar contato..." /></SelectTrigger>
                <SelectContent>
                  {contatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receber Modal */}
      <Dialog open={!!receberModal} onOpenChange={open => !open && setReceberModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>
          {receberModal && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-[var(--surface-raised)] text-sm">
                <p className="font-medium text-t1">{receberModal.descricao}</p>
                <p className="text-t3 mt-0.5">Valor restante: <span className="text-emerald-600 font-medium">{formatCurrency(receberModal.valor_total - receberModal.valor_pago)}</span></p>
              </div>
              <div className="space-y-1.5">
                <Label>Data de Recebimento</Label>
                <Input type="date" value={receberForm.data_pagamento} onChange={e => setReceberForm(f => ({ ...f, data_pagamento: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Conta Bancária *</Label>
                <Select value={receberForm.conta_bancaria_id} onValueChange={v => setReceberForm(f => ({ ...f, conta_bancaria_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                  <SelectContent>
                    {contasBancarias.filter(cb => cb.ativa).map(cb => (
                      <SelectItem key={cb.id} value={cb.id}>
                        {cb.nome} — {formatCurrency(cb.saldo_atual)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor Recebido *</Label>
                <Input type="number" step="0.01" value={receberForm.valor_pago} onChange={e => setReceberForm(f => ({ ...f, valor_pago: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleReceber} disabled={savingReceber} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {savingReceber && <Loader2 size={14} className="animate-spin" />} Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Conta</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir <strong>{deleteTarget?.descricao}</strong>? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 size={14} className="animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

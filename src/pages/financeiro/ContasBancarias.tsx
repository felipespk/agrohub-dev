import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { useFinanceiro, ContaBancaria } from '@/contexts/FinanceiroContext'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
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
import { Loader2, Plus, Pencil, Trash2, DollarSign, Landmark } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

const tipoLabels: Record<string, string> = {
  corrente: 'Conta Corrente', poupanca: 'Poupança', investimento: 'Investimento',
}
const tipoColors: Record<string, string> = {
  corrente: 'bg-blue-50 text-blue-600 border-blue-100',
  poupanca: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  investimento: 'bg-purple-50 text-purple-600 border-purple-100',
}

const EMPTY_FORM = {
  nome: '', banco: '', agencia: '', conta: '',
  tipo: 'corrente' as 'corrente' | 'poupanca' | 'investimento',
  saldo_atual: '0', ativa: true,
}

export function ContasBancarias() {
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()
  const { contasBancarias, loading, reload } = useFinanceiro()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<ContaBancaria | null>(null)
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [saving, setSaving]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContaBancaria | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const totalSaldo = contasBancarias.filter(c => c.ativa).reduce((s, c) => s + (c.saldo_atual ?? 0), 0)
  const countedSaldo = useCountUp(totalSaldo)

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  function openEdit(c: ContaBancaria) {
    setEditing(c)
    setForm({
      nome: c.nome, banco: c.banco ?? '', agencia: c.agencia ?? '', conta: c.conta ?? '',
      tipo: c.tipo as typeof EMPTY_FORM.tipo, saldo_atual: String(c.saldo_atual), ativa: c.ativa,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.tipo) {
      toast.error('Campos obrigatórios', { description: 'Preencha o nome e tipo da conta.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        nome: form.nome.trim(),
        banco: form.banco.trim() || null,
        agencia: form.agencia.trim() || null,
        conta: form.conta.trim() || null,
        tipo: form.tipo,
        saldo_atual: parseFloat(form.saldo_atual) || 0,
        ativa: form.ativa,
      }
      if (editing) {
        const { error } = await supabase.from('contas_bancarias').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Conta atualizada com sucesso.')
      } else {
        const { error } = await supabase.from('contas_bancarias').insert(payload)
        if (error) throw error
        toast.success('Conta criada com sucesso.')
      }
      setShowModal(false)
      reload()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleToggleAtiva(c: ContaBancaria) {
    const { error } = await supabase.from('contas_bancarias').update({ ativa: !c.ativa }).eq('id', c.id)
    if (error) {
      toast.error('Erro ao atualizar')
    } else {
      reload()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      // Check if any lancamentos reference this account
      const { count } = await supabase
        .from('lancamentos').select('*', { count: 'exact', head: true })
        .or(`conta_bancaria_id.eq.${deleteTarget.id},conta_destino_id.eq.${deleteTarget.id}`)
      if (count && count > 0) {
        toast.error('Conta possui lançamentos', { description: 'Não é possível excluir uma conta com lançamentos vinculados.' })
        setDeleting(false); return
      }
      const { error } = await supabase.from('contas_bancarias').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Conta excluída.')
      setDeleteTarget(null)
      reload()
    } catch (e: unknown) {
      toast.error('Erro ao excluir', { description: (e as Error).message })
    } finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-32" /></div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-heading-lg text-t1">Contas Bancárias</h1>
          <p className="text-sm text-t3 mt-0.5">{contasBancarias.filter(c => c.ativa).length} conta(s) ativa(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus size={15} /> Nova Conta</Button>
      </div>

      {/* Total KPI */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-t3 uppercase tracking-wider mb-1">Saldo Total (Contas Ativas)</p>
              <p className="t-display-sm tabular text-emerald-600">{formatCurrency(countedSaldo)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign size={18} className="text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Grid */}
      {contasBancarias.length === 0 ? (
        <EmptyState icon={Landmark} title="Nenhuma conta bancária cadastrada" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contasBancarias.map(c => (
            <Card key={c.id} className={`relative overflow-hidden transition-all duration-200 ${!c.ativa ? 'opacity-60' : ''}`}>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" />
              <CardContent className="p-5 pl-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-t1">{c.nome}</h3>
                    {c.banco && <p className="text-xs text-t3 mt-0.5">{c.banco}{c.agencia ? ` · Ag. ${c.agencia}` : ''}{c.conta ? ` · ${c.conta}` : ''}</p>}
                  </div>
                  <Badge className={`text-xs border ${tipoColors[c.tipo]}`}>{tipoLabels[c.tipo]}</Badge>
                </div>
                <p className={`text-2xl font-bold tabular mb-4 ${c.saldo_atual >= 0 ? 'text-t1' : 'text-red-600'}`}>
                  {formatCurrency(c.saldo_atual)}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAtiva(c)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${c.ativa ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.ativa ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-xs text-t3">{c.ativa ? 'Ativa' : 'Inativa'}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}><Pencil size={12} /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteTarget(c)}><Trash2 size={12} /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta Bancária'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Banco do Brasil" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Banco</Label>
                <Input placeholder="Ex: Bradesco" value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as typeof form.tipo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Agência</Label>
                <Input placeholder="0000-0" value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Número da Conta</Label>
                <Input placeholder="00000-0" value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? 'Saldo Atual' : 'Saldo Inicial'}</Label>
              <Input type="number" step="0.01" value={form.saldo_atual} onChange={e => setForm(f => ({ ...f, saldo_atual: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm(f => ({ ...f, ativa: !f.ativa }))}
                className={`relative w-9 h-5 rounded-full transition-colors ${form.ativa ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ativa ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <Label className="cursor-pointer" onClick={() => setForm(f => ({ ...f, ativa: !f.ativa }))}>
                Conta {form.ativa ? 'Ativa' : 'Inativa'}
              </Label>
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

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Conta</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Não é possível excluir contas com lançamentos vinculados.</p>
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

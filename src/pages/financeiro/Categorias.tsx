import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { useFinanceiro, CategoriaFinanceira } from '@/contexts/FinanceiroContext'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

const grupoTipos: { tipo: CategoriaFinanceira['tipo']; label: string; color: string }[] = [
  { tipo: 'receita', label: 'Receita', color: 'text-emerald-600' },
  { tipo: 'despesa', label: 'Despesa', color: 'text-red-600' },
  { tipo: 'investimento', label: 'Investimento', color: 'text-purple-600' },
]

const EMPTY_FORM = { nome: '', tipo: 'despesa' as CategoriaFinanceira['tipo'] }

export function Categorias() {
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()
  const { categorias, loading, reload } = useFinanceiro()

  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<CategoriaFinanceira | null>(null)
  const [form, setForm]               = useState({ ...EMPTY_FORM })
  const [saving, setSaving]           = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CategoriaFinanceira | null>(null)
  const [deleting, setDeleting]       = useState(false)

  function openCreate(tipo?: CategoriaFinanceira['tipo']) {
    setEditing(null)
    setForm({ nome: '', tipo: tipo ?? 'despesa' })
    setShowModal(true)
  }

  function openEdit(c: CategoriaFinanceira) {
    setEditing(c)
    setForm({ nome: c.nome, tipo: c.tipo })
    setShowModal(true)
  }

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Modo de impersonação ativo.' })
      return
    }
    if (!form.nome.trim()) {
      toast.error('Nome obrigatório'); return
    }
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('categorias_financeiras').update({ nome: form.nome.trim(), tipo: form.tipo }).eq('id', editing.id)
        if (error) throw error
        toast.success('Categoria atualizada.')
      } else {
        const { error } = await supabase.from('categorias_financeiras').insert({ user_id: userId, nome: form.nome.trim(), tipo: form.tipo })
        if (error) throw error
        toast.success('Categoria criada.')
      }
      setShowModal(false); reload()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Modo de impersonação ativo.' })
      return
    }
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('categorias_financeiras').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Categoria excluída.')
      setDeleteTarget(null); reload()
    } catch (e: unknown) {
      toast.error('Erro ao excluir', { description: (e as Error).message })
    } finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-32" /></div>
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-heading-lg text-t1">Categorias</h1>
          <p className="text-sm text-t3 mt-0.5">{categorias.length} categoria(s) cadastrada(s)</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2"><Plus size={15} /> Nova Categoria</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {grupoTipos.map(({ tipo, label, color }) => {
          const items = categorias.filter(c => c.tipo === tipo)
          return (
            <Card key={tipo}>
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-sm font-semibold ${color}`}>{label}</CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openCreate(tipo)}><Plus size={13} /></Button>
                </div>
                <p className="text-xs text-t3">{items.length} categoria(s)</p>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {items.length === 0 ? (
                  <EmptyState icon={Tag} title="Nenhuma categoria cadastrada" compact />
                ) : (
                  <div className="space-y-1">
                    {items.map(c => (
                      <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[var(--surface-raised)] group">
                        <span className="text-sm text-t1">{c.nome}</span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(c)}><Pencil size={11} /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => setDeleteTarget(c)}><Trash2 size={11} /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Combustível" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as typeof form.tipo }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="investimento">Investimento</SelectItem>
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

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Categoria</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>?</p>
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

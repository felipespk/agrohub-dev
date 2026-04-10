import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { useFinanceiro, CentroCusto } from '@/contexts/FinanceiroContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2, Layers } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

const PRESET_COLORS = [
  '#f97316', '#22c55e', '#eab308', '#6366f1',
  '#ec4899', '#06b6d4', '#3b82f6', '#111110',
]

const EMPTY_FORM = { nome: '', cor: '#22c55e', ativo: true }

export function CentrosCusto() {
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()
  const { centrosCusto, loading, reload } = useFinanceiro()

  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<CentroCusto | null>(null)
  const [form, setForm]               = useState({ ...EMPTY_FORM })
  const [saving, setSaving]           = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CentroCusto | null>(null)
  const [deleting, setDeleting]       = useState(false)

  function openCreate() {
    setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true)
  }

  function openEdit(c: CentroCusto) {
    setEditing(c)
    setForm({ nome: c.nome, cor: c.cor, ativo: c.ativo })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast.error('Nome obrigatório'); return
    }
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('centros_custo').update({ nome: form.nome.trim(), cor: form.cor, ativo: form.ativo }).eq('id', editing.id)
        if (error) throw error
        toast.success('Centro de custo atualizado.')
      } else {
        const { error } = await supabase.from('centros_custo').insert({ user_id: userId, nome: form.nome.trim(), cor: form.cor, ativo: form.ativo })
        if (error) throw error
        toast.success('Centro de custo criado.')
      }
      setShowModal(false); reload()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleToggleAtivo(c: CentroCusto) {
    const { error } = await supabase.from('centros_custo').update({ ativo: !c.ativo }).eq('id', c.id)
    if (error) toast.error('Erro ao atualizar')
    else reload()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('centros_custo').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Centro de custo excluído.')
      setDeleteTarget(null); reload()
    } catch (e: unknown) {
      toast.error('Erro ao excluir', { description: (e as Error).message })
    } finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-32" /></div>
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-heading-lg text-t1">Centros de Custo</h1>
          <p className="text-sm text-t3 mt-0.5">{centrosCusto.filter(c => c.ativo).length} ativo(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus size={15} /> Novo Centro</Button>
      </div>

      {centrosCusto.length === 0 ? (
        <EmptyState icon={Layers} title="Nenhum centro de custo cadastrado" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centrosCusto.map(c => (
            <Card key={c.id} className={`relative overflow-hidden transition-all ${!c.ativo ? 'opacity-60' : ''}`}>
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: c.cor }} />
              <CardContent className="p-5 pl-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                    <h3 className="font-semibold text-t1">{c.nome}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}><Pencil size={12} /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteTarget(c)}><Trash2 size={12} /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAtivo(c)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${c.ativo ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.ativo ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-xs text-t3">{c.ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Lavoura" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm(f => ({ ...f, cor: color }))}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                      form.cor === color ? 'border-[var(--t1)] scale-110' : 'border-transparent'
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                className={`relative w-9 h-5 rounded-full transition-colors ${form.ativo ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ativo ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <Label>{form.ativo ? 'Ativo' : 'Inativo'}</Label>
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
          <DialogHeader><DialogTitle>Excluir Centro de Custo</DialogTitle></DialogHeader>
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

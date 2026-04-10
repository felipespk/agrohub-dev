import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Dna } from 'lucide-react'
import { supabase, Raca } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface RacaWithCount extends Raca {
  count: number
}

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-3 items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GadoRacas() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [racas, setRacas] = useState<RacaWithCount[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRaca, setEditingRaca] = useState<Raca | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [racasRes, animaisRes] = await Promise.all([
        supabase.from('racas').select('*').eq('user_id', userId).order('nome'),
        supabase.from('animais').select('raca_id').eq('user_id', userId),
      ])

      const animais = animaisRes.data ?? []
      const countMap: Record<string, number> = {}
      for (const a of animais) {
        if (a.raca_id) countMap[a.raca_id] = (countMap[a.raca_id] ?? 0) + 1
      }

      setRacas((racasRes.data ?? []).map(r => ({ ...r, count: countMap[r.id] ?? 0 })))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditingRaca(null)
    setNome('')
    setDialogOpen(true)
  }

  function openEdit(r: Raca) {
    setEditingRaca(r)
    setNome(r.nome)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!nome.trim()) {
      toast.error('Nome obrigatório')
      return
    }
    setSaving(true)
    try {
      if (editingRaca) {
        const { error } = await supabase.from('racas').update({ nome: nome.trim() }).eq('id', editingRaca.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('racas').insert({ user_id: session!.user.id, nome: nome.trim() })
        if (error) throw error
      }
      toast.success(editingRaca ? 'Raça atualizada!' : 'Raça criada!')
      setDialogOpen(false)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    const raca = racas.find(r => r.id === id)
    if (raca && raca.count > 0) {
      toast.error('Raça em uso', { description: `${raca.count} animal(is) usam esta raça. Remova a raça dos animais antes de excluí-la.` })
      setConfirmDeleteId(null)
      return
    }
    const { error } = await supabase.from('racas').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir', { description: error.message })
    } else {
      toast.success('Raça excluída')
      setRacas(prev => prev.filter(r => r.id !== id))
    }
    setConfirmDeleteId(null)
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Raças</h1>
          <p className="text-sm text-t3">{racas.length} raça(s) cadastrada(s)</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus size={14} />
          Nova Raça
        </Button>
      </div>

      <div className="rounded-xl glass-card overflow-hidden">
        {racas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center animate-float">
              <Dna size={20} className="text-t4" />
            </div>
            <p className="text-sm text-t3">Nenhuma raça cadastrada</p>
            <Button variant="outline" size="sm" onClick={openNew}><Plus size={13} className="mr-1.5" /> Criar raça</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-t3">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-t3">Animais</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {racas.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-3 font-medium text-t1">{r.nome}</td>
                  <td className="px-4 py-3 text-t3 tabular-nums">{r.count} animal(is)</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Editar"
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded-md text-t3 hover:text-t1 hover:bg-[var(--surface-overlay)] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        title="Excluir"
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="p-1.5 rounded-md text-t3 hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{editingRaca ? 'Editar Raça' : 'Nova Raça'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Nelore, Angus..."
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-t2">Tem certeza que deseja excluir esta raça?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

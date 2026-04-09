import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, MapPin, ArrowRight } from 'lucide-react'
import { supabase, Pasto, Animal } from '@/lib/supabase'
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNumber } from '@/lib/utils'

interface PastoWithStats extends Pasto {
  count: number
  pesoMedio: number | null
}

function GridSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function OccupationBar({ count, capacity }: { count: number; capacity: number | null }) {
  if (!capacity) return <p className="text-xs text-t3">Sem capacidade definida</p>
  const pct = Math.min((count / capacity) * 100, 100)
  const color = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-400'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-t3">Ocupação</span>
        <span className="text-xs font-medium text-t2 tabular-nums">{count} / {capacity}</span>
      </div>
      <div className="h-1.5 bg-[var(--surface-overlay)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-t3 mt-0.5">{pct.toFixed(0)}% ocupado</p>
    </div>
  )
}

export function GadoPastos() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pastos, setPastos] = useState<PastoWithStats[]>([])
  const [animaisByPasto, setAnimaisByPasto] = useState<Record<string, Animal[]>>({})

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPasto, setEditingPasto] = useState<Pasto | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [moverOpen, setMoverOpen] = useState(false)
  const [moverOrigemId, setMoverOrigemId] = useState('')
  const [moverDestinoId, setMoverDestinoId] = useState('')
  const [moverAnimalIds, setMoverAnimalIds] = useState<string[]>([])

  const [form, setForm] = useState({ nome: '', area_hectares: '', capacidade_cabecas: '' })

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [pastosRes, animaisRes] = await Promise.all([
        supabase.from('pastos').select('*').eq('user_id', userId).order('nome'),
        supabase.from('animais').select('*').eq('user_id', userId).eq('status', 'ativo'),
      ])

      const animaisList: Animal[] = animaisRes.data ?? []
      const byPasto: Record<string, Animal[]> = {}
      for (const a of animaisList) {
        if (a.pasto_id) {
          if (!byPasto[a.pasto_id]) byPasto[a.pasto_id] = []
          byPasto[a.pasto_id].push(a)
        }
      }
      setAnimaisByPasto(byPasto)

      const pastosWithStats: PastoWithStats[] = (pastosRes.data ?? []).map(p => {
        const animaisNoPasto = byPasto[p.id] ?? []
        const withWeight = animaisNoPasto.filter(a => a.peso_atual)
        const pesoMedio = withWeight.length > 0
          ? withWeight.reduce((s, a) => s + (a.peso_atual ?? 0), 0) / withWeight.length
          : null
        return { ...p, count: animaisNoPasto.length, pesoMedio }
      })

      setPastos(pastosWithStats)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditingPasto(null)
    setForm({ nome: '', area_hectares: '', capacidade_cabecas: '' })
    setDialogOpen(true)
  }

  function openEdit(p: Pasto) {
    setEditingPasto(p)
    setForm({
      nome: p.nome,
      area_hectares: p.area_hectares?.toString() ?? '',
      capacidade_cabecas: p.capacidade_cabecas?.toString() ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!form.nome.trim()) {
      toast.error('Nome obrigatório')
      return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      const payload = {
        user_id: uid,
        nome: form.nome.trim(),
        area_hectares: form.area_hectares ? parseFloat(form.area_hectares) : null,
        capacidade_cabecas: form.capacidade_cabecas ? parseInt(form.capacidade_cabecas) : null,
      }
      if (editingPasto) {
        const { error } = await supabase.from('pastos').update(payload).eq('id', editingPasto.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('pastos').insert(payload)
        if (error) throw error
      }
      toast.success(editingPasto ? 'Pasto atualizado!' : 'Pasto criado!')
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
    const { error } = await supabase.from('pastos').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir', { description: error.message })
    } else {
      toast.success('Pasto excluído')
      setPastos(prev => prev.filter(p => p.id !== id))
    }
    setConfirmDeleteId(null)
  }

  function openMover(pastoId: string) {
    setMoverOrigemId(pastoId)
    setMoverDestinoId('')
    setMoverAnimalIds([])
    setMoverOpen(true)
  }

  async function handleMover() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!moverDestinoId || moverAnimalIds.length === 0) {
      toast.error('Selecione destino e animais')
      return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      for (const animalId of moverAnimalIds) {
        await supabase.from('animais').update({ pasto_id: moverDestinoId }).eq('id', animalId)
        await supabase.from('movimentacoes_gado').insert({
          user_id: uid,
          tipo: 'transferencia',
          animal_id: animalId,
          data: new Date().toISOString().split('T')[0],
          quantidade: 1,
          pasto_origem_id: moverOrigemId,
          pasto_destino_id: moverDestinoId,
        })
      }
      toast.success(`${moverAnimalIds.length} animal(is) movido(s)!`)
      setMoverOpen(false)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao mover', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <GridSkeleton />

  const animaisOrigem = moverOrigemId ? (animaisByPasto[moverOrigemId] ?? []) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Pastos</h1>
          <p className="text-sm text-t3">{pastos.length} pasto(s) cadastrado(s)</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus size={14} />
          Novo Pasto
        </Button>
      </div>

      {pastos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center animate-float">
            <MapPin size={20} className="text-t4" />
          </div>
          <p className="text-sm text-t3">Nenhum pasto cadastrado</p>
          <Button variant="outline" size="sm" onClick={openNew}><Plus size={13} className="mr-1.5" /> Criar pasto</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastos.map((p, i) => (
            <div
              key={p.id}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-elev-1 p-5 flex flex-col gap-4 animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-t1">{p.nome}</h3>
                  <div className="flex gap-3 mt-1">
                    {p.area_hectares != null && <span className="text-xs text-t3">{formatNumber(p.area_hectares, 1)} ha</span>}
                    <span className="text-xs text-t3">{p.count} cabeças</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button title="Editar" onClick={() => openEdit(p)} className="p-1.5 rounded-md text-t3 hover:text-t1 hover:bg-[var(--surface-raised)] transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button title="Excluir" onClick={() => setConfirmDeleteId(p.id)} className="p-1.5 rounded-md text-t3 hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <OccupationBar count={p.count} capacity={p.capacidade_cabecas} />

              {p.pesoMedio != null && (
                <div className="text-xs text-t3">
                  Peso médio: <span className="font-medium text-t2">{formatNumber(p.pesoMedio, 0)} kg</span>
                </div>
              )}

              {p.count > 0 && (
                <Button variant="outline" size="sm" className="gap-1.5 w-full mt-auto" onClick={() => openMover(p.id)}>
                  <ArrowRight size={13} />
                  Mover Animais
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPasto ? 'Editar Pasto' : 'Novo Pasto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Pasto Norte" />
            </div>
            <div className="space-y-1.5">
              <Label>Área (ha)</Label>
              <Input type="number" value={form.area_hectares} onChange={e => setForm(f => ({ ...f, area_hectares: e.target.value }))} placeholder="0.0" />
            </div>
            <div className="space-y-1.5">
              <Label>Capacidade (cabeças)</Label>
              <Input type="number" value={form.capacidade_cabecas} onChange={e => setForm(f => ({ ...f, capacidade_cabecas: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-t2">Tem certeza que deseja excluir este pasto?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mover Animais Dialog */}
      <Dialog open={moverOpen} onOpenChange={setMoverOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mover Animais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Pasto de Destino *</Label>
              <Select value={moverDestinoId} onValueChange={setMoverDestinoId}>
                <SelectTrigger><SelectValue placeholder="Selecione destino" /></SelectTrigger>
                <SelectContent>
                  {pastos.filter(p => p.id !== moverOrigemId).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{moverAnimalIds.length} selecionado(s)</Label>
                <div className="flex gap-2">
                  <button
                    className="text-xs text-t3 hover:text-t1"
                    onClick={() => setMoverAnimalIds(animaisOrigem.map(a => a.id))}
                  >
                    Todos
                  </button>
                  <button
                    className="text-xs text-t3 hover:text-t1"
                    onClick={() => setMoverAnimalIds([])}
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {animaisOrigem.length === 0 ? (
                  <p className="text-xs text-t3 text-center py-4">Nenhum animal neste pasto</p>
                ) : animaisOrigem.map(a => (
                  <label key={a.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-raised)] transition-colors">
                    <input
                      type="checkbox"
                      checked={moverAnimalIds.includes(a.id)}
                      onChange={e => setMoverAnimalIds(prev =>
                        e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                      )}
                      className="w-3.5 h-3.5 accent-[var(--primary)]"
                    />
                    <span className="text-sm text-t1">{a.brinco}</span>
                    <span className="text-xs text-t3 capitalize">{a.categoria}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoverOpen(false)}>Cancelar</Button>
            <Button onClick={handleMover} disabled={saving}>{saving ? 'Movendo...' : 'Mover'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

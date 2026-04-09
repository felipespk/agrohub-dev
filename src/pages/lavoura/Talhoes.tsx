import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, MapPin, Map, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface Talhao {
  id: string; nome: string; area_hectares: number | null; tipo_solo: string | null
  coordenadas: unknown; ativo: boolean; user_id: string; created_at: string
}

interface FormData {
  nome: string; area_hectares: string; tipo_solo: string; ativo: boolean
}

const EMPTY_FORM: FormData = { nome: '', area_hectares: '', tipo_solo: '', ativo: true }

function GridSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  )
}

export function Talhoes() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase.from('talhoes').select('*').eq('user_id', userId).order('nome')
      setTalhoes(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(t: Talhao) {
    setEditId(t.id)
    setForm({
      nome: t.nome,
      area_hectares: t.area_hectares != null ? String(t.area_hectares) : '',
      tipo_solo: t.tipo_solo ?? '',
      ativo: t.ativo,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Modo de impersonação ativo.' })
      return
    }
    if (!form.nome.trim()) {
      toast.error('Campo obrigatório', { description: 'Informe o nome do talhão.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        area_hectares: form.area_hectares ? parseFloat(form.area_hectares) : null,
        tipo_solo: form.tipo_solo || null,
        ativo: form.ativo,
      }
      if (editId) {
        const { error } = await supabase.from('talhoes').update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('talhoes').insert({ ...payload, user_id: session!.user.id })
        if (error) throw error
      }
      toast.success(editId ? 'Talhão atualizado!' : 'Talhão criado!')
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
      toast.error('Ação bloqueada', { description: 'Modo de impersonação ativo.' })
      return
    }
    const { count } = await supabase.from('safra_talhoes').select('id', { count: 'exact', head: true }).eq('talhao_id', id).eq('user_id', userId!)
    if ((count ?? 0) > 0) {
      toast.error('Não é possível excluir', { description: 'Este talhão está vinculado a uma ou mais safras.' })
      setConfirmDeleteId(null)
      return
    }
    const { error } = await supabase.from('talhoes').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir', { description: error.message })
    } else {
      toast.success('Talhão excluído.')
      loadData()
    }
    setConfirmDeleteId(null)
  }

  if (loading) return <GridSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Talhões</h1>
          <p className="text-sm text-t3">Gerencie os talhões e parcelas da sua fazenda</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Novo Talhão
        </Button>
      </div>

      {talhoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-float">
            <MapPin className="w-12 h-12 text-t3" />
          </div>
          <p className="text-sm text-t3">Nenhum talhão cadastrado</p>
          <Button size="sm" variant="outline" onClick={openCreate}>Cadastrar Talhão</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {talhoes.map((t, i) => (
            <div
              key={t.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-elev-1 animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary-bg)] flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[var(--primary-dark)]" />
                  </div>
                  <div>
                    <p className="font-medium text-t1 text-sm">{t.nome}</p>
                    {t.tipo_solo && <p className="text-xs text-t3">{t.tipo_solo}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {t.ativo ? (
                    <Badge className="bg-green-100 text-green-700 text-xs">Ativo</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-500 text-xs">Inativo</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-t2">
                    {t.area_hectares != null ? `${t.area_hectares} ha` : '–'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-t3">
                    {t.coordenadas ? (
                      <><Map className="w-3 h-3" /> Mapeado</>
                    ) : (
                      <><Map className="w-3 h-3" /> Sem mapa</>
                    )}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-md text-t3 hover:text-t1 hover:bg-[var(--surface-raised)] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(t.id)}
                    className="p-1.5 rounded-md text-t3 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Talhão' : 'Novo Talhão'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Talhão A1"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Área (ha)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.area_hectares}
                  onChange={e => setForm(f => ({ ...f, area_hectares: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Solo</Label>
                <Input
                  placeholder="Ex: Argiloso"
                  value={form.tipo_solo}
                  onChange={e => setForm(f => ({ ...f, tipo_solo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={form.ativo}
                onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <Label htmlFor="ativo" className="cursor-pointer">Talhão ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir este talhão? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

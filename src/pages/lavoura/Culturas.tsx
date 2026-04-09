import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Leaf } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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

interface Cultura {
  id: string; nome: string; unidade_colheita: string | null; ciclo_dias: number | null; user_id: string
}
interface Variedade { id: string; cultura_id: string; nome: string; user_id: string }

interface CulturaForm { nome: string; unidade_colheita: string; ciclo_dias: string }
const EMPTY_CULTURA: CulturaForm = { nome: '', unidade_colheita: '', ciclo_dias: '' }

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  )
}

export function Culturas() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [culturas, setCulturas] = useState<Cultura[]>([])
  const [variedades, setVariedades] = useState<Variedade[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CulturaForm>(EMPTY_CULTURA)
  const [newVariedades, setNewVariedades] = useState<Record<string, string>>({})
  const [confirmDeleteCultura, setConfirmDeleteCultura] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [c, v] = await Promise.all([
        supabase.from('culturas').select('*').eq('user_id', userId).order('nome'),
        supabase.from('variedades_cultura').select('*').eq('user_id', userId).order('nome'),
      ])
      setCulturas(c.data ?? [])
      setVariedades(v.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  async function handleSaveCultura() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('culturas').insert({
        user_id: session!.user.id,
        nome: form.nome.trim(),
        unidade_colheita: form.unidade_colheita || null,
        ciclo_dias: form.ciclo_dias ? parseInt(form.ciclo_dias) : null,
      })
      if (error) throw error
      toast.success('Cultura criada!')
      setDialogOpen(false); setForm(EMPTY_CULTURA); loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleDeleteCultura(id: string) {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    const { count } = await supabase.from('safra_talhoes').select('id', { count: 'exact', head: true }).eq('cultura_id', id).eq('user_id', userId!)
    if ((count ?? 0) > 0) {
      toast.error('Não é possível excluir', { description: 'Esta cultura está vinculada a uma ou mais safras.' })
      setConfirmDeleteCultura(null); return
    }
    await supabase.from('variedades_cultura').delete().eq('cultura_id', id)
    const { error } = await supabase.from('culturas').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir', { description: error.message })
    else { toast.success('Cultura excluída.'); loadData() }
    setConfirmDeleteCultura(null)
  }

  async function handleAddVariedade(culturaId: string) {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    const nome = newVariedades[culturaId]?.trim()
    if (!nome) return
    const { error } = await supabase.from('variedades_cultura').insert({ user_id: session!.user.id, cultura_id: culturaId, nome })
    if (error) toast.error('Erro ao salvar', { description: error.message })
    else {
      toast.success('Variedade adicionada!')
      setNewVariedades(p => ({ ...p, [culturaId]: '' })); loadData()
    }
  }

  async function handleDeleteVariedade(id: string) {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    const { error } = await supabase.from('variedades_cultura').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir', { description: error.message })
    else { toast.success('Variedade excluída.'); loadData() }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Culturas</h1>
          <p className="text-sm text-t3">Cadastro de culturas e variedades</p>
        </div>
        <Button size="sm" onClick={() => { setForm(EMPTY_CULTURA); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nova Cultura
        </Button>
      </div>

      {culturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-float"><Leaf className="w-12 h-12 text-t3" /></div>
          <p className="text-sm text-t3">Nenhuma cultura cadastrada</p>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>Cadastrar Cultura</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {culturas.map((c, i) => {
            const isExpanded = expandedId === c.id
            const vars = variedades.filter(v => v.cultura_id === c.id)
            return (
              <div
                key={c.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-hidden animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--surface-raised)] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-t3" /> : <ChevronRight className="w-4 h-4 text-t3" />}
                    <div>
                      <p className="font-medium text-t1">{c.nome}</p>
                      <p className="text-xs text-t3">
                        {[c.unidade_colheita, c.ciclo_dias ? `${c.ciclo_dias} dias` : null].filter(Boolean).join(' · ')}
                        {vars.length > 0 ? ` · ${vars.length} variedade${vars.length > 1 ? 's' : ''}` : ''}
                      </p>
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmDeleteCultura(c.id)}
                      className="p-1.5 rounded text-t3 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-[var(--border)] bg-[var(--surface-raised)]">
                    <p className="text-xs font-medium text-t2 mt-3 mb-2">Variedades</p>
                    {vars.length === 0 ? (
                      <p className="text-xs text-t3 mb-3">Nenhuma variedade cadastrada.</p>
                    ) : (
                      <div className="space-y-1 mb-3">
                        {vars.map(v => (
                          <div key={v.id} className="flex items-center justify-between py-1">
                            <span className="text-sm text-t1">{v.nome}</span>
                            <button
                              onClick={() => handleDeleteVariedade(v.id)}
                              className="p-1 rounded text-t3 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-sm"
                        placeholder="Nome da variedade"
                        value={newVariedades[c.id] ?? ''}
                        onChange={e => setNewVariedades(p => ({ ...p, [c.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddVariedade(c.id) }}
                      />
                      <Button size="sm" variant="outline" className="h-8" onClick={() => handleAddVariedade(c.id)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Cultura</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Soja, Milho, Trigo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unidade de Colheita</Label>
                <Input placeholder="Ex: sacas/ha, ton/ha" value={form.unidade_colheita} onChange={e => setForm(f => ({ ...f, unidade_colheita: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ciclo (dias)</Label>
                <Input type="number" placeholder="90" value={form.ciclo_dias} onChange={e => setForm(f => ({ ...f, ciclo_dias: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCultura} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteCultura} onOpenChange={() => setConfirmDeleteCultura(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir esta cultura e suas variedades?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteCultura(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteCultura && handleDeleteCultura(confirmDeleteCultura)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

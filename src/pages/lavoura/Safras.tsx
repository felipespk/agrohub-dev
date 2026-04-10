import { useEffect, useState, useCallback } from 'react'
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, Wheat, PlusCircle } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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
import { formatDate } from '@/lib/utils'

interface Safra {
  id: string; nome: string; data_inicio: string | null; data_fim: string | null
  status: 'planejamento' | 'andamento' | 'finalizada'; user_id: string; created_at: string
}
interface Talhao { id: string; nome: string; area_hectares: number | null }
interface Cultura { id: string; nome: string; unidade_colheita: string | null }
interface Variedade { id: string; cultura_id: string; nome: string }
interface SafraTalhao {
  id: string; safra_id: string; talhao_id: string; cultura_id: string; variedade_id: string | null
  data_plantio: string | null; data_colheita_prevista: string | null; meta_produtividade: number | null
}

const STATUS_COLORS: Record<string, string> = {
  planejamento: 'bg-gray-100 text-gray-700',
  andamento: 'bg-green-100 text-green-700',
  finalizada: 'bg-blue-100 text-blue-700',
}
const STATUS_LABELS: Record<string, string> = {
  planejamento: 'Planejamento', andamento: 'Em Andamento', finalizada: 'Finalizada',
}

interface SafraForm { nome: string; data_inicio: string; data_fim: string; status: string }
interface STForm {
  talhao_id: string; cultura_id: string; variedade_id: string
  data_plantio: string; data_colheita_prevista: string; meta_produtividade: string
}
const EMPTY_SAFRA: SafraForm = { nome: '', data_inicio: '', data_fim: '', status: 'planejamento' }
const EMPTY_ST: STForm = { talhao_id: '', cultura_id: '', variedade_id: '', data_plantio: '', data_colheita_prevista: '', meta_produtividade: '' }

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="rounded-xl glass-card overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Safras() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [safras, setSafras] = useState<Safra[]>([])
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [culturas, setCulturas] = useState<Cultura[]>([])
  const [variedades, setVariedades] = useState<Variedade[]>([])
  const [safTalhoes, setSafTalhoes] = useState<SafraTalhao[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteStId, setDeleteStId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<SafraForm>(EMPTY_SAFRA)

  const [stDialogOpen, setStDialogOpen] = useState(false)
  const [stSafraId, setStSafraId] = useState<string | null>(null)
  const [stForm, setStForm] = useState<STForm>(EMPTY_ST)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [s, t, c, v, st] = await Promise.all([
        supabase.from('safras').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('talhoes').select('*').eq('user_id', userId).eq('ativo', true).order('nome'),
        supabase.from('culturas').select('*').eq('user_id', userId).order('nome'),
        supabase.from('variedades_cultura').select('*').eq('user_id', userId).order('nome'),
        supabase.from('safra_talhoes').select('*').eq('user_id', userId),
      ])
      setSafras(s.data ?? [])
      setTalhoes(t.data ?? [])
      setCulturas(c.data ?? [])
      setVariedades(v.data ?? [])
      setSafTalhoes(st.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() { setEditId(null); setForm(EMPTY_SAFRA); setDialogOpen(true) }
  function openEdit(s: Safra) {
    setEditId(s.id)
    setForm({ nome: s.nome, data_inicio: s.data_inicio ?? '', data_fim: s.data_fim ?? '', status: s.status })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        status: form.status as Safra['status'],
      }
      if (editId) {
        const { error } = await supabase.from('safras').update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('safras').insert({ ...payload, user_id: session!.user.id })
        if (error) throw error
      }
      toast.success(editId ? 'Safra atualizada!' : 'Safra criada!')
      setDialogOpen(false)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSafra(id: string) {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    const { error } = await supabase.from('safras').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir', { description: error.message })
    else { toast.success('Safra excluída.'); loadData() }
  }

  function openAddTalhao(safraId: string) { setStSafraId(safraId); setStForm(EMPTY_ST); setStDialogOpen(true) }

  const filteredVariedades = variedades.filter(v => v.cultura_id === stForm.cultura_id)

  async function handleSaveST() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!stForm.talhao_id || !stForm.cultura_id) {
      toast.error('Campos obrigatórios', { description: 'Selecione o talhão e a cultura.' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('safra_talhoes').insert({
        user_id: session!.user.id,
        safra_id: stSafraId,
        talhao_id: stForm.talhao_id,
        cultura_id: stForm.cultura_id,
        variedade_id: stForm.variedade_id || null,
        data_plantio: stForm.data_plantio || null,
        data_colheita_prevista: stForm.data_colheita_prevista || null,
        meta_produtividade: stForm.meta_produtividade ? parseFloat(stForm.meta_produtividade) : null,
      })
      if (error) throw error
      toast.success('Talhão adicionado à safra!')
      setStDialogOpen(false)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveST(id: string) {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    const { error } = await supabase.from('safra_talhoes').delete().eq('id', id)
    if (error) toast.error('Erro ao remover', { description: error.message })
    else { toast.success('Talhão removido da safra.'); loadData() }
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Safras</h1>
          <p className="text-sm text-t3">Planejamento e gestão de safras</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Nova Safra
        </Button>
      </div>

      {safras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-float"><Wheat className="w-12 h-12 text-t3" /></div>
          <p className="text-sm text-t3">Nenhuma safra cadastrada</p>
          <Button size="sm" variant="outline" onClick={openCreate}>Criar Safra</Button>
        </div>
      ) : (
        <div className="rounded-xl glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 w-8" />
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Início</th>
                <th className="text-left px-4 py-3">Fim</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Talhões</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {safras.map((s, i) => {
                const isExpanded = expandedId === s.id
                const linked = safTalhoes.filter(st => st.safra_id === s.id)
                return (
                  <>
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer animate-fade-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      <td className="px-4 py-3">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-t3" /> : <ChevronRight className="w-4 h-4 text-t3" />}
                      </td>
                      <td className="px-4 py-3 font-medium text-t1">{s.nome}</td>
                      <td className="px-4 py-3 text-t2">{s.data_inicio ? formatDate(s.data_inicio) : '–'}</td>
                      <td className="px-4 py-3 text-t2">{s.data_fim ? formatDate(s.data_fim) : '–'}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-t2">{linked.length}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded text-t3 hover:text-t1 hover:bg-[var(--surface-raised)] transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded text-t3 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${s.id}-exp`} className="bg-[var(--surface-raised)]">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-t2">Talhões vinculados</p>
                              <Button size="sm" variant="outline" onClick={() => openAddTalhao(s.id)}>
                                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Adicionar Talhão
                              </Button>
                            </div>
                            {linked.length === 0 ? (
                              <p className="text-xs text-t3">Nenhum talhão vinculado a esta safra.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-t3 font-medium border-b border-[var(--border)]">
                                    <th className="text-left py-1.5 pr-4">Talhão</th>
                                    <th className="text-left py-1.5 pr-4">Cultura</th>
                                    <th className="text-left py-1.5 pr-4">Variedade</th>
                                    <th className="text-left py-1.5 pr-4">Plantio</th>
                                    <th className="text-left py-1.5 pr-4">Colheita Prev.</th>
                                    <th className="text-left py-1.5 pr-4">Meta (sc/ha)</th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  {linked.map(st => {
                                    const t = talhoes.find(x => x.id === st.talhao_id)
                                    const c = culturas.find(x => x.id === st.cultura_id)
                                    const v = variedades.find(x => x.id === st.variedade_id)
                                    return (
                                      <tr key={st.id} className="border-b border-[var(--border)] last:border-0">
                                        <td className="py-1.5 pr-4 text-t1">{t?.nome ?? '–'}</td>
                                        <td className="py-1.5 pr-4 text-t2">{c?.nome ?? '–'}</td>
                                        <td className="py-1.5 pr-4 text-t2">{v?.nome ?? '–'}</td>
                                        <td className="py-1.5 pr-4 text-t2">{st.data_plantio ? formatDate(st.data_plantio) : '–'}</td>
                                        <td className="py-1.5 pr-4 text-t2">{st.data_colheita_prevista ? formatDate(st.data_colheita_prevista) : '–'}</td>
                                        <td className="py-1.5 pr-4 text-t2">{st.meta_produtividade ?? '–'}</td>
                                        <td className="py-1.5">
                                          <button onClick={() => setDeleteStId(st.id)} className="p-1 rounded text-t3 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Safra' : 'Nova Safra'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Soja 2024/25" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Início</Label>
                <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim</Label>
                <Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejamento">Planejamento</SelectItem>
                  <SelectItem value="andamento">Em Andamento</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { handleDeleteSafra(deleteId!); setDeleteId(null) }}
        title="Confirmar exclusão"
        description="Tem certeza que deseja excluir esta safra? Esta ação não pode ser desfeita."
      />

      <ConfirmDialog
        open={!!deleteStId}
        onClose={() => setDeleteStId(null)}
        onConfirm={() => { handleRemoveST(deleteStId!); setDeleteStId(null) }}
        title="Confirmar exclusão"
        description="Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."
      />

      <Dialog open={stDialogOpen} onOpenChange={setStDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar Talhão à Safra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Talhão *</Label>
                <Select value={stForm.talhao_id} onValueChange={v => setStForm(f => ({ ...f, talhao_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {talhoes.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cultura *</Label>
                <Select value={stForm.cultura_id} onValueChange={v => setStForm(f => ({ ...f, cultura_id: v, variedade_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {culturas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Variedade</Label>
              <Select value={stForm.variedade_id} onValueChange={v => setStForm(f => ({ ...f, variedade_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {filteredVariedades.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Plantio</Label>
                <Input type="date" value={stForm.data_plantio} onChange={e => setStForm(f => ({ ...f, data_plantio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Colheita Prevista</Label>
                <Input type="date" value={stForm.data_colheita_prevista} onChange={e => setStForm(f => ({ ...f, data_colheita_prevista: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Meta de Produtividade (sc/ha)</Label>
              <Input type="number" placeholder="0" value={stForm.meta_produtividade} onChange={e => setStForm(f => ({ ...f, meta_produtividade: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveST} disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

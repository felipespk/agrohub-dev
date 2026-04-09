import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Bug } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'

interface Safra { id: string; nome: string }
interface Talhao { id: string; nome: string }
interface SafraTalhao { id: string; safra_id: string; talhao_id: string }
interface OcorrenciaMip {
  id: string; safra_talhao_id: string; data: string; tipo: string; nome: string
  severidade: string; decisao: string | null; observacao: string | null
}

const SEV_COLORS: Record<string, string> = {
  baixo: 'bg-green-100 text-green-700',
  medio: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700',
  critico: 'bg-red-100 text-red-700',
}
const SEV_LABELS: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' }
const TIPO_COLORS: Record<string, string> = {
  praga: 'bg-orange-100 text-orange-700',
  doenca: 'bg-purple-100 text-purple-700',
  daninha: 'bg-yellow-100 text-yellow-700',
}
const TIPO_LABELS: Record<string, string> = { praga: 'Praga', doenca: 'Doença', daninha: 'Daninha' }
const DECISAO_LABELS: Record<string, string> = { monitorar: 'Monitorar', aplicar: 'Aplicar', nenhuma: 'Nenhuma' }

interface FormData {
  safra_id: string; safra_talhao_id: string; data: string
  tipo: string; nome: string; severidade: string; decisao: string; observacao: string
}
const EMPTY_FORM: FormData = {
  safra_id: '', safra_talhao_id: '', data: format(new Date(), 'yyyy-MM-dd'),
  tipo: 'praga', nome: '', severidade: 'medio', decisao: 'monitorar', observacao: '',
}

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-28" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="flex gap-2"><Skeleton className="h-9 w-40 rounded-md" /><Skeleton className="h-9 w-36 rounded-md" /><Skeleton className="h-9 w-36 rounded-md" /></div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Pragas() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaMip[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [safTalhoes, setSafTalhoes] = useState<SafraTalhao[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [filterSafra, setFilterSafra] = useState('todos')
  const [filterSev, setFilterSev] = useState('todos')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [o, s, t, st] = await Promise.all([
        supabase.from('ocorrencias_mip').select('*').eq('user_id', userId).order('data', { ascending: false }),
        supabase.from('safras').select('*').eq('user_id', userId).order('nome'),
        supabase.from('talhoes').select('*').eq('user_id', userId).order('nome'),
        supabase.from('safra_talhoes').select('*').eq('user_id', userId),
      ])
      setOcorrencias(o.data ?? [])
      setSafras(s.data ?? [])
      setTalhoes(t.data ?? [])
      setSafTalhoes(st.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const linkedSTs = form.safra_id ? safTalhoes.filter(st => st.safra_id === form.safra_id) : []

  function getTalhaoName(stId: string) {
    const st = safTalhoes.find(x => x.id === stId)
    return st ? talhoes.find(t => t.id === st.talhao_id)?.nome ?? '–' : '–'
  }

  const filtered = ocorrencias.filter(o => {
    if (filterSev !== 'todos' && o.severidade !== filterSev) return false
    if (filterTipo !== 'todos' && o.tipo !== filterTipo) return false
    if (filterSafra !== 'todos') {
      const st = safTalhoes.find(x => x.id === o.safra_talhao_id)
      if (!st || st.safra_id !== filterSafra) return false
    }
    return true
  })

  async function handleSave() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!form.safra_talhao_id || !form.tipo || !form.nome || !form.severidade) {
      toast.error('Campos obrigatórios', { description: 'Talhão, Tipo, Nome e Severidade são obrigatórios.' }); return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('ocorrencias_mip').insert({
        user_id: session!.user.id,
        safra_talhao_id: form.safra_talhao_id,
        data: form.data,
        tipo: form.tipo,
        nome: form.nome,
        severidade: form.severidade,
        decisao: form.decisao || null,
        observacao: form.observacao || null,
      })
      if (error) throw error
      toast.success('Ocorrência registrada!')
      setDialogOpen(false); setForm(EMPTY_FORM); loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    const { error } = await supabase.from('ocorrencias_mip').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir', { description: error.message })
    else { toast.success('Ocorrência excluída.'); loadData() }
    setConfirmDeleteId(null)
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Pragas / MIP</h1>
          <p className="text-sm text-t3">Monitoramento integrado de pragas, doenças e daninhas</p>
        </div>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nova Ocorrência
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterSafra} onValueChange={setFilterSafra}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todas as safras" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as safras</SelectItem>
            {safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSev} onValueChange={setFilterSev}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {['baixo', 'medio', 'alto', 'critico'].map(s => <SelectItem key={s} value={s}>{SEV_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {['praga', 'doenca', 'daninha'].map(t => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-float"><Bug className="w-12 h-12 text-t3" /></div>
          <p className="text-sm text-t3">Nenhuma ocorrência registrada</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Talhão</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Severidade</th>
                <th className="text-left px-4 py-3">Decisão</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr
                  key={o.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-4 py-3 text-t2">{formatDate(o.data)}</td>
                  <td className="px-4 py-3 font-medium text-t1">{getTalhaoName(o.safra_talhao_id)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${TIPO_COLORS[o.tipo] ?? ''}`}>{TIPO_LABELS[o.tipo] ?? o.tipo}</Badge>
                  </td>
                  <td className="px-4 py-3 text-t1">{o.nome}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {o.severidade === 'critico' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                      )}
                      <Badge className={`text-xs ${SEV_COLORS[o.severidade] ?? ''}`}>{SEV_LABELS[o.severidade] ?? o.severidade}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-t2">{o.decisao ? DECISAO_LABELS[o.decisao] ?? o.decisao : '–'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setConfirmDeleteId(o.id)} className="p-1.5 rounded text-t3 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nova Ocorrência MIP</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Safra</Label>
                <Select value={form.safra_id} onValueChange={v => setForm(f => ({ ...f, safra_id: v, safra_talhao_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Talhão *</Label>
                <Select value={form.safra_talhao_id} onValueChange={v => setForm(f => ({ ...f, safra_talhao_id: v }))} disabled={!form.safra_id}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {linkedSTs.map(st => {
                      const t = talhoes.find(x => x.id === st.talhao_id)
                      return <SelectItem key={st.id} value={st.id}>{t?.nome ?? st.talhao_id}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="praga">Praga</SelectItem>
                    <SelectItem value="doenca">Doença</SelectItem>
                    <SelectItem value="daninha">Daninha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severidade *</Label>
                <Select value={form.severidade} onValueChange={v => setForm(f => ({ ...f, severidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['baixo', 'medio', 'alto', 'critico'].map(s => <SelectItem key={s} value={s}>{SEV_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Lagarta-do-cartucho" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Decisão</Label>
              <Select value={form.decisao} onValueChange={v => setForm(f => ({ ...f, decisao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monitorar">Monitorar</SelectItem>
                  <SelectItem value="aplicar">Aplicar</SelectItem>
                  <SelectItem value="nenhuma">Nenhuma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input placeholder="Detalhes adicionais" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir esta ocorrência?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Tractor, Wrench, AlertCircle } from 'lucide-react'
import { format, parseISO, isBefore } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Maquina {
  id: string; nome: string; tipo: string; modelo: string | null; ano: number | null
  placa_chassi: string | null; valor_aquisicao: number | null; custo_hora: number | null; user_id: string
}
interface Manutencao {
  id: string; maquina_id: string; data: string; tipo: string; descricao: string | null
  custo: number | null; proxima_manutencao: string | null; user_id: string
}

const TIPO_MAQUINA_COLORS: Record<string, string> = {
  trator: 'bg-green-100 text-green-700', colheitadeira: 'bg-amber-100 text-amber-700',
  pulverizador: 'bg-orange-100 text-orange-700', plantadeira: 'bg-lime-100 text-lime-700',
  outro: 'bg-gray-100 text-gray-600',
}
const TIPO_MAQUINA_LABELS: Record<string, string> = {
  trator: 'Trator', colheitadeira: 'Colheitadeira', pulverizador: 'Pulverizador',
  plantadeira: 'Plantadeira', outro: 'Outro',
}
const TIPOS_MAQUINA = ['trator', 'colheitadeira', 'pulverizador', 'plantadeira', 'outro']
const TIPOS_MANUTENCAO = ['preventiva', 'corretiva']

interface MaqForm {
  nome: string; tipo: string; modelo: string; ano: string; placa_chassi: string
  valor_aquisicao: string; custo_hora: string
}
interface ManForm { maquina_id: string; data: string; tipo: string; descricao: string; custo: string; proxima_manutencao: string }

const EMPTY_MAQ: MaqForm = { nome: '', tipo: 'trator', modelo: '', ano: '', placa_chassi: '', valor_aquisicao: '', custo_hora: '' }
const EMPTY_MAN: ManForm = { maquina_id: '', data: format(new Date(), 'yyyy-MM-dd'), tipo: 'preventiva', descricao: '', custo: '', proxima_manutencao: '' }

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <Skeleton className="h-9 w-48 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    </div>
  )
}

export function Maquinas() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [maqDialog, setMaqDialog] = useState(false)
  const [editMaqId, setEditMaqId] = useState<string | null>(null)
  const [maqForm, setMaqForm] = useState<MaqForm>(EMPTY_MAQ)
  const [manDialog, setManDialog] = useState(false)
  const [manForm, setManForm] = useState<ManForm>(EMPTY_MAN)
  const [filterMaqId, setFilterMaqId] = useState('todos')
  const [confirmDeleteMaq, setConfirmDeleteMaq] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [m, man] = await Promise.all([
        supabase.from('maquinas').select('*').eq('user_id', userId).order('nome'),
        supabase.from('manutencoes').select('*').eq('user_id', userId).order('data', { ascending: false }),
      ])
      setMaquinas(m.data ?? [])
      setManutencoes(man.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function openCreateMaq() { setEditMaqId(null); setMaqForm(EMPTY_MAQ); setMaqDialog(true) }
  function openEditMaq(m: Maquina) {
    setEditMaqId(m.id)
    setMaqForm({
      nome: m.nome, tipo: m.tipo, modelo: m.modelo ?? '', ano: m.ano ? String(m.ano) : '',
      placa_chassi: m.placa_chassi ?? '', valor_aquisicao: m.valor_aquisicao ? String(m.valor_aquisicao) : '',
      custo_hora: m.custo_hora ? String(m.custo_hora) : '',
    })
    setMaqDialog(true)
  }

  async function handleSaveMaq() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!maqForm.nome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const payload = {
        nome: maqForm.nome.trim(), tipo: maqForm.tipo,
        modelo: maqForm.modelo || null, ano: maqForm.ano ? parseInt(maqForm.ano) : null,
        placa_chassi: maqForm.placa_chassi || null,
        valor_aquisicao: maqForm.valor_aquisicao ? parseFloat(maqForm.valor_aquisicao) : null,
        custo_hora: maqForm.custo_hora ? parseFloat(maqForm.custo_hora) : null,
      }
      if (editMaqId) {
        const { error } = await supabase.from('maquinas').update(payload).eq('id', editMaqId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('maquinas').insert({ ...payload, user_id: session!.user.id })
        if (error) throw error
      }
      toast.success(editMaqId ? 'Máquina atualizada!' : 'Máquina cadastrada!')
      setMaqDialog(false); loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleDeleteMaq(id: string) {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    const { error } = await supabase.from('maquinas').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir', { description: error.message })
    else { toast.success('Máquina excluída.'); loadData() }
    setConfirmDeleteMaq(null)
  }

  async function handleSaveMan() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!manForm.maquina_id || !manForm.data || !manForm.tipo) {
      toast.error('Campos obrigatórios', { description: 'Máquina, Data e Tipo são obrigatórios.' }); return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('manutencoes').insert({
        user_id: session!.user.id,
        maquina_id: manForm.maquina_id, data: manForm.data, tipo: manForm.tipo,
        descricao: manForm.descricao || null,
        custo: manForm.custo ? parseFloat(manForm.custo) : null,
        proxima_manutencao: manForm.proxima_manutencao || null,
      })
      if (error) throw error
      toast.success('Manutenção registrada!')
      setManDialog(false); loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  const filteredMan = filterMaqId === 'todos' ? manutencoes : manutencoes.filter(m => m.maquina_id === filterMaqId)
  const today = new Date()

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Máquinas</h1>
          <p className="text-sm text-t3">Gestão de máquinas e manutenções</p>
        </div>
      </div>

      <Tabs defaultValue="maquinas">
        <TabsList>
          <TabsTrigger value="maquinas">Máquinas</TabsTrigger>
          <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
        </TabsList>

        <TabsContent value="maquinas" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateMaq}>
              <Plus className="w-4 h-4 mr-1" /> Nova Máquina
            </Button>
          </div>
          {maquinas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-float"><Tractor className="w-12 h-12 text-t3" /></div>
              <p className="text-sm text-t3">Nenhuma máquina cadastrada</p>
              <Button size="sm" variant="outline" onClick={openCreateMaq}>Cadastrar Máquina</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {maquinas.map((m, i) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-elev-1 animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary-bg)] flex items-center justify-center">
                        <Tractor className="w-4 h-4 text-[var(--primary-dark)]" />
                      </div>
                      <div>
                        <p className="font-medium text-t1 text-sm">{m.nome}</p>
                        {m.modelo && <p className="text-xs text-t3">{m.modelo}{m.ano ? ` — ${m.ano}` : ''}</p>}
                      </div>
                    </div>
                    <Badge className={`text-xs ${TIPO_MAQUINA_COLORS[m.tipo] ?? ''}`}>{TIPO_MAQUINA_LABELS[m.tipo] ?? m.tipo}</Badge>
                  </div>
                  <div className="text-xs text-t3 space-y-0.5 mt-2">
                    {m.custo_hora != null && <p>Custo/hora: {formatCurrency(m.custo_hora)}</p>}
                    {m.valor_aquisicao != null && <p>Valor aquisição: {formatCurrency(m.valor_aquisicao)}</p>}
                    {m.placa_chassi && <p>Placa/Chassi: {m.placa_chassi}</p>}
                  </div>
                  <div className="flex gap-1 mt-3 justify-end">
                    <button onClick={() => openEditMaq(m)} className="p-1.5 rounded text-t3 hover:text-t1 hover:bg-[var(--surface-raised)] transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDeleteMaq(m.id)} className="p-1.5 rounded text-t3 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manutencoes" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Select value={filterMaqId} onValueChange={setFilterMaqId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Todas as máquinas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as máquinas</SelectItem>
                {maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setManForm(EMPTY_MAN); setManDialog(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Nova Manutenção
            </Button>
          </div>
          {filteredMan.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-float"><Wrench className="w-10 h-10 text-t3" /></div>
              <p className="text-sm text-t3">Nenhuma manutenção registrada</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3">Máquina</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Descrição</th>
                    <th className="text-left px-4 py-3">Custo</th>
                    <th className="text-left px-4 py-3">Próxima</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMan.map((man, i) => {
                    const maq = maquinas.find(x => x.id === man.maquina_id)
                    const overdue = man.proxima_manutencao && isBefore(parseISO(man.proxima_manutencao), today)
                    return (
                      <tr
                        key={man.id}
                        className={`border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors animate-fade-up ${overdue ? 'bg-red-50/50' : ''}`}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <td className="px-4 py-3 font-medium text-t1">{maq?.nome ?? '–'}</td>
                        <td className="px-4 py-3 text-t2">{formatDate(man.data)}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${man.tipo === 'preventiva' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {man.tipo === 'preventiva' ? 'Preventiva' : 'Corretiva'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-t2 max-w-[200px] truncate">{man.descricao ?? '–'}</td>
                        <td className="px-4 py-3 text-t2">{man.custo != null ? formatCurrency(man.custo) : '–'}</td>
                        <td className="px-4 py-3">
                          {man.proxima_manutencao ? (
                            <span className={`flex items-center gap-1 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-t2'}`}>
                              {overdue && <AlertCircle className="w-3.5 h-3.5" />}
                              {formatDate(man.proxima_manutencao)}
                            </span>
                          ) : '–'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={maqDialog} onOpenChange={setMaqDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editMaqId ? 'Editar Máquina' : 'Nova Máquina'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input placeholder="Ex: Trator John Deere" value={maqForm.nome} onChange={e => setMaqForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={maqForm.tipo} onValueChange={v => setMaqForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_MAQUINA.map(t => <SelectItem key={t} value={t}>{TIPO_MAQUINA_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input placeholder="Ex: 5078E" value={maqForm.modelo} onChange={e => setMaqForm(f => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input type="number" placeholder="2022" value={maqForm.ano} onChange={e => setMaqForm(f => ({ ...f, ano: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Placa / Chassi</Label>
              <Input placeholder="Ex: ABC-1234" value={maqForm.placa_chassi} onChange={e => setMaqForm(f => ({ ...f, placa_chassi: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor Aquisição (R$)</Label>
                <Input type="number" placeholder="0.00" value={maqForm.valor_aquisicao} onChange={e => setMaqForm(f => ({ ...f, valor_aquisicao: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Custo por Hora (R$)</Label>
                <Input type="number" placeholder="0.00" value={maqForm.custo_hora} onChange={e => setMaqForm(f => ({ ...f, custo_hora: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaqDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveMaq} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manDialog} onOpenChange={setManDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Máquina *</Label>
              <Select value={manForm.maquina_id} onValueChange={v => setManForm(f => ({ ...f, maquina_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>{maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={manForm.data} onChange={e => setManForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={manForm.tipo} onValueChange={v => setManForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_MANUTENCAO.map(t => <SelectItem key={t} value={t}>{t === 'preventiva' ? 'Preventiva' : 'Corretiva'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input placeholder="Detalhes da manutenção" value={manForm.descricao} onChange={e => setManForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Custo (R$)</Label>
                <Input type="number" placeholder="0.00" value={manForm.custo} onChange={e => setManForm(f => ({ ...f, custo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Próxima Manutenção</Label>
                <Input type="date" value={manForm.proxima_manutencao} onChange={e => setManForm(f => ({ ...f, proxima_manutencao: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveMan} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteMaq} onOpenChange={() => setConfirmDeleteMaq(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir esta máquina?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteMaq(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteMaq && handleDeleteMaq(confirmDeleteMaq)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

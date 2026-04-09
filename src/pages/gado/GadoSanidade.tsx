import { useEffect, useState, useCallback } from 'react'
import { Plus, Syringe, Pill } from 'lucide-react'
import { format } from 'date-fns'
import { supabase, Medicamento, AplicacaoSanitaria, Animal, Pasto } from '@/lib/supabase'
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

const TIPO_COLORS: Record<string, string> = {
  vacina: 'bg-blue-100 text-blue-700',
  vermifugo: 'bg-orange-100 text-orange-700',
  medicamento: 'bg-red-100 text-red-700',
  suplemento: 'bg-green-100 text-green-700',
}

const CATEGORIAS = ['vaca', 'touro', 'bezerro', 'bezerra', 'novilha', 'garrote', 'boi']

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--border)]">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

export function GadoSanidade() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [aplicacoes, setAplicacoes] = useState<AplicacaoSanitaria[]>([])
  const [animais, setAnimais] = useState<Animal[]>([])
  const [pastos, setPastos] = useState<Pasto[]>([])

  const [medDialogOpen, setMedDialogOpen] = useState(false)
  const [apDialogOpen, setApDialogOpen] = useState(false)
  const [loteDialogOpen, setLoteDialogOpen] = useState(false)

  const [medForm, setMedForm] = useState({
    nome: '', tipo: '', fabricante: '', carencia_dias: '0',
  })

  const [apForm, setApForm] = useState({
    animal_id: '', medicamento_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    dose: '', proxima_dose: '', observacao: '',
  })

  const [loteForm, setLoteForm] = useState({
    medicamento_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    dose: '', proxima_dose: '',
    filtro_pasto: 'todos',
    filtro_categoria: 'todos',
    animal_ids: [] as string[],
  })

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [medRes, apRes, animaisRes, pastosRes] = await Promise.all([
        supabase.from('medicamentos').select('*').eq('user_id', userId).order('nome'),
        supabase.from('aplicacoes_sanitarias').select('*').eq('user_id', userId).order('data', { ascending: false }),
        supabase.from('animais').select('*').eq('user_id', userId).eq('status', 'ativo').order('brinco'),
        supabase.from('pastos').select('*').eq('user_id', userId).order('nome'),
      ])
      setMedicamentos(medRes.data ?? [])
      setAplicacoes(apRes.data ?? [])
      setAnimais(animaisRes.data ?? [])
      setPastos(pastosRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  async function handleSaveMed() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!medForm.nome.trim()) {
      toast.error('Nome obrigatório')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('medicamentos').insert({
        user_id: session!.user.id,
        nome: medForm.nome.trim(),
        tipo: medForm.tipo || null,
        fabricante: medForm.fabricante || null,
        carencia_dias: parseInt(medForm.carencia_dias) || 0,
      })
      if (error) throw error
      toast.success('Medicamento cadastrado!')
      setMedDialogOpen(false)
      setMedForm({ nome: '', tipo: '', fabricante: '', carencia_dias: '0' })
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAp() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!apForm.animal_id || !apForm.medicamento_id || !apForm.data) {
      toast.error('Campos obrigatórios', { description: 'Preencha animal, medicamento e data.' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('aplicacoes_sanitarias').insert({
        user_id: session!.user.id,
        animal_id: apForm.animal_id,
        medicamento_id: apForm.medicamento_id,
        data: apForm.data,
        dose: apForm.dose || null,
        proxima_dose: apForm.proxima_dose || null,
        observacao: apForm.observacao || null,
      })
      if (error) throw error
      toast.success('Aplicação registrada!')
      setApDialogOpen(false)
      setApForm({ animal_id: '', medicamento_id: '', data: format(new Date(), 'yyyy-MM-dd'), dose: '', proxima_dose: '', observacao: '' })
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveLote() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!loteForm.medicamento_id || loteForm.animal_ids.length === 0) {
      toast.error('Selecione medicamento e animais')
      return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      const inserts = loteForm.animal_ids.map(aid => ({
        user_id: uid,
        animal_id: aid,
        medicamento_id: loteForm.medicamento_id,
        data: loteForm.data,
        dose: loteForm.dose || null,
        proxima_dose: loteForm.proxima_dose || null,
      }))
      const { error } = await supabase.from('aplicacoes_sanitarias').insert(inserts)
      if (error) throw error
      toast.success(`${loteForm.animal_ids.length} aplicação(ões) registrada(s)!`)
      setLoteDialogOpen(false)
      setLoteForm({
        medicamento_id: '', data: format(new Date(), 'yyyy-MM-dd'),
        dose: '', proxima_dose: '', filtro_pasto: 'todos', filtro_categoria: 'todos', animal_ids: [],
      })
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const animalMap = new Map(animais.map(a => [a.id, a]))
  const medMap = new Map(medicamentos.map(m => [m.id, m]))

  const animaisFiltradosLote = animais.filter(a => {
    if (loteForm.filtro_pasto !== 'todos' && a.pasto_id !== loteForm.filtro_pasto) return false
    if (loteForm.filtro_categoria !== 'todos' && a.categoria !== loteForm.filtro_categoria) return false
    return true
  })

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <TableSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-t1">Sanidade</h1>
        <p className="text-sm text-t3">Controle de medicamentos e aplicações sanitárias</p>
      </div>

      <Tabs defaultValue="medicamentos">
        <TabsList>
          <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
          <TabsTrigger value="aplicacoes">Aplicações</TabsTrigger>
        </TabsList>

        {/* Medicamentos Tab */}
        <TabsContent value="medicamentos" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setMedDialogOpen(true)} className="gap-1.5">
              <Plus size={14} />
              Novo Medicamento
            </Button>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-hidden">
            {medicamentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center animate-float">
                  <Pill size={20} className="text-t4" />
                </div>
                <p className="text-sm text-t3">Nenhum medicamento cadastrado</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Nome', 'Tipo', 'Fabricante', 'Carência (dias)'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {medicamentos.map((m, i) => (
                    <tr key={m.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-4 py-3 font-medium text-t1">{m.nome}</td>
                      <td className="px-4 py-3">
                        {m.tipo ? (
                          <Badge className={`${TIPO_COLORS[m.tipo] ?? 'bg-gray-100 text-gray-700'} border-0 text-xs capitalize`}>{m.tipo}</Badge>
                        ) : <span className="text-t3">—</span>}
                      </td>
                      <td className="px-4 py-3 text-t2">{m.fabricante ?? '—'}</td>
                      <td className="px-4 py-3 text-t2 tabular-nums">{m.carencia_dias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Aplicações Tab */}
        <TabsContent value="aplicacoes" className="space-y-4 mt-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLoteDialogOpen(true)} className="gap-1.5">
              <Syringe size={14} />
              Vacinação em Lote
            </Button>
            <Button onClick={() => setApDialogOpen(true)} className="gap-1.5">
              <Plus size={14} />
              Nova Aplicação
            </Button>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-hidden">
            {aplicacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center animate-float">
                  <Syringe size={20} className="text-t4" />
                </div>
                <p className="text-sm text-t3">Nenhuma aplicação registrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {['Data', 'Brinco', 'Medicamento', 'Dose', 'Próxima Dose', 'Observação'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aplicacoes.map((ap, i) => {
                      const animal = animalMap.get(ap.animal_id)
                      const med = medMap.get(ap.medicamento_id)
                      return (
                        <tr key={ap.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                          <td className="px-4 py-3 text-t2">{formatDate(ap.data)}</td>
                          <td className="px-4 py-3 font-medium text-t1">{animal?.brinco ?? '—'}</td>
                          <td className="px-4 py-3 text-t2">{med?.nome ?? '—'}</td>
                          <td className="px-4 py-3 text-t2">{ap.dose ?? '—'}</td>
                          <td className="px-4 py-3 text-t2">{ap.proxima_dose ? formatDate(ap.proxima_dose) : '—'}</td>
                          <td className="px-4 py-3 text-t3 text-xs">{ap.observacao ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Medicamento Dialog */}
      <Dialog open={medDialogOpen} onOpenChange={setMedDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Medicamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={medForm.nome} onChange={e => setMedForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Ivomec" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={medForm.tipo} onValueChange={v => setMedForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não informado</SelectItem>
                  <SelectItem value="vacina">Vacina</SelectItem>
                  <SelectItem value="vermifugo">Vermífugo</SelectItem>
                  <SelectItem value="medicamento">Medicamento</SelectItem>
                  <SelectItem value="suplemento">Suplemento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fabricante</Label>
              <Input value={medForm.fabricante} onChange={e => setMedForm(f => ({ ...f, fabricante: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Carência (dias)</Label>
              <Input type="number" value={medForm.carencia_dias} onChange={e => setMedForm(f => ({ ...f, carencia_dias: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMedDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMed} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova Aplicação Dialog */}
      <Dialog open={apDialogOpen} onOpenChange={setApDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Aplicação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Animal *</Label>
              <Select value={apForm.animal_id} onValueChange={v => setApForm(f => ({ ...f, animal_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {animais.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} ({a.categoria})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Medicamento *</Label>
              <Select value={apForm.medicamento_id} onValueChange={v => setApForm(f => ({ ...f, medicamento_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {medicamentos.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={apForm.data} onChange={e => setApForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Dose</Label>
              <Input value={apForm.dose} onChange={e => setApForm(f => ({ ...f, dose: e.target.value }))} placeholder="Ex: 5ml" />
            </div>
            <div className="space-y-1.5">
              <Label>Próxima Dose</Label>
              <Input type="date" value={apForm.proxima_dose} onChange={e => setApForm(f => ({ ...f, proxima_dose: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input value={apForm.observacao} onChange={e => setApForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAp} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vacinação em Lote Dialog */}
      <Dialog open={loteDialogOpen} onOpenChange={setLoteDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vacinação em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Medicamento *</Label>
              <Select value={loteForm.medicamento_id} onValueChange={v => setLoteForm(f => ({ ...f, medicamento_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {medicamentos.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={loteForm.data} onChange={e => setLoteForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Dose</Label>
                <Input value={loteForm.dose} onChange={e => setLoteForm(f => ({ ...f, dose: e.target.value }))} placeholder="Ex: 5ml" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Próxima Dose</Label>
              <Input type="date" value={loteForm.proxima_dose} onChange={e => setLoteForm(f => ({ ...f, proxima_dose: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Filtrar por Pasto</Label>
                <Select value={loteForm.filtro_pasto} onValueChange={v => setLoteForm(f => ({ ...f, filtro_pasto: v, animal_ids: [] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Filtrar por Categoria</Label>
                <Select value={loteForm.filtro_categoria} onValueChange={v => setLoteForm(f => ({ ...f, filtro_categoria: v, animal_ids: [] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{loteForm.animal_ids.length} selecionado(s)</Label>
                <div className="flex gap-2">
                  <button className="text-xs text-t3 hover:text-t1" onClick={() => setLoteForm(f => ({ ...f, animal_ids: animaisFiltradosLote.map(a => a.id) }))}>
                    Todos
                  </button>
                  <button className="text-xs text-t3 hover:text-t1" onClick={() => setLoteForm(f => ({ ...f, animal_ids: [] }))}>
                    Nenhum
                  </button>
                </div>
              </div>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {animaisFiltradosLote.length === 0 ? (
                  <p className="text-xs text-t3 text-center py-4">Nenhum animal neste filtro</p>
                ) : animaisFiltradosLote.map(a => (
                  <label key={a.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-raised)] transition-colors">
                    <input
                      type="checkbox"
                      checked={loteForm.animal_ids.includes(a.id)}
                      onChange={e => setLoteForm(f => ({
                        ...f,
                        animal_ids: e.target.checked ? [...f.animal_ids, a.id] : f.animal_ids.filter(id => id !== a.id),
                      }))}
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
            <Button variant="outline" onClick={() => setLoteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveLote} disabled={saving}>{saving ? 'Salvando...' : `Aplicar (${loteForm.animal_ids.length})`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

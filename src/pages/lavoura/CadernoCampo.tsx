import { useEffect, useState, useCallback } from 'react'
import { Plus, Download, BookOpen } from 'lucide-react'
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
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'

interface Safra { id: string; nome: string }
interface Talhao { id: string; nome: string; area_hectares: number | null }
interface Insumo { id: string; nome: string; unidade: string; preco_unitario: number; estoque_atual: number }
interface Maquina { id: string; nome: string; custo_hora: number | null }
interface SafraTalhao { id: string; safra_id: string; talhao_id: string; cultura_id: string }
interface AtividadeCampo {
  id: string; safra_talhao_id: string; tipo: string; data: string
  area_coberta: number | null; insumo_id: string | null; quantidade_insumo: number | null
  maquina_id: string | null; horas_maquina: number | null; operador: string | null
  custo_total: number | null; condicao_clima: string | null; observacao: string | null
}

const TIPO_COLORS: Record<string, string> = {
  plantio: 'bg-green-100 text-green-700',
  adubacao: 'bg-lime-100 text-lime-700',
  pulverizacao: 'bg-orange-100 text-orange-700',
  irrigacao: 'bg-blue-100 text-blue-700',
  capina: 'bg-yellow-100 text-yellow-700',
  colheita: 'bg-amber-100 text-amber-700',
  outro: 'bg-gray-100 text-gray-600',
}
const TIPOS = ['plantio', 'adubacao', 'pulverizacao', 'irrigacao', 'capina', 'colheita', 'outro']
const TIPO_LABELS: Record<string, string> = {
  plantio: 'Plantio', adubacao: 'Adubação', pulverizacao: 'Pulverização',
  irrigacao: 'Irrigação', capina: 'Capina', colheita: 'Colheita', outro: 'Outro',
}

interface FormData {
  safra_id: string; safra_talhao_id: string; tipo: string; data: string
  area_coberta: string; insumo_id: string; quantidade_insumo: string
  maquina_id: string; horas_maquina: string; operador: string
  condicao_clima: string; observacao: string; custo_total: string
}
const EMPTY_FORM: FormData = {
  safra_id: '', safra_talhao_id: '', tipo: '', data: format(new Date(), 'yyyy-MM-dd'),
  area_coberta: '', insumo_id: '', quantidade_insumo: '', maquina_id: '', horas_maquina: '',
  operador: '', condicao_clima: '', observacao: '', custo_total: '',
}

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-52" /></div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="flex gap-2"><Skeleton className="h-9 w-40 rounded-md" /><Skeleton className="h-9 w-40 rounded-md" /></div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CadernoCampo() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [atividades, setAtividades] = useState<AtividadeCampo[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [safTalhoes, setSafTalhoes] = useState<SafraTalhao[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [filterSafra, setFilterSafra] = useState('todos')
  const [filterTipo, setFilterTipo] = useState('todos')

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [a, s, t, i, m, st] = await Promise.all([
        supabase.from('atividades_campo').select('*').eq('user_id', userId).order('data', { ascending: false }),
        supabase.from('safras').select('*').eq('user_id', userId).order('nome'),
        supabase.from('talhoes').select('*').eq('user_id', userId).order('nome'),
        supabase.from('insumos').select('*').eq('user_id', userId).order('nome'),
        supabase.from('maquinas').select('*').eq('user_id', userId).order('nome'),
        supabase.from('safra_talhoes').select('*').eq('user_id', userId),
      ])
      setAtividades(a.data ?? [])
      setSafras(s.data ?? [])
      setTalhoes(t.data ?? [])
      setInsumos(i.data ?? [])
      setMaquinas(m.data ?? [])
      setSafTalhoes(st.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const linkedSTs = form.safra_id
    ? safTalhoes.filter(st => st.safra_id === form.safra_id)
    : []

  const selectedInsumo = insumos.find(i => i.id === form.insumo_id)
  const selectedMaquina = maquinas.find(m => m.id === form.maquina_id)

  function calcCusto() {
    let c = 0
    if (selectedInsumo && form.quantidade_insumo) c += parseFloat(form.quantidade_insumo) * selectedInsumo.preco_unitario
    if (selectedMaquina?.custo_hora && form.horas_maquina) c += parseFloat(form.horas_maquina) * selectedMaquina.custo_hora
    return c
  }

  function handleInsumoChange(v: string) {
    setForm(f => {
      const ins = insumos.find(x => x.id === v)
      const maq = maquinas.find(x => x.id === f.maquina_id)
      let custo = 0
      if (ins && f.quantidade_insumo) custo += parseFloat(f.quantidade_insumo) * ins.preco_unitario
      if (maq?.custo_hora && f.horas_maquina) custo += parseFloat(f.horas_maquina) * maq.custo_hora
      return { ...f, insumo_id: v, custo_total: custo > 0 ? String(custo.toFixed(2)) : f.custo_total }
    })
  }

  function handleQtdChange(v: string) {
    setForm(f => {
      const ins = insumos.find(x => x.id === f.insumo_id)
      const maq = maquinas.find(x => x.id === f.maquina_id)
      let custo = 0
      if (ins && v) custo += parseFloat(v) * ins.preco_unitario
      if (maq?.custo_hora && f.horas_maquina) custo += parseFloat(f.horas_maquina) * maq.custo_hora
      return { ...f, quantidade_insumo: v, custo_total: String(custo.toFixed(2)) }
    })
  }

  function handleHorasChange(v: string) {
    setForm(f => {
      const ins = insumos.find(x => x.id === f.insumo_id)
      const maq = maquinas.find(x => x.id === f.maquina_id)
      let custo = 0
      if (ins && f.quantidade_insumo) custo += parseFloat(f.quantidade_insumo) * ins.preco_unitario
      if (maq?.custo_hora && v) custo += parseFloat(v) * maq.custo_hora
      return { ...f, horas_maquina: v, custo_total: String(custo.toFixed(2)) }
    })
  }

  async function handleSave() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!form.safra_talhao_id || !form.tipo || !form.data) {
      toast.error('Campos obrigatórios', { description: 'Safra, Talhão, Tipo e Data são obrigatórios.' })
      return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      const { error } = await supabase.from('atividades_campo').insert({
        user_id: uid,
        safra_talhao_id: form.safra_talhao_id,
        tipo: form.tipo,
        data: form.data,
        area_coberta: form.area_coberta ? parseFloat(form.area_coberta) : null,
        insumo_id: form.insumo_id || null,
        quantidade_insumo: form.quantidade_insumo ? parseFloat(form.quantidade_insumo) : null,
        maquina_id: form.maquina_id || null,
        horas_maquina: form.horas_maquina ? parseFloat(form.horas_maquina) : null,
        operador: form.operador || null,
        custo_total: form.custo_total ? parseFloat(form.custo_total) : calcCusto() || null,
        condicao_clima: form.condicao_clima || null,
        observacao: form.observacao || null,
      })
      if (error) throw error

      if (form.insumo_id && form.quantidade_insumo) {
        const qtd = parseFloat(form.quantidade_insumo)
        const ins = insumos.find(x => x.id === form.insumo_id)
        if (ins) {
          await Promise.all([
            supabase.from('movimentacoes_insumo').insert({
              user_id: uid,
              insumo_id: form.insumo_id,
              tipo: 'saida',
              quantidade: qtd,
              data: form.data,
              valor_total: qtd * ins.preco_unitario,
            }),
            supabase.from('insumos').update({ estoque_atual: ins.estoque_atual - qtd }).eq('id', ins.id),
          ])
        }
      }

      toast.success('Atividade registrada!')
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const filtered = atividades.filter(a => {
    if (filterTipo !== 'todos' && a.tipo !== filterTipo) return false
    if (filterSafra !== 'todos') {
      const st = safTalhoes.find(x => x.id === a.safra_talhao_id)
      if (!st || st.safra_id !== filterSafra) return false
    }
    return true
  })

  function getTalhaoName(stId: string) {
    const st = safTalhoes.find(x => x.id === stId)
    if (!st) return '–'
    return talhoes.find(t => t.id === st.talhao_id)?.nome ?? '–'
  }

  async function handleExport() {
    const rows = filtered.map(a => ({
      data: a.data,
      talhao: getTalhaoName(a.safra_talhao_id),
      tipo: TIPO_LABELS[a.tipo] ?? a.tipo,
      insumo: insumos.find(x => x.id === a.insumo_id)?.nome ?? '–',
      qtd_insumo: a.quantidade_insumo ?? '',
      maquina: maquinas.find(x => x.id === a.maquina_id)?.nome ?? '–',
      horas: a.horas_maquina ?? '',
      custo: a.custo_total ?? 0,
      operador: a.operador ?? '–',
    }))
    await exportToExcel('caderno_campo', 'Caderno de Campo', [
      { key: 'data', header: 'Data', type: 'date', width: 12 },
      { key: 'talhao', header: 'Talhão', width: 18 },
      { key: 'tipo', header: 'Tipo', width: 16 },
      { key: 'insumo', header: 'Insumo', width: 20 },
      { key: 'qtd_insumo', header: 'Qtd Insumo', type: 'number', width: 12 },
      { key: 'maquina', header: 'Máquina', width: 18 },
      { key: 'horas', header: 'Horas', type: 'number', width: 10 },
      { key: 'custo', header: 'Custo Total', type: 'currency', width: 16 },
      { key: 'operador', header: 'Operador', width: 18 },
    ], rows)
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Caderno de Campo</h1>
          <p className="text-sm text-t3">Registro de atividades realizadas nos talhões</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Nova Atividade
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterSafra} onValueChange={setFilterSafra}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todas as safras" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as safras</SelectItem>
            {safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo de atividade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map(t => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-float"><BookOpen className="w-12 h-12 text-t3" /></div>
          <p className="text-sm text-t3">Nenhuma atividade registrada</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Talhão</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Insumo</th>
                <th className="text-left px-4 py-3">Qtd</th>
                <th className="text-left px-4 py-3">Máquina</th>
                <th className="text-left px-4 py-3">Horas</th>
                <th className="text-left px-4 py-3">Custo</th>
                <th className="text-left px-4 py-3">Operador</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-4 py-3 text-t2">{formatDate(a.data)}</td>
                  <td className="px-4 py-3 font-medium text-t1">{getTalhaoName(a.safra_talhao_id)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${TIPO_COLORS[a.tipo] ?? 'bg-gray-100 text-gray-600'}`}>{TIPO_LABELS[a.tipo] ?? a.tipo}</Badge>
                  </td>
                  <td className="px-4 py-3 text-t2">{insumos.find(x => x.id === a.insumo_id)?.nome ?? '–'}</td>
                  <td className="px-4 py-3 text-t2">{a.quantidade_insumo != null ? formatNumber(a.quantidade_insumo) : '–'}</td>
                  <td className="px-4 py-3 text-t2">{maquinas.find(x => x.id === a.maquina_id)?.nome ?? '–'}</td>
                  <td className="px-4 py-3 text-t2">{a.horas_maquina != null ? formatNumber(a.horas_maquina, 1) : '–'}</td>
                  <td className="px-4 py-3 text-t2">{a.custo_total != null ? formatCurrency(a.custo_total) : '–'}</td>
                  <td className="px-4 py-3 text-t2">{a.operador ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Atividade de Campo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Safra *</Label>
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
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Área Coberta (ha)</Label>
                <Input type="number" placeholder="0" value={form.area_coberta} onChange={e => setForm(f => ({ ...f, area_coberta: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Insumo</Label>
                <Select value={form.insumo_id} onValueChange={handleInsumoChange}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.nome} ({i.unidade})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Qtd Insumo {selectedInsumo && `(${selectedInsumo.unidade})`}</Label>
                <Input type="number" placeholder="0" value={form.quantidade_insumo} onChange={e => handleQtdChange(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Máquina</Label>
                <Select value={form.maquina_id} onValueChange={v => setForm(f => ({ ...f, maquina_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Horas Máquina</Label>
                <Input type="number" placeholder="0" value={form.horas_maquina} onChange={e => handleHorasChange(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Operador</Label>
                <Input placeholder="Nome do operador" value={form.operador} onChange={e => setForm(f => ({ ...f, operador: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Condição do Clima</Label>
                <Input placeholder="Ex: Ensolarado" value={form.condicao_clima} onChange={e => setForm(f => ({ ...f, condicao_clima: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Custo Total (R$)</Label>
              <Input
                type="number"
                placeholder="Auto-calculado ou informe manualmente"
                value={form.custo_total}
                onChange={e => setForm(f => ({ ...f, custo_total: e.target.value }))}
              />
              {calcCusto() > 0 && !form.custo_total && (
                <p className="text-xs text-t3">Sugerido: {formatCurrency(calcCusto())}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input placeholder="Observações adicionais" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
